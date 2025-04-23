-- Migration to add the reorder_workflow_sub_stage function

-- Function to reorder workflow sub-stages within the same parent stage
CREATE OR REPLACE FUNCTION public.reorder_workflow_sub_stage(
    p_organization_id UUID,
    p_sub_stage_id UUID,
    p_direction TEXT -- Expects 'up' or 'down'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with definer's privileges, bypassing caller's RLS
AS $$
DECLARE
    v_current_sequence INT;
    v_target_sequence INT;
    v_sibling_id UUID;
    v_parent_stage_id UUID;
BEGIN
    -- Ensure the user calling this function via RPC has already passed
    -- necessary RBAC checks in the calling API route or service.
    -- This function relies on the organization_id checks within its queries
    -- for data access control, facilitated by SECURITY DEFINER.

    -- Fetch the current sub-stage's parent stage ID and sequence order.
    -- Crucially, filter by the provided organization ID.
    SELECT stage_id, sequence_order INTO v_parent_stage_id, v_current_sequence
    FROM public.workflow_sub_stages
    WHERE id = p_sub_stage_id AND organization_id = p_organization_id;

    -- If the sub-stage is not found for the given organization, raise an error.
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sub-stage with ID % not found or does not belong to organization %.', p_sub_stage_id, p_organization_id;
    END IF;

    -- Find the adjacent sibling sub-stage to swap with, based on direction.
    -- IMPORTANT: The sibling must belong to the same parent stage (v_parent_stage_id)
    -- and the same organization (p_organization_id).
    IF p_direction = 'up' THEN
        -- Find the sub-stage immediately preceding the current one in the sequence.
        SELECT id, sequence_order INTO v_sibling_id, v_target_sequence
        FROM public.workflow_sub_stages
        WHERE organization_id = p_organization_id
          AND stage_id = v_parent_stage_id -- Must be in the same stage
          AND sequence_order < v_current_sequence
        ORDER BY sequence_order DESC
        LIMIT 1;

        -- If no preceding sibling exists, it's already the first item.
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Cannot move the first sub-stage up.';
        END IF;
    ELSIF p_direction = 'down' THEN
        -- Find the sub-stage immediately following the current one in the sequence.
        SELECT id, sequence_order INTO v_sibling_id, v_target_sequence
        FROM public.workflow_sub_stages
        WHERE organization_id = p_organization_id
          AND stage_id = v_parent_stage_id -- Must be in the same stage
          AND sequence_order > v_current_sequence
        ORDER BY sequence_order ASC
        LIMIT 1;

        -- If no following sibling exists, it's already the last item.
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Cannot move the last sub-stage down.';
        END IF;
    ELSE
        -- Handle invalid direction input.
        RAISE EXCEPTION 'Invalid direction specified. Use ''up'' or ''down''.';
    END IF;

    -- Atomically swap the sequence numbers of the current sub-stage and its sibling.
    -- This happens within an implicit transaction in PL/pgSQL.
    UPDATE public.workflow_sub_stages
    SET sequence_order = v_target_sequence
    WHERE id = p_sub_stage_id; -- Update the sub-stage being moved

    UPDATE public.workflow_sub_stages
    SET sequence_order = v_current_sequence
    WHERE id = v_sibling_id; -- Update the sibling sub-stage

END;
$$;

-- Grant execution permission after creating the function.
-- Choose the appropriate role based on how your API/application authenticates with Supabase.
-- Typically 'authenticated' for user-driven actions or 'service_role' for backend operations.
-- Uncomment the relevant line below:

GRANT EXECUTE ON FUNCTION public.reorder_workflow_sub_stage(UUID, UUID, TEXT) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.reorder_workflow_sub_stage(UUID, UUID, TEXT) TO service_role; 
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
// import { getUserData } from "@/lib/auth/utils"; // Removed incorrect helper

const schema = z.object({
  currentItemStageId: z.string().uuid(),
  currentItemSubStageId: z.string().uuid().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  // const { user, orgId, error: userError } = await getUserData(supabase);
  // --- Start: Standard Auth & Profile Fetch --- //
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Auth Error [Valid Rework Targets]:", authError);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id, role") // Fetch role even if not used directly here, for consistency
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.organization_id) {
    console.error(
      `Profile Error [Valid Rework Targets] for user ${user.id}:`,
      profileError?.message
    );
    return NextResponse.json(
      {
        error:
          profileError?.message ||
          "Unauthorized: User profile or organization mapping not found.",
      },
      { status: 401 } // Treat missing profile/org as auth issue
    );
  }
  const orgId = profile.organization_id;
  // const userRole = profile.role; // Role not strictly needed for this GET, but fetched
  // --- End: Standard Auth & Profile Fetch --- //

  const searchParams = request.nextUrl.searchParams;
  const parseResult = schema.safeParse({
    currentItemStageId: searchParams.get("currentItemStageId"),
    currentItemSubStageId: searchParams.get("currentItemSubStageId"),
  });

  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details: parseResult.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { currentItemStageId, currentItemSubStageId } = parseResult.data;

  try {
    // 1. Get the sequence order of the current stage/sub-stage
    let currentSequenceOrder: number | null = null;

    if (currentItemSubStageId) {
      const { data: subStageData, error: subStageError } = await supabase
        .from("workflow_sub_stages")
        .select("sequence_order")
        .eq("id", currentItemSubStageId)
        .eq("organization_id", orgId)
        .single();

      if (subStageError || !subStageData) {
        console.error("Error fetching current sub-stage:", subStageError);
        return NextResponse.json(
          { error: "Could not find current sub-stage" },
          { status: 404 }
        );
      }
      currentSequenceOrder = subStageData.sequence_order;
    } else {
      const { data: stageData, error: stageError } = await supabase
        .from("workflow_stages")
        .select("sequence_order")
        .eq("id", currentItemStageId)
        .eq("organization_id", orgId)
        .single();

      if (stageError || !stageData) {
        console.error("Error fetching current stage:", stageError);
        return NextResponse.json(
          { error: "Could not find current stage" },
          { status: 404 }
        );
      }
      currentSequenceOrder = stageData.sequence_order;
    }

    if (currentSequenceOrder === null) {
      // Should not happen if previous checks passed, but defensive check
      return NextResponse.json(
        { error: "Could not determine current sequence order" },
        { status: 500 }
      );
    }

    // 2. Fetch stages/sub-stages with a lower sequence order using the RPC function
    const { data: validTargets, error: fetchError } = await supabase.rpc(
      "get_valid_rework_targets",
      {
        p_organization_id: orgId,
        p_current_item_stage_id: currentItemStageId,
        p_current_item_sub_stage_id: currentItemSubStageId,
      }
    );

    if (fetchError) {
      console.error("Error fetching valid rework targets:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch valid rework targets" },
        { status: 500 }
      );
    }

    // The RPC function should return stages and sub-stages combined and formatted
    // Example expected format: [{ id: 'stage-uuid', name: 'Stage Name', type: 'stage' }, { id: 'sub-stage-uuid', name: 'Sub Stage Name', type: 'sub_stage', parent_stage_id: 'parent-stage-uuid' }]

    return NextResponse.json(validTargets || []);
  } catch (err) {
    console.error("Unexpected error fetching rework targets:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// NOTE: Need to create the Supabase RPC function `get_valid_rework_targets`
/*
Example SQL for `get_valid_rework_targets` function:

CREATE OR REPLACE FUNCTION get_valid_rework_targets(
    _organization_id uuid,
    _current_sequence_order integer
)
RETURNS TABLE(id uuid, name text, type text, parent_stage_id uuid, sequence_order integer) AS $$
-- Added sequence_order to the return table for potential client-side sorting if needed
BEGIN
    IF _current_sequence_order IS NULL THEN
        RAISE EXCEPTION 'Current sequence order cannot be NULL.';
    END IF;

    RETURN QUERY
    (
        -- Select stages with sequence order less than current, that have NO sub-stages
        SELECT
            ws.id,
            ws.name,
            'stage'::text AS type,
            NULL::uuid AS parent_stage_id,
            ws.sequence_order
        FROM
            workflow_stages ws
        WHERE
            ws.organization_id = _organization_id
            AND ws.sequence_order < _current_sequence_order
            AND NOT EXISTS (
                SELECT 1
                FROM workflow_sub_stages wss_check
                WHERE wss_check.stage_id = ws.id
                  AND wss_check.organization_id = _organization_id
            )
    )
    UNION ALL
    (
        -- Select sub-stages with sequence order less than current
        SELECT
            wss.id,
            wss.name,
            'sub_stage'::text AS type,
            wss.stage_id AS parent_stage_id,
            wss.sequence_order
        FROM
            workflow_sub_stages wss
        WHERE
            wss.organization_id = _organization_id
            AND wss.sequence_order < _current_sequence_order
    )
    ORDER BY sequence_order; -- Order results by sequence
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_valid_rework_targets(uuid, integer) TO authenticated; -- Or appropriate role

*/

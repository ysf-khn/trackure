-- Phase 1: Initial Database Schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations Table: Stores company/tenant information
CREATE TABLE public.organizations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.organizations IS 'Stores company/tenant information.';

-- Profiles Table: Links auth.users to organizations and roles
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, -- Links to Supabase auth user ID
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'Worker' CHECK (role IN ('Owner', 'Worker')), -- Enforce valid roles
    full_name text,
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.profiles IS 'User profile information, linking Supabase auth users to organizations and roles.';

-- Workflow Stages Table: Defines main stages in the production workflow
CREATE TABLE public.workflow_stages (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    sequence_order integer NOT NULL,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL indicates a default stage template
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
    -- Consider adding UNIQUE constraint on (organization_id, sequence_order) later if needed
);
COMMENT ON TABLE public.workflow_stages IS 'Defines the main stages in the production/preparation workflow.';
COMMENT ON COLUMN public.workflow_stages.organization_id IS 'NULL indicates a global default stage template.';

-- Workflow Sub-Stages Table: Defines steps within a main workflow stage
CREATE TABLE public.workflow_sub_stages (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    sequence_order integer NOT NULL,
    stage_id uuid NOT NULL REFERENCES public.workflow_stages(id) ON DELETE CASCADE, -- Link to parent stage
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL indicates a default sub-stage template
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
    -- Consider adding UNIQUE constraint on (stage_id, organization_id, sequence_order) later if needed
);
COMMENT ON TABLE public.workflow_sub_stages IS 'Defines specific sub-steps within a main workflow stage.';
COMMENT ON COLUMN public.workflow_sub_stages.organization_id IS 'NULL indicates a global default sub-stage template.';

-- Orders Table: Represents customer orders containing items to be processed
CREATE TABLE public.orders (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    order_number text UNIQUE, -- Assuming order number should be unique per organization? Add constraint later if needed globally.
    customer_name text,
    payment_status text, -- Consider ENUM type later (e.g., 'Lent', 'Credit', 'Paid')
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.orders IS 'Represents customer orders containing items to be processed.';

-- Item Master Table: Catalog of unique items (SKUs) an organization handles
CREATE TABLE public.item_master (
    sku text NOT NULL,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    master_details jsonb, -- Stores default details like weight, dimensions, etc.
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (sku, organization_id) -- Composite key ensures SKU is unique per organization
);
COMMENT ON TABLE public.item_master IS 'Catalog of unique items (SKUs) with their master details for an organization.';

-- Items Table: Tracks individual item instances within orders through the workflow
CREATE TABLE public.items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    sku text NOT NULL,
    instance_details jsonb, -- Overrides or specific details for this instance
    current_stage_id uuid REFERENCES public.workflow_stages(id) ON DELETE SET NULL, -- Current location in the workflow
    current_sub_stage_id uuid REFERENCES public.workflow_sub_stages(id) ON DELETE SET NULL, -- Current location within a stage
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    -- Foreign key to ensure the SKU exists in the item master for the organization
    FOREIGN KEY (sku, organization_id) REFERENCES public.item_master(sku, organization_id) ON DELETE RESTRICT ON UPDATE CASCADE
);
COMMENT ON TABLE public.items IS 'Tracks individual item instances within orders as they move through the workflow.';
COMMENT ON COLUMN public.items.instance_details IS 'Specific details for this item instance, potentially overriding master details.';

-- Item History Table: Logs the movement of items between stages/sub-stages
CREATE TABLE public.item_history (
    id bigserial PRIMARY KEY, -- Auto-incrementing history entry ID
    item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    stage_id uuid REFERENCES public.workflow_stages(id) ON DELETE SET NULL, -- Record the stage ID even if the stage is deleted later
    sub_stage_id uuid REFERENCES public.workflow_sub_stages(id) ON DELETE SET NULL, -- Record the sub-stage ID even if it's deleted
    entered_at timestamptz NOT NULL DEFAULT now(),
    exited_at timestamptz, -- Timestamp when the item left this stage/sub-stage
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- User who performed the action, keep history if user deleted
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    rework_reason text -- Reason if this entry corresponds to a rework step
);
COMMENT ON TABLE public.item_history IS 'Logs the movement of items between workflow stages and sub-stages.';

-- Remarks Table: Stores comments or notes related to specific items or history events
CREATE TABLE public.remarks (
    id bigserial PRIMARY KEY,
    item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    history_id bigint REFERENCES public.item_history(id) ON DELETE SET NULL, -- Optional: Link remark to a specific history event
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL, -- User who made the remark
    text text NOT NULL CHECK (text <> ''), -- Ensure remark text is not empty
    "timestamp" timestamptz NOT NULL DEFAULT now(), -- Quoted identifier as 'timestamp' is a type name
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.remarks IS 'Stores comments or notes related to items, potentially linked to specific history events.';

-- Trigger function to update 'updated_at' timestamp on profiles table
CREATE OR REPLACE FUNCTION public.handle_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update 'updated_at' when profile row is updated
CREATE TRIGGER on_profile_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_update();

-- Add basic indexes (more can be added later based on query patterns - Step 1.4)
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX idx_workflow_stages_organization_id ON public.workflow_stages(organization_id);
CREATE INDEX idx_workflow_stages_is_default ON public.workflow_stages(is_default);
CREATE INDEX idx_workflow_sub_stages_stage_id ON public.workflow_sub_stages(stage_id);
CREATE INDEX idx_workflow_sub_stages_organization_id ON public.workflow_sub_stages(organization_id);
CREATE INDEX idx_workflow_sub_stages_is_default ON public.workflow_sub_stages(is_default);
CREATE INDEX idx_orders_organization_id ON public.orders(organization_id);
CREATE INDEX idx_item_master_organization_id ON public.item_master(organization_id);
CREATE INDEX idx_items_order_id ON public.items(order_id);
CREATE INDEX idx_items_organization_id ON public.items(organization_id);
CREATE INDEX idx_items_current_stage_id ON public.items(current_stage_id);
CREATE INDEX idx_items_current_sub_stage_id ON public.items(current_sub_stage_id);
CREATE INDEX idx_items_sku_organization_id ON public.items(sku, organization_id);
CREATE INDEX idx_item_history_item_id ON public.item_history(item_id);
CREATE INDEX idx_item_history_organization_id ON public.item_history(organization_id);
CREATE INDEX idx_item_history_entered_at ON public.item_history(entered_at);
CREATE INDEX idx_remarks_item_id ON public.remarks(item_id);
CREATE INDEX idx_remarks_organization_id ON public.remarks(organization_id);
CREATE INDEX idx_remarks_history_id ON public.remarks(history_id); 
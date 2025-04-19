-- Trackure V1 - Seed Default Workflow Data
-- Seed default workflow stages
-- These represent the top-level steps in the process.
-- organization_id is NULL to indicate they are system defaults.
INSERT INTO
    public.workflow_stages (name, sequence_order, is_default, organization_id)
VALUES
    ('Order Intake', 10, true, NULL::uuid),
    ('Manufacturing', 20, true, NULL::uuid),
    ('Customization', 30, true, NULL::uuid),
    ('Finishing', 40, true, NULL::uuid),
    ('Packaging', 50, true, NULL::uuid),
    ('Ready for Dispatch', 60, true, NULL::uuid) ON CONFLICT (name, organization_id) DO NOTHING;

-- Avoid duplicates if script is run again
-- Seed default workflow sub-stages
-- These are linked to specific main stages.
-- We use Common Table Expressions (CTEs) to look up the stage_id based on the name,
-- ensuring we link to the correct default stage (where organization_id IS NULL).
-- Sub-stages for Manufacturing
WITH
    stage AS (
        SELECT
            id
        FROM
            public.workflow_stages
        WHERE
            name = 'Manufacturing'
            AND organization_id IS NULL
        LIMIT
            1
    )
INSERT INTO
    public.workflow_sub_stages (
        stage_id,
        name,
        sequence_order,
        is_default,
        description,
        organization_id
    )
SELECT
    id,
    'Material Preparation',
    10,
    true,
    'Cutting, shaping raw materials',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Casting / Molding',
    20,
    true,
    'Initial forming of the item',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Machining / Milling',
    30,
    true,
    'Precision shaping or drilling',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Component Assembly',
    40,
    true,
    'Joining initial parts',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Welding / Joining',
    50,
    true,
    'Permanent joining methods',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Deburring / Smoothing',
    60,
    true,
    'Removing rough edges',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Structural Check',
    70,
    true,
    'Initial check for basic form/integrity',
    NULL::uuid
FROM
    stage ON CONFLICT (stage_id, name, organization_id) DO NOTHING;

-- Sub-stages for Customization
WITH
    stage AS (
        SELECT
            id
        FROM
            public.workflow_stages
        WHERE
            name = 'Customization'
            AND organization_id IS NULL
        LIMIT
            1
    )
INSERT INTO
    public.workflow_sub_stages (
        stage_id,
        name,
        sequence_order,
        is_default,
        description,
        organization_id
    )
SELECT
    id,
    'Surface Prep',
    10,
    true,
    'Cleaning/preparing for customization',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Fine Polishing',
    20,
    true,
    'Achieving high shine',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Brushing / Graining',
    30,
    true,
    'Creating specific surface textures',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Laser Engraving',
    40,
    true,
    'Precise marking or design application',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Hand Engraving',
    50,
    true,
    'Manual detailed work',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Stone Setting (If Any)',
    60,
    true,
    'Adding gems or decorative elements',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Plating / Coating',
    70,
    true,
    'Applying final surface layer (gold, rhodium etc)',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Customization Verify',
    80,
    true,
    'Check if customization matches specs',
    NULL::uuid
FROM
    stage ON CONFLICT (stage_id, name, organization_id) DO NOTHING;

-- Sub-stages for Finishing
WITH
    stage AS (
        SELECT
            id
        FROM
            public.workflow_stages
        WHERE
            name = 'Finishing'
            AND organization_id IS NULL
        LIMIT
            1
    )
INSERT INTO
    public.workflow_sub_stages (
        stage_id,
        name,
        sequence_order,
        is_default,
        description,
        organization_id
    )
SELECT
    id,
    'Post-Customization Clean',
    10,
    true,
    'Removing residues from previous stage',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Matte / Satin Finish Application',
    20,
    true,
    'Applying non-gloss finishes',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Protective Coating (Optional)',
    30,
    true,
    'Lacquer or anti-tarnish layer',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Final Polish / Buffing',
    40,
    true,
    'Final touch-up for appearance',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Dimensional Check',
    50,
    true,
    'Verifying final size/shape',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Functional Check (If Any)',
    60,
    true,
    'Testing moving parts, clasps etc.',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Aesthetic Final Inspection',
    70,
    true,
    'Overall look and feel assessment',
    NULL::uuid
FROM
    stage ON CONFLICT (stage_id, name, organization_id) DO NOTHING;

-- Sub-stages for Packaging
WITH
    stage AS (
        SELECT
            id
        FROM
            public.workflow_stages
        WHERE
            name = 'Packaging'
            AND organization_id IS NULL
        LIMIT
            1
    )
INSERT INTO
    public.workflow_sub_stages (
        stage_id,
        name,
        sequence_order,
        is_default,
        description,
        organization_id
    )
SELECT
    id,
    'Verify Packaging Materials',
    10,
    true,
    'Ensuring correct boxes, inserts are available',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Individual Item Wrapping',
    20,
    true,
    'Protective wrap (tissue, polybag)',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Placement in Primary Box',
    30,
    true,
    'Placing item in velvet box, gift box etc.',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Adding Inserts/Padding',
    40,
    true,
    'Securing item within primary box',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Labeling Primary Box',
    50,
    true,
    'SKU, barcode, or item identifier label',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Packing into Shipping Carton',
    60,
    true,
    'Grouping primary boxes into outer carton',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Adding Dunnage',
    70,
    true,
    'Filling voids in shipping carton',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Sealing Shipping Carton',
    80,
    true,
    'Taping and securing the outer box',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Final Weight/Dimension Check',
    90,
    true,
    'Recording final shipping metrics',
    NULL::uuid
FROM
    stage
UNION ALL
SELECT
    id,
    'Applying Shipping Labels',
    100,
    true,
    'Address labels, customs declarations etc.',
    NULL::uuid
FROM
    stage ON CONFLICT (stage_id, name, organization_id) DO NOTHING;

-- Note: 'Order Intake' and 'Ready for Dispatch' stages have no default sub-stages defined.
SELECT
    'Default workflow stages and sub-stages seeded successfully.' as result;

-- Add unique constraint to workflow_stages
-- Ensures stage names are unique within an organization,
-- or unique globally if organization_id is NULL (default stages).
ALTER TABLE public.workflow_stages ADD CONSTRAINT workflow_stages_name_organization_id_uq UNIQUE (name, organization_id);

-- Add unique constraint to workflow_sub_stages
-- Ensures sub-stage names are unique within a parent stage and organization,
-- or unique within a default parent stage if organization_id is NULL.
ALTER TABLE public.workflow_sub_stages ADD CONSTRAINT workflow_sub_stages_stage_id_name_organization_id_uq UNIQUE (stage_id, name, organization_id);
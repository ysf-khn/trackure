// import { createClient } from "@/lib/supabase/server";
import { type SupabaseClient } from "@supabase/supabase-js"; // Import SupabaseClient type
// import { cookies } from 'next/headers'; // No longer needed here
// import type { Database } from "@/types/supabase"; // TODO: Uncomment and fix path once types are generated

// TODO: Replace 'any' with actual types once Database type path is found and import uncommented
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SubStage = any; // Database['public']['Tables']['workflow_sub_stages']['Row'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Stage = any & {
  // Database['public']['Tables']['workflow_stages']['Row']
  subStages: SubStage[];
};
export type WorkflowStructure = Stage[];

async function getOrganizationIdForCurrentUser(
  supabase: SupabaseClient
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Assuming a 'profiles' table links auth.users.id to an organization_id
  // This might need adjustment based on your actual schema and RLS setup.
  // If you implemented get_my_organization_id() SQL function, RLS might handle this automatically
  // on the 'profiles' table, but fetching it explicitly can be clearer.
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    // Use console.warn or info instead of error for expected case of no profile
    console.warn("User profile not found or error fetching:", error?.message);
    return null;
  }
  return profile.organization_id;
}

export async function getWorkflowStructure(
  supabase: SupabaseClient
): Promise<WorkflowStructure> {
  const organizationId = await getOrganizationIdForCurrentUser(supabase);

  let stagesResult;
  let fetchedDefaults = false; // Flag to know if we fetched defaults

  // 1. Try fetching organization-specific stages ONLY if organizationId exists
  if (organizationId) {
    stagesResult = await supabase
      .from("workflow_stages")
      .select("*")
      .eq("organization_id", organizationId) // Direct comparison
      .order("sequence_order", { ascending: true });

    if (stagesResult.error) {
      console.warn(
        `Error fetching stages for org ${organizationId}, falling back to default: `,
        stagesResult.error.message
      );
      // Don't throw yet, fallback logic will handle fetching defaults
    }
  }

  // 2. Fetch default stages if:
  //    - organizationId was null initially
  //    - OR org-specific fetch had an error
  //    - OR org-specific fetch returned no data
  if (!organizationId || stagesResult?.error || !stagesResult?.data?.length) {
    fetchedDefaults = true;
    stagesResult = await supabase
      .from("workflow_stages")
      .select("*")
      .is("organization_id", null)
      .eq("is_default", true)
      .order("sequence_order", { ascending: true });
  }

  // 3. Handle final errors after attempting both org-specific and default
  if (stagesResult?.error) {
    console.error(
      `Error fetching workflow stages (tried org: ${!!organizationId}, fetched defaults: ${fetchedDefaults}):`,
      stagesResult.error
    );
    throw new Error("Could not fetch workflow stages.");
  }

  const stages = stagesResult?.data || [];
  if (stages.length === 0) {
    return []; // No stages found (neither org-specific nor default)
  }

  const stageIds = stages.map((s) => s.id);

  // Fetch all relevant sub-stages in one query
  const { data: subStagesData, error: subStagesError } = await supabase
    .from("workflow_sub_stages")
    .select("*")
    .in("stage_id", stageIds)
    .order("sequence_order", { ascending: true });

  if (subStagesError) {
    console.error("Error fetching workflow sub-stages:", subStagesError);
    throw new Error("Could not fetch workflow sub-stages.");
  }

  const subStagesByStageId = (subStagesData || []).reduce((acc, subStage) => {
    const stageId = subStage.stage_id;
    if (!acc[stageId]) {
      acc[stageId] = [];
    }
    acc[stageId].push(subStage);
    return acc;
  }, {} as Record<string, SubStage[]>);

  // Combine stages and their sub-stages
  const workflowStructure: WorkflowStructure = stages.map((stage) => ({
    ...stage,
    subStages: subStagesByStageId[stage.id] || [],
  }));

  return workflowStructure;
}

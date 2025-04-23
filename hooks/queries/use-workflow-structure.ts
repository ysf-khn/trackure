import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client"; // Use client for hooks
import { WorkflowStageWithSubStages, WorkflowSubStage } from "@/types/workflow"; // Assuming paths

// --- Query Key Generator --- //
// Exported for use in mutations (invalidation)
export const getWorkflowQueryKey = (organizationId: string) => [
  "workflowStructure",
  organizationId,
];

// Fetch function to get workflow structure from Supabase
const fetchWorkflowStructure = async (
  organizationId: string
): Promise<WorkflowStageWithSubStages[]> => {
  const supabase = createClient();

  // Fetch stages ordered by sequence_order
  const { data: stagesData, error: stagesError } = await supabase
    .from("workflow_stages")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sequence_order", { ascending: true });

  if (stagesError) {
    console.error("Error fetching workflow stages:", stagesError);
    throw new Error(stagesError.message || "Failed to fetch workflow stages");
  }

  if (!stagesData) {
    return []; // No stages found
  }

  // Fetch all sub-stages for the organization ordered by sequence_order
  // We fetch all sub-stages at once to minimize requests
  const { data: subStagesData, error: subStagesError } = await supabase
    .from("workflow_sub_stages")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sequence_order", { ascending: true });

  if (subStagesError) {
    console.error("Error fetching workflow sub-stages:", subStagesError);
    throw new Error(
      subStagesError.message || "Failed to fetch workflow sub-stages"
    );
  }

  // Group sub-stages by their parent stage_id for efficient lookup
  const subStagesByStageId: Record<string, WorkflowSubStage[]> = (
    subStagesData || []
  ).reduce((acc, subStage) => {
    const stageId = subStage.stage_id;
    if (!acc[stageId]) {
      acc[stageId] = [];
    }
    acc[stageId].push(subStage);
    return acc;
  }, {} as Record<string, WorkflowSubStage[]>);

  // Combine stages with their respective sub-stages
  const workflowStructure: WorkflowStageWithSubStages[] = stagesData.map(
    (stage) => ({
      ...stage,
      workflow_sub_stages: subStagesByStageId[stage.id] || [], // Attach sub-stages or empty array if none
    })
  );

  return workflowStructure;
};

// --- TanStack Query Hook --- //
export const useWorkflowStructure = (organizationId: string) => {
  const queryKey = getWorkflowQueryKey(organizationId); // Use the generator

  return useQuery<WorkflowStageWithSubStages[], Error>({
    queryKey: queryKey, // Use the generated query key
    queryFn: () => fetchWorkflowStructure(organizationId),
    enabled: !!organizationId, // Only run the query if organizationId is provided
    staleTime: 5 * 60 * 1000, // Optional: Data is considered fresh for 5 minutes
    // Add other TanStack Query options as needed (e.g., refetchOnWindowFocus)
  });
};

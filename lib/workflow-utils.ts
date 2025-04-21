// import { type Stage } from "@/types"; // Assuming Stage type definition exists - Removing as unused

// Type definition for the expected structure of workflow stages fetched from DB
// Should align with the select query in the API route
type WorkflowStage = {
  id: string;
  sequence_order: number;
  sub_stages: {
    id: string;
    sequence_order: number;
  }[];
};

/**
 * Determines the next stage and/or sub-stage in the workflow sequence.
 * @param currentStageId The ID of the item's current stage.
 * @param currentSubStageId The ID of the item's current sub-stage (null if none).
 * @param workflowStages The ordered list of stages and their ordered sub-stages for the organization.
 * @returns An object containing the next { stageId, subStageId } or null if at the end of the workflow.
 */
export function determineNextStage(
  currentStageId: string,
  currentSubStageId: string | null,
  workflowStages: WorkflowStage[]
): { stageId: string; subStageId: string | null } | null {
  const currentStageIndex = workflowStages.findIndex(
    (s) => s.id === currentStageId
  );

  if (currentStageIndex === -1) {
    console.error(
      `determineNextStage: Current stage ID ${currentStageId} not found in workflow.`
    );
    return null; // Current stage doesn't exist in the provided workflow
  }

  const currentStage = workflowStages[currentStageIndex];

  // Case 1: Currently in a sub-stage
  if (currentSubStageId) {
    const currentSubStages = currentStage.sub_stages ?? [];
    const currentSubStageIndex = currentSubStages.findIndex(
      (ss) => ss.id === currentSubStageId
    );

    if (currentSubStageIndex === -1) {
      console.error(
        `determineNextStage: Current sub-stage ID ${currentSubStageId} not found in stage ${currentStageId}.`
      );
      return null; // Data inconsistency
    }

    // Case 1a: There is a next sub-stage within the current stage
    if (currentSubStageIndex < currentSubStages.length - 1) {
      const nextSubStage = currentSubStages[currentSubStageIndex + 1];
      return { stageId: currentStageId, subStageId: nextSubStage.id };
    }
    // Case 1b: This was the last sub-stage; move to the next main stage
    // Fall through to Case 2 logic below
  }

  // Case 2: Currently at a main stage (or finished the last sub-stage of the current main stage)
  // Find the next main stage in the sequence
  if (currentStageIndex < workflowStages.length - 1) {
    const nextStage = workflowStages[currentStageIndex + 1];
    const nextSubStages = nextStage.sub_stages ?? [];

    // Case 2a: The next main stage has sub-stages; move to its first sub-stage
    if (nextSubStages.length > 0) {
      return { stageId: nextStage.id, subStageId: nextSubStages[0].id };
    }
    // Case 2b: The next main stage has no sub-stages; move directly to it
    else {
      return { stageId: nextStage.id, subStageId: null };
    }
  }

  // Case 3: Currently at the last main stage (and potentially its last sub-stage)
  // This is the end of the workflow
  return null;
}

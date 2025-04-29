// import { type Stage } from "@/types"; // Assuming Stage type definition exists - Removing as unused

// Type definition for the expected structure of workflow stages fetched from DB
// Should align with the select query in the API route
export type WorkflowStage = {
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

/**
 * Determines the previous stage and/or sub-stage in the workflow sequence.
 * Used for actions like "Send Back" or "Rework".
 * @param currentStageId The ID of the item's current stage.
 * @param currentSubStageId The ID of the item's current sub-stage (null if none).
 * @param workflowStages The ordered list of stages and their ordered sub-stages for the organization.
 * @returns An object containing the previous { stageId, subStageId } or null if at the start of the workflow.
 */
export function determinePreviousStage(
  currentStageId: string,
  currentSubStageId: string | null,
  workflowStages: WorkflowStage[]
): { stageId: string; subStageId: string | null } | null {
  const currentStageIndex = workflowStages.findIndex(
    (s) => s.id === currentStageId
  );

  if (currentStageIndex === -1) {
    console.error(
      `determinePreviousStage: Current stage ID ${currentStageId} not found in workflow.`
    );
    return null; // Current stage doesn't exist
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
        `determinePreviousStage: Current sub-stage ID ${currentSubStageId} not found in stage ${currentStageId}.`
      );
      return null; // Data inconsistency
    }

    // Case 1a: There is a previous sub-stage within the current stage
    if (currentSubStageIndex > 0) {
      const previousSubStage = currentSubStages[currentSubStageIndex - 1];
      return { stageId: currentStageId, subStageId: previousSubStage.id };
    }
    // Case 1b: This was the first sub-stage; move to the main stage itself (treated as the step before the first sub-stage)
    else {
      return { stageId: currentStageId, subStageId: null };
    }
  }

  // Case 2: Currently at a main stage (no sub-stage ID provided, or was the first sub-stage)
  // Find the previous main stage in the sequence
  if (currentStageIndex > 0) {
    const previousStage = workflowStages[currentStageIndex - 1];
    const previousSubStages = previousStage.sub_stages ?? [];

    // Case 2a: The previous main stage has sub-stages; move to its *last* sub-stage
    if (previousSubStages.length > 0) {
      return {
        stageId: previousStage.id,
        subStageId: previousSubStages[previousSubStages.length - 1].id,
      };
    }
    // Case 2b: The previous main stage has no sub-stages; move directly to it
    else {
      return { stageId: previousStage.id, subStageId: null };
    }
  }

  // Case 3: Currently at the first main stage (and not in a sub-stage, or was its first sub-stage)
  // This is the beginning of the workflow
  return null;
}

import { FetchedWorkflowStage } from "@/hooks/queries/use-workflow-structure"; // Import the EXPORTED type

// --- NEW FUNCTION --- //
interface SubsequentStageInfo {
  id: string;
  name: string | null;
}

export function getSubsequentStages(
  workflowData: FetchedWorkflowStage[], // Use the type from the hook
  currentStageId: string,
  currentSubStageId: string | null | undefined
): SubsequentStageInfo[] {
  const subsequent: SubsequentStageInfo[] = [];
  if (!workflowData || workflowData.length === 0) {
    return [];
  }

  // Find the current stage's index
  const currentStageIndex = workflowData.findIndex(
    (stage) => stage.id === currentStageId
  );

  if (currentStageIndex === -1) {
    console.error("getSubsequentStages: Current stage not found");
    return [];
  }

  const currentStage = workflowData[currentStageIndex];

  // 1. Add subsequent sub-stages within the current stage (if any)
  if (currentSubStageId) {
    const sortedSubStages = [...(currentStage.sub_stages || [])].sort(
      (a, b) => a.sequence_order - b.sequence_order
    );
    const currentSubStageIndex = sortedSubStages.findIndex(
      (sub) => sub.id === currentSubStageId
    );

    if (currentSubStageIndex !== -1) {
      for (let i = currentSubStageIndex + 1; i < sortedSubStages.length; i++) {
        // Note: We currently don't have a way to represent "Move to Sub-Stage X" distinctly
        // in the UI/API. This function focuses on moving to subsequent *main* stages.
        // If moving *within* sub-stages is required via this dropdown, the logic
        // and return type need adjustment.
        // For now, we skip adding sub-stages of the *current* stage.
      }
    }
  }

  // 2. Add all subsequent main stages
  for (let i = currentStageIndex + 1; i < workflowData.length; i++) {
    const stage = workflowData[i];
    subsequent.push({ id: stage.id, name: stage.name });

    // Optionally, include the first sub-stage of each subsequent stage if needed?
    // Requires adjusting the return type and how targetStageId is handled.
    // Example:
    // const sortedSubStages = [...(stage.sub_stages || [])].sort((a, b) => a.sequence_order - b.sequence_order);
    // if (sortedSubStages.length > 0) {
    //   subsequent.push({ id: sortedSubStages[0].id, name: `${stage.name} > ${sortedSubStages[0].name}` });
    // }
  }

  return subsequent;
}

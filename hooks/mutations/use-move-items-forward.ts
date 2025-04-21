import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner"; // Or your preferred toast library

// Define the expected structure of the API response for success/partial success
type MoveForwardSuccessResponse = {
  message: string;
  results: {
    itemId: string;
    status: "success";
    nextStageId: string;
    nextSubStageId: string | null;
  }[];
  errors?: { itemId: string; error: string }[];
};

// Define the structure for the API error response
type MoveForwardErrorResponse = {
  error: string;
  details?: unknown; // Use unknown instead of any for better type safety
};

// Define the type for the mutation variables
interface MoveItemsForwardVariables {
  itemIds: string[];
  organizationId: string;
}

async function moveItemsForwardAPI(
  itemIds: string[]
): Promise<MoveForwardSuccessResponse> {
  const response = await fetch("/api/items/move/forward", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ item_ids: itemIds }),
  });

  const data = await response.json();

  if (!response.ok) {
    // Try to parse the error message from the response
    const errorData = data as MoveForwardErrorResponse;
    throw new Error(
      errorData.error || `Failed to move items. Status: ${response.status}`
    );
  }

  return data as MoveForwardSuccessResponse;
}

export function useMoveItemsForward() {
  const queryClient = useQueryClient();

  return useMutation<
    MoveForwardSuccessResponse,
    Error,
    MoveItemsForwardVariables // Use the new variables type
  >({
    // Adapt mutationFn slightly to extract itemIds from variables
    mutationFn: (variables) => moveItemsForwardAPI(variables.itemIds),
    onSuccess: (data, variables) => {
      // 'variables' contains { itemIds, organizationId }
      toast.success(data.message || "Items moved forward successfully!");

      const { organizationId } = variables; // Get organizationId from variables

      // Invalidate queries using the organizationId AND the general workflow structure
      // 1. Invalidate all stages for the current org (for table views)
      queryClient.invalidateQueries({
        queryKey: ["itemsInStage", organizationId],
      });
      // 2. Invalidate the workflow structure query (which includes counts for the sidebar)
      queryClient.invalidateQueries({
        queryKey: ["workflow", "structure"], // Correct key for sidebar counts
      });
      // 3. Keep the sidebar-counts invalidation just in case it's used elsewhere,
      //    but the key above is the one identified in the Sidebar component.
      queryClient.invalidateQueries({
        queryKey: ["sidebar-counts", organizationId],
      });

      // Optional: More precise invalidation if needed later
      // You could iterate through data.results and invalidate specific
      // destination stages: ['itemsInStage', organizationId, result.nextStageId, result.nextSubStageId]
      // Invalidating the source stage requires passing its ID to the mutation as well.

      if (data.errors && data.errors.length > 0) {
        toast.warning(
          `Some items failed to move: ${data.errors
            .map((e) => e.itemId)
            .join(", ")}`
        );
        console.warn("Move forward partial failures:", data.errors);
      }
    },
    onError: (error) => {
      console.error("Move forward error:", error);
      toast.error(error.message || "An error occurred while moving items.");
    },
  });
}

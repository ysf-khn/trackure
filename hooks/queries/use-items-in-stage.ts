import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client"; // Assuming client setup
// import { useAuth } from "@/hooks/use-auth"; // Removed direct dependency

// Define the structure of the fetched item data including the entry time
export interface ItemInStage {
  id: string;
  sku: string;
  instance_details: Record<string, unknown>; // Use unknown for flexible JSON
  current_stage_id: string;
  current_sub_stage_id: string | null;
  current_stage_entered_at: string | null; // ISO timestamp for when the item entered the current stage
  // Add other relevant item fields as needed
}

// Define the structure of the history entry subset we need
type HistoryEntry = {
  entered_at: string;
  stage_id: string;
  sub_stage_id: string | null;
};

const fetchItemsInStage = async (
  organizationId: string,
  stageId: string,
  subStageId: string | null
): Promise<ItemInStage[]> => {
  const supabase = createClient();

  // Base query for items in the current stage/sub-stage for the org
  // Fetch associated history, ordered by entry time descending to easily find the latest
  let query = supabase
    .from("items")
    .select(
      `
      id,
      sku,
      instance_details,
      current_stage_id,
      current_sub_stage_id,
      item_history ( entered_at, stage_id, sub_stage_id )
    `
    )
    .eq("organization_id", organizationId)
    .eq("current_stage_id", stageId)
    // Order joined history entries directly in the query if possible (syntax depends on Supabase version/setup)
    // If direct ordering isn't straightforward via select, client-side sorting is needed.
    // Assuming client-side sort remains necessary for robustness:
    .order("created_at", { ascending: false }); // Order items themselves if needed

  // Filter by sub-stage if provided
  if (subStageId) {
    query = query.eq("current_sub_stage_id", subStageId);
  } else {
    query = query.is("current_sub_stage_id", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching items in stage:", error);
    throw new Error(error.message);
  }

  // Process data to find the correct 'entered_at' for the current stage
  const processedData =
    data?.map((item) => {
      const historyEntries = (item.item_history as HistoryEntry[]) || [];

      // Find the latest history entry that matches the item's current stage and sub-stage
      const currentStageHistory = historyEntries
        .filter(
          (h) =>
            h.stage_id === item.current_stage_id &&
            h.sub_stage_id === item.current_sub_stage_id
        )
        .sort(
          (a, b) =>
            // Sort descending by date to get the latest entry first
            new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime()
        );

      const latestEntryForCurrentStage = currentStageHistory[0] ?? null;

      return {
        // Spread existing item fields, ensuring type consistency
        id: item.id,
        sku: item.sku,
        instance_details: item.instance_details,
        current_stage_id: item.current_stage_id,
        current_sub_stage_id: item.current_sub_stage_id,
        // Assign the found entry time, or null if not found
        current_stage_entered_at:
          latestEntryForCurrentStage?.entered_at ?? null,
        // Note: item_history is implicitly excluded by spreading known fields
      };
    }) || [];

  // Ensure the final array matches the ItemInStage interface
  return processedData as ItemInStage[];
};

export const useItemsInStage = (
  organizationId: string | undefined | null,
  stageId: string,
  subStageId: string | null
) => {
  // const { organizationId } = useAuth(); // Removed direct call

  return useQuery<ItemInStage[], Error>({
    queryKey: ["itemsInStage", organizationId, stageId, subStageId],
    queryFn: () => {
      if (!organizationId || !stageId) {
        // Return an empty array or throw if prerequisites are not met
        return Promise.resolve([]);
      }
      return fetchItemsInStage(organizationId, stageId, subStageId);
    },
    // Query will only run if organizationId and stageId are truthy
    enabled: !!organizationId && !!stageId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

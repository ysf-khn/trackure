import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { z } from "zod";

// Re-define or import the ActivityItem schema to ensure type safety
const ActivityItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.string().datetime(),
  detail: z.string().nullable(),
  link: z.string().nullable().optional(),
});

const ActivityResponseSchema = z.object({
  activity: z.array(ActivityItemSchema),
});

export type ActivityItem = z.infer<typeof ActivityItemSchema>;

const fetchRecentActivity = async (): Promise<ActivityItem[]> => {
  try {
    const response = await axios.get("/api/dashboard/activity");
    const parsedData = ActivityResponseSchema.parse(response.data);
    return parsedData.activity;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Axios error fetching activity:",
        error.response?.data || error.message
      );
    } else if (error instanceof z.ZodError) {
      console.error("Zod validation error fetching activity:", error.errors);
    } else {
      console.error("Unexpected error fetching activity:", error);
    }
    // Re-throw or return a specific error structure if needed downstream
    throw new Error("Failed to fetch recent activity");
  }
};

// Hook to use the activity data
export const useRecentActivity = (
  organizationId: string | null | undefined
) => {
  return useQuery<ActivityItem[], Error>({
    queryKey: ["dashboard", "activity", organizationId], // Include orgId for cache separation
    queryFn: fetchRecentActivity,
    enabled: !!organizationId, // Only run the query if organizationId is available
    staleTime: 1000 * 60 * 5, // Refetch data every 5 minutes
    retry: 1, // Retry once on failure
  });
};

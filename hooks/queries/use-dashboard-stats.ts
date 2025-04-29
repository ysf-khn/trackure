import { useQuery } from "@tanstack/react-query";
// import { apiClient } from "@/lib/api-client"; // Assuming a configured axios/fetch client - Replaced with fetch

// Updated interface to include new stats
interface DashboardStats {
  activeItemsCount: number;
  activeOrdersCount: number;
  ordersNeedingPackagingInfoCount: number;
  reworkEventsLast7DaysCount: number;
}

const fetchDashboardStats = async (): Promise<DashboardStats> => {
  // const { data } = await apiClient.get<DashboardStats>("/api/dashboard/stats"); // Replaced with fetch
  const response = await fetch("/api/dashboard/stats");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})); // Try to get error details
    throw new Error(
      errorData?.error || `HTTP error! status: ${response.status}`
    );
  }
  const data = await response.json();
  // Ensure default values if API somehow doesn't return them (optional, but safer)
  return {
    activeItemsCount: data.activeItemsCount ?? 0,
    activeOrdersCount: data.activeOrdersCount ?? 0,
    ordersNeedingPackagingInfoCount: data.ordersNeedingPackagingInfoCount ?? 0,
    reworkEventsLast7DaysCount: data.reworkEventsLast7DaysCount ?? 0,
  };
};

export const useDashboardStats = () => {
  return useQuery<DashboardStats, Error>({
    queryKey: ["dashboard", "stats"], // Query key for caching
    queryFn: fetchDashboardStats,
    // Optional: Add staleTime, gcTime, etc. if needed
    // staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

import { useQuery } from "@tanstack/react-query";

// Interface matching the structure returned by the RPC function
export interface BottleneckItem {
  item_id: string;
  sku: string | null;
  order_id: string;
  order_number: string | null;
  stage_id: string;
  stage_name: string;
  sub_stage_id: string | null;
  sub_stage_name: string | null;
  entered_at: string; // ISO 8601 timestamp string
  // Define a type for the interval object structure
  time_in_stage: {
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
    milliseconds?: number;
  } | null; // Or string if backend formats it
}

const fetchBottleneckItems = async (): Promise<BottleneckItem[]> => {
  const response = await fetch("/api/dashboard/bottlenecks");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error || `HTTP error! status: ${response.status}`
    );
  }
  const data = await response.json();
  return data;
};

export const useBottleneckItems = () => {
  return useQuery<BottleneckItem[], Error>({
    queryKey: ["dashboard", "bottlenecks"],
    queryFn: fetchBottleneckItems,
  });
};

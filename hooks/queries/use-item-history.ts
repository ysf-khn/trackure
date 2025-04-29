"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// Generic type for query results - removed profiles
type HistoryQueryResult = {
  id: string;
  entered_at: string;
  exited_at: string | null;
  rework_reason: string | null;
  item_id: string;
  stage_id: string | null;
  sub_stage_id: string | null;
  user_id: string | null; // Keep user_id to potentially display it
  workflow_stages: { name: string } | null;
  workflow_sub_stages: { name: string } | null;
  // profiles: { email: string } | null; // Removed
  // profiles: { full_name: string } | null; // Added profiles join for full_name
};

export type ItemHistoryEntry = {
  id: string;
  entered_at: string;
  exited_at: string | null;
  rework_reason: string | null;
  stage_name: string | null;
  sub_stage_name: string | null;
  user_email: string | null; // Keep this, but it will be populated differently
  // user_full_name: string | null; // Added user full name
};

async function fetchItemHistory(itemId: string): Promise<ItemHistoryEntry[]> {
  const supabase = createClient();

  // Removed profiles ( email ) from select
  // Added profiles ( full_name ) to select
  const { data, error } = await supabase
    .from("item_history")
    .select(
      `
      id,
      entered_at,
      exited_at,
      rework_reason,
      user_id,
      workflow_stages ( name ),
      workflow_sub_stages ( name ),
    `
    )
    .eq("item_id", itemId)
    .order("entered_at", { ascending: false })
    .returns<HistoryQueryResult[]>();

  if (error) {
    // Log the specific Supabase error if possible
    const errorMessage = error.message || "Unknown error";
    console.error("Error fetching item history:", errorMessage);
    // Provide a more specific error message to the user
    toast.error(`Failed to load item history: ${errorMessage}`);
    throw error;
  }

  // Flatten the response
  return data.map((entry) => ({
    id: entry.id,
    entered_at: entry.entered_at,
    exited_at: entry.exited_at,
    rework_reason: entry.rework_reason,
    stage_name: entry.workflow_stages?.name ?? "N/A",
    sub_stage_name: entry.workflow_sub_stages?.name ?? null,
    // Set user_email based on whether user_id exists, otherwise 'System'
    user_email: entry.user_id ? entry.user_id : "System", // Keep user_id for now, might remove later
    // user_full_name:
    //   entry.profiles?.full_name ?? (entry.user_id ? "Unknown User" : "System")
  }));
}

export function useItemHistory(itemId: string | null) {
  return useQuery<ItemHistoryEntry[], Error>({
    queryKey: ["itemHistory", itemId],
    queryFn: () => fetchItemHistory(itemId!),
    enabled: !!itemId, // Only run the query if itemId is not null
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

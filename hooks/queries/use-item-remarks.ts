import { useQuery } from "@tanstack/react-query";
import {
  createClientComponentClient,
  SupabaseClient,
} from "@supabase/auth-helpers-nextjs";

// Define the type for a single profile entry
interface ProfileInfo {
  full_name: string | null;
  // Add other profile fields if needed
}

// Adjust RemarkWithProfile: profiles can be an array or null/undefined from the join
export interface RemarkWithProfile {
  id: string;
  timestamp: string;
  text: string;
  item_id: string;
  user_id: string;
  profiles: ProfileInfo | null; // Store the *extracted* profile info, not the array
}

// Type for the raw data returned by Supabase before transformation
interface RawRemarkData {
  id: string;
  timestamp: string;
  text: string;
  item_id: string;
  user_id: string;
  profiles: ProfileInfo[] | ProfileInfo | null; // Supabase might return array, single obj, or null
}

// Function to fetch remarks for a specific item
async function fetchItemRemarks(
  supabase: SupabaseClient,
  itemId: string
): Promise<RemarkWithProfile[]> {
  const { data, error } = await supabase
    .from("remarks")
    .select(
      `
            id,
            timestamp,
            text,
            item_id,
            user_id,
            profiles ( full_name )
        `
    )
    .eq("item_id", itemId)
    .order("timestamp", { ascending: false }); // Fetch newest first

  if (error) {
    console.error("Error fetching remarks:", error);
    throw new Error("Could not fetch item remarks");
  }

  // Process the raw data
  const rawData = (data || []) as RawRemarkData[];

  return rawData.map((remark) => {
    let profileInfo: ProfileInfo | null = null;
    // Check if profiles exists and handle array/object cases
    if (remark.profiles) {
      if (Array.isArray(remark.profiles) && remark.profiles.length > 0) {
        profileInfo = remark.profiles[0]; // Take the first profile if it's an array
      } else if (!Array.isArray(remark.profiles)) {
        profileInfo = remark.profiles; // Use it directly if it's an object
      }
    }

    return {
      id: remark.id,
      timestamp: remark.timestamp,
      text: remark.text,
      item_id: remark.item_id,
      user_id: remark.user_id,
      profiles: profileInfo ?? { full_name: "Unknown User" }, // Fallback if no profile found
    };
  });
}

// Custom hook to use the fetch function with TanStack Query
export function useItemRemarks(itemId: string | null) {
  const supabase = createClientComponentClient();

  return useQuery<RemarkWithProfile[], Error>({
    queryKey: ["itemRemarks", itemId], // Query key includes the item ID
    queryFn: () => {
      if (!itemId) {
        // If no itemId, return empty array immediately
        return Promise.resolve([]);
      }
      return fetchItemRemarks(supabase, itemId);
    },
    enabled: !!itemId, // Only run the query if itemId is not null
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: true, // Optional: Refetch on window focus
  });
}

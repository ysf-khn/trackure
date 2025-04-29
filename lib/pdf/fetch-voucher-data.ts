import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
// import { Database } from 'types/supabase'; // Uncomment once types/supabase.ts is generated
import { VoucherData } from "@/components/pdf/VoucherTemplate"; // Import the interface

// Placeholder function to fetch data required for a voucher PDF
// This needs access to Supabase and likely the itemId
export async function fetchVoucherData(
  itemId: string
): Promise<VoucherData | null> {
  const cookieStore = cookies();
  // TODO: Use generated Database type from types/supabase.ts once available
  const supabase = createServerClient<any>( // Use <any> temporarily
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value; // Correct usage (may still show error)
        },
      },
    }
  );

  // TODO: Implement RBAC check - Ensure only Owner can fetch this data

  console.log(`Fetching voucher data for item ID: ${itemId}`);

  // Example Query (Needs refinement based on actual schema and required data):
  // Fetch item details, its order, and potentially its latest history entry
  const { data: itemData, error: itemError } = await supabase
    .from("items")
    .select(
      `
      id,
      item_master_id,
      order_id,
      item_master ( name ),
      orders ( order_number ),
      item_history (
        stage_id,
        sub_stage_id,
        created_at,
        notes,
        workflow_stages ( name ),
        workflow_sub_stages ( name )
      )
    `
    )
    .eq("id", itemId)
    // Order history to get the latest entry first
    .order("created_at", { referencedTable: "item_history", ascending: false })
    .limit(1, { referencedTable: "item_history" }) // Get only the latest history entry
    .single();

  if (itemError || !itemData) {
    console.error("Error fetching voucher data:", itemError);
    return null;
  }

  const latestHistory = itemData.item_history?.[0]; // Get the single latest history entry

  // --- Placeholder Data Structure ---
  const placeholderData: VoucherData = {
    itemId: itemData.id,
    itemName: itemData.item_master?.name ?? "Unknown Item",
    orderNumber: itemData.orders?.order_number ?? "N/A",
    stageName: latestHistory?.workflow_stages?.name ?? "Unknown Stage",
    subStageName: latestHistory?.workflow_sub_stages?.name, // Optional
    timestamp: latestHistory?.created_at ?? new Date().toISOString(),
    notes: latestHistory?.notes,
  };
  // --- End Placeholder ---

  // TODO: Replace placeholder data with actual transformed data from query

  return placeholderData;
}

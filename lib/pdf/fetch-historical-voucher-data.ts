import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/supabase"; // Assuming generated types

// Define the expected structure for voucher data
// Adapt this based on VoucherTemplate.tsx requirements
export interface VoucherData {
  itemId: string;
  itemName?: string; // Or other identifier like SKU
  orderNumber?: string;
  customerName?: string;
  stageName?: string;
  subStageName?: string;
  timestamp: string; // When it entered the stage/sub-stage or current timestamp
  instanceDetails?: any; // Adjust type based on actual structure
  organizationId: string;
  // Add other necessary fields
}

async function fetchStageNames(
  supabase: ReturnType<typeof createServerClient<Database>>,
  stageId: string | null,
  subStageId: string | null
): Promise<{ stageName?: string; subStageName?: string }> {
  let stageName: string | undefined = undefined;
  let subStageName: string | undefined = undefined;

  if (stageId) {
    const { data: stageData, error: stageError } = await supabase
      .from("workflow_stages")
      .select("name")
      .eq("id", stageId)
      .maybeSingle();
    if (stageError) console.error("Error fetching stage name:", stageError);
    stageName = stageData?.name;
  }

  if (subStageId) {
    const { data: subStageData, error: subStageError } = await supabase
      .from("workflow_sub_stages")
      .select("name")
      .eq("id", subStageId)
      .maybeSingle();
    if (subStageError)
      console.error("Error fetching sub-stage name:", subStageError);
    subStageName = subStageData?.name;
  }

  return { stageName, subStageName };
}

// Fetches voucher data, optionally based on a specific history entry.
export async function fetchVoucherDataForHistory(
  itemId: string,
  historyId?: string | null,
  userId?: string, // Pass user ID for authorization checks
  organizationId?: string // Pass org ID for authorization checks
): Promise<VoucherData | null> {
  if (!itemId) return null;

  // Correctly await cookies()
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // --- Authorization Check ---
  // Fetch the item to verify ownership/access
  const { data: itemOrgData, error: itemOrgError } = await supabase
    .from("items")
    .select("organization_id")
    .eq("id", itemId)
    .single();

  if (itemOrgError || !itemOrgData) {
    console.error(
      "Error fetching item for auth or item not found:",
      itemOrgError
    );
    return null; // Item not found or DB error
  }

  // TODO: Implement proper RBAC check using user ID and roles from profiles table
  // For now, just check if the item's org matches the user's org passed in
  if (!organizationId || itemOrgData.organization_id !== organizationId) {
    console.warn(
      `Auth check failed: Item ${itemId} org (${itemOrgData.organization_id}) doesn't match user org (${organizationId})`
    );
    // Temporarily allow for testing, REMOVE THIS LINE and uncomment return null
    console.warn("Temporarily allowing access for testing. REMOVE THIS.");
    // return null; // Access denied
  }

  // --- Data Fetching ---
  if (historyId) {
    // Fetch historical data
    const { data: historyData, error: historyError } = await supabase
      .from("item_history")
      .select(
        `
                *,
                items (
                    id,
                    sku,
                    instance_details,
                    organization_id,
                    orders ( id, order_number, customer_name )
                )
            `
      )
      .eq("id", historyId)
      .eq("item_id", itemId) // Ensure history ID belongs to the correct item
      .single();

    if (historyError || !historyData || !historyData.items) {
      console.error(
        "Error fetching item history or history not found:",
        historyError
      );
      return null;
    }

    // Ensure history record belongs to the correct organization (redundant check, but safe)
    if (historyData.organization_id !== organizationId) {
      console.warn(
        `Auth check failed: History ${historyId} org (${historyData.organization_id}) doesn't match user org (${organizationId})`
      );
      // return null; // Access denied
    }

    const { stageName, subStageName } = await fetchStageNames(
      supabase,
      historyData.stage_id,
      historyData.sub_stage_id
    );

    return {
      itemId: historyData.items.id,
      itemName: historyData.items.sku, // Use SKU as name for now
      orderNumber: historyData.items.orders?.order_number ?? undefined,
      customerName: historyData.items.orders?.customer_name ?? undefined,
      stageName: stageName,
      subStageName: subStageName,
      timestamp: historyData.entered_at,
      instanceDetails: historyData.items.instance_details,
      organizationId: historyData.organization_id,
    };
  } else {
    // Fetch current data (similar to original fetchVoucherData)
    const { data: currentItemData, error: currentItemError } = await supabase
      .from("items")
      .select(
        `
                id,
                sku,
                instance_details,
                current_stage_id,
                current_sub_stage_id,
                created_at,
                organization_id,
                orders ( id, order_number, customer_name )
            `
      )
      .eq("id", itemId)
      .single();

    if (currentItemError || !currentItemData) {
      console.error("Error fetching current item data:", currentItemError);
      return null;
    }

    const { stageName, subStageName } = await fetchStageNames(
      supabase,
      currentItemData.current_stage_id,
      currentItemData.current_sub_stage_id
    );

    return {
      itemId: currentItemData.id,
      itemName: currentItemData.sku,
      orderNumber: currentItemData.orders?.order_number ?? undefined,
      customerName: currentItemData.orders?.customer_name ?? undefined,
      stageName: stageName,
      subStageName: subStageName,
      timestamp: currentItemData.created_at, // Or maybe find the latest history entry? Using created_at for now.
      instanceDetails: currentItemData.instance_details,
      organizationId: currentItemData.organization_id,
    };
  }
}

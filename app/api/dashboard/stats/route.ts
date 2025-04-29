import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Define the response type
interface DashboardStatsResponse {
  activeItemsCount: number;
  activeOrdersCount: number;
  ordersNeedingPackagingInfoCount: number;
  reworkEventsLast7DaysCount: number;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Error fetching user:", userError);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch user profile and organization ID directly
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile:", profileError);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
  if (!profile || !profile.organization_id) {
    console.error("Profile or organization ID not found for user:", user.id);
    // Consider if this should be a 404 or handled differently
    return NextResponse.json(
      { error: "User profile incomplete or organization not assigned" },
      { status: 404 }
    );
  }

  const orgId = profile.organization_id;

  try {
    // Fetch Active Items Count
    const { count: activeItemsCount, error: itemsError } = await supabase
      .from("items")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .is("completed_at", null); // Item is active if not completed

    if (itemsError) throw itemsError;

    // Fetch Active Orders Count (Orders with at least one active item)
    // We need a specific query for this, possibly an RPC or a more complex join
    // Let's use an RPC function for efficiency if available, or build the query
    // For now, let's build the query using distinct order IDs from active items

    const { data: activeItemsWithOrders, error: activeOrdersError } =
      await supabase
        .from("items")
        .select("order_id") // Select the actual order_id
        .eq("organization_id", orgId)
        .is("completed_at", null)
        .not("order_id", "is", null); // Correctly filter for non-null order_ids

    if (activeOrdersError) throw activeOrdersError;

    // Count distinct order IDs from the fetched items
    const activeOrdersCount = new Set(
      activeItemsWithOrders?.map((item) => item.order_id)
    ).size;

    // --- New Stat: Orders Needing Packaging Info ---
    // TODO: Requires schema changes (e.g., workflow_stages.requires_packaging_info boolean, items.packaging_info_set_at timestamp)
    //       Temporarily setting to 0.
    // // 1. Find stages requiring packaging info
    // const { data: packagingStages, error: stagesError } = await supabase
    //   .from("workflow_stages")
    //   .select("id")
    //   .eq("organization_id", orgId)
    //   .eq("requires_packaging_info", true);
    //
    // if (stagesError)
    //   throw new Error(`Packaging Stages Fetch Error: ${stagesError.message}`);
    //
    // const packagingStageIds = packagingStages?.map((stage) => stage.id) ?? [];
    const ordersNeedingPackagingInfoCount = 0;
    //
    // // 2. Count items in those stages without packaging info set
    // if (packagingStageIds.length > 0) {
    //   const { count, error: packagingItemsError } = await supabase
    //     .from("items")
    //     .select("*", { count: "exact", head: true })
    //     .eq("organization_id", orgId)
    //     .is("completed_at", null)
    //     .in("current_stage_id", packagingStageIds)
    //     .is("packaging_info_set_at", null); // Assuming this column exists
    //
    //   if (packagingItemsError)
    //     throw new Error(
    //       `Packaging Items Count Error: ${packagingItemsError.message}`
    //     );
    //   ordersNeedingPackagingInfoCount = count ?? 0;
    // }

    // --- New Stat: Rework Events (Last 7 Days) ---
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    // Corrected to use item_history table and rework_reason column
    const { count: reworkCount, error: reworkError } = await supabase
      .from("item_history") // Correct table
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .not("rework_reason", "is", null) // Check if rework_reason is populated
      .gte("entered_at", sevenDaysAgoISO); // Assuming entered_at reflects the rework time

    if (reworkError)
      throw new Error(`Rework Count Error: ${reworkError.message}`);

    const responsePayload: DashboardStatsResponse = {
      activeItemsCount: activeItemsCount ?? 0,
      activeOrdersCount: activeOrdersCount ?? 0,
      ordersNeedingPackagingInfoCount: ordersNeedingPackagingInfoCount, // Already handled null case
      reworkEventsLast7DaysCount: reworkCount ?? 0,
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics", details: message },
      { status: 500 }
    );
  }
}

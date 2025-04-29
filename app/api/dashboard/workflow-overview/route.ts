import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
    return NextResponse.json(
      { error: "User profile incomplete or organization not assigned" },
      { status: 404 }
    );
  }

  const orgId = profile.organization_id;

  try {
    // Fetch workflow stages with item counts
    const { data, error } = await supabase
      .from("workflow_stages")
      .select(
        `
        id,
        name,
        items!left(count)
      `
      )
      .eq("organization_id", orgId)
      // Apply the filter on the joined items table as well
      .eq("items.organization_id", orgId)
      // We only want counts of *active* items, so filter out completed ones
      .is("items.completed_at", null)
      .order("sequence_order", { ascending: true });

    if (error) throw error;

    // Format the data to match the expected structure { id, name, item_count }
    const formattedData = data.map((stage) => ({
      id: stage.id,
      name: stage.name,
      // Supabase returns the count within an array on the joined table object
      item_count: stage.items[0]?.count ?? 0,
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Error fetching workflow overview:", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch workflow overview", details: message },
      { status: 500 }
    );
  }
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
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
    return NextResponse.json(
      { error: "User profile incomplete or organization not assigned" },
      { status: 404 }
    );
  }

  const orgId = profile.organization_id;

  try {
    // Call the RPC function
    const { data, error } = await supabase.rpc("get_bottleneck_items", {
      p_org_id: orgId,
      p_limit: 10, // Fetch top 10 bottlenecks
    });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching bottleneck items:", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch bottleneck items", details: message },
      { status: 500 }
    );
  }
}

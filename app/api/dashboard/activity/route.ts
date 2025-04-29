import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
// import { cookies } from "next/headers";

// Define the structure of an activity item
const ActivityItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.string().datetime(), // ISO 8601 format
  detail: z.string().nullable(),
  link: z.string().nullable().optional(), // Optional link for navigation
});

export type ActivityItem = z.infer<typeof ActivityItemSchema>;

// Define the response structure
const ActivityResponseSchema = z.object({
  activity: z.array(ActivityItemSchema),
});

const MAX_ACTIVITY_ITEMS = 15; // Limit the number of items fetched

export async function GET() {
  // Remove cookieStore constant
  // const cookieStore = cookies();
  // Correct the createClient call
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's organization ID (assuming it's stored in user_metadata or a profile table)
    // Adapt this based on your actual user profile structure
    const { data: profile, error: profileError } = await supabase
      .from("profiles") // Assuming a 'profiles' table linked to auth.users
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || !profile.organization_id) {
      console.error(
        "Profile fetch error or missing organization ID:",
        profileError
      );
      // Handle cases where organization_id might be missing, depending on your setup
      // Might return an empty list or a specific error
      return NextResponse.json({ activity: [] });
      // Or: return NextResponse.json({ error: 'Organization not found or profile error' }, { status: 500 });
    }

    const organizationId = profile.organization_id;

    // --- Fetch Recent Activities ---
    // This uses UNION ALL as described in the plan. Consider performance for large datasets.
    // A dedicated activity log table might scale better.

    const { data: activityData, error: activityError } = await supabase.rpc(
      "get_recent_activity", // Assuming a Postgres function handles the UNION ALL
      {
        org_id: organizationId,
        limit_count: MAX_ACTIVITY_ITEMS,
      }
    );

    if (activityError) {
      console.error("Error fetching recent activity:", activityError);
      return NextResponse.json(
        { error: "Failed to fetch activity" },
        { status: 500 }
      );
    }

    // Validate the fetched data against the schema
    const parsedActivity = ActivityResponseSchema.parse({
      activity: activityData || [],
    });

    return NextResponse.json(parsedActivity);
  } catch (error) {
    console.error("Unexpected error in /api/dashboard/activity:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid data format received from database.",
          details: error.errors,
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// ---- PostgreSQL Function (get_recent_activity) ----
/*
 You'll need to create this function in your Supabase SQL editor:

 CREATE OR REPLACE FUNCTION get_recent_activity(org_id UUID, limit_count INT)
 RETURNS TABLE(id TEXT, type TEXT, "timestamp" TEXT, detail TEXT, link TEXT)
 LANGUAGE sql
 AS $$
    WITH CombinedActivity AS (
        -- Order Creations
        SELECT
            o.id::TEXT,
            'Order Created' AS type,
            to_json(o.created_at)::TEXT AS "timestamp",
            '#' || o.order_number AS detail,
            '/orders/' || o.id::TEXT AS link
        FROM orders o
        WHERE o.organization_id = org_id
        ORDER BY o.created_at DESC
        LIMIT limit_count -- Apply limit early if possible

        UNION ALL

        -- Item Movements / Actions (from item_history)
        SELECT
            ih.id::TEXT,
            ih.action_taken AS type,
            to_json(ih.entered_at)::TEXT AS "timestamp",
            COALESCE(i.sku, i.id::TEXT) AS detail, -- Show SKU if available, else Item ID
            '/items/' || ih.item_id::TEXT AS link
        FROM item_history ih
        JOIN items i ON ih.item_id = i.id -- Join to get item details like SKU
        WHERE ih.organization_id = org_id AND ih.action_taken IS NOT NULL AND ih.action_taken != '' -- Filter specific actions if needed
        ORDER BY ih.entered_at DESC
        LIMIT limit_count -- Apply limit early if possible

        UNION ALL

        -- Remarks Added
        SELECT
            r.id::TEXT,
            'Remark Added' AS type,
            to_json(r."timestamp")::TEXT AS "timestamp",
            COALESCE(i.sku, i.id::TEXT) AS detail, -- Show SKU if available
             '/items/' || r.item_id::TEXT || '#remarks' AS link -- Link to item, potentially navigating to remarks section
        FROM remarks r
        JOIN items i ON r.item_id = i.id -- Join to get item details like SKU
        WHERE r.organization_id = org_id
        ORDER BY r."timestamp" DESC
        LIMIT limit_count -- Apply limit early if possible
    )
    SELECT *
    FROM CombinedActivity
    ORDER BY timestamp DESC
    LIMIT limit_count; -- Final overall limit
 $$;

 -- Make sure the function is owned by postgres or a role supabase_admin can assume
 -- Grant execute permission to the authenticated role (or service_role if called from server)
 -- GRANT EXECUTE ON FUNCTION get_recent_activity(UUID, INT) TO authenticated;

*/

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Zod schema for input validation
const reworkInputSchema = z.object({
  item_ids: z
    .array(z.string().uuid())
    .min(1, "At least one item ID is required."),
  rework_stage_id: z.string().uuid("Invalid Rework Stage ID format."),
  rework_sub_stage_id: z
    .string()
    .uuid("Invalid Rework Sub Stage ID format.")
    .optional()
    .nullable(), // Allow optional sub-stage
  rework_reason: z
    .string()
    .min(3, "Rework reason must be at least 3 characters long."),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // --- Start: Standard Auth & Profile Fetch --- //
  const { data: authData, error: authError } = await supabase.auth.getUser();

  // Check for auth error first
  if (authError) {
    console.error("Auth Error [Rework]:", authError);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    ); // Use 500 for server-side auth issues
  }
  // Check for user second
  if (!authData.user) {
    console.error("Auth Error [Rework]: No user found");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // User is guaranteed to exist here
  const user = authData.user;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id, role") // Fetch role for RBAC
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.organization_id || !profile.role) {
    console.error(
      `Profile Error/Missing Data [Rework] for user ${user.id}:`,
      profileError?.message
    );
    return NextResponse.json(
      {
        error:
          profileError?.message ||
          "Unauthorized: User profile, organization, or role mapping not found.",
      },
      { status: 401 }
    );
  }
  const orgId = profile.organization_id;
  const userRole = profile.role;
  // --- End: Standard Auth & Profile Fetch --- //

  // RBAC Check: Only 'Owner' can perform rework actions
  if (userRole !== "Owner") {
    console.warn(
      `User ${user.id} with role ${userRole} attempted rework action.`
    );
    return NextResponse.json(
      { error: "Forbidden: Insufficient permissions" },
      { status: 403 }
    );
  }

  // Validate request body
  const parseResult = await reworkInputSchema.safeParseAsync(
    await request.json()
  );

  if (!parseResult.success) {
    console.error("Validation Error [Rework]:", parseResult.error.format());
    return NextResponse.json(
      { error: "Invalid input", details: parseResult.error.format() },
      { status: 400 }
    );
  }

  const { item_ids, rework_stage_id, rework_sub_stage_id, rework_reason } =
    parseResult.data;

  try {
    // Use a Supabase transaction (RPC function) to ensure atomicity
    const { error: rpcError } = await supabase.rpc("process_rework_items", {
      p_item_ids: item_ids,
      p_rework_stage_id: rework_stage_id,
      // Ensure null is passed if undefined/null, otherwise pass the value
      p_rework_sub_stage_id: rework_sub_stage_id ?? null,
      p_rework_reason: rework_reason,
      p_user_id: user.id,
      p_organization_id: orgId,
    });

    if (rpcError) {
      console.error("RPC Error [process_rework_items]:", rpcError);
      // Consider more specific error handling based on rpcError details if needed
      return NextResponse.json(
        { error: "Failed to process rework.", details: rpcError.message },
        { status: 500 }
      );
    }

    // Success response
    return NextResponse.json({
      message: "Items successfully moved to rework.",
    });
  } catch (error) {
    console.error("Unexpected Error [Rework]:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}

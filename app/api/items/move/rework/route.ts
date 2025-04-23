import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { determinePreviousStage } from "@/lib/workflow-utils";
import type { WorkflowStage } from "@/lib/workflow-utils";

// Zod schema for input validation
const reworkInputSchema = z.object({
  item_ids: z
    .array(z.string().uuid())
    .min(1, "At least one item ID is required."),
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

  const { item_ids, rework_reason } = parseResult.data;

  try {
    // Fetch workflow configuration for the organization once
    const { data: workflowStagesData, error: workflowError } = await supabase
      .from("workflow_stages")
      .select(
        `
            id,
            sequence_order,
            sub_stages:workflow_sub_stages ( id, sequence_order )
        `
      )
      .eq("organization_id", orgId) // Use orgId from profile
      .order("sequence_order", { ascending: true })
      .order("sequence_order", {
        foreignTable: "workflow_sub_stages",
        ascending: true,
      });

    if (workflowError || !workflowStagesData) {
      console.error("Rework Workflow Fetch Error:", workflowError);
      return NextResponse.json(
        { error: "Failed to fetch workflow configuration." },
        { status: 500 }
      );
    }
    // Cast to the correct type expected by determinePreviousStage
    const workflowStages = workflowStagesData as WorkflowStage[];

    // --- Loop Start (Similar to 'forward' route) ---
    const results = [];
    const errors = [];

    for (const itemId of item_ids) {
      // Fetch current item state
      const { data: item, error: itemError } = await supabase
        .from("items")
        .select("id, current_stage_id, current_sub_stage_id")
        .eq("id", itemId)
        .eq("organization_id", orgId) // Ensure item belongs to the org
        .single();

      if (itemError || !item) {
        console.warn(
          `Rework: Item ${itemId} not found or error fetching.`,
          itemError
        );
        errors.push({ itemId, error: `Item not found or cannot be accessed.` });
        continue; // Skip to the next item
      }

      if (!item.current_stage_id) {
        console.warn(
          `Rework: Item ${itemId} has no current stage ID. Cannot determine previous stage.`
        );
        errors.push({ itemId, error: `Item has no current stage ID.` });
        continue;
      }

      // Determine the previous stage/sub-stage
      const previousLocation = determinePreviousStage(
        item.current_stage_id,
        item.current_sub_stage_id,
        workflowStages
      );

      if (!previousLocation) {
        errors.push({
          itemId,
          error:
            "Cannot determine previous stage (possibly already at the start or workflow misconfiguration).",
        });
        continue;
      }

      const timestamp = new Date().toISOString();

      // Find the latest history entry for this item to update exit time
      const { data: latestHistory, error: historyFetchError } = await supabase
        .from("item_history")
        .select("id")
        .eq("item_id", itemId)
        .order("entered_at", { ascending: false })
        .limit(1)
        .single();

      // Update previous history entry's exit time (if found)
      if (latestHistory && !historyFetchError) {
        const { error: historyUpdateError } = await supabase
          .from("item_history")
          .update({ exited_at: timestamp })
          .eq("id", latestHistory.id);

        if (historyUpdateError) {
          console.error(
            `Rework: Error updating exit time for history ${latestHistory.id}`,
            historyUpdateError
          );
          errors.push({
            itemId,
            error: `Failed to update previous history record.`,
          });
          continue; // Stop processing this item on critical failure
        }
      } else if (historyFetchError && historyFetchError.code !== "PGRST116") {
        // PGRST116: Single row not found (should not happen if item exists unless history is missing)
        console.error(
          `Rework: Error fetching latest history for item ${itemId}`,
          historyFetchError
        );
        errors.push({ itemId, error: `Failed to fetch history.` });
        continue;
      }

      // Update the item's current stage to the previous location
      const { error: itemUpdateError } = await supabase
        .from("items")
        .update({
          current_stage_id: previousLocation.stageId,
          current_sub_stage_id: previousLocation.subStageId,
          // Optionally update status or other fields if needed for rework
        })
        .eq("id", itemId);

      if (itemUpdateError) {
        console.error(`Rework: Error updating item ${itemId}`, itemUpdateError);
        errors.push({ itemId, error: `Failed to update item stage.` });
        continue; // Stop processing this item
      }

      // Insert new history record for entering the rework stage
      const { error: historyInsertError } = await supabase
        .from("item_history")
        .insert({
          item_id: itemId,
          stage_id: previousLocation.stageId,
          sub_stage_id: previousLocation.subStageId,
          entered_at: timestamp,
          user_id: user.id,
          rework_reason: rework_reason, // Store the rework reason
          organization_id: orgId, // Ensure history is tied to org
        });

      if (historyInsertError) {
        console.error(
          `Rework: Error inserting new history for item ${itemId}`,
          historyInsertError
        );
        errors.push({ itemId, error: `Failed to log new history record.` });
        continue; // Stop processing this item
      }

      results.push({
        itemId,
        status: "success",
        previousStageId: previousLocation.stageId,
        previousSubStageId: previousLocation.subStageId,
      });
    }
    // --- Loop End ---

    // Return results (similar to 'forward' route)
    if (errors.length > 0) {
      return NextResponse.json(
        {
          message: `Processed ${item_ids.length} items for rework. Success: ${results.length}, Failures: ${errors.length}.`,
          results,
          errors,
        },
        { status: errors.length === item_ids.length ? 500 : 207 } // 207 Multi-Status
      );
    }

    return NextResponse.json(
      {
        message: `Successfully sent back ${results.length} items for rework.`,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected Error [Rework]:", error);
    // Ensure error is an instance of Error before accessing message
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "An unexpected server error occurred.", details: errorMessage },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { determineNextStage, WorkflowStage } from "@/lib/workflow-utils";

// Use the specific type from the utils file if needed, or define locally
// type FetchedStage = {
//   id: string;
//   sequence_order: number;
//   sub_stages: { id: string; sequence_order: number }[];
// };

// Define the expected request body schema
const moveForwardSchema = z.object({
  item_ids: z
    .array(z.string().uuid())
    .min(1, "At least one item ID is required."),
  target_stage_id: z.string().uuid().optional().nullable(), // Optional target stage
});

export async function POST(request: Request) {
  // const cookieStore = cookies();
  const supabase = await createClient();

  // 1. Verify Authentication & Authorization
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("Move Forward Auth Error:", authError);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch user profile to get organization_id and role (adjust table/column names)
  const { data: profile, error: profileError } = await supabase
    .from("profiles") // Assuming 'profiles' table stores org and role
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("Move Forward Profile Error:", profileError);
    return NextResponse.json(
      { error: "User profile not found or error fetching it." },
      { status: 403 }
    );
  }

  // RBAC Check: Ensure user role has permission (adjust roles as needed)
  if (!["Owner", "Worker"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Forbidden: Insufficient permissions." },
      { status: 403 }
    );
  }

  const organizationId = profile.organization_id;

  // 2. Validate Request Body
  const body = await request.json();
  const validation = moveForwardSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid input.", details: validation.error.format() },
      { status: 400 }
    );
  }

  const { item_ids, target_stage_id } = validation.data;

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
      .eq("organization_id", organizationId)
      .order("sequence_order", { ascending: true })
      .order("sequence_order", {
        foreignTable: "workflow_sub_stages",
        ascending: true,
      });

    if (workflowError || !workflowStagesData) {
      console.error("Move Forward Workflow Fetch Error:", workflowError);
      return NextResponse.json(
        { error: "Failed to fetch workflow configuration." },
        { status: 500 }
      );
    }

    // Ensure sub_stages is always an array and cast to the expected type
    const workflowStages: WorkflowStage[] = workflowStagesData.map((stage) => ({
      ...stage,
      sub_stages: stage.sub_stages || [],
    }));

    // --- Transaction Start ---
    // Note: Supabase JS client doesn't have built-in transactions across multiple awaits easily.
    // We'll perform operations sequentially. For true atomicity, a db function/Edge Function might be better.
    // Consider this a pseudo-transaction; if one fails, prior successful ones aren't rolled back automatically here.

    const results = [];
    const errors = [];

    for (const itemId of item_ids) {
      // Fetch current item state
      const { data: item, error: itemError } = await supabase
        .from("items")
        .select("id, current_stage_id, current_sub_stage_id")
        .eq("id", itemId)
        .eq("organization_id", organizationId) // Ensure item belongs to the org
        .single();

      if (itemError || !item) {
        console.warn(
          `Move Forward: Item ${itemId} not found or error fetching.`,
          itemError
        );
        errors.push({ itemId, error: `Item not found or cannot be accessed.` });
        continue; // Skip to the next item
      }

      let nextLocation: { stageId: string; subStageId: string | null } | null =
        null;

      // --- Determine Target Location --- //
      if (target_stage_id) {
        // Validate the target_stage_id
        const currentStageIndex = workflowStages.findIndex(
          (s) => s.id === item.current_stage_id
        );
        const targetStageIndex = workflowStages.findIndex(
          (s) => s.id === target_stage_id
        );

        if (targetStageIndex === -1) {
          errors.push({
            itemId,
            error: `Target stage ID ${target_stage_id} not found in workflow.`,
          });
          continue;
        }

        if (currentStageIndex === -1) {
          errors.push({
            itemId,
            error: `Current stage ID ${item.current_stage_id} not found for item.`,
          });
          continue;
        }

        // Ensure target stage is AFTER the current stage
        if (targetStageIndex <= currentStageIndex) {
          errors.push({
            itemId,
            error: `Target stage ${target_stage_id} is not after the current stage ${item.current_stage_id}.`,
          });
          continue;
        }

        // Target is valid, determine its first sub-stage (if any)
        const targetStage = workflowStages[targetStageIndex];
        const targetSubStages = targetStage.sub_stages ?? [];
        const nextSubStageId =
          targetSubStages.length > 0 ? targetSubStages[0].id : null;

        nextLocation = {
          stageId: target_stage_id,
          subStageId: nextSubStageId,
        };
      } else {
        // No target_stage_id provided, use the default next stage logic
        nextLocation = determineNextStage(
          item.current_stage_id,
          item.current_sub_stage_id,
          workflowStages // Use the formatted workflow stages
        );
      }
      // --- End Determine Target Location --- //

      if (!nextLocation) {
        errors.push({
          itemId,
          error:
            "Cannot determine next stage (possibly already at the end or workflow misconfiguration).",
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
            `Move Forward: Error updating exit time for history ${latestHistory.id}`,
            historyUpdateError
          );
          errors.push({
            itemId,
            error: `Failed to update previous history record.`,
          });
          continue; // Stop processing this item on critical failure
        }
      } else if (historyFetchError && historyFetchError.code !== "PGRST116") {
        // PGRST116: Single row not found (okay if it's the first move)
        console.error(
          `Move Forward: Error fetching latest history for item ${itemId}`,
          historyFetchError
        );
        errors.push({ itemId, error: `Failed to fetch history.` });
        continue;
      }

      // Update the item's current stage
      const { error: itemUpdateError } = await supabase
        .from("items")
        .update({
          current_stage_id: nextLocation.stageId,
          current_sub_stage_id: nextLocation.subStageId, // Will be null if moving to a stage without sub-stages
        })
        .eq("id", itemId);

      if (itemUpdateError) {
        console.error(
          `Move Forward: Error updating item ${itemId}`,
          itemUpdateError
        );
        // Attempt to rollback history update? Difficult without transactions. Log and report error.
        errors.push({ itemId, error: `Failed to update item stage.` });
        continue; // Stop processing this item
      }

      // Insert new history record for entering the new stage
      const { error: historyInsertError } = await supabase
        .from("item_history")
        .insert({
          item_id: itemId,
          stage_id: nextLocation.stageId,
          sub_stage_id: nextLocation.subStageId,
          entered_at: timestamp,
          user_id: user.id,
          //   action_taken: "Moved Forward",
          organization_id: organizationId, // Ensure history is tied to org
        });

      if (historyInsertError) {
        console.error(
          `Move Forward: Error inserting new history for item ${itemId}`,
          historyInsertError
        );
        // Critical inconsistency. Log and report error. Consider manual cleanup/alerting.
        errors.push({ itemId, error: `Failed to log new history record.` });
        continue; // Stop processing this item
      }

      results.push({
        itemId,
        status: "success",
        nextStageId: nextLocation.stageId,
        nextSubStageId: nextLocation.subStageId,
      });
    }

    // --- Pseudo-Transaction End ---

    if (errors.length > 0) {
      // Partial success or total failure
      return NextResponse.json(
        {
          message: `Processed ${item_ids.length} items. Success: ${results.length}, Failures: ${errors.length}.`,
          results,
          errors,
        },
        { status: errors.length === item_ids.length ? 500 : 207 }
      ); // 207 Multi-Status if partially successful
    }

    return NextResponse.json(
      {
        message: `Successfully moved ${results.length} items.`,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Move Forward Unhandled Error:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}

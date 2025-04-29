/// <reference types="https://deno.land/x/deno/cli/types/deno.d.ts" />

import {
  serve,
  ServerRequest,
} from "https://deno.land/std@0.177.0/http/server.ts";
import {
  createClient,
  SupabaseClient,
  // PostgrestError, // Example if needed for specific error handling
} from "https://esm.sh/@supabase/supabase-js@2.43.2";
import { Database } from "../../../types/supabase.ts"; // Adjust path as needed
import { sendPackagingReminder } from "../../../lib/email/send-packaging-reminder.ts"; // Adjust path as needed

// Define Profile type subset needed here
type ProfileEmail = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "email"
>;

// Helper function to get Owner emails for an organization
async function getOwnerEmails(
  supabaseAdmin: SupabaseClient<Database>,
  organizationId: string
): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("email") // Select only the email column
    .eq("organization_id", organizationId)
    .eq("role", "Owner");

  if (error) {
    console.error(
      `Error fetching owner emails for org ${organizationId}:`,
      error.message
    );
    return [];
  }
  // Explicitly type map parameter and filter non-null/non-empty emails
  return (
    data
      ?.map((p: ProfileEmail) => p.email)
      .filter(
        (email: string | null): email is string =>
          !!email && email.trim() !== ""
      ) || []
  );
}

// Helper to get stage/sub-stage names (optional but good for context)
async function getTriggerNames(
  supabaseAdmin: SupabaseClient<Database>,
  stageId: string | null,
  subStageId: string | null
): Promise<{ stageName: string | null; subStageName: string | null }> {
  let stageName: string | null = null;
  let subStageName: string | null = null;

  if (stageId) {
    const { data: stageData, error: stageError } = await supabaseAdmin
      .from("workflow_stages")
      .select("name")
      .eq("id", stageId)
      .single();
    if (stageError) {
      console.warn(
        `Error fetching stage name for ID ${stageId}:`,
        stageError.message
      );
    } else {
      stageName = stageData?.name ?? null;
    }
  }

  if (subStageId) {
    const { data: subStageData, error: subStageError } = await supabaseAdmin
      .from("workflow_sub_stages")
      .select("name, parent_stage_id") // Fetch parent ID if stage ID wasn't the trigger
      .eq("id", subStageId)
      .single();

    if (subStageError) {
      console.warn(
        `Error fetching sub-stage name for ID ${subStageId}:`,
        subStageError.message
      );
    } else {
      subStageName = subStageData?.name ?? null;
      // If trigger was sub-stage only, try fetching parent stage name for context
      if (!stageName && subStageData?.parent_stage_id) {
        const { data: parentStageData, error: parentStageError } =
          await supabaseAdmin
            .from("workflow_stages")
            .select("name")
            .eq("id", subStageData.parent_stage_id)
            .single();
        if (!parentStageError) {
          stageName = parentStageData?.name ?? null;
        }
      }
    }
  }
  return { stageName, subStageName };
}

serve(async (_req: ServerRequest) => {
  console.log("Packaging Reminder Cron Job Started");

  // Ensure this function is called via Supabase schedule (check header if needed)
  // Example: Check for a specific header set by Supabase Functions or a secret
  // const authHeader = req.headers.get('Authorization');
  // if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_FUNCTION_SECRET')}`) {
  //   return new Response("Unauthorized", { status: 401 });
  // }

  try {
    // IMPORTANT: Use the Admin client for cron jobs
    const supabaseAdmin: SupabaseClient<Database> = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", // Use Service Role Key
      {
        auth: {
          // Required for admin client
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 1. Fetch orders needing reminders
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select(
        "id, organization_id, required_packaging_materials, packaging_reminder_trigger_stage_id, packaging_reminder_trigger_sub_stage_id, order_number"
      )
      .eq("packaging_reminder_sent", false)
      .or(
        "packaging_reminder_trigger_stage_id.not.is.null,packaging_reminder_trigger_sub_stage_id.not.is.null"
      );

    if (ordersError) {
      console.error("Error fetching orders:", ordersError.message);
      throw ordersError;
    }

    if (!orders || orders.length === 0) {
      console.log("No orders found needing packaging reminders.");
      return new Response(JSON.stringify({ message: "No orders to process" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found ${orders.length} orders to check.`);
    let remindersSent = 0;
    let remindersFailed = 0;

    // 2. Process each order
    for (const order of orders) {
      if (!order.organization_id) {
        console.warn(`Order ${order.id} is missing organization_id. Skipping.`);
        continue;
      }

      // 3. Check if any item in the order reached the trigger state
      const triggerStageId = order.packaging_reminder_trigger_stage_id;
      const triggerSubStageId = order.packaging_reminder_trigger_sub_stage_id;

      // Build the query dynamically based on which trigger is set
      let itemQuery = supabaseAdmin
        .from("items")
        .select("id", { count: "exact", head: true }) // Just need the count
        .eq("order_id", order.id);

      if (triggerSubStageId) {
        // If sub-stage trigger is set, that's the primary condition
        itemQuery = itemQuery.eq("current_sub_stage_id", triggerSubStageId);
      } else if (triggerStageId) {
        // Otherwise, if stage trigger is set, use that
        itemQuery = itemQuery.eq("current_stage_id", triggerStageId);
        // Optionally, ensure it doesn't have a sub-stage if only stage is the trigger?
        // itemQuery = itemQuery.is('current_sub_stage_id', null);
      }

      const { count: itemCount, error: itemError } = await itemQuery;

      if (itemError) {
        console.error(
          `Error checking items for order ${order.id}:`,
          itemError.message
        );
        continue; // Skip to next order on error
      }

      // 4. If item(s) are in the trigger state, send reminder
      if (itemCount !== null && itemCount > 0) {
        console.log(`Trigger condition met for order ${order.id}.`);

        // Fetch owner emails
        const ownerEmails = await getOwnerEmails(
          supabaseAdmin,
          order.organization_id
        );

        if (ownerEmails.length === 0) {
          console.warn(
            `No owner emails found for org ${order.organization_id} (Order ID: ${order.id}). Cannot send reminder.`
          );
          continue; // Skip if no recipients
        }

        // Get trigger names for context
        const { stageName, subStageName } = await getTriggerNames(
          supabaseAdmin,
          triggerStageId,
          triggerSubStageId
        );

        // Send email
        const emailResult = await sendPackagingReminder({
          recipientEmails: ownerEmails,
          orderNumber: order.order_number ?? `ID ${order.id}`, // Fallback if number missing
          requiredMaterials: order.required_packaging_materials,
          triggerStageName: stageName,
          triggerSubStageName: subStageName,
        });

        if (emailResult.success) {
          remindersSent++;
          // 5. Update the order flag
          const { error: updateError } = await supabaseAdmin
            .from("orders")
            .update({ packaging_reminder_sent: true })
            .eq("id", order.id);

          if (updateError) {
            console.error(
              `Failed to update packaging_reminder_sent flag for order ${order.id}:`,
              updateError.message
            );
            // Decide if this counts as a full failure? Email was sent.
            remindersFailed++; // Count as failed if flag update fails
          }
        } else {
          console.error(
            `Failed to send reminder for order ${order.id}: ${emailResult.error}`
          );
          remindersFailed++;
        }
      }
    }

    const message = `Cron job finished. Reminders Sent: ${remindersSent}, Failed: ${remindersFailed}.`;
    console.log(message);
    return new Response(JSON.stringify({ message }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Cron Job Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});

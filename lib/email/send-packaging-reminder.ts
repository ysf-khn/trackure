import { Resend } from "resend";

// Ensure RESEND_API_KEY is set in your environment variables
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Define the sender email address - Should be a verified domain in Resend
const SENDER_EMAIL = process.env.EMAIL_SENDER || "onboarding@resend.dev"; // Fallback for safety

interface SendPackagingReminderParams {
  recipientEmails: string[];
  orderNumber: string;
  requiredMaterials: string[] | null;
  triggerStageName?: string | null; // Optional context
  triggerSubStageName?: string | null; // Optional context
}

export async function sendPackagingReminder({
  recipientEmails,
  orderNumber,
  requiredMaterials,
  triggerStageName,
  triggerSubStageName,
}: SendPackagingReminderParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error(
      "Resend API key not configured. Cannot send packaging reminder."
    );
    return {
      success: false,
      error: "Resend API key not configured.",
    };
  }

  if (!recipientEmails || recipientEmails.length === 0) {
    console.warn(
      `No recipient emails provided for order ${orderNumber} packaging reminder.`
    );
    return { success: true }; // Not an error, just nothing to send
  }

  const subject = `Packaging Reminder for Order #${orderNumber}`;

  let triggerContext = "";
  if (triggerSubStageName) {
    triggerContext = `when an item entered sub-stage: ${triggerSubStageName}`;
    if (triggerStageName) {
      triggerContext += ` (within stage: ${triggerStageName})`;
    }
  } else if (triggerStageName) {
    triggerContext = `when an item entered stage: ${triggerStageName}`;
  }

  const materialsList = requiredMaterials?.length
    ? `\n\nRequired Materials:\n- ${requiredMaterials.join("\n- ")}`
    : "\n\nNo specific packaging materials listed for this order.";

  const body = `This is a reminder to prepare packaging for Order #${orderNumber}.${triggerContext ? ` This reminder was triggered ${triggerContext}.` : ""}${materialsList}`;

  try {
    const { data, error } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: recipientEmails, // Resend handles sending to multiple recipients
      subject: subject,
      text: body, // Using text email for simplicity
      // html: `<p>${body.replace(/\n/g, "<br>")}</p>`, // Optional HTML version
    });

    if (error) {
      console.error(
        `Resend API error sending reminder for order ${orderNumber}:`,
        error
      );
      return {
        success: false,
        error: error.message || "Failed to send email via Resend",
      };
    }

    console.log(
      `Packaging reminder sent successfully for order ${orderNumber} to ${recipientEmails.join(", ")}. Resend ID: ${data?.id}`
    );
    return { success: true };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(
      `Failed to send packaging reminder email for order ${orderNumber}:`,
      errorMessage
    );
    return { success: false, error: errorMessage };
  }
}

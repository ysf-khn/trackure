import { NextResponse } from "next/server";
import { cookies } from "next/headers"; // Import cookies
import { createServerClient, type CookieOptions } from "@supabase/ssr"; // Use createServerClient
import { getWorkflowStructure } from "@/lib/queries/workflow";
import { type WorkflowStructure } from "@/lib/queries/workflow"; // Import the type

export const dynamic = "force-dynamic"; // Ensure it runs dynamically per request

export async function GET() {
  const cookieStore = await cookies(); // Await the cookies()

  // Create the server client directly in the route handler
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // Add set and remove if needed for this route, otherwise they can be omitted
        // if only reading data. For consistency or potential future use:
        set(name: string, value: string, options: CookieOptions) {
          // In Route Handlers, you might want to await this
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          // In Route Handlers, you might want to await this
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  try {
    // Pass the created client to the function
    const workflowData: WorkflowStructure = await getWorkflowStructure(
      supabase
    );
    return NextResponse.json(workflowData);
  } catch (error) {
    console.error("API Error fetching workflow:", error);
    // Determine a more specific error message if possible
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch workflow structure";
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

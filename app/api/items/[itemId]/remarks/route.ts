import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

// Zod schema for request body validation
const addRemarkSchema = z.object({
  text: z.string().min(1, "Remark text cannot be empty").max(1000),
});

export async function POST(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error: unknown) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            if (error instanceof Error) {
              console.error("Error setting cookie:", error.message);
            } else {
              console.error("An unknown error occurred while setting cookie");
            }
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (error: unknown) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            if (error instanceof Error) {
              console.error("Error removing cookie:", error.message);
            } else {
              console.error("An unknown error occurred while removing cookie");
            }
          }
        },
      },
    }
  );
  const { itemId } = await params;

  // 1. Validate user session
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate request body
  let validatedData;
  try {
    const body = await request.json();
    validatedData = addRemarkSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid request body", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Could not parse request body" },
      { status: 400 }
    );
  }

  // 3. Fetch organization_id from the user's profile (or item)
  //    Assuming user profile has organization_id. Adjust if needed.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id, role") // Fetch role for potential future RBAC checks
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !profile.organization_id) {
    console.error("Error fetching profile or organization ID:", profileError);
    return NextResponse.json(
      { message: "Could not verify user organization" },
      { status: 500 }
    );
  }

  // 4. RBAC Check: Allow both 'Owner' and 'Worker' as per requirements
  // No explicit block here, as both roles are permitted to add remarks.
  // We check the role exists to ensure profile data is valid.
  if (!profile.role) {
    console.error("User profile missing role for RBAC check");
    return NextResponse.json(
      { message: "User role not found" },
      { status: 500 }
    );
  }

  // 5. Check if item belongs to the user's organization
  //    This implicitly enforces multi-tenancy via RLS if RLS is set up correctly on 'items' table.
  //    However, an explicit check adds another layer of security.
  const { data: itemData, error: itemError } = await supabase
    .from("items")
    .select("id")
    .eq("id", itemId)
    .eq("organization_id", profile.organization_id)
    .maybeSingle(); // Use maybeSingle to handle case where item doesn't exist

  if (itemError) {
    console.error("Error fetching item for validation:", itemError);
    return NextResponse.json(
      { message: "Error validating item access" },
      { status: 500 }
    );
  }

  if (!itemData) {
    return NextResponse.json(
      { message: "Item not found or access denied" },
      { status: 404 }
    );
  }

  // 6. Insert the remark
  const { error: insertError } = await supabase.from("remarks").insert({
    item_id: itemId,
    user_id: user.id,
    organization_id: profile.organization_id,
    text: validatedData.text,
    // timestamp defaults to now() in the database
  });

  if (insertError) {
    console.error("Error inserting remark:", insertError);
    return NextResponse.json(
      { message: "Failed to add remark" },
      { status: 500 }
    );
  }

  // 7. Return success response
  return NextResponse.json(
    { message: "Remark added successfully" },
    { status: 201 }
  );
}

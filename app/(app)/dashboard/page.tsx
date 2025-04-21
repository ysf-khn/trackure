import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server"; // Import server client

export default async function DashboardPage() {
  // Make component async
  const supabase = await createClient(); // Await client

  // Fetch user session and profile server-side
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRole: string | null = null;
  let canCreateOrder = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role") // Select only the role
      .eq("id", user.id)
      .single();
    userRole = profile?.role;
    // Determine permission based on role (assuming Worker can create orders)
    canCreateOrder = userRole === "Owner" || userRole === "Worker";
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">
        Trackure Dashboard
      </h1>
      <p className="mt-2 text-muted-foreground">
        Welcome to your dashboard. Content will go here.
      </p>
      {/* Conditionally render Create Order button */}
      {canCreateOrder && (
        <div className="mt-4">
          <Button asChild>
            <Link href="/orders/new">Create Order</Link>
          </Button>
        </div>
      )}
      {/* Placeholder content area */}
    </div>
  );
}

"use client"; // Need client for useEffect and useRouter

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client"; // Use client helper

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.replace("/dashboard"); // Redirect logged-in users
      }
    };

    checkSession();
  }, [router, supabase]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <h1 className="text-3xl font-bold text-foreground">
        Welcome to Trackure
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Loading or redirecting...
      </p>
      {/* Optionally, add a link to login if not authenticated and redirect doesn't happen fast */}
      {/* <Link href="/login" className="mt-6 text-primary hover:underline">Go to Login</Link> */}
    </div>
  );
}

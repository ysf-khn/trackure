"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// This component listens for Supabase auth changes and refreshes the
// router to ensure server components update accordingly.
export default function AuthListener() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // For simplicity, we refresh on any auth event.
        // You could add more specific logic here based on the event type
        // (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.) if needed.
        console.log(
          "Auth event:",
          event,
          "Session:",
          session ? "Exists" : "Null"
        );
        router.refresh();
      }
    );

    // Cleanup function to unsubscribe from the listener when the component unmounts
    return () => {
      authListener?.subscription.unsubscribe();
    };
    // Adding router and supabase to dependency array, though refresh function reference is stable
    // and supabase client instance should also be stable within component lifecycle.
  }, [supabase, router]);

  // This component doesn't render anything itself
  return null;
}

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Session,
  User,
  AuthChangeEvent,
  AuthError,
  SupabaseClient,
} from "@supabase/supabase-js";

// Define a shape for your user profile data, adjust as needed
// Ensure this matches the structure in your 'profiles' table
interface UserProfile {
  id: string;
  organization_id: string;
  // Add other profile fields like full_name, avatar_url, role, etc.
  [key: string]: unknown; // Use unknown instead of any for type safety
}

interface UseAuthReturn {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  organizationId: string | null;
  isLoading: boolean;
  error: Error | null;
  refreshSession: () => Promise<void>;
  supabase: SupabaseClient;
}

// Helper function to parse errors
function parseError(err: unknown, context: string): Error {
  let errorMessage = `Unknown error in ${context}.`;
  if (err instanceof AuthError) {
    errorMessage = `${context} (AuthError): ${err.message}`;
  } else if (err instanceof Error) {
    // Check for Supabase postgrest errors (common for RLS issues)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pgError = err as any;
    if (pgError?.code && pgError?.details) {
      errorMessage = `${context} (DB Error ${pgError.code}): ${pgError.details} | ${pgError.message}`;
    } else {
      errorMessage = `${context}: ${err.message}`;
    }
  } else if (typeof err === "string") {
    errorMessage = `${context}: ${err}`;
  }
  console.error(errorMessage, err); // Log the original error too
  return new Error(errorMessage);
}

export function useAuth(): UseAuthReturn {
  // Create the client instance only once
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );
  const DEBUG = process.env.NODE_ENV === "development";

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  // Combined loading state: true initially, false after initial session/profile attempt
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  // Specific loading state for profile fetch after user changes
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);

  // --- Effect 1: Handle Auth State Changes ---
  useEffect(() => {
    if (DEBUG) console.log("useAuth: Subscribing to auth state changes");

    // Fetch initial session right away
    let isMounted = true;
    const fetchInitialSession = async () => {
      try {
        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (!isMounted) return; // Avoid state update if unmounted
        if (sessionError) throw sessionError;
        if (DEBUG)
          console.log(
            "useAuth: Initial session fetched",
            initialSession?.user?.id
          );
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        // Initial loading is done once session is checked, profile fetch comes next
        // setIsLoading(false); // We now wait for profile fetch too
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(parseError(err, "Initial session fetch"));
        setSession(null);
        setUser(null);
        setIsLoading(false); // Error occurred, stop loading
      }
    };

    fetchInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, newSession: Session | null) => {
        if (!isMounted) return; // Avoid state update if unmounted

        if (DEBUG) {
          console.log(
            "useAuth: Auth state changed:",
            _event,
            newSession?.user?.id
          );
        }

        // Clear errors on any auth change for a fresh start
        setError(null);

        setSession(newSession);
        // Update user ONLY if the ID actually changes to prevent unnecessary profile fetches
        setUser((currentUser) => {
          if (currentUser?.id !== newSession?.user?.id) {
            if (DEBUG)
              console.log(
                "useAuth: User ID changed, updating user state.",
                newSession?.user?.id
              );
            return newSession?.user ?? null;
          }
          return currentUser; // Keep the same user object reference if ID is the same
        });

        // If user logs out, clear profile immediately
        if (!newSession?.user) {
          if (DEBUG) console.log("useAuth: User logged out, clearing profile.");
          setProfile(null);
          setOrganizationId(null);
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      if (DEBUG) console.log("useAuth: Unsubscribing from auth state changes");
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [supabase, DEBUG]); // Only depends on the stable supabase client

  // --- Effect 2: Fetch Profile when User ID Changes ---
  useEffect(() => {
    const currentUserId = user?.id;
    if (DEBUG)
      console.log("useAuth: User ID effect triggered. User ID:", currentUserId);

    if (currentUserId) {
      let isMounted = true;
      const fetchProfile = async () => {
        if (DEBUG)
          console.log(`useAuth: Fetching profile for user ${currentUserId}...`);
        setIsProfileLoading(true);
        setError(null); // Clear previous profile errors
        setProfile(null); // Clear stale profile
        setOrganizationId(null);

        try {
          const { data, error: profileError } = await supabase
            .from("profiles")
            .select("*, organization_id") // Ensure organization_id is selected
            .eq("id", currentUserId)
            .single();

          if (!isMounted) return;

          if (profileError) {
            // Handle case where profile might not exist yet (e.g., just signed up)
            if (profileError.code === "PGRST116") {
              // 'PGRST116' is "Resource Not Found"
              console.warn(
                `useAuth: Profile not found for user ${currentUserId}. This might be expected.`
              );
              setProfile(null);
              setOrganizationId(null);
            } else {
              throw profileError; // Rethrow other errors
            }
          } else if (data) {
            if (DEBUG)
              console.log(
                `useAuth: Profile fetched successfully for user ${currentUserId}`,
                data
              );
            setProfile(data as UserProfile);
            // Ensure organization_id exists on the fetched data
            if ("organization_id" in data && data.organization_id) {
              setOrganizationId(data.organization_id);
            } else {
              console.warn(
                `useAuth: organization_id not found or null in profile for user ${currentUserId}.`
              );
              setOrganizationId(null);
              setError(
                new Error("Profile fetched but missing organization_id.")
              );
            }
          } else {
            // Should be caught by profileError.code === 'PGRST116', but as a fallback:
            console.warn(
              `useAuth: No profile data returned for user ${currentUserId}, though no error was thrown.`
            );
            setProfile(null);
            setOrganizationId(null);
          }
        } catch (fetchError: unknown) {
          if (!isMounted) return;
          setError(parseError(fetchError, "Profile fetch"));
          setProfile(null);
          setOrganizationId(null);
        } finally {
          if (!isMounted) return;
          setIsProfileLoading(false);
          setIsLoading(false); // Combined loading is finished after profile attempt
        }
      };

      fetchProfile();

      return () => {
        isMounted = false;
      };
    } else {
      // No user, ensure profile is null and loading is false
      if (DEBUG) console.log("useAuth: No user ID, ensuring profile is null.");
      setProfile(null);
      setOrganizationId(null);
      setIsProfileLoading(false);
      setIsLoading(false); // Combined loading is finished if there's no user
    }
  }, [user?.id, supabase, DEBUG]); // Depend specifically on user?.id

  // Expose a manual refresh function (fetches session AND profile again)
  const refreshSession = useCallback(async () => {
    if (DEBUG) console.log("useAuth: Manual refresh triggered.");
    setIsLoading(true); // Indicate loading during manual refresh
    setError(null);
    setProfile(null); // Clear potentially stale data
    setOrganizationId(null);
    setUser(null); // Clear user to force profile refetch via effect
    setSession(null); // Clear session

    try {
      const {
        data: { session: currentSession },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      setSession(currentSession);
      setUser(currentSession?.user ?? null); // This will trigger the profile fetch effect
      // Loading will be set to false within the profile fetch effect's finally block
    } catch (err: unknown) {
      setError(parseError(err, "Manual refresh"));
      setSession(null);
      setUser(null);
      setProfile(null);
      setOrganizationId(null);
      setIsLoading(false); // Stop loading on error
    }
  }, [supabase, DEBUG]);

  // Determine the final loading state
  // isLoading is true initially, and during manual refresh
  // isProfileLoading is true only during the profile fetch triggered by user ID change
  const combinedIsLoading = isLoading || isProfileLoading;

  return {
    session,
    user,
    profile,
    organizationId,
    isLoading: combinedIsLoading, // Use the combined loading state
    error,
    refreshSession,
    supabase, // Expose client
  };
}

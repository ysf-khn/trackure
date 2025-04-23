import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUserWithProfile } from "@/lib/supabase/queries";
import WorkflowTabContent from "@/components/settings/workflow-tab-content"; // Import the new client component

export default async function SettingsPage() {
  const supabase = await createClient();

  // Fetch user session and profile data including role and organization_id
  const {
    user,
    profile,
    error: profileError,
  } = await getUserWithProfile(supabase);

  // Redirect if not logged in or profile fetch failed
  if (profileError || !user || !profile) {
    console.error("Settings Auth Error:", profileError);
    return redirect("/login"); // Or dashboard if appropriate for profile errors
  }

  // Role check: Redirect if the user is not an 'Owner'
  if (profile.role !== "Owner") {
    // Redirect non-owners back to the dashboard
    return redirect("/dashboard");
  }

  // User is an Owner, get their organization ID
  const organizationId = profile.organization_id;

  // Render the settings page
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <Tabs defaultValue="workflow" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          {" "}
          {/* Adjust grid-cols as needed */}
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="general" disabled>
            General
          </TabsTrigger>{" "}
          {/* Placeholder */}
          <TabsTrigger value="billing" disabled>
            Billing
          </TabsTrigger>{" "}
          {/* Placeholder */}
        </TabsList>
        <TabsContent value="workflow">
          {/* Render the client component, passing the organizationId */}
          <WorkflowTabContent organizationId={organizationId} />
        </TabsContent>
        <TabsContent value="general">
          {/* Placeholder Content */}
          <p>General settings content goes here.</p>
        </TabsContent>
        <TabsContent value="billing">
          {/* Placeholder Content */}
          <p>Billing settings content goes here.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

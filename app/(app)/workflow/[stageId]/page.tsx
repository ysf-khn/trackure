"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";

import { ItemListTable } from "@/components/items/item-list-table";
import { useAuth } from "@/hooks/use-auth"; // Correct import path now
import { useStage } from "@/hooks/queries/use-stage"; // Import the new hook
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function StageViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  // --- Authentication ---
  const {
    organizationId,
    isLoading: isAuthLoading,
    error: authError,
  } = useAuth();

  // --- Stage/SubStage IDs ---
  const stageId = params.stageId as string | undefined;
  const subStageId = searchParams.get("subStage") || null; // Get subStage from query param

  // --- Fetch Stage Data ---
  const {
    data: stageData,
    isLoading: isStageLoading,
    isError: isStageError,
    error: stageError,
  } = useStage(stageId, organizationId);

  // --- Action Handlers (Placeholders) ---
  const handleMoveForward = React.useCallback((itemIds: string[]) => {
    console.log(`Placeholder: Move forward items: ${itemIds.join(", ")}`);
    // TODO: Implement actual API call using useMutation (from Step 4)
    alert(`Placeholder: Would move items: ${itemIds.join(", ")}`);
  }, []);

  const handleViewHistory = React.useCallback((itemId: string) => {
    console.log(`Placeholder: View history for item: ${itemId}`);
    // TODO: Implement logic to show history modal/panel (from Step 5)
    alert(`Placeholder: Would show history for item: ${itemId}`);
  }, []);

  // --- Loading and Error States ---
  if (isAuthLoading || isStageLoading) {
    // Combine loading states
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-8 w-1/4" /> {/* Title placeholder */}
        <Skeleton className="h-10 w-full" /> {/* Table placeholder */}
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  // Authentication Error (higher priority)
  if (authError) {
    return (
      <Alert variant="destructive" className="m-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Authentication Error</AlertTitle>
        <AlertDescription>
          Could not load user data. Please try refreshing. ({authError.message})
        </AlertDescription>
      </Alert>
    );
  }

  // Missing Org ID (higher priority)
  if (!organizationId) {
    return (
      <Alert className="m-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Missing Information</AlertTitle>
        <AlertDescription>
          Organization context is missing. Cannot load items.
        </AlertDescription>
      </Alert>
    );
  }

  // Missing Stage ID (higher priority)
  if (!stageId) {
    return (
      <Alert variant="destructive" className="m-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Stage ID is missing from the URL.</AlertDescription>
      </Alert>
    );
  }

  // Stage Data Fetching Error
  if (isStageError) {
    return (
      <Alert variant="destructive" className="m-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Loading Stage</AlertTitle>
        <AlertDescription>
          Could not load details for this stage. Please try refreshing. (
          {stageError?.message || "Unknown error"})
        </AlertDescription>
      </Alert>
    );
  }

  // Stage not found (or RLS prevented access - handle appropriately)
  if (!stageData) {
    return (
      <Alert variant="destructive" className="m-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Stage Not Found</AlertTitle>
        <AlertDescription>
          The requested stage ({stageId}) could not be found or you do not have
          permission to view it.
        </AlertDescription>
      </Alert>
    );
  }

  // --- Render Table ---
  return (
    <div className="container mx-auto py-4 px-4 md:px-6">
      <h1 className="text-2xl font-semibold mb-4">
        {/* Display stage name */} Items in Stage: {stageData?.name ?? stageId}
        {/* TODO: Handle sub-stage name fetching similarly if needed */}
        {subStageId ? ` / Sub-Stage: ${subStageId}` : ""}
      </h1>

      <ItemListTable
        organizationId={organizationId}
        stageId={stageId} // Pass the ID
        subStageId={subStageId}
        onMoveForward={handleMoveForward}
        onViewHistory={handleViewHistory}
      />
    </div>
  );
}

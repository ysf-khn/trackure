"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";

import { ItemListTable } from "@/components/items/item-list-table";
import { useAuth } from "@/hooks/use-auth"; // Correct import path now
import { useStage } from "@/hooks/queries/use-stage"; // Import the new hook
import { useSubStage } from "@/hooks/queries/use-sub-stage"; // Import the sub-stage hook
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
  // Correctly handle null from searchParams.get, pass undefined if null
  const subStageId = searchParams.get("subStage") ?? undefined; // Fix linter error here

  // --- Fetch Stage Data ---
  const {
    data: stageData,
    isLoading: isStageLoading,
    isError: isStageError,
    error: stageError,
  } = useStage(stageId, organizationId);

  // --- Fetch Sub-Stage Data (Conditional) ---
  const {
    data: subStageData,
    isLoading: isSubStageLoading,
    isError: isSubStageError,
    error: subStageError,
  } = useSubStage(subStageId ?? null, organizationId); // Pass null if undefined

  // --- Loading and Error States ---
  if (isAuthLoading || isStageLoading) {
    // Combine loading states
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-8 w-1/4" /> {/* Title placeholder */}
        <Skeleton className="h-5 w-1/3 mt-1 mb-2" />{" "}
        {/* Sub-title placeholder */}
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

  // --- Render Page Content ---
  return (
    // Added space-y-4 for spacing between sections
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-4">
      {/* Stage and Sub-Stage Name Section */}
      <div>
        <h1 className="text-2xl font-semibold mb-1 bg-gradient-to-b from-white to-gray-800 text-transparent bg-clip-text">
          {stageData?.name ?? stageId}
        </h1>

        {/* Sub-Stage Name (conditional) */}
        {subStageId && (
          <div className="mb-0">
            {" "}
            {/* Removed redundant margin */}
            {isSubStageLoading ? (
              <Skeleton className="h-5 w-1/3" /> // Sub-stage loading skeleton
            ) : isSubStageError ? (
              <span className="text-sm text-destructive">
                {" "}
                {/* Sub-stage error message */}
                Error loading sub-stage:{" "}
                {subStageError?.message || "Unknown error"}
              </span>
            ) : subStageData ? (
              <p className="text-lg text-muted-foreground">
                {" "}
                {/* Display fetched sub-stage name */}
                {subStageData.name ?? subStageId} {/* Fallback to ID */}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {" "}
                {/* Sub-stage ID if data not found */}
                Sub-Stage: {subStageId} (Details not found)
              </p>
            )}
          </div>
        )}
      </div>

      <ItemListTable
        organizationId={organizationId}
        stageId={stageId} // Pass the ID
        subStageId={subStageId ?? null} // Pass subStageId or null
      />
    </div>
  );
}

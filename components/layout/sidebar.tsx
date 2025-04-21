"use client";
import React, { useState } from "react";
import { TriangleAlert } from "lucide-react"; // Assuming lucide-react is used for icons
import Link from "next/link"; // Import Link
import { usePathname } from "next/navigation"; // Import usePathname

import { useWorkflow } from "@/hooks/queries/use-workflow";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { type Stage, type SubStage } from "@/lib/queries/workflow"; // Import types

// Define a type for the item ID (could be stage or sub-stage)
// We don't strictly need selectedItemId state anymore if we use pathname
// type SelectedItemId = string | null;

const Sidebar = () => {
  const { data: workflowData, isLoading, isError, error } = useWorkflow();
  const pathname = usePathname(); // Get current path
  // const [selectedItemId, setSelectedItemId] = useState<SelectedItemId>(null); // Can be removed or adapted
  const [openCollapsibles, setOpenCollapsibles] = useState<
    Record<string, boolean>
  >({});

  const toggleCollapsible = (stageId: string) => {
    setOpenCollapsibles((prev) => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  // handleSelect is no longer needed for navigation
  // const handleSelect = (id: string) => {
  //   setSelectedItemId(id);
  // };

  // Determine if an item (stage or sub-stage) is currently active based on URL
  const isActive = (stageId: string, subStageId?: string | null) => {
    const basePath = `/workflow/${stageId}`;
    if (subStageId) {
      // Check if path matches base path and has the correct subStage query param
      // This requires parsing query params, which usePathname doesn't do directly.
      // For simplicity, let's assume active state based on path segment for now,
      // or we can use useSearchParams hook if precise sub-stage active state is needed.
      // Simple check: is the current path starting with the stage path?
      // TODO: Refine active state logic, especially for sub-stages with query params
      return pathname.startsWith(basePath); // Simplified check
    }
    return pathname === basePath; // Exact match for main stage
  };

  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-border bg-black p-4 md:flex">
      {/* Fixed width, hidden on mobile (md:flex) */}
      <h2 className="mb-4 text-lg font-semibold tracking-tight">
        Workflow Stages
      </h2>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertDescription>
            Error loading workflow: {error?.message || "Unknown error"}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && workflowData && (
        <nav className="flex flex-col space-y-1">
          {workflowData.map((stage: Stage) => (
            <Collapsible
              key={stage.id}
              // Keep collapsible open if the current path belongs to this stage
              open={
                openCollapsibles[stage.id] ||
                pathname.startsWith(`/workflow/${stage.id}`)
              }
              onOpenChange={() => toggleCollapsible(stage.id)}
              className="w-full"
            >
              {/* Wrap Trigger/Button in Link */}
              <Link href={`/workflow/${stage.id}`} passHref>
                <CollapsibleTrigger asChild>
                  <Button
                    variant={isActive(stage.id) ? "secondary" : "ghost"} // Use isActive
                    size="sm"
                    className="w-full justify-between"
                    // onClick={() => handleSelect(stage.id)} // Remove direct onClick handler
                  >
                    <span>
                      {stage.name} ({stage.itemCount})
                    </span>
                    {/* Add chevron icon here if desired, rotates based on open state */}
                  </Button>
                </CollapsibleTrigger>
              </Link>
              {stage.subStages && stage.subStages.length > 0 && (
                <CollapsibleContent className="pl-4 pt-1 space-y-1">
                  {stage.subStages.map((subStage: SubStage) => (
                    // Wrap Button in Link
                    <Link
                      key={subStage.id}
                      href={`/workflow/${stage.id}?subStage=${subStage.id}`} // Add query param
                      passHref
                    >
                      <Button
                        variant={
                          // TODO: Refine active state check for query params
                          pathname.startsWith(`/workflow/${stage.id}`) &&
                          pathname.includes(`subStage=${subStage.id}`)
                            ? "secondary"
                            : "ghost"
                        }
                        size="sm"
                        className="w-full justify-start"
                        // onClick={() => handleSelect(subStage.id)} // Remove direct onClick handler
                      >
                        {subStage.name} ({subStage.itemCount})
                      </Button>
                    </Link>
                  ))}
                </CollapsibleContent>
              )}
            </Collapsible>
          ))}
        </nav>
      )}
    </aside>
  );
};

export default Sidebar;

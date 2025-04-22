"use client";
import React, { useState } from "react";
import { TriangleAlert, ChevronDown, ChevronRight } from "lucide-react"; // Added icons
import Link from "next/link"; // Import Link
import { usePathname, useSearchParams } from "next/navigation"; // Import usePathname and useSearchParams

import { useWorkflow } from "@/hooks/queries/use-workflow";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge"; // Added Badge import
import { type Stage, type SubStage } from "@/lib/queries/workflow"; // Import types
import { cn } from "@/lib/utils"; // Import cn utility

// Define a type for the item ID (could be stage or sub-stage)
// We don't strictly need selectedItemId state anymore if we use pathname
// type SelectedItemId = string | null;

const Sidebar = () => {
  const { data: workflowData, isLoading, isError, error } = useWorkflow();
  const pathname = usePathname(); // Get current path
  const searchParams = useSearchParams(); // Get search params
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
    const currentSubStageId = searchParams.get("subStage");

    if (subStageId) {
      // Active if path matches stage and query param matches sub-stage ID
      return pathname.startsWith(basePath) && currentSubStageId === subStageId;
    }
    // Active if path matches stage exactly and no sub-stage is selected (or it's the main stage view)
    // Or active if path starts with stage path but a sub-stage IS selected (collapsible parent should look active)
    return (
      (pathname === basePath && !currentSubStageId) ||
      (pathname.startsWith(basePath) && !!currentSubStageId)
    );
  };

  // Helper to determine if a specific sub-stage is the active one for styling
  const isSubStageActive = (stageId: string, subStageId: string) => {
    const basePath = `/workflow/${stageId}`;
    const currentSubStageId = searchParams.get("subStage");
    return pathname.startsWith(basePath) && currentSubStageId === subStageId;
  };

  // Function to get the open state, considering path-based auto-open
  const getIsOpen = (stageId: string) => {
    // Explicitly open/closed takes precedence
    if (openCollapsibles[stageId] !== undefined) {
      return openCollapsibles[stageId];
    }
    // Otherwise, open if the current path is within this stage's section
    return pathname.startsWith(`/workflow/${stageId}`);
  };

  return (
    <aside className="hidden h-screen w-72 flex-col border-r border-border bg-black p-4 md:flex text-card-foreground">
      {/* Use bg-card and text-card-foreground */}
      <h2 className="mb-4 pl-3 text-lg font-semibold tracking-tight">
        {" "}
        {/* Added padding to align with items */}
        Workflow
      </h2>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" /> {/* Increased height slightly */}
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
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
          {workflowData.map((stage: Stage) => {
            const active = isActive(stage.id);
            const isOpen = getIsOpen(stage.id); // Use helper to determine open state

            return (
              <Collapsible
                key={stage.id}
                open={isOpen} // Use derived open state
                onOpenChange={() => toggleCollapsible(stage.id)}
                className="w-full group" // Add group for potential future styling
              >
                <div className="relative flex items-center">
                  {" "}
                  {/* Use relative positioning for indicator */}
                  {/* Active Indicator */}
                  <div
                    className={`absolute left-0 top-1 bottom-1 w-1 rounded-r-full bg-primary ${
                      active ? "opacity-100" : "opacity-0" // Show/hide based on active state
                    } transition-opacity duration-200`}
                    aria-hidden="true"
                  />
                  <Link
                    href={`/workflow/${stage.id}`}
                    passHref
                    className="flex-grow"
                  >
                    {" "}
                    {/* Link takes full width */}
                    <CollapsibleTrigger asChild>
                      <Button
                        variant={"ghost"} // Always ghost, apply active styles via className
                        size="sm"
                        className={cn(
                          "w-full justify-start pl-3 pr-2",
                          active
                            ? "bg-accent/20 text-accent-foreground font-semibold" // Lighter active state style using opacity
                            : "",
                          !isOpen && !active ? "text-muted-foreground" : "" // Keep chevron color consistent when closed and inactive
                        )}
                      >
                        {/* Conditional Chevron Icon */}
                        {isOpen ? (
                          <ChevronDown className="mr-2 h-4 w-4 flex-shrink-0" /> // Removed text-muted-foreground here, rely on Button's context
                        ) : (
                          <ChevronRight className="mr-2 h-4 w-4 flex-shrink-0" /> // Removed text-muted-foreground here
                        )}
                        <span className="flex-grow text-left mr-2 truncate">
                          {" "}
                          {/* Allow text to grow and truncate */}
                          {stage.name}
                        </span>
                        <Badge
                          variant={
                            stage.itemCount > 0 ? "default" : "secondary"
                          } // Use default (primary bg) if count > 0
                          className={cn(
                            "flex-shrink-0 mr-2",
                            stage.itemCount > 0 &&
                              "bg-primary text-primary-foreground" // Explicitly set primary colors
                          )}
                        >
                          {" "}
                          {/* Badge for count */}
                          {stage.itemCount}
                        </Badge>
                        {/* Chevron Icons Removed - PlusCircle indicates collapsibility */}
                      </Button>
                    </CollapsibleTrigger>
                  </Link>
                </div>
                {stage.subStages && stage.subStages.length > 0 && (
                  <CollapsibleContent className="pl-4 pt-1 space-y-1 border-l border-border">
                    {stage.subStages.map((subStage: SubStage) => {
                      const subActive = isSubStageActive(stage.id, subStage.id);

                      return (
                        <div
                          key={subStage.id}
                          className="relative flex items-center w-full"
                        >
                          {" "}
                          {/* Relative container */}
                          {/* Active Indicator for Sub-Stage */}
                          <div
                            className={`absolute left-0 top-1 bottom-1 w-1 rounded-r-full bg-primary ${
                              subActive ? "opacity-100" : "opacity-0"
                            } transition-opacity duration-200`}
                            aria-hidden="true"
                          />
                          <Link
                            href={`/workflow/${stage.id}?subStage=${subStage.id}`}
                            passHref
                            className="flex-grow" // Link takes full width
                          >
                            <Button
                              variant={"ghost"} // Always ghost, apply active styles via className
                              size="sm"
                              className={cn(
                                "w-full justify-start pl-3 pr-2",
                                subActive
                                  ? "bg-accent/20 text-accent-foreground font-semibold" // Lighter active state style using opacity
                                  : ""
                              )}
                            >
                              <span className="flex-grow text-left mr-2 truncate">
                                {subStage.name}
                              </span>
                              <Badge
                                variant={
                                  subStage.itemCount > 0
                                    ? "default"
                                    : "secondary"
                                } // Use default (primary bg) if count > 0
                                className={cn(
                                  "flex-shrink-0",
                                  subStage.itemCount > 0 &&
                                    "bg-primary text-primary-foreground" // Explicitly set primary colors
                                )}
                              >
                                {" "}
                                {/* Badge for count */}
                                {subStage.itemCount}
                              </Badge>
                            </Button>
                          </Link>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                )}
              </Collapsible>
            );
          })}
        </nav>
      )}
    </aside>
  );
};

export default Sidebar;

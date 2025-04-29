"use client";
import React, { useState } from "react";
import {
  TriangleAlert,
  ChevronDown,
  ChevronRight,
  Settings, // Added Settings icon
  Package, // Added Package icon for Orders
  Dot, // Added Dot icon for leaf stages
} from "lucide-react"; // Added icons
import Link from "next/link"; // Import Link
import Image from "next/image"; // Import Image
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
      <Link href="/dashboard" className="pb-5 mb-4 border-b border-border">
        <div className="flex items-center pl-3">
          <Image
            src="/logo.svg"
            alt="Trackure Logo"
            width={18}
            height={18}
            className="mr-2"
          />
          <h2 className="text-lg font-semibold tracking-tight bg-gradient-to-b from-white to-gray-800 text-transparent bg-clip-text">
            Trackure
          </h2>
        </div>
      </Link>
      {/* Separator/Container for main nav items - Made scrollable */}
      {/* Added overflow-y-auto and flex-grow to this div */}
      {/* Explicitly hide horizontal overflow */}
      <div className="flex flex-col space-y-1 flex-grow overflow-y-auto overflow-x-hidden pr-2 -mr-2">
        {" "}
        {/* Added padding compensation */} {/* Orders Link */}
        <Link href="/orders" passHref>
          <Button
            variant={pathname.startsWith("/orders") ? "secondary" : "ghost"} // Highlight if path starts with /orders
            size="sm"
            className="w-full justify-start pl-3"
          >
            <Package className="mr-2 h-4 w-4" /> {/* Orders Icon */}
            Orders
          </Button>
        </Link>
        {/* Workflow Section Title (Optional but good separation) */}
        <h3 className="mt-4 mb-1 px-3 text-sm font-semibold uppercase tracking-wider bg-gradient-to-b from-white to-gray-800 text-transparent bg-clip-text">
          Workflow
        </h3>
        {/* Workflow Loading/Error/Data */}
        {isLoading && (
          <div className="space-y-2 px-3">
            {" "}
            {/* Added padding to align */}
            <Skeleton className="h-10 w-full" />{" "}
            {/* Increased height slightly */}
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
                    {/* Conditionally render Link or just the Button */}
                    {stage.subStages && stage.subStages.length > 0 ? (
                      // --- Stage WITH Sub-Stages: Button only toggles ---
                      <CollapsibleTrigger asChild>
                        <Button
                          variant={"ghost"} // Always ghost, apply active styles via className
                          size="sm"
                          className={cn(
                            "w-full justify-start pl-3 pr-2 flex-grow", // Use flex-grow here
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
                            {/* Manually truncate name if longer than 22 chars */}
                            {stage.name.length > 22
                              ? `${stage.name.slice(0, 22)}...`
                              : stage.name}
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
                        </Button>
                      </CollapsibleTrigger>
                    ) : (
                      // --- Stage WITHOUT Sub-Stages: Button is wrapped in Link ---
                      <Link
                        href={`/workflow/${stage.id}`}
                        passHref
                        className="flex-grow" // Link takes full width
                      >
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
                          {/* Icon Placeholder (Chevron doesn't make sense here) */}
                          <Dot className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <span className="flex-grow text-left mr-2 truncate">
                            {" "}
                            {/* Allow text to grow and truncate */}
                            {/* Manually truncate name if longer than 22 chars */}
                            {stage.name.length > 22
                              ? `${stage.name.slice(0, 22)}...`
                              : stage.name}
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
                        </Button>
                      </Link>
                    )}
                  </div>
                  {stage.subStages && stage.subStages.length > 0 && (
                    <CollapsibleContent className="pl-4 pt-1 space-y-1 border-l border-border">
                      {stage.subStages.map((subStage: SubStage) => {
                        const subActive = isSubStageActive(
                          stage.id,
                          subStage.id
                        );

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
                                  {/* Manually truncate name if longer than 22 chars */}
                                  {subStage.name.length > 22
                                    ? `${subStage.name.slice(0, 22)}...`
                                    : subStage.name}
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
      </div>{" "}
      {/* End main nav items container */}
      {/* Settings Link at the bottom */}
      <div className="mt-auto border-t border-border pt-4 flex-shrink-0">
        {" "}
        {/* Ensure this div doesn't shrink */}{" "}
        {/* Add separator and push to bottom */}
        <Link href="/settings" passHref>
          <Button
            variant={pathname.startsWith("/settings") ? "secondary" : "ghost"} // Highlight if path starts with /settings
            size="sm"
            className="w-full justify-start pl-3"
          >
            <Settings className="mr-2 h-4 w-4" /> {/* Settings Icon */}
            Settings
          </Button>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;

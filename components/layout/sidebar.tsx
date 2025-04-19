"use client";
import React, { useState } from "react";
import { TriangleAlert } from "lucide-react"; // Assuming lucide-react is used for icons

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
type SelectedItemId = string | null;

const Sidebar = () => {
  const { data: workflowData, isLoading, isError, error } = useWorkflow();
  const [selectedItemId, setSelectedItemId] = useState<SelectedItemId>(null);
  const [openCollapsibles, setOpenCollapsibles] = useState<
    Record<string, boolean>
  >({});

  const toggleCollapsible = (stageId: string) => {
    setOpenCollapsibles((prev) => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  const handleSelect = (id: string) => {
    setSelectedItemId(id);
    // Optional: Automatically open the parent collapsible if a sub-stage is selected
    // This requires knowing the parent stage ID for a sub-stage ID
  };

  return (
    <aside className="hidden h-screen w-64 flex-col border-r bg-background p-4 md:flex">
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
              open={openCollapsibles[stage.id]}
              onOpenChange={() => toggleCollapsible(stage.id)}
              className="w-full"
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant={selectedItemId === stage.id ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => handleSelect(stage.id)}
                >
                  <span>{stage.name} (0)</span>
                  {/* Add chevron icon here if desired, rotates based on open state */}
                </Button>
              </CollapsibleTrigger>
              {stage.subStages && stage.subStages.length > 0 && (
                <CollapsibleContent className="pl-4 pt-1 space-y-1">
                  {stage.subStages.map((subStage: SubStage) => (
                    <Button
                      key={subStage.id}
                      variant={
                        selectedItemId === subStage.id ? "secondary" : "ghost"
                      }
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleSelect(subStage.id)}
                    >
                      {subStage.name} (0)
                    </Button>
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

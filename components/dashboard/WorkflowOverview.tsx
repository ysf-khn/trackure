"use client";

import React from "react";
import Link from "next/link";
import { useWorkflowOverview } from "@/hooks/queries/use-workflow-overview";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function WorkflowOverview() {
  const { data, isLoading, isError, error } = useWorkflowOverview();

  return (
    <Card className="md:col-span-2 xl:col-span-2 border-border">
      {" "}
      {/* Span across multiple columns */}
      <CardHeader>
        <CardTitle className="text-xl font-semibold bg-gradient-to-b from-white to-gray-600 text-transparent bg-clip-text">
          Workflow Overview
        </CardTitle>
        <CardDescription>Active item count per stage.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-5 w-2/5" />
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error?.message || "Could not load workflow overview."}
            </AlertDescription>
          </Alert>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No workflow stages found or no items currently in workflow.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.map((stage) => (
              <li
                key={stage.id}
                className="flex justify-between items-center text-sm"
              >
                <Link
                  href={`/items?stageId=${stage.id}`} // Assuming /items is the correct page
                  className="hover:underline text-primary font-medium"
                >
                  {stage.name}
                </Link>
                <span className="font-semibold text-muted-foreground">
                  {stage.item_count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

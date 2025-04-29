"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { useDashboardStats } from "@/hooks/queries/use-dashboard-stats";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function QuickStats() {
  const { data, isLoading, isError, error } = useDashboardStats();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {isLoading ? (
        <>
          <StatCardSkeleton title="Active Orders" />
          <StatCardSkeleton title="Active Items" />
          {/* <StatCardSkeleton title="Needs Packaging Info" /> */}
          <StatCardSkeleton title="Reworks (7d)" />
        </>
      ) : isError ? (
        <Alert variant="destructive" className="md:col-span-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Stats</AlertTitle>
          <AlertDescription>
            {error?.message || "Could not load dashboard statistics."}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <StatCard
            title="Active Orders"
            value={data?.activeOrdersCount ?? 0}
          />
          <StatCard title="Active Items" value={data?.activeItemsCount ?? 0} />
          {/* <StatCard
            title="Needs Packaging Info"
            value={data?.ordersNeedingPackagingInfoCount ?? 0}
          /> */}
          <StatCard
            title="Reworks (7d)"
            value={data?.reworkEventsLast7DaysCount ?? 0}
          />
        </>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
}

function StatCard({ title, value }: StatCardProps) {
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {/* Optional: Add an icon here */}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {/* Optional: Add descriptive text here */}
      </CardContent>
    </Card>
  );
}

interface StatCardSkeletonProps {
  title: string;
}

function StatCardSkeleton({ title }: StatCardSkeletonProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-1/4" />
      </CardContent>
    </Card>
  );
}

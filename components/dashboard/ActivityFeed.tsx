"use client";

import React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  useRecentActivity,
  ActivityItem,
} from "@/hooks/queries/use-recent-activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const ActivityFeedSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        <Skeleton className="h-4 w-4 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-3 w-[100px]" />
        </div>
      </div>
    ))}
  </div>
);

const ActivityItemDisplay = ({ item }: { item: ActivityItem }) => {
  const formattedTime = formatDistanceToNow(new Date(item.timestamp), {
    addSuffix: true,
  });
  const content = (
    <div className="flex flex-col">
      <span className="text-sm font-medium">
        {item.type}: {item.detail}
      </span>
      <span className="text-xs text-muted-foreground">{formattedTime}</span>
    </div>
  );

  if (item.link) {
    return (
      <Link href={item.link} className="hover:bg-muted/50 p-2 rounded block">
        {content}
      </Link>
    );
  }

  return <div className="p-2">{content}</div>;
};

export const ActivityFeed = () => {
  // The useRecentActivity hook needs the organizationId for the query key primarily.
  // The actual fetching logic in the API route gets the org ID from the authenticated user.
  // We still need *a* value for the query key. We can pass a placeholder or derive it.
  // For now, let's assume the hook handles null/undefined gracefully (which it does via `enabled` flag).
  // If useUser hook was available, we would use: const { user } = useUser();
  const placeholderOrgId = "temp-org-id"; // Or retrieve appropriately if possible here

  const {
    data: activity = [],
    isLoading,
    isError,
    error,
  } = useRecentActivity(placeholderOrgId); // Pass placeholder or actual ID if available

  return (
    <Card className="h-full border-border">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <ActivityFeedSkeleton />}
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Could not load recent activity. {error?.message}
            </AlertDescription>
          </Alert>
        )}
        {!isLoading && !isError && activity.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No recent activity found.
          </p>
        )}
        {!isLoading && !isError && activity.length > 0 && (
          <div className="space-y-1 -mx-2">
            {activity.map((item) => (
              <div key={item.id}>
                <ActivityItemDisplay item={item} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

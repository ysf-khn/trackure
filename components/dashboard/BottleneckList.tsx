"use client";

import React from "react";
import Link from "next/link";
import { useBottleneckItems } from "@/hooks/queries/use-bottleneck-items";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDistanceToNowStrict, parseISO } from "date-fns";

export function BottleneckList() {
  const { data, isLoading, isError, error } = useBottleneckItems();

  const formatTime = (enteredAt: string | null): string => {
    if (!enteredAt) return "N/A";
    try {
      // Use parseISO to handle the timestamp string correctly
      return formatDistanceToNowStrict(parseISO(enteredAt), {
        addSuffix: true,
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Invalid date";
    }
  };

  return (
    <Card className="md:col-span-2 lg:col-span-4 border-border">
      {" "}
      {/* Adjust span as needed */}
      <CardHeader>
        <CardTitle className="text-xl font-semibold bg-gradient-to-b from-white to-gray-600 text-transparent bg-clip-text">
          Potential Bottlenecks
        </CardTitle>
        <CardDescription>
          Items waiting the longest in their current stage.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex justify-between items-center space-x-4"
              >
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error?.message || "Could not load bottleneck items."}
            </AlertDescription>
          </Alert>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No potential bottlenecks found.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Current Stage</TableHead>
                <TableHead className="text-right">Time in Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.item_id}>
                  <TableCell>
                    <Link
                      href={`/items/${item.item_id}`}
                      className="hover:underline font-medium text-primary"
                    >
                      {item.sku || item.item_id.substring(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/orders/${item.order_id}`}
                      className="hover:underline"
                    >
                      {item.order_number || item.order_id.substring(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>{item.stage_name}</TableCell>
                  <TableCell className="text-right">
                    {formatTime(item.entered_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

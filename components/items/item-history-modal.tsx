"use client";

import React from "react";
import {
  useItemHistory,
  ItemHistoryEntry,
} from "@/hooks/queries/use-item-history";
import {
  useItemRemarks,
  RemarkWithProfile,
} from "@/hooks/queries/use-item-remarks";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquareText } from "lucide-react";

// Define a combined type for history and remarks
type CombinedHistoryItem =
  | (ItemHistoryEntry & { type: "history" })
  | (RemarkWithProfile & { type: "remark" });

interface ItemHistoryModalProps {
  itemId: string | null;
  itemSku: string | null; // For displaying in the title
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ItemHistoryModal({
  itemId,
  itemSku,
  isOpen,
  onOpenChange,
}: ItemHistoryModalProps) {
  const {
    data: history,
    isLoading: isLoadingHistory,
    error: historyError,
  } = useItemHistory(itemId);
  const {
    data: remarks,
    isLoading: isLoadingRemarks,
    error: remarksError,
  } = useItemRemarks(itemId);

  // Combine and sort data when both history and remarks are loaded
  const combinedData = React.useMemo(() => {
    if (isLoadingHistory || isLoadingRemarks || !history || !remarks) {
      return [];
    }

    const typedHistory: CombinedHistoryItem[] = history.map((entry) => ({
      ...entry,
      type: "history",
    }));
    const typedRemarks: CombinedHistoryItem[] = remarks.map((remark) => ({
      ...remark,
      type: "remark",
    }));

    const combined = [...typedHistory, ...typedRemarks];

    // Sort chronologically (newest first)
    combined.sort((a, b) => {
      const dateA = new Date(
        a.type === "history" ? a.entered_at : a.created_at
      );
      const dateB = new Date(
        b.type === "history" ? b.entered_at : b.created_at
      );
      return dateB.getTime() - dateA.getTime(); // Descending order
    });

    return combined;
  }, [history, remarks, isLoadingHistory, isLoadingRemarks]);

  const renderHistory = () => {
    if (isLoadingHistory || isLoadingRemarks)
      return <p>Loading history and remarks...</p>;
    if (historyError || remarksError)
      return (
        <p className="text-destructive">
          Error loading data: {historyError?.message || remarksError?.message}
        </p>
      );
    if (combinedData.length === 0)
      return <p>No history or remarks found for this item.</p>;

    return (
      <ScrollArea className="h-[60vh]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Timestamp</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>User</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {combinedData.map((item) => {
              if (item.type === "history") {
                return (
                  <TableRow key={`hist-${item.id}`}>
                    <TableCell>
                      {formatDistanceToNow(new Date(item.entered_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {item.action_taken || "Stage Entry"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      Entered{" "}
                      <strong>
                        {item.stage_name}
                        {item.sub_stage_name ? ` / ${item.sub_stage_name}` : ""}
                      </strong>
                      {item.exited_at &&
                        ` (Exited: ${formatDistanceToNow(
                          new Date(item.exited_at),
                          { addSuffix: true }
                        )})`}
                      {item.rework_reason && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Reason: {item.rework_reason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{item.user_email}</TableCell>
                  </TableRow>
                );
              } else {
                return (
                  <TableRow
                    key={`rem-${item.id}`}
                    className="bg-muted/30 hover:bg-muted/50"
                  >
                    <TableCell>
                      {formatDistanceToNow(new Date(item.created_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-blue-500 text-blue-700"
                      >
                        <MessageSquareText className="h-3 w-3 mr-1" /> Remark
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">
                      {item.text}
                    </TableCell>
                    <TableCell>
                      {item.profiles?.full_name ?? "Unknown User"}
                    </TableCell>
                  </TableRow>
                );
              }
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-none 2xl:max-w-none w-[90vw] sm:w-[90vw] overflow-hidden !important">
        <DialogHeader>
          <DialogTitle>
            History & Remarks for Item: {itemSku || itemId}
          </DialogTitle>
          <DialogDescription>
            Chronological log of movements, actions, and remarks for the
            selected item.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">{renderHistory()}</div>
      </DialogContent>
    </Dialog>
  );
}

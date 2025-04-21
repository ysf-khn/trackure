"use client";

import {
  useItemHistory,
  ItemHistoryEntry,
} from "@/hooks/queries/use-item-history";
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
  const { data: history, isLoading, error } = useItemHistory(itemId);

  const renderHistory = () => {
    if (isLoading) return <p>Loading history...</p>;
    if (error)
      return (
        <p className="text-destructive">
          Error loading history: {error.message}
        </p>
      );
    if (!history || history.length === 0)
      return <p>No history found for this item.</p>;

    return (
      <ScrollArea className="h-[60vh]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stage</TableHead>
              <TableHead>Sub-Stage</TableHead>
              <TableHead>Entered At</TableHead>
              <TableHead>Exited At</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Rework Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((entry: ItemHistoryEntry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.stage_name}</TableCell>
                <TableCell>{entry.sub_stage_name ?? "-"}</TableCell>
                <TableCell>
                  {formatDistanceToNow(new Date(entry.entered_at), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell>
                  {entry.exited_at
                    ? formatDistanceToNow(new Date(entry.exited_at), {
                        addSuffix: true,
                      })
                    : "-"}
                </TableCell>
                <TableCell>{entry.user_email}</TableCell>
                <TableCell>
                  {entry.action_taken && (
                    <Badge variant="outline">{entry.action_taken}</Badge>
                  )}
                </TableCell>
                <TableCell>{entry.rework_reason ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-none 2xl:max-w-none w-[90vw] sm:w-[90vw] overflow-hidden !important">
        <DialogHeader>
          <DialogTitle>History for Item: {itemSku || itemId}</DialogTitle>
          <DialogDescription>
            Detailed log of movements and actions for the selected item.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">{renderHistory()}</div>
      </DialogContent>
    </Dialog>
  );
}

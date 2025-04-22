"use client";

import * as React from "react";
import { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  getPaginationRowModel, // Import for pagination
} from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";

import { MoreHorizontal, ChevronRight, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import {
  ItemInStage,
  useItemsInStage,
} from "@/hooks/queries/use-items-in-stage";
import { useMoveItemsForward } from "@/hooks/mutations/use-move-items-forward"; // Import the mutation hook
import { ItemHistoryModal } from "./item-history-modal"; // Import the modal
import { useAuth } from "@/hooks/use-auth"; // Use the correct hook
import { ReworkModal } from "./rework-modal"; // Import the ReworkModal
import { AddRemarkModal } from "./add-remark-modal"; // Import the AddRemarkModal

// Define the shape of an item for the rework modal
interface ReworkableItem {
  id: string;
  current_stage_id: string;
  current_sub_stage_id?: string | null;
  display_name?: string; // Assuming SKU or similar is used as display name
}

// Define Columns - Adding meta type for mutation access
export const columns: ColumnDef<ItemInStage>[] = [
  {
    id: "select",
    header: ({ table }) => {
      const meta = table.options.meta as ItemListTableMeta | undefined;
      if (
        !meta?.userRole ||
        (meta.userRole !== "Owner" && meta.userRole !== "Worker")
      ) {
        return null;
      }
      return (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value: boolean) =>
            table.toggleAllPageRowsSelected(!!value)
          }
          aria-label="Select all"
        />
      );
    },
    cell: ({ row, table }) => {
      const meta = table.options.meta as ItemListTableMeta | undefined;
      if (
        !meta?.userRole ||
        (meta.userRole !== "Owner" && meta.userRole !== "Worker")
      ) {
        return null;
      }
      return (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => <div className="font-medium">{row.getValue("sku")}</div>,
  },
  {
    accessorKey: "instance_details",
    header: "Details",
    cell: ({ row }) => {
      const details = row.getValue("instance_details") as Record<
        string,
        unknown
      >;
      return <div className="truncate w-32">{JSON.stringify(details)}</div>;
    },
  },
  {
    accessorKey: "current_stage_entered_at",
    header: "Time in Stage",
    cell: ({ row }) => {
      const enteredAt = row.getValue("current_stage_entered_at") as
        | string
        | null;
      if (!enteredAt) return <div>-</div>;
      try {
        return (
          <div>
            {formatDistanceToNow(new Date(enteredAt), { addSuffix: true })}
          </div>
        );
      } catch (error) {
        console.error("Error formatting date:", error);
        return <div>Invalid Date</div>;
      }
    },
    sortingFn: "datetime", // Enable sorting by date
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const item = row.original;
      const meta = table.options.meta as ItemListTableMeta | undefined;

      // Prepare item data for modal
      const reworkableItem: ReworkableItem = {
        id: item.id,
        current_stage_id: item.current_stage_id,
        current_sub_stage_id: item.current_sub_stage_id,
        display_name: item.sku, // Use SKU as display name, adjust if needed
      };

      // Determine if actions are possible
      const canMove = meta?.userRole === "Owner" || meta?.userRole === "Worker";
      const canRework = meta?.userRole === "Owner";
      const canViewHistory = true; // Assuming anyone can view history
      const canAddRemark = canMove; // Both Owner and Worker can add remarks

      if (!canMove && !canRework && !canViewHistory && !canAddRemark) {
        return null; // No actions available for this user
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              disabled={meta?.isMovingItems}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {canMove && (
              <DropdownMenuItem
                onClick={() => meta?.handleMoveForward([item.id])}
                disabled={meta?.isMovingItems}
              >
                Move Forward
              </DropdownMenuItem>
            )}
            {canRework && (
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                onClick={() => meta?.handleOpenReworkModal([reworkableItem])}
                disabled={meta?.isMovingItems}
              >
                Send Back for Rework
              </DropdownMenuItem>
            )}
            {canAddRemark && (
              <AddRemarkModal itemId={item.id}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Add Remark
                </DropdownMenuItem>
              </AddRemarkModal>
            )}
            {(canMove || canRework || canAddRemark) && (
              <DropdownMenuSeparator />
            )}
            {canViewHistory && (
              <DropdownMenuItem
                onClick={() => meta?.onViewHistory?.(item.id, item.sku)}
                disabled={meta?.isMovingItems || !meta?.onViewHistory}
              >
                View History
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];

// --- Component ---

// Define Meta type for table options
interface ItemListTableMeta {
  onViewHistory?: (itemId: string, itemSku: string) => void;
  handleMoveForward: (itemIds: string[]) => void;
  handleOpenReworkModal: (items: ReworkableItem[]) => void;
  isMovingItems: boolean;
  userRole?: string | null;
}

interface ItemListTableProps {
  organizationId: string | undefined | null;
  stageId: string;
  subStageId: string | null;
}

export function ItemListTable({
  organizationId,
  stageId,
  subStageId,
}: ItemListTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  // State for History Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItemId, setHistoryItemId] = useState<string | null>(null);
  const [historyItemSku, setHistoryItemSku] = useState<string | null>(null);

  // State for Rework Modal
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
  const [reworkItems, setReworkItems] = useState<ReworkableItem[]>([]);

  const {
    data: items,
    isLoading: isLoadingItems,
    isError: isItemsError,
    error: itemsError,
  } = useItemsInStage(organizationId, stageId, subStageId);

  const { profile, isLoading: isLoadingUser } = useAuth();
  const moveItemsMutation = useMoveItemsForward();

  // Determine role from profile (assuming profile has a 'role' property)
  const userRole = profile?.role; // Safely access role from profile
  const isOwner = userRole === "Owner";
  const canPerformBulkActions = isOwner || userRole === "Worker"; // Move or Rework

  // Function to open history modal
  const handleViewHistory = (itemId: string, itemSku: string) => {
    setHistoryItemId(itemId);
    setHistoryItemSku(itemSku);
    setIsHistoryModalOpen(true);
  };

  // Function to open rework modal
  const handleOpenReworkModal = (itemsToRework: ReworkableItem[]) => {
    if (!isOwner) {
      console.warn("Attempted to open rework modal without Owner role.");
      return; // Prevent non-owners from opening
    }
    if (itemsToRework.length > 0) {
      setReworkItems(itemsToRework);
      setIsReworkModalOpen(true);
    } else {
      console.log("No items selected for rework.");
    }
  };

  const handleMoveForward = (itemIds: string[]) => {
    if (!canPerformBulkActions) {
      console.warn("Move Forward: Insufficient permissions.");
      return;
    }
    if (itemIds.length === 0 || !organizationId) {
      console.warn(
        "Cannot move items: No items selected or organizationId missing."
      );
      return;
    }
    moveItemsMutation.mutate(
      { itemIds, organizationId },
      {
        onSuccess: () => {
          setRowSelection({}); // Clear selection on success
        },
      }
    );
  };

  // Callback for successful rework action
  const handleReworkSuccess = () => {
    setRowSelection({}); // Clear selection after successful rework
  };

  const table = useReactTable<ItemInStage>({
    data: items ?? [],
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 10, // Default page size
      },
    },
    meta: {
      onViewHistory: handleViewHistory,
      handleMoveForward: handleMoveForward,
      handleOpenReworkModal: handleOpenReworkModal,
      isMovingItems: moveItemsMutation.isPending,
      userRole: userRole,
    } as ItemListTableMeta,
  });

  // Get selected item data for bulk actions
  const selectedItemsData = table.getSelectedRowModel().rows.map((row) => ({
    id: row.original.id,
    current_stage_id: row.original.current_stage_id,
    current_sub_stage_id: row.original.current_sub_stage_id,
    display_name: row.original.sku, // Use SKU as display name
  }));

  // Loading state: Check user loading AND item loading
  if (isLoadingUser || isLoadingItems) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isItemsError) {
    return (
      <div className="text-destructive">
        Error loading items: {itemsError?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Area above table for bulk actions */}
      <div className="flex items-center justify-start space-x-2 py-4">
        {canPerformBulkActions && (
          <Button
            variant="outline"
            onClick={() =>
              handleMoveForward(selectedItemsData.map((item) => item.id))
            }
            disabled={
              selectedItemsData.length === 0 || moveItemsMutation.isPending
            }
            size="sm"
          >
            Move Selected ({selectedItemsData.length})
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        {isOwner && (
          <Button
            variant="outline"
            onClick={() => handleOpenReworkModal(selectedItemsData)}
            disabled={
              selectedItemsData.length === 0 || moveItemsMutation.isPending
            }
            size="sm"
          >
            Send Back Selected ({selectedItemsData.length})
            <Undo2 className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      {/* Table */}
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="bg-muted/50 first:rounded-tl-md last:rounded-tr-md"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No items found in this stage.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Pagination Controls */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage() || moveItemsMutation.isPending}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage() || moveItemsMutation.isPending}
        >
          Next
        </Button>
      </div>

      {/* Render the History Modal */}
      <ItemHistoryModal
        itemId={historyItemId}
        itemSku={historyItemSku}
        isOpen={isHistoryModalOpen}
        onOpenChange={setIsHistoryModalOpen}
      />
      {/* Render the Rework Modal */}
      <ReworkModal
        isOpen={isReworkModalOpen}
        onOpenChange={setIsReworkModalOpen}
        items={reworkItems}
        onSuccess={handleReworkSuccess}
      />
    </div>
  );
}

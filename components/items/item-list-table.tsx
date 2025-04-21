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

import { MoreHorizontal, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
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

// Helper to display key instance details (customize as needed)
const displayInstanceDetails = (details: Record<string, unknown>): string => {
  // Example: Displaying first 2 key-value pairs or specific keys
  return Object.entries(details)
    .slice(0, 2) // Show limited details in the table
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
};

// Define Columns - Adding meta type for mutation access
export const columns: ColumnDef<ItemInStage>[] = [
  {
    id: "select",
    header: ({ table }) => {
      const meta = table.options.meta as ItemListTableMeta | undefined;
      if (!meta?.canPerformActions) {
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
      if (!meta?.canPerformActions) {
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
    cell: ({ row }) => <div>{row.getValue("sku")}</div>,
  },
  {
    accessorKey: "instance_details",
    header: "Details",
    cell: ({ row }) => {
      const details = row.getValue("instance_details") as Record<
        string,
        unknown
      >;
      return <div>{displayInstanceDetails(details)}</div>;
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
      const meta = table.options.meta as ItemListTableMeta | undefined; // Allow meta to be potentially undefined

      // Don't render the action menu if the user cannot perform actions or meta is missing
      if (!meta?.canPerformActions) {
        return null;
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              disabled={meta.isMovingItems}
            >
              {" "}
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {/* Move Forward is role-restricted */}
            {meta.canPerformActions && (
              <DropdownMenuItem
                onClick={() => meta.handleMoveForward([item.id])}
                disabled={meta.isMovingItems}
              >
                Move Forward
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                // Ensure onViewHistory exists before calling
                if (meta.onViewHistory) {
                  meta.onViewHistory(item.id, item.sku);
                }
              }}
              // Also disable if onViewHistory doesn't exist
              disabled={!meta.onViewHistory || meta.isMovingItems}
            >
              View History
            </DropdownMenuItem>
            {/* Removed unused separator and placeholder delete action */}
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
  handleMoveForward: (itemIds: string[]) => void; // Add move forward handler
  isMovingItems: boolean; // Add loading state for mutation
  canPerformActions: boolean; // Flag for role-based action permission
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
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({}); // Fix type for rowSelection

  // State for History Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItemId, setHistoryItemId] = useState<string | null>(null);
  const [historyItemSku, setHistoryItemSku] = useState<string | null>(null);

  const {
    data: items,
    isLoading: isLoadingItems,
    isError: isItemsError,
    error: itemsError,
  } = useItemsInStage(organizationId, stageId, subStageId);

  const { profile, isLoading: isLoadingUser } = useAuth(); // Use correct hook and get profile

  const moveItemsMutation = useMoveItemsForward();

  // Determine role from profile (assuming profile has a 'role' property)
  const userRole = profile?.role; // Safely access role from profile

  // Determine if the current user can perform actions based on role
  const canPerformActions =
    !isLoadingUser && (userRole === "Owner" || userRole === "Worker");

  // Function to open history modal
  const handleViewHistory = (itemId: string, itemSku: string) => {
    setHistoryItemId(itemId);
    setHistoryItemSku(itemSku);
    setIsHistoryModalOpen(true);
  };

  const handleMoveForward = (itemIds: string[]) => {
    if (itemIds.length === 0 || !organizationId || !canPerformActions) {
      // Add role check
      console.warn(
        "Cannot move items: No items selected, organizationId missing, or insufficient permissions."
      );
      return;
    }
    moveItemsMutation.mutate(
      { itemIds, organizationId },
      {
        onSuccess: () => {
          // Clear selection after successful mutation
          setRowSelection({});
        },
      }
    );
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
      isMovingItems: moveItemsMutation.isPending,
      canPerformActions: canPerformActions, // Pass permission flag
    } as ItemListTableMeta,
  });

  // Selected row IDs accessor
  const selectedRowIds = Object.keys(rowSelection)
    .filter(
      (key) => rowSelection[key] // Check if key exists and is true
    )
    .map((key) => table.getRow(key).original.id);

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
      <div className="flex items-center justify-between space-x-2 py-4">
        {/* Conditionally render the main Move Forward button */}
        {canPerformActions && (
          <Button
            onClick={() => handleMoveForward(selectedRowIds)}
            disabled={
              selectedRowIds.length === 0 || moveItemsMutation.isPending
            }
          >
            Move Selected ({selectedRowIds.length}){" "}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        {/* Add Filters or other controls here if needed */}
      </div>
      {/* Table */}
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
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
    </div>
  );
}

"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  getPaginationRowModel,
  RowSelectionState,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ItemInStage,
  useItemsInStage,
} from "@/hooks/queries/use-items-in-stage";
import { FetchedWorkflowStage } from "@/hooks/queries/use-workflow-structure";

// Re-define necessary types locally or import if centralized
interface ReworkableItem {
  id: string;
  current_stage_id: string;
  current_sub_stage_id?: string | null;
  display_name?: string;
}

interface ItemListTableMeta {
  onViewHistory?: (itemId: string, itemSku: string) => void;
  handleMoveForward: (itemIds: string[], targetStageId?: string | null) => void;
  handleOpenReworkModal: (items: ReworkableItem[]) => void;
  isMovingItems: boolean;
  userRole?: string | null;
  workflowData?: FetchedWorkflowStage[];
  isWorkflowLoading: boolean;
  currentStageId: string;
  currentSubStageId: string | null;
  subsequentStages?: { id: string; name: string | null }[];
}

interface ItemTableCoreProps {
  organizationId: string | undefined | null;
  stageId: string;
  subStageId: string | null;
  orderIdFilter: string | null;
  columns: ColumnDef<ItemInStage>[]; // Pass columns definition
  // Pass state and handlers needed by the table meta/rendering
  userRole?: string | null;
  isMovingItems: boolean;
  onViewHistory: (itemId: string, itemSku: string) => void;
  handleMoveForward: (itemIds: string[], targetStageId?: string | null) => void;
  handleOpenReworkModal: (items: ReworkableItem[]) => void;
  // Add state setters for sorting/filtering/selection if managed outside
  sorting: SortingState;
  onSortingChange: React.Dispatch<React.SetStateAction<SortingState>>;
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: React.Dispatch<
    React.SetStateAction<ColumnFiltersState>
  >;
  rowSelection: RowSelectionState;
  onRowSelectionChange: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  // Add workflow data needed for meta
  workflowData?: FetchedWorkflowStage[];
  isWorkflowLoading: boolean;
  currentStageId: string;
  currentSubStageId: string | null;
  // Accept calculated subsequent stages
  subsequentStages?: { id: string; name: string | null }[];
}

export function ItemTableCore({
  organizationId,
  stageId,
  subStageId,
  orderIdFilter,
  columns,
  userRole,
  isMovingItems,
  onViewHistory,
  handleMoveForward,
  handleOpenReworkModal,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  rowSelection,
  onRowSelectionChange,
  workflowData,
  isWorkflowLoading,
  currentStageId,
  currentSubStageId,
  subsequentStages,
}: ItemTableCoreProps) {
  // Fetch data based on props
  const {
    data: items,
    isLoading: isLoadingItems,
    isError: isItemsError,
    error: itemsError,
  } = useItemsInStage(organizationId, stageId, subStageId, orderIdFilter);

  // Create table instance
  const table = useReactTable<ItemInStage>({
    data: items ?? [],
    columns,
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange,
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange,
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
      onViewHistory: onViewHistory,
      handleMoveForward: handleMoveForward,
      handleOpenReworkModal: handleOpenReworkModal,
      isMovingItems: isMovingItems,
      userRole: userRole,
      workflowData: workflowData,
      isWorkflowLoading: isWorkflowLoading,
      currentStageId: currentStageId,
      currentSubStageId: currentSubStageId,
      subsequentStages: subsequentStages,
    } as ItemListTableMeta,
    // Needed for selection state access in parent
    enableRowSelection: true,
  });

  // Pass selected row data back up (or handle bulk actions differently)
  // For now, let's assume the parent (`ItemListTable`) gets selection state
  // via `rowSelection` prop and computes `selectedItemsData` there.

  // Loading state
  if (isLoadingItems) {
    // Simplified skeleton for the table part
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isItemsError) {
    let displayError = "Error loading items: Unknown error";
    if (itemsError?.message) {
      // Check for the specific UUID syntax error
      if (itemsError.message.includes("invalid input syntax for type uuid")) {
        displayError =
          "Invalid Order ID format. Please check the ID and try again.";
      } else {
        // Use the original error message for other errors
        displayError = `Error loading items: ${itemsError.message}`;
      }
    }
    return <div className="text-destructive p-4">{displayError}</div>; // Added padding
  }

  return (
    <>
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
                  colSpan={columns.length} // Use dynamic columns length
                  className="h-24 text-center"
                >
                  No items found matching the criteria.
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
          disabled={!table.getCanPreviousPage() || isMovingItems}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage() || isMovingItems}
        >
          Next
        </Button>
      </div>
    </>
  );
}

"use client";

import * as React from "react";
import { useState } from "react";
import {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  RowSelectionState,
} from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner"; // Import toast

import {
  MoreHorizontal,
  ChevronRight,
  Undo2,
  X,
  History,
  Download,
  ChevronsRight, // Icon for submenu
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ItemInStage } from "@/hooks/queries/use-items-in-stage"; // Keep type import
import { useMoveItemsForward } from "@/hooks/mutations/use-move-items-forward";
import { ItemHistoryModal } from "./item-history-modal";
import { useAuth } from "@/hooks/use-auth";
import { ReworkModal } from "./rework-modal";
import { AddRemarkModal } from "./add-remark-modal";
import { useDebounce } from "@/hooks/queries/use-debounce";
import { ItemTableCore } from "./item-table-core"; // Import the new core component
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import {
  useWorkflowStructure,
  FetchedWorkflowStage,
} from "@/hooks/queries/use-workflow-structure"; // Import the hook AND type
import { getSubsequentStages } from "@/lib/workflow-utils"; // Assuming this utility function exists or will be created

// --- Types --- //

// Update meta type
interface ItemListTableMeta {
  onViewHistory?: (itemId: string, itemSku: string) => void;
  handleMoveForward: (itemIds: string[], targetStageId?: string | null) => void; // Add optional targetStageId
  handleOpenReworkModal: (items: ReworkableItem[]) => void;
  isMovingItems: boolean;
  userRole?: string | null;
  // Use specific type and add subsequent stages list
  workflowData?: FetchedWorkflowStage[];
  isWorkflowLoading: boolean;
  currentStageId: string;
  currentSubStageId: string | null;
  subsequentStages?: { id: string; name: string | null }[];
}

interface ReworkableItem {
  id: string;
  current_stage_id: string;
  current_sub_stage_id?: string | null;
  display_name?: string;
}

// --- Columns Definition (kept here for clarity) --- //

// Define Columns - Adding meta type for mutation access
// Note: The 'meta' accessed here will be passed down to ItemTableCore
export const columns: ColumnDef<ItemInStage>[] = [
  {
    id: "select",
    header: ({ table }) => {
      // Access meta through table options
      const meta = table.options.meta as ItemListTableMeta | undefined; // Use defined type
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
      const meta = table.options.meta as ItemListTableMeta | undefined; // Use defined type
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
    id: "history",
    header: "History",
    cell: ({ row, table }) => {
      const item = row.original;
      const meta = table.options.meta as ItemListTableMeta | undefined;
      const canViewHistory = !!meta?.onViewHistory; // Button enabled if handler exists

      if (!canViewHistory) {
        return null; // Or potentially a disabled placeholder
      }

      return (
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => meta.onViewHistory?.(item.id, item.sku)}
          disabled={meta.isMovingItems}
          aria-label="View Item History"
        >
          <History className="h-4 w-4" />
        </Button>
      );
    },
    enableSorting: false,
  },
  {
    id: "voucher",
    header: "Voucher",
    cell: ({ row, table }) => {
      const item = row.original;
      const meta = table.options.meta as ItemListTableMeta | undefined;
      // Explicitly type item to check for the history ID property
      const currentStageHistoryId = (
        item as ItemInStage & { current_stage_history_id?: string }
      ).current_stage_history_id;

      const canDownloadHistoricalVoucher =
        meta?.userRole === "Owner" && !!currentStageHistoryId;

      if (!canDownloadHistoricalVoucher) {
        return null; // Or a placeholder/disabled button
      }

      return (
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          asChild
          disabled={meta.isMovingItems}
          aria-label="Download Voucher for this Stage"
        >
          <a
            href={`/api/vouchers/${item.id}?history_id=${currentStageHistoryId}`}
            target="_blank"
            rel="noopener noreferrer"
            // Prevent click propagation if needed, though 'asChild' might handle this
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-4 w-4" />
          </a>
        </Button>
      );
    },
    enableSorting: false,
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const item = row.original;
      const meta = table.options.meta as ItemListTableMeta | undefined;

      // Extract necessary info from meta
      const { subsequentStages, isWorkflowLoading } = meta || {};

      const reworkableItem: ReworkableItem = {
        id: item.id,
        current_stage_id: item.current_stage_id,
        current_sub_stage_id: item.current_sub_stage_id,
        display_name: item.sku,
      };

      const canMove = meta?.userRole === "Owner" || meta?.userRole === "Worker";
      const canRework = meta?.userRole === "Owner";
      const canAddRemark = canMove;

      if (!canMove && !canRework && !canAddRemark) {
        return null; // Only show dropdown if there are move/rework/remark actions
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
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={meta?.isMovingItems}>
                  <ChevronsRight className="mr-2 h-4 w-4" />
                  <span>Move Forward</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={() => meta?.handleMoveForward([item.id])} // No targetStageId means immediate next
                      disabled={meta?.isMovingItems}
                    >
                      Immediate Next Stage
                    </DropdownMenuItem>
                    {/* Render subsequent stages if available */}
                    {(subsequentStages?.length ?? 0) > 0 && (
                      <DropdownMenuSeparator />
                    )}
                    {isWorkflowLoading ? (
                      <DropdownMenuItem disabled>
                        Loading stages...
                      </DropdownMenuItem>
                    ) : (
                      subsequentStages?.map(
                        (stage: { id: string; name: string | null }) => (
                          <DropdownMenuItem
                            key={stage.id}
                            onClick={() =>
                              meta?.handleMoveForward([item.id], stage.id)
                            } // Pass targetStageId
                            disabled={meta?.isMovingItems}
                          >
                            {stage.name || `Stage ${stage.id.substring(0, 6)}`}
                          </DropdownMenuItem>
                        )
                      )
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )}
            {canRework && (
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()} // Prevent closing menu
                onClick={() => meta?.handleOpenReworkModal([reworkableItem])}
                disabled={meta?.isMovingItems}
              >
                Send Back for Rework
              </DropdownMenuItem>
            )}
            {canAddRemark && (
              <AddRemarkModal itemId={item.id}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  {" "}
                  {/* Prevent closing menu */}
                  Add Remark
                </DropdownMenuItem>
              </AddRemarkModal>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];

// --- Main Component --- //

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
  // --- State Management --- //
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({}); // Use specific type
  const [filterInput, setFilterInput] = useState<string>("");
  const debouncedFilter = useDebounce(filterInput, 300);

  // Modal States
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItemId, setHistoryItemId] = useState<string | null>(null);
  const [historyItemSku, setHistoryItemSku] = useState<string | null>(null);
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
  const [reworkItems, setReworkItems] = useState<ReworkableItem[]>([]);

  // --- Hooks --- //
  const { profile, isLoading: isLoadingUser } = useAuth(); // Keep auth hook here for roles
  const moveItemsMutation = useMoveItemsForward();
  // Fetch workflow structure
  const {
    data: workflowData,
    isLoading: isWorkflowLoading,
    error: workflowError,
  } = useWorkflowStructure(organizationId);

  // State for Export Button
  const [isExporting, setIsExporting] = React.useState(false);

  // Handle workflow fetch error
  React.useEffect(() => {
    if (workflowError) {
      toast.error(`Failed to load workflow data: ${workflowError.message}`);
    }
  }, [workflowError]);

  // Calculate subsequent stages once
  const subsequentStages = React.useMemo(() => {
    if (!workflowData || isWorkflowLoading || !stageId) return [];
    return getSubsequentStages(workflowData, stageId, subStageId);
  }, [workflowData, isWorkflowLoading, stageId, subStageId]);

  // --- Derived State / Roles --- //
  const userRole = profile?.role;
  // Ensure userRole is string | null | undefined before passing down
  const typedUserRole =
    typeof userRole === "string" || userRole === null || userRole === undefined
      ? userRole
      : undefined;
  const isOwner = userRole === "Owner";
  const canPerformBulkActions = isOwner || userRole === "Worker";

  // --- Handlers --- //
  const handleViewHistory = (itemId: string, itemSku: string) => {
    setHistoryItemId(itemId);
    setHistoryItemSku(itemSku);
    setIsHistoryModalOpen(true);
  };

  const handleOpenReworkModal = (itemsToRework: ReworkableItem[]) => {
    if (!isOwner) {
      console.warn("Attempted to open rework modal without Owner role.");
      return;
    }
    if (itemsToRework.length > 0) {
      setReworkItems(itemsToRework);
      setIsReworkModalOpen(true);
    } else {
      console.log("No items selected for rework.");
    }
  };

  const handleMoveForward = (
    itemIds: string[],
    targetStageId?: string | null // Add optional targetStageId
  ) => {
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
      { itemIds, organizationId, targetStageId }, // Pass targetStageId to mutation
      {
        onSuccess: (data, variables) => {
          setRowSelection({}); // Clear selection on success
          toast.success(
            `Successfully moved ${variables.itemIds.length} item(s) forward.`
          );
        },
        onError: (error) => {
          let errorMessage = "An unexpected error occurred.";
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (
            error &&
            typeof error === "object" && // Check if error is an object
            "message" in error && // Check if it has a message property
            typeof (error as { message?: unknown }).message === "string" // Check if message is string
          ) {
            // Attempt to get message from generic object error
            errorMessage = (error as { message: string }).message;
          }
          toast.error(`Failed to move items: ${errorMessage}`);
        },
      }
    );
  };

  const handleReworkSuccess = () => {
    setRowSelection({});
  };

  // --- CSV Export Handler --- //
  const handleExportCsv = async () => {
    if (!isOwner) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating CSV export...");

    try {
      const params = new URLSearchParams();
      if (stageId) params.set("stageId", stageId);
      if (subStageId) params.set("subStageId", subStageId);
      if (debouncedFilter) params.set("orderId", debouncedFilter); // Assuming filter is orderId

      const response = await fetch(`/api/items/export?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP Error: ${response.status}`);
      }

      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const contentDisposition = response.headers.get("content-disposition");
      let filename = "trackure_export.csv"; // Default filename
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success("CSV export generated successfully.", { id: toastId });
    } catch (error) {
      console.error("Failed to export CSV:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to export CSV: ${message}`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // --- Compute Selected Items Data (Needed for Bulk Actions) --- //
  // This needs access to the table instance, which is now in ItemTableCore.
  // Option 1: Pass `setRowSelection` down and get selected IDs directly.
  // Option 2: Pass the full `rowSelection` state down and have ItemTableCore compute?
  // Option 3: Define a function here to get selected items based on rowSelection state.

  // Let's use Option 3: Calculate based on rowSelection state held here.
  // This requires knowing the data structure (ItemInStage), but avoids passing table instance.
  // *Limitation*: This won't work correctly if data isn't available here yet or pagination is used.
  // A better approach might involve callbacks or state lifting for selected IDs.

  // For now, we calculate based on the selection keys, assuming they are item IDs.
  // THIS IS FLAWED with pagination/filtering if not all selected rows are currently loaded/visible.
  // A more robust solution is needed if bulk actions across pages are required.
  const selectedItemIds = Object.keys(rowSelection).filter(
    (key) => rowSelection[key]
  );
  // Update data structure for rework - Fetch actual data for selected items?
  // TODO: Refactor how selectedItemsData for rework is gathered.
  const selectedItemsDataForRework = selectedItemIds.map((id) => {
    // Find the full item data from the table's data source if possible
    // This is still inefficient and potentially incorrect with pagination/filtering.
    // const itemData = table.getRowModel().rowsById[id]?.original;
    return {
      id: id,
      // Use current stage/substage from props as fallback
      current_stage_id: stageId,
      current_sub_stage_id: subStageId,
      display_name: `Item ${id.substring(0, 6)}...`, // Placeholder name
    };
  });

  // Loading state for Auth - blocks rendering controls if user role isn't known
  if (isLoadingUser) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full" /> {/* Control row placeholder */}
        <Skeleton className="h-40 w-full" /> {/* Table area placeholder */}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Area above table for bulk actions and filter */}
      <div className="flex items-center justify-between py-4">
        {/* Left side: Bulk action buttons */}
        <div className="flex items-center space-x-2">
          {canPerformBulkActions && (
            <Button
              variant="outline"
              onClick={() => handleMoveForward(selectedItemIds)} // Bulk move still goes to immediate next
              disabled={
                selectedItemIds.length === 0 || moveItemsMutation.isPending
              }
              size="sm"
            >
              Move Selected Forward ({selectedItemIds.length})
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {isOwner && (
            <Button
              variant="outline"
              // Pass the potentially incomplete data for now
              onClick={() => handleOpenReworkModal(selectedItemsDataForRework)}
              disabled={
                selectedItemIds.length === 0 || moveItemsMutation.isPending
              }
              size="sm"
            >
              Send Back Selected ({selectedItemIds.length})
              <Undo2 className="ml-2 h-4 w-4" />
            </Button>
          )}
          {isOwner && (
            <Button
              variant="outline"
              onClick={handleExportCsv}
              disabled={isExporting || moveItemsMutation.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
          )}
        </div>

        {/* Right side: Filter input */}
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Filter by Order ID..."
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
            className="max-w-xs"
          />
          {filterInput && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFilterInput("")}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear filter</span>
            </Button>
          )}
        </div>
      </div>

      {/* Render the core table component */}
      <ItemTableCore
        organizationId={organizationId}
        stageId={stageId}
        subStageId={subStageId}
        orderIdFilter={debouncedFilter || null}
        columns={columns} // Pass the columns definition
        userRole={typedUserRole} // Pass the correctly typed userRole
        isMovingItems={moveItemsMutation.isPending}
        onViewHistory={handleViewHistory}
        handleMoveForward={handleMoveForward} // Pass down handlers
        handleOpenReworkModal={handleOpenReworkModal} // Pass down handlers
        // Pass necessary data for meta
        workflowData={workflowData} // Still needed for meta
        isWorkflowLoading={isWorkflowLoading} // Still needed for meta
        currentStageId={stageId} // Still needed for meta
        currentSubStageId={subStageId} // Still needed for meta
        subsequentStages={subsequentStages} // Pass calculated stages
        // Pass state and setters for table state management
        sorting={sorting}
        onSortingChange={setSorting}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />

      {/* Render Modals */}
      <ItemHistoryModal
        itemId={historyItemId}
        itemSku={historyItemSku}
        isOpen={isHistoryModalOpen}
        onOpenChange={setIsHistoryModalOpen}
      />
      <ReworkModal
        isOpen={isReworkModalOpen}
        onOpenChange={setIsReworkModalOpen}
        items={reworkItems} // Pass the state held here
        onSuccess={handleReworkSuccess}
      />
    </div>
  );
}

// Removed the old table rendering logic, useItemsInStage hook call, useReactTable hook call.

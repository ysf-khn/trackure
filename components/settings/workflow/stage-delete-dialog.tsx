"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { z } from "zod";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

// Define a minimal Stage type matching the API and data structure
interface Stage {
  id: string;
  name: string;
  organization_id: string;
  // Add other fields if necessary
}

interface ApiErrorResponse {
  error?: string;
  code?: string; // Include code for specific errors like STAGE_IN_USE
  issues?: z.ZodIssue[]; // Now z is defined
}

interface StageDeleteDialogProps {
  stage: Stage | null; // Stage to delete (or null if not set)
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StageDeleteDialog({
  stage,
  isOpen,
  onOpenChange,
}: StageDeleteDialogProps) {
  const queryClient = useQueryClient();

  const deleteStageMutation = useMutation<
    unknown,
    AxiosError<ApiErrorResponse>,
    string // Expects stageId as input
  >({
    mutationFn: (stageId) => {
      return axios.delete(`/api/settings/workflow/stages/${stageId}`);
    },
    onSuccess: () => {
      toast.success(`Stage successfully deleted.`);
      if (stage) {
        queryClient.invalidateQueries({
          queryKey: ["workflowStructure", stage.organization_id],
        });
      }
      onOpenChange(false); // Close the dialog
    },
    onError: (error) => {
      console.error("Error deleting stage:", error);
      // Provide more specific feedback for known errors
      const errorCode = error.response?.data?.code;
      let errorMsg =
        error.response?.data?.error ||
        "Failed to delete stage. Please try again.";

      if (errorCode === "STAGE_IN_USE") {
        // Use the specific message from the API if available
        errorMsg =
          error.response?.data?.error ||
          `Cannot delete stage because items are currently in it.`;
      }

      toast.error(errorMsg, { duration: 5000 }); // Show potentially longer messages
    },
  });

  const handleDeleteConfirm = () => {
    if (stage) {
      deleteStageMutation.mutate(stage.id);
    } else {
      console.error("Delete confirmation attempted without a valid stage.");
      toast.error("Could not delete stage: Stage information missing.");
      onOpenChange(false);
    }
  };

  // Handle closing the dialog explicitly
  const handleClose = () => {
    if (!deleteStageMutation.isPending) {
      onOpenChange(false);
    }
  };

  if (!stage) {
    // Don't render the dialog content if no stage is selected
    // This prevents errors if the dialog accidentally opens without a target
    return null;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      {/* No AlertDialogTrigger here - opened by parent component */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            <strong className="px-1">{stage.name}</strong>
            stage. You cannot delete a stage if there are items currently
            assigned to it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleClose}
            disabled={deleteStageMutation.isPending}
          >
            Cancel
          </AlertDialogCancel>
          {/* Use a Button for the action to apply danger variant */}
          <Button
            variant="destructive"
            onClick={handleDeleteConfirm}
            disabled={deleteStageMutation.isPending}
          >
            {deleteStageMutation.isPending
              ? "Deleting..."
              : "Yes, delete stage"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

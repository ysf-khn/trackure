"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { WorkflowSubStage } from "@/types/workflow"; // Assuming type exists

// Schema matching the backend API (only name is updatable here)
const editSubStageSchema = z.object({
  name: z.string().min(1, { message: "Sub-stage name cannot be empty." }),
});

type EditSubStageFormData = z.infer<typeof editSubStageSchema>;

interface EditSubStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  subStage: WorkflowSubStage | null; // Sub-stage object to edit
}

export function EditSubStageModal({
  isOpen,
  onClose,
  organizationId,
  subStage,
}: EditSubStageModalProps) {
  const queryClient = useQueryClient();

  const form = useForm<EditSubStageFormData>({
    resolver: zodResolver(editSubStageSchema),
    defaultValues: {
      name: subStage?.name || "",
    },
  });

  // Reset form when modal opens with a new subStage
  useEffect(() => {
    if (isOpen && subStage) {
      form.reset({ name: subStage.name });
    } else if (!isOpen) {
      // Clear form on close
      form.reset({ name: "" });
    }
  }, [isOpen, subStage, form]);

  const mutation = useMutation<
    WorkflowSubStage, // Success type (API returns updated sub-stage)
    AxiosError<{ error: string | { _errors: string[] } }>, // Error type
    EditSubStageFormData // Variables type
  >({
    mutationFn: (updatedData) => {
      if (!subStage?.id) throw new Error("Sub-stage ID is missing.");
      return axios
        .put(`/api/settings/workflow/sub-stages/${subStage.id}`, updatedData)
        .then((res) => res.data); // Return data on success
    },
    onSuccess: (data) => {
      toast.success(`Sub-stage "${data.name}" updated successfully.`);
      queryClient.invalidateQueries({
        queryKey: ["workflowStructure", organizationId],
      });
      onClose();
    },
    onError: (error) => {
      const errorMsg =
        typeof error.response?.data.error === "string"
          ? error.response.data.error
          : "Failed to update sub-stage. Please try again.";
      toast.error("Error Updating Sub-Stage", { description: errorMsg });
    },
  });

  const onSubmit = (data: EditSubStageFormData) => {
    if (!subStage) return; // Should not happen if modal is open
    mutation.mutate(data);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
    // Allow opening even if subStage is null initially, useEffect handles reset
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Sub-Stage</DialogTitle>
        </DialogHeader>
        {subStage ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub-Stage Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Quality Check" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Sequence order is not editable here, handled by reordering */}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          // Render loading or placeholder if subStage is null when opening
          <p>Loading sub-stage data...</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React from "react";
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

// Schema matching the backend API
const addSubStageSchema = z.object({
  name: z.string().min(1, { message: "Sub-stage name cannot be empty." }),
  sequence_order: z.coerce // Use coerce for number input from string
    .number({ invalid_type_error: "Sequence must be a number." })
    .int()
    .positive({ message: "Sequence must be a positive number." }),
});

type AddSubStageFormData = z.infer<typeof addSubStageSchema>;

interface AddSubStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  stageId: string | null; // Stage ID under which to add the sub-stage
  nextSequenceOrder: number; // Pre-calculated next sequence order
}

export function AddSubStageModal({
  isOpen,
  onClose,
  organizationId,
  stageId,
  nextSequenceOrder,
}: AddSubStageModalProps) {
  const queryClient = useQueryClient();

  const form = useForm<AddSubStageFormData>({
    resolver: zodResolver(addSubStageSchema),
    defaultValues: {
      name: "",
      sequence_order: nextSequenceOrder, // Set default sequence
    },
  });

  // Reset form when modal opens with a new stageId or nextSequenceOrder
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        name: "",
        sequence_order: nextSequenceOrder,
      });
    }
  }, [isOpen, nextSequenceOrder, form]);

  const mutation = useMutation<
    unknown, // Success type (adjust if API returns data)
    AxiosError<{ error: string | { _errors: string[] } }>, // Error type
    AddSubStageFormData // Variables type
  >({
    mutationFn: (newSubStage) => {
      if (!stageId) throw new Error("Stage ID is missing.");
      return axios.post(
        `/api/settings/workflow/stages/${stageId}/sub-stages`,
        newSubStage
      );
    },
    onSuccess: () => {
      toast.success("New sub-stage added successfully.");
      // Invalidate query to refetch workflow structure
      queryClient.invalidateQueries({
        queryKey: ["workflowStructure", organizationId],
      });
      onClose(); // Close modal
    },
    onError: (error) => {
      const errorMsg =
        typeof error.response?.data.error === "string"
          ? error.response.data.error
          : "Failed to add sub-stage. Please try again.";
      toast.error(errorMsg);
    },
  });

  const onSubmit = (data: AddSubStageFormData) => {
    mutation.mutate(data);
  };

  // Prevent modal close if stageId is missing
  const handleOpenChange = (open: boolean) => {
    if (!open || stageId) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen && !!stageId} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Sub-Stage</DialogTitle>
        </DialogHeader>
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
            <FormField
              control={form.control}
              name="sequence_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sequence Order</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                Add Sub-Stage
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

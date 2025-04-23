// Create file: components/settings/add-stage-modal.tsx
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { getWorkflowQueryKey } from "@/hooks/queries/use-workflow-structure"; // Assuming this helper exists

const addStageSchema = z.object({
  name: z.string().min(1, "Stage name cannot be empty."),
});

type AddStageFormValues = z.infer<typeof addStageSchema>;

interface AddStageModalProps {
  organizationId: string;
  isOpen: boolean;
  onClose: () => void;
}

async function createStage(
  values: AddStageFormValues,
  organizationId: string
): Promise<any> {
  // Note: organizationId is not needed in the body, it's handled by the API
  const response = await fetch(`/api/settings/workflow/stages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create stage");
  }
  return response.json();
}

export function AddStageModal({
  organizationId,
  isOpen,
  onClose,
}: AddStageModalProps) {
  const queryClient = useQueryClient();
  const form = useForm<AddStageFormValues>({
    resolver: zodResolver(addStageSchema),
    defaultValues: {
      name: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: AddStageFormValues) =>
      createStage(values, organizationId),
    onSuccess: (data) => {
      toast.success(`Stage "${data.name}" created successfully!`);
      // Invalidate query to refetch workflow structure
      queryClient.invalidateQueries({
        queryKey: getWorkflowQueryKey(organizationId),
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast.error(`Error creating stage: ${error.message}`);
    },
  });

  const onSubmit = (values: AddStageFormValues) => {
    mutation.mutate(values);
  };

  const handleClose = () => {
    if (mutation.isPending) return; // Prevent closing while submitting
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Workflow Stage</DialogTitle>
          <DialogDescription>
            Enter the name for the new stage. The sequence order will be
            automatically assigned.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Quality Check" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Adding..." : "Add Stage"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

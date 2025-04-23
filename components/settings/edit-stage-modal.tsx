// Create file: components/settings/edit-stage-modal.tsx
import React, { useEffect } from "react";
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
import type { WorkflowStage } from "@/types/workflow"; // Assuming a type definition exists

const editStageSchema = z.object({
  name: z.string().min(1, "Stage name cannot be empty."),
});

type EditStageFormValues = z.infer<typeof editStageSchema>;

interface EditStageModalProps {
  organizationId: string;
  stage: WorkflowStage | null; // Stage data to edit
  isOpen: boolean;
  onClose: () => void;
}

async function updateStage(
  stageId: string,
  values: EditStageFormValues,
  organizationId: string // Used for query invalidation key, not API call body
): Promise<WorkflowStage> {
  const response = await fetch(`/api/settings/workflow/stages/${stageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to update stage");
  }
  return response.json();
}

export function EditStageModal({
  organizationId,
  stage,
  isOpen,
  onClose,
}: EditStageModalProps) {
  const queryClient = useQueryClient();
  const form = useForm<EditStageFormValues>({
    resolver: zodResolver(editStageSchema),
    defaultValues: {
      name: stage?.name || "",
    },
  });

  // Reset form when stage data changes (e.g., opening modal for a different stage)
  useEffect(() => {
    if (stage) {
      form.reset({ name: stage.name });
    } else {
      form.reset({ name: "" });
    }
  }, [stage, form]);

  const mutation = useMutation({
    mutationFn: (values: EditStageFormValues) => {
      if (!stage?.id) throw new Error("Stage ID is missing");
      return updateStage(stage.id, values, organizationId);
    },
    onSuccess: (data) => {
      toast.success(`Stage renamed to "${data.name}" successfully!`);
      queryClient.invalidateQueries({
        queryKey: getWorkflowQueryKey(organizationId),
      });
      onClose(); // Close modal on success
    },
    onError: (error) => {
      toast.error(`Error updating stage: ${error.message}`);
    },
  });

  const onSubmit = (values: EditStageFormValues) => {
    mutation.mutate(values);
  };

  const handleClose = () => {
    if (mutation.isPending) return; // Prevent closing while submitting
    onClose(); // Resetting form handled by useEffect or next open
  };

  if (!stage) return null; // Don't render if no stage data

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Stage Name</DialogTitle>
          <DialogDescription>
            Update the name for the stage &quot;{stage.name}&quot;.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Stage Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter new stage name" {...field} />
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
                {mutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

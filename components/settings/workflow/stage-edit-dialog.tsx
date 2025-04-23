"use client";

import { useEffect } from "react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  // DialogTrigger, // Trigger will likely be external (e.g., an Edit button)
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

// Define a minimal Stage type matching the API and data structure
interface Stage {
  id: string;
  name: string;
  organization_id: string;
  // Add other fields if necessary, e.g., sequence_order if displayed
}

const editStageSchema = z.object({
  name: z.string().min(1, "Stage name is required."),
});

type EditStageFormValues = z.infer<typeof editStageSchema>;

interface ApiErrorResponse {
  error?: string;
  issues?: z.ZodIssue[];
}

interface StageEditDialogProps {
  stage: Stage;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // organizationId is implicitly available via stage.organization_id for query invalidation
}

export function StageEditDialog({
  stage,
  isOpen,
  onOpenChange,
}: StageEditDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<EditStageFormValues>({
    resolver: zodResolver(editStageSchema),
    defaultValues: {
      name: stage.name || "", // Pre-fill with current name
    },
  });

  // Effect to reset form when stage prop changes (e.g., opening dialog for a different stage)
  useEffect(() => {
    if (stage) {
      form.reset({ name: stage.name });
    }
  }, [stage, form]);

  const editStageMutation = useMutation<
    unknown,
    AxiosError<ApiErrorResponse>,
    EditStageFormValues
  >({
    mutationFn: (updatedStage) => {
      return axios.put(
        `/api/settings/workflow/stages/${stage.id}`,
        updatedStage
      );
    },
    onSuccess: () => {
      toast.success(`Stage "${form.getValues("name")}" updated successfully!`);
      queryClient.invalidateQueries({
        queryKey: ["workflowStructure", stage.organization_id],
      });
      onOpenChange(false); // Close the dialog
    },
    onError: (error) => {
      console.error("Error updating stage:", error);
      const errorMsg =
        error.response?.data?.error ||
        "Failed to update stage. Please try again.";
      toast.error(errorMsg);
    },
  });

  const onSubmit = (values: EditStageFormValues) => {
    // Only submit if the name has actually changed
    if (values.name !== stage.name) {
      editStageMutation.mutate(values);
    } else {
      onOpenChange(false); // Close if no changes were made
    }
  };

  // Handle closing the dialog explicitl
  const handleClose = () => {
    onOpenChange(false);
    // Optionally reset form to original stage name if needed when canceling
    // form.reset({ name: stage.name });
  };

  return (
    // Control open state externally via props
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {/* No DialogTrigger here - opened by parent component */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Stage: {stage.name}</DialogTitle>
          <DialogDescription>
            Update the name for this workflow stage.
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
                    <Input placeholder="e.g., Preparation" {...field} />
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
                disabled={editStageMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editStageMutation.isPending}>
                {editStageMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

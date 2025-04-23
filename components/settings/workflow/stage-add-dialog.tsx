"use client";

import { useState } from "react";
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
  DialogTrigger,
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
import { PlusCircle } from "lucide-react";

const addStageSchema = z.object({
  name: z.string().min(1, "Stage name is required."),
  // Sequence order is handled by the backend API
});

type AddStageFormValues = z.infer<typeof addStageSchema>;

// Define the expected shape of the error response from the API
interface ApiErrorResponse {
  error?: string;
  issues?: z.ZodIssue[];
}

interface StageAddDialogProps {
  organizationId: string; // Needed for query invalidation
  // Add any other props needed, e.g., triggering element if not using DialogTrigger directly
}

export function StageAddDialog({ organizationId }: StageAddDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<AddStageFormValues>({
    resolver: zodResolver(addStageSchema),
    defaultValues: {
      name: "",
    },
  });

  const addStageMutation = useMutation<
    unknown, // Type of the successful response (adjust if API returns data)
    AxiosError<ApiErrorResponse>, // Type of the error
    AddStageFormValues // Type of the variables passed to the mutation fn
  >({
    mutationFn: (newStage) => {
      return axios.post("/api/settings/workflow/stages", newStage);
    },
    onSuccess: () => {
      toast.success("Workflow stage added successfully!");
      // Invalidate the query to refetch the workflow structure
      queryClient.invalidateQueries({
        queryKey: ["workflowStructure", organizationId],
      });
      setIsOpen(false); // Close the dialog
      form.reset(); // Reset the form
    },
    onError: (error) => {
      console.error("Error adding stage:", error);
      const errorMsg =
        error.response?.data?.error || "Failed to add stage. Please try again.";
      // TODO: Potentially display Zod validation errors from error.response?.data?.issues
      toast.error(errorMsg);
    },
  });

  const onSubmit = (values: AddStageFormValues) => {
    addStageMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Stage
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Workflow Stage</DialogTitle>
          <DialogDescription>
            Enter the name for the new stage. The sequence order will be set
            automatically.
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
                onClick={() => setIsOpen(false)}
                disabled={addStageMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addStageMutation.isPending}>
                {addStageMutation.isPending ? "Adding..." : "Add Stage"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

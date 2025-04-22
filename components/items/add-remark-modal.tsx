"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Define Zod schema for form validation
const remarkFormSchema = z.object({
  text: z
    .string()
    .min(1, "Remark cannot be empty")
    .max(1000, "Remark is too long"),
});

type RemarkFormData = z.infer<typeof remarkFormSchema>;

interface AddRemarkModalProps {
  itemId: string;
  children: React.ReactNode; // To wrap the trigger element
}

// Placeholder function for the API call - replace with actual implementation
async function addRemarkApi(
  itemId: string,
  data: RemarkFormData
): Promise<void> {
  const response = await fetch(`/api/items/${itemId}/remarks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to add remark");
  }
  // No need to return data on success for this simple case
}

export function AddRemarkModal({ itemId, children }: AddRemarkModalProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const form = useForm<RemarkFormData>({
    resolver: zodResolver(remarkFormSchema),
    defaultValues: {
      text: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: RemarkFormData) => addRemarkApi(itemId, data),
    onSuccess: () => {
      toast.success("Remark added successfully!");
      form.reset();
      setIsOpen(false);
      // Invalidate queries related to item remarks or history to refetch
      queryClient.invalidateQueries({ queryKey: ["itemRemarks", itemId] });
      queryClient.invalidateQueries({ queryKey: ["itemHistory", itemId] }); // Assuming history might show remarks
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  function onSubmit(data: RemarkFormData) {
    mutation.mutate(data);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Remark</DialogTitle>
          <DialogDescription>
            Add a remark for this item. It&apos;s will be visible in the
            item&apos;s history.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remark</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your remark here..."
                      {...field}
                    />
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
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save Remark"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

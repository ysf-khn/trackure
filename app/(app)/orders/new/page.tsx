"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
// Import other necessary components like Input, Label, Button later

// Define Zod schema based on Task 1.2 (assuming required fields)
const orderFormSchema = z.object({
  order_number: z.string().min(1, "Order Number is required"),
  customer_name: z.string().min(1, "Customer Name is required"),
  // Add other fields as needed based on PRD
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

// Function to post data to the API
async function createOrder(orderData: OrderFormValues) {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    // Attempt to parse error response, otherwise throw generic error
    try {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    } catch {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  return response.json();
}

export default function NewOrderPage() {
  const router = useRouter();
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      order_number: "",
      customer_name: "",
      // Initialize other fields
    },
  });

  // Setup mutation
  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (data) => {
      console.log("Order created successfully:", data);
      toast.success(`Order ${data.order_number} created successfully!`);
      // Redirect on success (as per task 1.4)
      // Assuming the API returns the new order with an `id`
      // and we redirect to the detail page `/orders/[id]`
      router.push(`/orders/${data.id}`);
      // Resetting the form might not be necessary if redirecting
      // form.reset();
    },
    onError: (error) => {
      console.error("Failed to create order:", error);
      toast.error(`Failed to create order: ${error.message}`);
    },
  });

  function onSubmit(data: OrderFormValues) {
    mutation.mutate(data);
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Order</CardTitle>
        <CardDescription>
          Fill in the details below to create a new order.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="order_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter order number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter customer name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Add more FormField components for other order details */}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : "Create Order"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

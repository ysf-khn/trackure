"use client";

import * as React from "react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useDebounce } from "@/hooks/queries/use-debounce";

// Zod schema for form validation
const formSchema = z.object({
  sku: z.string().min(1, { message: "SKU is required." }),
  // Define fields for instance_details - make them optional for manual override
  // Using string for input, backend will handle parsing/validation if necessary
  weight: z.string().optional(),
  size: z.string().optional(),
  boxSize: z.string().optional(),
  // Add other instance details fields as needed based on PRD/Schema
});

type AddItemFormProps = {
  orderId: string;
  onItemAdded?: () => void; // Optional callback after successful add
};

// Type for Autocomplete suggestions (needs value and label for combobox pattern)
type SkuSuggestion = {
  value: string; // Typically the SKU itself
  label: string; // User-friendly display (e.g., SKU - Name)
  master_details?: Record<string, unknown>; // Details to pre-fill (JSONB)
};

// Explicit type for the API response
type AddItemApiResponse = {
  message: string;
  itemId: string;
};

export function AddItemForm({ orderId, onItemAdded }: AddItemFormProps) {
  const queryClient = useQueryClient();

  // 1. Form Setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sku: "",
      weight: "",
      size: "",
      boxSize: "",
      // Initialize other fields
    },
  });

  // 2. SKU Autocomplete State & Query
  const [skuSearch, setSkuSearch] = React.useState("");
  // Use the current SKU form field value for debouncing if user types directly
  const debouncedSkuSearch = useDebounce(skuSearch, 300);
  const [popoverOpen, setPopoverOpen] = React.useState(false); // State for Popover

  // Explicitly type the useQuery result
  const {
    data: skuSuggestions,
    isLoading: isLoadingSuggestions,
  }: UseQueryResult<SkuSuggestion[], Error> = useQuery<SkuSuggestion[], Error>({
    queryKey: ["skuSearch", debouncedSkuSearch], // Correct query key format
    queryFn: async () => {
      if (!debouncedSkuSearch) return [];
      const response = await fetch(
        `/api/item-master/search?q=${encodeURIComponent(debouncedSkuSearch)}`
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch SKU suggestions");
      }
      const data = await response.json();
      // Ensure data is always an array
      return Array.isArray(data) ? data : [];
    },
    enabled: !!debouncedSkuSearch, // Only run query if search term exists
    staleTime: 5 * 60 * 1000, // Cache results for 5 minutes
    retry: false, // Don't retry on failure for search
  });

  // 3. Mutation Setup (for submitting the form)
  const mutation = useMutation<
    AddItemApiResponse,
    Error,
    z.infer<typeof formSchema>
  >({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      // Construct instance_details ensuring no undefined values are sent if empty
      const instance_details_payload: Record<string, string | number> = {};
      if (values.weight)
        instance_details_payload.weight = parseFloat(values.weight); // Try parsing
      if (values.size) instance_details_payload.size = values.size;
      if (values.boxSize) instance_details_payload.box_size = values.boxSize; // snake_case

      const payload: {
        sku: string;
        instance_details?: Record<string, string | number>;
      } = {
        sku: values.sku,
      };
      // Only include instance_details if it has keys
      if (Object.keys(instance_details_payload).length > 0) {
        payload.instance_details = instance_details_payload;
      }

      const response = await fetch(`/api/orders/${orderId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.json(); // Always parse JSON response

      if (!response.ok) {
        throw new Error(responseBody.error || "Failed to add item");
      }
      return responseBody as AddItemApiResponse;
    },
    onSuccess: (data) => {
      toast.success(`Item added successfully (ID: ${data.itemId})`);
      form.reset(); // Reset form fields
      setSkuSearch(""); // Reset SKU search input
      // Invalidate queries to refetch relevant data
      queryClient.invalidateQueries({ queryKey: ["orderItems", orderId] }); // If you have a query for items specific to this order
      queryClient.invalidateQueries({ queryKey: ["itemsInStage"] }); // To update stage view lists
      if (onItemAdded) onItemAdded(); // Call optional callback
    },
    onError: (error: Error) => {
      toast.error(`Error adding item: ${error.message}`);
    },
  });

  // 4. Handle Autocomplete Selection
  const handleSkuSelect = (selected: SkuSuggestion | null) => {
    if (!selected) {
      // Allow clearing the selection
      form.resetField("sku");
      setSkuSearch("");
      return;
    }

    form.setValue("sku", selected.value, { shouldValidate: true });
    setSkuSearch(selected.value); // Update search state to match selection

    // Pre-fill instance details from master_details if available
    // Reset other fields first to avoid merging old/new data
    form.resetField("weight");
    form.resetField("size");
    form.resetField("boxSize");
    // Reset other instance fields...

    if (selected.master_details) {
      // Safely access properties using `unknown`
      const weight = selected.master_details.weight;
      const size = selected.master_details.size;
      const boxSize = selected.master_details.box_size;

      form.setValue(
        "weight",
        typeof weight === "number" || typeof weight === "string"
          ? String(weight)
          : ""
      );
      form.setValue("size", typeof size === "string" ? size : "");
      form.setValue("boxSize", typeof boxSize === "string" ? boxSize : "");
      // Set other fields...
    }
  };

  // 5. Form Submit Handler
  function onSubmit(values: z.infer<typeof formSchema>) {
    // console.log('Form submitted:', values);
    mutation.mutate(values);
  }

  // Helper to find the label for the selected value
  const getSelectedLabel = (selectedValue: string) => {
    return (
      skuSuggestions?.find((suggestion) => suggestion.value === selectedValue)
        ?.label ?? selectedValue // Fallback to value if label not found (e.g., new/typed)
    );
  };

  // Check if the current search term exactly matches any suggestion
  const exactMatchExists = skuSuggestions?.some(
    (s) => s.value.toLowerCase() === skuSearch.toLowerCase()
  );

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Add Item to Order</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>SKU *</FormLabel>
                  {/* Use Popover + Command for SKU */}
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={popoverOpen}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? getSelectedLabel(field.value)
                            : "Select or type SKU..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                      <Command shouldFilter={false}>
                        {" "}
                        {/* Disable default filtering */}
                        <CommandInput
                          placeholder="Search SKU..."
                          value={skuSearch} // Controlled input
                          onValueChange={setSkuSearch} // Update search state on type
                        />
                        <CommandList>
                          {isLoadingSuggestions && (
                            <div className="p-2 text-center text-sm">
                              Loading...
                            </div>
                          )}
                          {!isLoadingSuggestions &&
                            !skuSuggestions?.length &&
                            !skuSearch && (
                              <CommandEmpty>Type to search SKUs.</CommandEmpty>
                            )}
                          {/* Show 'Create' option if typing and no exact match */}
                          {!isLoadingSuggestions &&
                            skuSearch &&
                            !exactMatchExists && (
                              <CommandItem
                                key="create-new"
                                value={`__create__${skuSearch}`}
                                onSelect={() => {
                                  form.setValue("sku", skuSearch, {
                                    shouldValidate: true,
                                  });
                                  form.resetField("weight"); // Clear details for new SKU
                                  form.resetField("size");
                                  form.resetField("boxSize");
                                  setPopoverOpen(false);
                                }}
                              >
                                <span className="mr-2">+</span> Create &quot;
                                {skuSearch}&quot;
                              </CommandItem>
                            )}
                          {/* Display existing suggestions */}
                          <CommandGroup>
                            {skuSuggestions?.map((suggestion) => (
                              <CommandItem
                                key={suggestion.value}
                                value={suggestion.value}
                                onSelect={() => {
                                  handleSkuSelect(suggestion);
                                  setPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === suggestion.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {suggestion.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          {/* Fallback if suggestions load but are empty for the search */}
                          {!isLoadingSuggestions &&
                            !skuSuggestions?.length &&
                            skuSearch &&
                            exactMatchExists && (
                              <CommandEmpty>
                                No other matching SKUs found.
                              </CommandEmpty>
                            )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <h3 className="text-lg font-semibold pt-2">
              Instance Details (Optional Overrides)
            </h3>
            <FormDescription>
              Provide details specific to this item instance. If a known SKU is
              selected, these may be pre-filled but can be changed.
            </FormDescription>
            {/* Instance Detail Fields */}
            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight</FormLabel>
                  <FormControl>
                    {/* Use text input for flexibility, backend handles parsing */}
                    <Input
                      placeholder="e.g., 10.5"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Large"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="boxSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Box Size</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 12x12x6"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Add other instance detail FormFields here */}

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Adding..." : "Add Item"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

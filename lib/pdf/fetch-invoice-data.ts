import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
// import { Database } from "types/supabase"; // Correct path - uncomment once types/supabase.ts is generated
import { InvoiceData } from "@/components/pdf/InvoiceTemplate"; // Import the interface

// Placeholder function to fetch data required for an invoice PDF
// This needs access to Supabase and likely the orderId
export async function fetchInvoiceData(
  orderId: string
): Promise<InvoiceData | null> {
  const cookieStore = cookies();
  // TODO: Use generated Database type from types/supabase.ts once available
  const supabase = createServerClient<any>( // Use <any> temporarily
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value; // Correct usage
        },
      },
    }
  );

  // TODO: Implement RBAC check - Ensure only Owner can fetch this data
  // Fetch user session and profile to check role

  console.log(`Fetching invoice data for order ID: ${orderId}`);

  // Example Query (Needs refinement based on actual schema and required data):
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      organization_id,
      // customer_name, // Add if you have a customer name field
      order_items:items (
        id,
        item_master_id,
        quantity,
        // price, // Need to determine where item price comes from (item_master?)
        item_master:item_master(name)
      )
      // ... other required order fields
    `
    )
    .eq("id", orderId)
    .single();

  if (orderError || !orderData) {
    console.error("Error fetching invoice data:", orderError);
    return null;
  }

  // Define type for items based on query structure (use any temporarily)
  // TODO: Replace 'any' with proper type derived from Database['public']['Tables']['items']['Row'] & { item_master: ... }
  type OrderItem = any; // Temporary type

  // --- Placeholder Data Structure ---
  // This needs to be replaced with actual fetched and processed data
  const placeholderData: InvoiceData = {
    orderId: orderData.id,
    orderNumber: orderData.order_number ?? "N/A",
    customerName: "Placeholder Customer", // Replace with actual customer data
    items: orderData.order_items.map((item: OrderItem) => ({
      // Add explicit type
      id: item.id,
      name: item.item_master?.name ?? "Unknown Item",
      quantity: item.quantity ?? 1,
      price: 10.0, // Placeholder price - Fetch from item_master or another source
    })),
    totalAmount: 100.0, // Placeholder total - Calculate based on items
  };
  // --- End Placeholder ---

  // TODO: Replace placeholder data with actual transformed data from query
  // Calculate totalAmount based on item prices and quantities

  return placeholderData; // Return actual data eventually
}

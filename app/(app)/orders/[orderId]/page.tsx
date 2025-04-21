// import React from 'react';
// import { auth } from '@clerk/nextjs/server';
import { createClient } from "@/lib/supabase/server"; // Import server client
import { AddItemForm } from "@/components/items/add-item-form";
// import { headers } from 'next/headers'; // Needed for createClient - REMOVED
// import { OrderDetails } from '@/components/orders/order-details'; // Hypothetical component
// import { ItemListTable } from '@/components/items/item-list-table'; // For displaying items later

type OrderDetailPageProps = {
  params: {
    orderId: string;
  };
};

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { orderId } = await params;
  // const { userId, orgId } = auth();
  const supabase = await createClient(); // Await the client creation

  // Fetch user session and profile server-side
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRole: string | null = null;
  let canAddItem = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role") // Select only the role
      .eq("id", user.id)
      .single();
    userRole = profile?.role;
    // Determine permission based on role
    canAddItem = userRole === "Owner" || userRole === "Worker";
  }

  // TODO: Fetch order details based on orderId and orgId
  // const { data: order, error: orderError } = await supabase
  //   .from('orders')
  //   .select('*')
  //   .eq('id', orderId)
  //   .eq('organization_id', orgId)
  //   .single();

  // TODO: Fetch items associated with this order
  // const { data: items, error: itemsError } = await supabase
  //   .from('items')
  //   .select('*, item_history(*, stages(*), sub_stages(*))') // Example fetch
  //   .eq('order_id', orderId)
  //   .eq('organization_id', orgId)
  //   .order('created_at', { ascending: true });

  // if (!order || orderError) {
  //   // Handle error or not found (e.g., redirect or show error message)
  //   return <div>Order not found or access denied.</div>;
  // }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Order Details: {orderId}</h1>

      {/* TODO: Display Order Details using a dedicated component */}
      {/* <OrderDetails order={order} /> */}
      <div className="p-4 border rounded-md bg-muted">
        Placeholder for Order Details (Number, Customer, etc.)
      </div>

      {/* Section to Add New Items - Conditionally render based on role */}
      {canAddItem ? (
        <div className="pt-4">
          <h2 className="text-xl font-semibold pb-2">Add New Item</h2>
          <AddItemForm orderId={orderId} />
        </div>
      ) : (
        <div className="pt-4 text-muted-foreground">
          You do not have permission to add items to this order.
        </div>
      )}

      {/* TODO: Display List of Items in the Order */}
      <h2 className="text-xl font-semibold pt-6">Items in this Order</h2>
      {/* <ItemListTable items={items || []} /> */}
      <div className="p-4 border rounded-md bg-muted">
        Placeholder for Item List Table
      </div>
    </div>
  );
}

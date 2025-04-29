import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { renderToStream, Document } from "@react-pdf/renderer";
import { InvoiceTemplate } from "@/components/pdf/InvoiceTemplate";
import { fetchInvoiceData } from "@/lib/pdf/fetch-invoice-data";
import React from "react";
// import { Database } from 'types/supabase'; // Uncomment once types/supabase.ts is generated

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const { orderId } = params;
  if (!orderId) {
    return NextResponse.json(
      { error: "Order ID is required" },
      { status: 400 }
    );
  }

  const cookieStore = cookies();
  // TODO: Use generated Database type from types/supabase.ts once available
  const supabase = createServerClient<any>( // Use <any> temporarily
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value; // Correct usage (may still show error)
        },
      },
    }
  );

  // 1. Authentication & Authorization (RBAC)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Implement proper RBAC check for 'Owner' role
  // Fetch user profile/role associated with user.id and organization
  // For now, allow any authenticated user (placeholder)
  // const { data: profile, error: profileError } = await supabase
  //   .from('profiles') // Assuming a profiles table
  //   .select('role')
  //   .eq('id', user.id)
  //   .single();
  // if (profileError || !profile || profile.role !== 'Owner') {
  //   return NextResponse.json({ error: 'Forbidden: Owner access required' }, { status: 403 });
  // }
  console.warn(
    "RBAC check skipped for /api/invoices/[orderId] - Allowing any authenticated user."
  );

  try {
    // 2. Fetch Invoice Data
    const invoiceData = await fetchInvoiceData(orderId);

    if (!invoiceData) {
      return NextResponse.json(
        { error: "Invoice data not found or access denied" },
        { status: 404 }
      );
    }

    // 3. Render PDF to Stream inside a Document
    const pdfStream = await renderToStream(
      <Document>
        <InvoiceTemplate data={invoiceData} />
      </Document>
    );

    // 4. Return PDF Stream Response
    // Ensure correct headers for PDF download
    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"invoice_${invoiceData.orderNumber || orderId}.pdf\"`,
    });

    // Type assertion needed because ReadableStream types might not align perfectly
    return new Response(pdfStream as unknown as ReadableStream<Uint8Array>, {
      headers,
    });
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    // Check if the error is from @react-pdf/renderer or elsewhere
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: "Failed to generate invoice PDF", details: errorMessage },
      { status: 500 }
    );
  }
}

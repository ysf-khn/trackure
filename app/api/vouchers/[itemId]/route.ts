import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { fetchVoucherDataForHistory } from "@/lib/pdf/fetch-historical-voucher-data";
import { Database } from "@/types/supabase";
import pdf from "html-pdf";
import { promisify } from "util";

// Promisify the create method
const createPdf = promisify(pdf.create);

export async function GET(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  const { itemId } = await params;
  const { searchParams } = new URL(request.url);
  const historyId = searchParams.get("history_id");

  if (!itemId) {
    return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // Authentication checks
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch user profile
  const { data: userProfile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !userProfile) {
    return NextResponse.json(
      { error: "Failed to retrieve user profile." },
      { status: 500 }
    );
  }

  // Authorization
  if (userProfile.role !== "Owner") {
    return NextResponse.json(
      { error: "Forbidden: Only Owners can generate vouchers." },
      { status: 403 }
    );
  }

  try {
    // Fetch Voucher Data
    const voucherData = await fetchVoucherDataForHistory(
      itemId,
      historyId,
      user.id,
      userProfile.organization_id
    );

    if (!voucherData) {
      const message = historyId
        ? `Voucher data not found for item ${itemId} and history ${historyId}, or access denied`
        : `Voucher data not found for item ${itemId}, or access denied`;
      return NextResponse.json({ error: message }, { status: 404 });
    }

    // Generate HTML content
    const htmlContent = generateVoucherHtml(voucherData);

    // Create PDF from HTML - fixed type issue by using literal "A4" instead of string 'A4'
    const pdfOptions: pdf.CreateOptions = {
      format: "A4", // Using the specific string literal type
      border: {
        top: "1cm",
        right: "1cm",
        bottom: "1cm",
        left: "1cm",
      },
    };

    const pdfResult = await createPdf(htmlContent, pdfOptions);

    // Get the buffer directly from the PDF result
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      pdfResult.toBuffer((err: Error | null, buffer: Buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(buffer);
        }
      });
    });

    // Return PDF as a response
    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="voucher_${voucherData.itemName || itemId}${historyId ? "_hist_" + historyId : ""}.pdf"`,
      "Content-Length": pdfBuffer.length.toString(),
    });

    return new Response(pdfBuffer, { headers });
  } catch (error) {
    console.error("Error generating voucher PDF:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: "Failed to generate voucher PDF", details: errorMessage },
      { status: 500 }
    );
  }
}

// Helper function to generate HTML content
function generateVoucherHtml(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Voucher</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .voucher {
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid #ccc;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
        }
        .item-name {
          font-size: 18px;
          margin-bottom: 20px;
        }
        .details {
          margin-bottom: 20px;
        }
        .footer {
          margin-top: 40px;
          text-align: right;
        }
        .signature-line {
          display: inline-block;
          width: 200px;
          border-top: 1px solid #000;
          margin-bottom: 5px;
        }
      </style>
    </head>
    <body>
      <div class="voucher">
        <div class="header">
          <div class="title">${data.organizationName || "Organization"} Voucher</div>
        </div>
        
        <div class="item-name">Item: ${data.itemName || "Unknown Item"}</div>
        
        <div class="details">
          <p><strong>Voucher ID:</strong> ${data.id || "N/A"}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          ${data.historyId ? `<p><strong>History ID:</strong> ${data.historyId}</p>` : ""}
          <p><strong>Description:</strong> ${data.description || "No description available"}</p>
          ${data.serialNumber ? `<p><strong>Serial Number:</strong> ${data.serialNumber}</p>` : ""}
          ${data.statusName ? `<p><strong>Status:</strong> ${data.statusName}</p>` : ""}
        </div>
        
        <p>This voucher was generated on ${new Date().toLocaleString()} and serves as an official record.</p>
        
        <div class="footer">
          <div class="signature-line"></div>
          <p>Authorized Signature</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

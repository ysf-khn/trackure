# Trackure V1 - Implementation Plan: Phase 5 Detailed Tasks

**Phase Goal:** Implement Packaging Logistics (material definition, user-defined reminders via Resend), PDF generation (Vouchers/Invoices - Owner only), and basic Payment Status recording (Owner only).

_(Prerequisites: Phase 4 completed - Workflow customization is functional. Core tracking and rework are implemented. Users roles and RBAC are established)._

---

## Tasks Breakdown:

**1. Packaging Logistics:**

- **1.1. Data Model (Verify/Add):**
  - **Action:** Ensure a mechanism exists to store packaging requirements per order. Options:
    - Add a `required_packaging_materials (jsonb or text[])` column to the `orders` table.
    - _Or (More structured):_ Create a `packaging_materials` table (`id`, `order_id`, `material_name`, `quantity`, `organization_id`) and potentially a `material_master` table. _(Choose simpler JSONB/text array for V1 unless structure is crucial now)_.
- **1.2. UI for Defining Materials:**
  - **Action:** Add a section within the Order Detail view/page (or Order Creation form) for users (Owner/Worker) to input/list required packaging materials for that order. Use a simple `Textarea` or a dynamic list input component.
  - **Action:** Implement saving this data to the chosen field/table in the database via an API update to the order.
- **1.3. UI for Setting Reminder Trigger:**
  - **Action:** In the Workflow Settings UI (accessible by 'Owner', created in Phase 4), add a section for "Packaging Reminders".
  - **Action:** Allow the Owner to select _one_ Stage or Sub-stage from their custom workflow using a `Select` component. This selected stage ID will be the trigger point.
  - **Action:** Store this selected `trigger_stage_id` (or `trigger_sub_stage_id`) potentially in an `organization_settings` table or directly on the `organizations` table.
- **1.4. Resend API Integration:**
  - **Action:** Sign up for Resend and get an API key.
  - **Action:** Store the Resend API key securely (e.g., environment variable on the server/Supabase Edge Function environment).
  - **Action:** Install the Resend SDK: `npm install resend`.
- **1.5. Backend Scheduled Task/Logic:**
  - **Action:** Choose mechanism: Supabase Scheduled Edge Functions (preferred if available) or `pg_cron` within the database.
  - **Action:** Create the scheduled function/job to run periodically (e.g., every hour).
  - **Action:** Logic within the function:
    - Identify organizations that have configured a trigger stage.
    - For each organization, find items (`items` table) that have _just entered_ the configured `trigger_stage_id` (or `sub_stage_id`) since the last check. (Requires tracking notification status or using timestamps carefully).
    - Fetch the `required_packaging_materials` for the corresponding `order_id`.
    - Fetch the email address(es) of the 'Owner' (or designated contact) for that organization from the `profiles` table.
    - Prepare data for email notification (Order #, Item SKU/details, Required Materials).
- **1.6. Email Sending Logic:**
  - **Action:** Within the scheduled function, use the Resend SDK to send a formatted email notification containing the prepared data to the relevant user(s).
  - **Action:** Implement robust error handling for the email sending process.
  - **Action:** Mark the item/order as "reminder sent" in the database to avoid duplicate emails.
- **1.7. Basic In-App Notifications (V1 Simple):**
  - **Action:** Consider adding a simple in-app notification mechanism. Create a `notifications` table (`id`, `user_id`, `message`, `read_status`, `timestamp`, `organization_id`).
  - **Action:** Modify the scheduled task (1.5) to also insert a record into the `notifications` table when an email reminder is triggered.
  - **Action:** Add a simple notification icon/dropdown in the main application header that queries and displays unread notifications for the logged-in user.

**2. PDF Generation (Vouchers & Invoices):**

- **2.1. Integrate PDF Library:**
  - **Action:** Choose and install a library (e.g., `@react-pdf/renderer` for component-based generation or `pdf-lib` for lower-level control). `npm install @react-pdf/renderer`.
- **2.2. Backend Data Fetching Logic:**
  - **Action:** Create reusable server-side functions (e.g., in `src/lib/pdf/data-fetchers.ts`) to gather all necessary data for:
    - **Voucher:** Item details (instance + master), Order details, Current Stage/Sub-stage, potentially simplified Item History, Organization details. Requires `itemId`.
    - **Invoice:** Order details, list of Items in the order with details, Organization details, potentially Payment Status. Requires `orderId`.
- **2.3. Basic PDF Templates:**
  - **Action:** Create React components (if using `@react-pdf/renderer`) or template functions for:
    - `VoucherTemplate.tsx` (handles Main/Return differentiation perhaps via props).
    - `InvoiceTemplate.tsx`.
  - **Action:** Structure the templates with basic layout, displaying fetched data clearly. Include placeholders for Organization name/logo. Keep V1 templates simple.
- **2.4. API Route for PDF Generation:**
  - **Action:** Create API routes (e.g., `src/app/api/vouchers/[itemId]/route.ts` GET, `src/app/api/invoices/[orderId]/route.ts` GET).
  - **Action:** Validate parameters (`itemId`/`orderId`).
  - **Action:** Verify user authentication and 'Owner' role (RBAC).
  - **Action:** Call the data fetching functions (2.2).
  - **Action:** Use the chosen PDF library and templates (2.3) to render the PDF to a buffer or stream _on the server_.
  - **Action:** Set appropriate HTTP headers (`Content-Type: application/pdf`, `Content-Disposition: attachment; filename="..."`).
  - **Action:** Return the generated PDF file stream/buffer in the response.
- **2.5. UI Download Actions:**
  - **Action:** Add "Download Voucher" / "Download Invoice" buttons in relevant UI locations (e.g., Item Table row menu, Order Detail page). Render only for 'Owner' role.
  - **Action:** Link these buttons to directly call the corresponding API endpoints (e.g., `<a href="/api/vouchers/..." download>Download</a>` or trigger via JavaScript fetch).

**3. Payment Status Recording:**

- **3.1. Verify Schema:** Confirm `payment_status (text, nullable)` exists on the `orders` table.
- **3.2. UI Element for Status Update:**
  - **Action:** In the Order Detail view/page, add a `Select` or `RadioGroup` component (Shadcn) displaying the current `payment_status`.
  - **Action:** Conditionally render this element only for the 'Owner' role.
  - **Action:** Allow selection of predefined statuses (Lent, Credit, Paid).
- **3.3. Backend API for Status Update:**
  - **Action:** Create an API route (e.g., `src/app/api/orders/[orderId]/payment-status/route.ts` - handling PUT or PATCH).
  - **Action:** Validate input (new status) using Zod. Extract `orderId`.
  - **Action:** Verify user authentication and 'Owner' role (RBAC). Verify ownership of the order (`organization_id`).
  - **Action:** `UPDATE` the `orders` table, setting the `payment_status` for the given `orderId`.
  - **Action:** Handle errors and return success/error response.
- **3.4. Frontend Integration:**
  - **Action:** Use `useMutation` triggered when the Owner changes the status selection.
  - **Action:** Handle loading/success/error states. Update the displayed status optimistically or via query refetch on success.

---

**Phase 5 Acceptance Criteria:**

- Users can define required packaging materials for an order.
- Owners can configure a workflow stage that triggers packaging reminders.
- The backend system correctly identifies when items reach the trigger stage.
- Email notifications are successfully sent via Resend to the appropriate user(s) containing relevant order/material details.
- Basic in-app notifications for reminders are functional (if implemented).
- Owners can trigger the generation and download of basic PDF Vouchers for items.
- Owners can trigger the generation and download of basic PDF Invoices for orders.
- PDFs contain accurate data fetched from the system.
- Owners can view and manually update the internal Payment Status (Lent, Credit, Paid) for an order.
- Workers cannot access/modify Payment Status or generate Vouchers/Invoices.
- All new API endpoints have appropriate authentication, RBAC, and validation.

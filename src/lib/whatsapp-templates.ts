export type WhatsAppTemplateKey =
  | "PROOF_APPROVAL"
  | "READY_FOR_PICKUP"
  | "PRINTING_STARTED"
  | "ORDER_CONFIRMATION"
  | "ORDER_DELIVERED"
  | "POS_BILL"
  | "UDHAAR_REMINDER"
  | "QUOTATION_ESTIMATE"
  | "DELIVERY_CHALLAN";

export interface WhatsAppTemplate {
  key: WhatsAppTemplateKey;
  name: string;
  category: "Production & Jobs" | "Retail & Billing" | "Credit & Recovery" | "Quotations & Dispatch";
  description: string;
  defaultMessage: string;
  customMessage?: string;
  availableTokens: { token: string; label: string; example: string }[];
  icon: string;
}

export interface TemplateTokenValues {
  CUSTOMER_NAME?: string;
  CUSTOMER_PHONE?: string;
  ORDER_NUMBER?: string;
  JOB_TYPE?: string;
  QUANTITY?: string | number;
  UNIT?: string;
  TOTAL_AMOUNT?: string | number;
  ADVANCE_PAID?: string | number;
  BALANCE_DUE?: string | number;
  DUE_DATE?: string;
  TRACK_LINK?: string;
  SHOP_NAME?: string;
  SHOP_PHONE?: string;
  SHOP_ADDRESS?: string;
  UPI_ID?: string;
  INVOICE_NUMBER?: string;
  ITEM_COUNT?: string | number;
  PAYMENT_METHOD?: string;
  QUOTATION_NUMBER?: string;
  VALID_UNTIL?: string;
  CHALLAN_NUMBER?: string;
  VEHICLE_NO?: string;
  [key: string]: any;
}

export const DEFAULT_WHATSAPP_TEMPLATES: Record<WhatsAppTemplateKey, WhatsAppTemplate> = {
  PROOF_APPROVAL: {
    key: "PROOF_APPROVAL",
    name: "🎨 Design Proof Ready for Approval",
    category: "Production & Jobs",
    description: "Sent when artwork is designed and awaiting customer verification before printing.",
    icon: "Palette",
    availableTokens: [
      { token: "{CUSTOMER_NAME}", label: "Customer Name", example: "Rajesh Sharma" },
      { token: "{ORDER_NUMBER}", label: "Order Number", example: "JO-2026-0012" },
      { token: "{JOB_TYPE}", label: "Job Type", example: "Visiting Cards (350 GSM Velvet)" },
      { token: "{QUANTITY}", label: "Quantity", example: "1,000" },
      { token: "{UNIT}", label: "Unit", example: "pcs" },
      { token: "{TRACK_LINK}", label: "Live Proof Link", example: "https://crystalpress.in/track/JO-2026-0012" },
      { token: "{SHOP_NAME}", label: "Shop Name", example: "Crystal Press" },
      { token: "{SHOP_PHONE}", label: "Shop Phone", example: "+91 98765 43210" },
    ],
    defaultMessage:
`*DESIGN PROOF READY FOR APPROVAL — {SHOP_NAME}* 🎨

Dear *{CUSTOMER_NAME}*,

Your design proof for *Order #{ORDER_NUMBER}* ({JOB_TYPE} — {QUANTITY} {UNIT}) is prepared and ready for your review!

🔗 *Click here to review & approve your artwork:*
{TRACK_LINK}

🔍 *Action Required:*
Please inspect text, spelling, phone numbers, and design alignment. Once approved online, we will immediately initiate printing production.

_Thank you,_
*{SHOP_NAME}*
📞 {SHOP_PHONE}`.trim(),
  },

  READY_FOR_PICKUP: {
    key: "READY_FOR_PICKUP",
    name: "📦 Print Job Ready for Pickup",
    category: "Production & Jobs",
    description: "Sent when printing and quality checks are finished and the package is ready at counter.",
    icon: "PackageCheck",
    availableTokens: [
      { token: "{CUSTOMER_NAME}", label: "Customer Name", example: "Anita Desai" },
      { token: "{ORDER_NUMBER}", label: "Order Number", example: "JO-2026-0009" },
      { token: "{JOB_TYPE}", label: "Job Type", example: "Brochure 4-Fold" },
      { token: "{QUANTITY}", label: "Quantity", example: "500" },
      { token: "{UNIT}", label: "Unit", example: "pcs" },
      { token: "{BALANCE_DUE}", label: "Balance Due (₹)", example: "1,450.00" },
      { token: "{SHOP_NAME}", label: "Shop Name", example: "Crystal Press" },
      { token: "{SHOP_ADDRESS}", label: "Pickup Address", example: "Main Commercial Road, Shop #4" },
      { token: "{UPI_ID}", label: "Shop UPI ID", example: "crystalpress@icici" },
      { token: "{SHOP_PHONE}", label: "Shop Phone", example: "+91 98765 43210" },
    ],
    defaultMessage:
`*ORDER READY FOR PICKUP — {SHOP_NAME}* 📦🎉

Hello *{CUSTOMER_NAME}*,

Great news! Your print order *#{ORDER_NUMBER}* ({JOB_TYPE}) has completed production and quality verification.

📋 *Order Details:*
• Job: *{JOB_TYPE}*
• Quantity: *{QUANTITY} {UNIT}*
• Balance Payable: *₹{BALANCE_DUE}*

📍 *Pickup Counter:*
*{SHOP_NAME}*
{SHOP_ADDRESS}
📞 Phone: {SHOP_PHONE}

_Kindly collect your order at your earliest convenience during working hours._`.trim(),
  },

  PRINTING_STARTED: {
    key: "PRINTING_STARTED",
    name: "⚙️ Printing Production Active",
    category: "Production & Jobs",
    description: "Informs customer that their job has reached the printing press / finishing line.",
    icon: "Printer",
    availableTokens: [
      { token: "{CUSTOMER_NAME}", label: "Customer Name", example: "Vikram Mehta" },
      { token: "{ORDER_NUMBER}", label: "Order Number", example: "JO-2026-0024" },
      { token: "{JOB_TYPE}", label: "Job Type", example: "Multi-color Booklets" },
      { token: "{DUE_DATE}", label: "Expected Ready Date", example: "08/09/2026" },
      { token: "{TRACK_LINK}", label: "Live Progress Link", example: "https://crystalpress.in/track/JO-2026-0024" },
      { token: "{SHOP_NAME}", label: "Shop Name", example: "Crystal Press" },
    ],
    defaultMessage:
`*PRINTING PRODUCTION STARTED — {SHOP_NAME}* ⚙️

Dear *{CUSTOMER_NAME}*,

Your order *#{ORDER_NUMBER}* ({JOB_TYPE}) is now actively running on our printing press and finishing line.

⏳ *Expected Completion:* {DUE_DATE}
🔗 *Live Tracking:* {TRACK_LINK}

We will notify you the moment your order is packaged and ready for collection.

_Warm regards,_
*{SHOP_NAME}*`.trim(),
  },

  ORDER_CONFIRMATION: {
    key: "ORDER_CONFIRMATION",
    name: "📋 Job Order Placed & Advance Receipt",
    category: "Production & Jobs",
    description: "Sent immediately after booking a new job with advance deposit details.",
    icon: "FileCheck",
    availableTokens: [
      { token: "{CUSTOMER_NAME}", label: "Customer Name", example: "Sunil Verma" },
      { token: "{ORDER_NUMBER}", label: "Order Number", example: "JO-2026-0031" },
      { token: "{JOB_TYPE}", label: "Job Type", example: "Letterheads & Envelopes" },
      { token: "{QUANTITY}", label: "Quantity", example: "2,000" },
      { token: "{TOTAL_AMOUNT}", label: "Total Amount (₹)", example: "4,500.00" },
      { token: "{ADVANCE_PAID}", label: "Advance Paid (₹)", example: "2,000.00" },
      { token: "{BALANCE_DUE}", label: "Remaining Balance (₹)", example: "2,500.00" },
      { token: "{DUE_DATE}", label: "Delivery Date", example: "10/09/2026" },
      { token: "{TRACK_LINK}", label: "Tracking Link", example: "https://crystalpress.in/track/JO-2026-0031" },
      { token: "{SHOP_NAME}", label: "Shop Name", example: "Crystal Press" },
    ],
    defaultMessage:
`*JOB ORDER CONFIRMATION — {SHOP_NAME}* 📋

Dear *{CUSTOMER_NAME}*,

Thank you for placing your order with *{SHOP_NAME}*! We have successfully booked your print job:

• *Order No:* #{ORDER_NUMBER}
• *Job:* {JOB_TYPE}
• *Quantity:* {QUANTITY}
• *Total Bill:* ₹{TOTAL_AMOUNT}
• *Advance Received:* ₹{ADVANCE_PAID}
• *Balance Due:* ₹{BALANCE_DUE}
• *Target Delivery:* {DUE_DATE}

🔗 *Live Order & Proof Tracking:*
{TRACK_LINK}

_Thank you for choosing us!_`.trim(),
  },

  ORDER_DELIVERED: {
    key: "ORDER_DELIVERED",
    name: "🚚 Order Delivered & Thank You",
    category: "Production & Jobs",
    description: "Sent when order has been handed over or delivered to the customer.",
    icon: "Truck",
    availableTokens: [
      { token: "{CUSTOMER_NAME}", label: "Customer Name", example: "Rohan Kapoor" },
      { token: "{ORDER_NUMBER}", label: "Order Number", example: "JO-2026-0015" },
      { token: "{JOB_TYPE}", label: "Job Type", example: "Rigid Box Packaging" },
      { token: "{SHOP_NAME}", label: "Shop Name", example: "Crystal Press" },
      { token: "{SHOP_PHONE}", label: "Shop Phone", example: "+91 98765 43210" },
    ],
    defaultMessage:
`*ORDER DELIVERED — {SHOP_NAME}* 🚚✨

Dear *{CUSTOMER_NAME}*,

Your order *#{ORDER_NUMBER}* ({JOB_TYPE}) has been successfully delivered!

It has been a pleasure serving you. If you have any feedback or upcoming print requirements, feel free to reach out to us directly.

⭐ *Rate our service or reorder:*
📞 {SHOP_PHONE}

_Thank you for your valued business!_
*{SHOP_NAME}*`.trim(),
  },

  POS_BILL: {
    key: "POS_BILL",
    name: "🧾 POS Counter Sale Bill Receipt",
    category: "Retail & Billing",
    description: "Sent from the POS register after completing a retail counter checkout.",
    icon: "Receipt",
    availableTokens: [
      { token: "{CUSTOMER_NAME}", label: "Customer Name", example: "Pooja Hegde" },
      { token: "{INVOICE_NUMBER}", label: "Bill / Invoice No", example: "CP-2026-0182" },
      { token: "{ITEM_COUNT}", label: "Item Count", example: "4" },
      { token: "{TOTAL_AMOUNT}", label: "Net Bill Amount (₹)", example: "890.00" },
      { token: "{PAYMENT_METHOD}", label: "Payment Mode", example: "UPI / GPay" },
      { token: "{BALANCE_DUE}", label: "Udhaar / Balance (₹)", example: "0.00" },
      { token: "{SHOP_NAME}", label: "Shop Name", example: "Crystal Press" },
      { token: "{SHOP_PHONE}", label: "Shop Phone", example: "+91 98765 43210" },
    ],
    defaultMessage:
`*DIGITAL BILL RECEIPT — {SHOP_NAME}* 🧾

Hello *{CUSTOMER_NAME}*,
Thank you for shopping at *{SHOP_NAME}*!

📄 *Bill No:* {INVOICE_NUMBER}
📦 *Items Count:* {ITEM_COUNT}
💰 *Total Amount:* ₹{TOTAL_AMOUNT}
💳 *Payment Mode:* {PAYMENT_METHOD}

📍 *Store:* {SHOP_NAME}
📞 *Helpdesk:* {SHOP_PHONE}

_Keep this digital receipt for your records. Have a wonderful day!_`.trim(),
  },

  UDHAAR_REMINDER: {
    key: "UDHAAR_REMINDER",
    name: "📢 Customer Udhaar / Payment Due Reminder",
    category: "Credit & Recovery",
    description: "Sent to customers with outstanding credit ledger balance with UPI QR / Payee details.",
    icon: "AlertCircle",
    availableTokens: [
      { token: "{CUSTOMER_NAME}", label: "Customer Name", example: "Manoj Tiwari" },
      { token: "{BALANCE_DUE}", label: "Total Outstanding (₹)", example: "3,850.00" },
      { token: "{UPI_ID}", label: "Shop UPI ID", example: "crystalpress@icici" },
      { token: "{SHOP_NAME}", label: "Shop Name", example: "Crystal Press" },
      { token: "{SHOP_PHONE}", label: "Shop Phone", example: "+91 98765 43210" },
    ],
    defaultMessage:
`*PAYMENT DUE REMINDER — {SHOP_NAME}* 📢

Dear *{CUSTOMER_NAME}*,

Greetings from *{SHOP_NAME}*! This is a gentle reminder regarding your outstanding account balance:

💳 *Total Pending Balance:* *₹{BALANCE_DUE}*
📲 *Direct UPI Payment:* *{UPI_ID}*

Please clear the pending balance at your earliest convenience via UPI or at our shop counter. If you have already made the payment, kindly ignore this reminder.

_Thank you for your prompt cooperation!_
*{SHOP_NAME}*
📞 {SHOP_PHONE}`.trim(),
  },

  QUOTATION_ESTIMATE: {
    key: "QUOTATION_ESTIMATE",
    name: "💼 Print Quotation & Proforma Estimate",
    category: "Quotations & Dispatch",
    description: "Sent to prospective clients sharing estimated costs and validity terms.",
    icon: "FileSpreadsheet",
    availableTokens: [
      { token: "{CUSTOMER_NAME}", label: "Customer Name", example: "Deepak Agarwal" },
      { token: "{QUOTATION_NUMBER}", label: "Quote Number", example: "QT-2026-0045" },
      { token: "{TOTAL_AMOUNT}", label: "Quotation Total (₹)", example: "18,500.00" },
      { token: "{VALID_UNTIL}", label: "Valid Until", example: "15/09/2026" },
      { token: "{SHOP_NAME}", label: "Shop Name", example: "Crystal Press" },
      { token: "{SHOP_PHONE}", label: "Shop Phone", example: "+91 98765 43210" },
    ],
    defaultMessage:
`*PRINT ESTIMATE & QUOTATION — {SHOP_NAME}* 💼

Dear *{CUSTOMER_NAME}*,

Thank you for your inquiry! As requested, here is the official quotation for your printing requirement:

📋 *Quote No:* #{QUOTATION_NUMBER}
💰 *Total Estimated Value:* *₹{TOTAL_AMOUNT}*
📅 *Price Valid Until:* {VALID_UNTIL}

Please confirm your approval so we can schedule the artwork preparation and machine slot for you.

_Best regards,_
*{SHOP_NAME}*
📞 {SHOP_PHONE}`.trim(),
  },

  DELIVERY_CHALLAN: {
    key: "DELIVERY_CHALLAN",
    name: "🚚 Delivery Challan Dispatch Note",
    category: "Quotations & Dispatch",
    description: "Sent when goods are dispatched via delivery boy or vehicle to the recipient address.",
    icon: "Package",
    availableTokens: [
      { token: "{CUSTOMER_NAME}", label: "Customer Name", example: "Apex Industries" },
      { token: "{CHALLAN_NUMBER}", label: "Challan Number", example: "DC-2026-0018" },
      { token: "{ITEM_COUNT}", label: "Dispatched Items Count", example: "3 packages" },
      { token: "{VEHICLE_NO}", label: "Vehicle / Driver Info", example: "MH 12 AB 1234 (Ramesh)" },
      { token: "{SHOP_NAME}", label: "Shop Name", example: "Crystal Press" },
      { token: "{SHOP_PHONE}", label: "Shop Phone", example: "+91 98765 43210" },
    ],
    defaultMessage:
`*DISPATCH NOTIFICATION (DELIVERY CHALLAN) — {SHOP_NAME}* 🚚

Dear *{CUSTOMER_NAME}*,

Your order packages have been dispatched from *{SHOP_NAME}* under Delivery Challan:

📦 *Challan No:* #{CHALLAN_NUMBER}
📋 *Dispatched Packages:* {ITEM_COUNT}
🚛 *Vehicle / Delivery Agent:* {VEHICLE_NO}

Please verify the physical goods upon arrival and sign the delivery acknowledgment.

_Thank you,_
*{SHOP_NAME}*
📞 {SHOP_PHONE}`.trim(),
  },
};

/**
 * Replaces tokens in template string with live data
 */
export function renderWhatsAppTemplate(templateText: string, tokens: TemplateTokenValues): string {
  if (!templateText) return "";

  let result = templateText;

  // Standard token replacements
  for (const [key, rawValue] of Object.entries(tokens)) {
    const tokenTag = `{${key}}`;
    const safeValue = rawValue !== undefined && rawValue !== null ? String(rawValue) : "";
    result = result.split(tokenTag).join(safeValue);
  }

  // Clean any unresolved tokens gracefully with empty string
  result = result.replace(/\{[A-Z0-9_]+\}/g, "");

  return result;
}

/**
 * Generates an official wa.me link with encoded text
 */
export function createWhatsAppUrl(phone: string | undefined | null, message: string): string {
  const cleanPhone = (phone || "").replace(/\D/g, "");
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  if (!formattedPhone) {
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

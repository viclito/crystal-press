export interface ReceiptPrintData {
  shopName: string;
  tagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  upiId?: string;
  invoiceNumber: string;
  date?: string;
  customerName?: string;
  customerPhone?: string;
  cashierName?: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
    total: number;
    unit?: string;
  }>;
  subTotal: number;
  discountAmount?: number;
  taxAmount?: number;
  roundOff?: number;
  netTotal: number;
  paidAmount?: number;
  balanceDue?: number;
  paymentMethod: string;
  footerText?: string;
}

/**
 * Generates an ultra-clean, modern 80mm Thermal POS Receipt HTML
 */
export function generateThermalReceiptHtml(data: ReceiptPrintData): string {
  const dateStr = data.date || new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Receipt ${data.invoiceNumber}</title>
      <style>
        @page {
          margin: 0;
          size: 80mm auto;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 12px;
          line-height: 1.35;
          color: #0f172a;
          background: #ffffff;
          width: 76mm;
          margin: 0 auto;
          padding: 4mm 2mm;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .header {
          text-align: center;
          padding-bottom: 8px;
          border-bottom: 2px solid #0f172a;
        }
        .shop-name {
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.5px;
          text-transform: uppercase;
          color: #000000;
        }
        .shop-sub {
          font-size: 10px;
          font-weight: 600;
          color: #475569;
          margin-top: 1px;
        }
        .shop-contact {
          font-size: 9.5px;
          color: #64748b;
          margin-top: 2px;
        }
        .meta-section {
          padding: 6px 0;
          border-bottom: 1px dashed #cbd5e1;
          font-size: 10.5px;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
        }
        .meta-label {
          color: #64748b;
          font-weight: 500;
        }
        .meta-val {
          font-weight: 700;
          color: #0f172a;
        }
        .items-table {
          width: 100%;
          margin-top: 6px;
          border-collapse: collapse;
        }
        .items-table th {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #475569;
          padding: 4px 0;
          border-bottom: 1px solid #0f172a;
        }
        .items-table td {
          padding: 4px 0;
          font-size: 11px;
          vertical-align: top;
        }
        .item-name {
          font-weight: 600;
          color: #0f172a;
          line-height: 1.25;
        }
        .item-sub {
          font-size: 9.5px;
          color: #64748b;
        }
        .totals-section {
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px dashed #cbd5e1;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          padding: 1.5px 0;
          color: #475569;
        }
        .total-row.net-payable {
          margin-top: 4px;
          padding: 6px 4px;
          background: #0f172a;
          color: #ffffff;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 800;
        }
        .total-row.net-payable .amount {
          font-size: 14px;
        }
        .payment-status {
          margin-top: 6px;
          padding: 4px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 10.5px;
        }
        .barcode-section {
          margin-top: 10px;
          text-align: center;
        }
        .barcode-box {
          font-family: 'Libre Barcode 39', 'Courier New', monospace;
          font-size: 28px;
          letter-spacing: 3px;
          line-height: 1;
        }
        .footer {
          margin-top: 8px;
          text-align: center;
          font-size: 9px;
          color: #64748b;
          border-top: 1px dashed #cbd5e1;
          padding-top: 6px;
          line-height: 1.35;
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div class="shop-name">${data.shopName || "CRYSTAL PRESS"}</div>
        <div class="shop-sub">${data.tagline || "Printing Press & Stationery Retail"}</div>
        ${data.address ? `<div class="shop-contact">${data.address}</div>` : ""}
        ${data.phone ? `<div class="shop-contact">Phone: ${data.phone}</div>` : ""}
      </div>

      <!-- Invoice & Customer Meta -->
      <div class="meta-section">
        <div class="meta-row">
          <span class="meta-label">Invoice No:</span>
          <span class="meta-val">${data.invoiceNumber}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Date & Time:</span>
          <span class="meta-val">${dateStr}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Customer:</span>
          <span class="meta-val">${data.customerName || "Walk-in Retail"}</span>
        </div>
        ${
          data.customerPhone
            ? `<div class="meta-row"><span class="meta-label">Phone:</span><span class="meta-val">+91 ${data.customerPhone}</span></div>`
            : ""
        }
        <div class="meta-row">
          <span class="meta-label">Cashier / Staff:</span>
          <span class="meta-val">${data.cashierName || "Staff"}</span>
        </div>
      </div>

      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="text-align: left; width: 48%;">Item</th>
            <th style="text-align: center; width: 14%;">Qty</th>
            <th style="text-align: right; width: 18%;">Price</th>
            <th style="text-align: right; width: 20%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.items
            .map(
              (i) => `
            <tr>
              <td style="text-align: left;">
                <div class="item-name">${i.name}</div>
              </td>
              <td style="text-align: center; font-weight: 700;">${i.qty}</td>
              <td style="text-align: right; color: #475569;">₹${i.price.toFixed(2)}</td>
              <td style="text-align: right; font-weight: 700;">₹${i.total.toFixed(2)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>

      <!-- Totals & Taxes -->
      <div class="totals-section">
        <div class="total-row">
          <span>Subtotal:</span>
          <span style="font-weight: 600; color: #0f172a;">₹${data.subTotal.toFixed(2)}</span>
        </div>

        ${
          data.discountAmount && data.discountAmount > 0
            ? `<div class="total-row" style="color: #15803d;"><span>Discount:</span><span>-₹${data.discountAmount.toFixed(2)}</span></div>`
            : ""
        }

        ${
          data.taxAmount && data.taxAmount > 0
            ? `<div class="total-row"><span>Taxes / GST:</span><span>+₹${data.taxAmount.toFixed(2)}</span></div>`
            : ""
        }

        ${
          data.roundOff && data.roundOff !== 0
            ? `<div class="total-row"><span>Round-off:</span><span>${data.roundOff > 0 ? "+" : ""}₹${data.roundOff.toFixed(2)}</span></div>`
            : ""
        }

        <div class="total-row net-payable">
          <span>NET PAYABLE:</span>
          <span class="amount">₹${data.netTotal.toFixed(2)}</span>
        </div>
      </div>

      <!-- Payment Tender Breakdown -->
      <div class="payment-status">
        <div class="meta-row">
          <span class="meta-label">Payment Mode:</span>
          <span class="meta-val" style="text-transform: uppercase;">${data.paymentMethod}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Amount Paid:</span>
          <span class="meta-val">₹${(data.paidAmount ?? data.netTotal).toFixed(2)}</span>
        </div>
        ${
          data.balanceDue && data.balanceDue > 0
            ? `<div class="meta-row" style="color: #b91c1c; font-weight: 800;"><span style="color: #b91c1c;">Balance (Udhaar):</span><span>₹${data.balanceDue.toFixed(2)}</span></div>`
            : ""
        }
      </div>

      <!-- Barcode Reference -->
      <div class="barcode-section">
        <div style="font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #334155;">
          *${data.invoiceNumber}*
        </div>
      </div>

      <!-- Footer Notes -->
      <div class="footer">
        <div>${data.footerText || "Thank you for shopping with Crystal Press!"}</div>
        <div style="font-size: 8px; margin-top: 3px; color: #94a3b8;">Computer Generated Receipt</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates an Executive A4 / A5 Tax Invoice for Desktop & PDF Printers
 */
export function generateA4InvoiceHtml(data: ReceiptPrintData): string {
  const dateStr = data.date || new Date().toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Tax Invoice - ${data.invoiceNumber}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          padding: 10px;
          line-height: 1.4;
        }
        .invoice-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
        }
        .header-grid {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 20px;
          border-bottom: 2px solid #0f172a;
        }
        .brand-title {
          font-size: 24px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.5px;
          text-transform: uppercase;
        }
        .brand-sub {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          margin-top: 2px;
        }
        .invoice-badge {
          text-align: right;
        }
        .invoice-badge h1 {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .invoice-badge .inv-no {
          font-size: 13px;
          font-weight: 700;
          color: #047857;
          margin-top: 2px;
        }
        .meta-boxes {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          padding: 16px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .meta-box h4 {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          margin-bottom: 4px;
        }
        .meta-box p {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
        }
        .table-container {
          margin-top: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 10px 12px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #475569;
        }
        td {
          border: 1px solid #e2e8f0;
          padding: 10px 12px;
          font-size: 12px;
        }
        .total-summary-grid {
          display: flex;
          justify-content: space-between;
          margin-top: 24px;
          gap: 30px;
        }
        .terms-box {
          flex: 1;
          font-size: 11px;
          color: #64748b;
        }
        .totals-box {
          width: 280px;
        }
        .calc-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          font-size: 12px;
          color: #475569;
        }
        .calc-row.grand-total {
          border-top: 2px solid #0f172a;
          margin-top: 6px;
          padding-top: 8px;
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
        }
        .signatory-box {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .sign-line {
          width: 200px;
          border-top: 1px solid #0f172a;
          text-align: center;
          padding-top: 6px;
          font-size: 11px;
          font-weight: 600;
          color: #475569;
        }
      </style>
    </head>
    <body>
      <div class="invoice-card">
        <!-- Header -->
        <div class="header-grid">
          <div>
            <div class="brand-title">${data.shopName || "CRYSTAL PRESS"}</div>
            <div class="brand-sub">${data.tagline || "Commercial Offset & Digital Printing Press"}</div>
            <div class="brand-sub">${data.address || "Main Commercial Complex, Town Hall Road"}</div>
            <div class="brand-sub">Phone: ${data.phone || "+91 98765 43210"} | Email: ${data.email || "billing@crystalpress.com"}</div>
          </div>
          <div class="invoice-badge">
            <h1>TAX INVOICE</h1>
            <div class="inv-no"># ${data.invoiceNumber}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Date: ${dateStr}</div>
          </div>
        </div>

        <!-- Billed To -->
        <div class="meta-boxes">
          <div class="meta-box">
            <h4>Billed To (Customer)</h4>
            <p>${data.customerName || "Cash Customer / Walk-in"}</p>
            ${data.customerPhone ? `<p style="font-size: 12px; color: #64748b; font-weight: normal;">Contact: +91 ${data.customerPhone}</p>` : ""}
          </div>
          <div class="meta-box" style="text-align: right;">
            <h4>Payment Terms</h4>
            <p style="text-transform: uppercase;">Mode: ${data.paymentMethod}</p>
            <p style="font-size: 12px; color: #047857; font-weight: 700;">Status: ${data.balanceDue && data.balanceDue > 0 ? "PARTIAL / DUE" : "PAID IN FULL"}</p>
          </div>
        </div>

        <!-- Table -->
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="width: 8%; text-align: center;">#</th>
                <th style="text-align: left;">Item & Description</th>
                <th style="width: 12%; text-align: center;">Qty</th>
                <th style="width: 18%; text-align: right;">Unit Price (₹)</th>
                <th style="width: 18%; text-align: right;">Total Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${data.items
                .map(
                  (item, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
                  <td>
                    <strong>${item.name}</strong>
                  </td>
                  <td style="text-align: center; font-weight: 700;">${item.qty} ${item.unit || ""}</td>
                  <td style="text-align: right;">₹${item.price.toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 700;">₹${item.total.toFixed(2)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- Summary & Footer -->
        <div class="total-summary-grid">
          <div class="terms-box">
            <h4 style="font-size: 11px; font-weight: 700; color: #0f172a; margin-bottom: 4px; text-transform: uppercase;">Terms & Conditions</h4>
            <p>1. Goods once sold are not returnable after 3 days.</p>
            <p>2. For custom print jobs, approved digital proofs on WhatsApp are final.</p>
            ${data.upiId ? `<p style="margin-top: 6px; font-weight: 700; color: #0f172a;">UPI Payment VPA: ${data.upiId}</p>` : ""}
          </div>

          <div class="totals-box">
            <div class="calc-row">
              <span>Subtotal:</span>
              <span style="font-weight: 700; color: #0f172a;">₹${data.subTotal.toFixed(2)}</span>
            </div>
            ${data.discountAmount && data.discountAmount > 0 ? `<div class="calc-row" style="color: #15803d;"><span>Discount:</span><span>-₹${data.discountAmount.toFixed(2)}</span></div>` : ""}
            ${data.taxAmount && data.taxAmount > 0 ? `<div class="calc-row"><span>Taxes:</span><span>+₹${data.taxAmount.toFixed(2)}</span></div>` : ""}
            ${data.roundOff && data.roundOff !== 0 ? `<div class="calc-row"><span>Round-off:</span><span>${data.roundOff > 0 ? "+" : ""}₹${data.roundOff.toFixed(2)}</span></div>` : ""}
            <div class="calc-row grand-total">
              <span>Net Total:</span>
              <span>₹${data.netTotal.toFixed(2)}</span>
            </div>
            <div class="calc-row" style="font-weight: 600; margin-top: 4px;">
              <span>Amount Paid:</span>
              <span>₹${(data.paidAmount ?? data.netTotal).toFixed(2)}</span>
            </div>
            ${data.balanceDue && data.balanceDue > 0 ? `<div class="calc-row" style="color: #b91c1c; font-weight: 800;"><span>Balance Due:</span><span>₹${data.balanceDue.toFixed(2)}</span></div>` : ""}
          </div>
        </div>

        <!-- Signature -->
        <div class="signatory-box">
          <div style="font-size: 10px; color: #94a3b8;">
            Thank you for choosing Crystal Press!
          </div>
          <div class="sign-line">
            Authorized Signatory / Cashier
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Native hidden iframe printer
 */
export function printThermalReceipt(data: ReceiptPrintData, format: "thermal" | "a4" = "thermal") {
  const html = format === "a4" ? generateA4InvoiceHtml(data) : generateThermalReceiptHtml(data);
  let iframe = document.getElementById("thermal-print-iframe") as HTMLIFrameElement;

  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "thermal-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
  }, 100);
}

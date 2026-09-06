export interface JobCardData {
  shopName: string;
  jobOrderNumber: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  jobType: string;
  quantity: number;
  unitName: string;
  specifications: Record<string, any>;
  expectedDeliveryDate?: string;
  designNotes?: string;
  proofApproved: boolean;
}

export function generateJobCardHtml(data: JobCardData): string {
  const specsList = Object.entries(data.specifications || {}).map(
    ([k, v]) => `<tr><td style="width: 35%; font-weight: bold; text-transform: capitalize;">${k.replace(/([A-Z])/g, " $1")}:</td><td>${v}</td></tr>`
  ).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Job Work Order - ${data.jobOrderNumber}</title>
      <style>
        @page { size: A5 landscape; margin: 10mm; }
        body {
          font-family: Arial, sans-serif;
          font-size: 13px;
          color: #000;
          line-height: 1.4;
          margin: 0;
          padding: 0;
        }
        .header { border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-end; }
        .title { font-size: 20px; font-weight: bold; }
        .job-tag { font-size: 16px; font-weight: bold; background: #000; color: #fff; padding: 4px 10px; border-radius: 4px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 12px; }
        .card { border: 1px solid #ccc; border-radius: 6px; padding: 10px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 4px 0; border-bottom: 1px solid #eee; }
        .notes-box { border: 1px dashed #666; border-radius: 6px; padding: 10px; background: #fdfdfd; min-height: 50px; }
        .status-stamp { border: 2px solid #22c55e; color: #15803d; font-weight: bold; padding: 4px 8px; border-radius: 4px; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">${data.shopName || "CRYSTAL PRESS"} — WORK ORDER</div>
          <div style="font-size: 11px; color: #555;">Press Production Job Card</div>
        </div>
        <div class="job-tag">${data.jobOrderNumber}</div>
      </div>

      <div class="grid">
        <div class="card">
          <div style="font-weight: bold; margin-bottom: 6px; border-bottom: 1px solid #ddd; padding-bottom: 4px;">Customer & Schedule</div>
          <table>
            <tr><td style="width: 35%; font-weight: bold;">Customer:</td><td>${data.customerName}</td></tr>
            <tr><td style="font-weight: bold;">Contact:</td><td>${data.customerPhone || "N/A"}</td></tr>
            <tr><td style="font-weight: bold;">Order Date:</td><td>${data.date}</td></tr>
            <tr><td style="font-weight: bold;">Target Date:</td><td><strong>${data.expectedDeliveryDate || "URGENT / ASAP"}</strong></td></tr>
          </table>
        </div>

        <div class="card">
          <div style="font-weight: bold; margin-bottom: 6px; border-bottom: 1px solid #ddd; padding-bottom: 4px;">Job Type & Quantity</div>
          <table>
            <tr><td style="width: 35%; font-weight: bold;">Job Item:</td><td><strong style="font-size: 15px;">${data.jobType}</strong></td></tr>
            <tr><td style="font-weight: bold;">Quantity:</td><td><strong style="font-size: 16px;">${data.quantity} ${data.unitName}</strong></td></tr>
            <tr><td style="font-weight: bold;">Proof Status:</td><td>${data.proofApproved ? '<span class="status-stamp">APPROVED FOR PRINT</span>' : 'PENDING APPROVAL'}</td></tr>
          </table>
        </div>
      </div>

      <div class="card" style="margin-bottom: 12px;">
        <div style="font-weight: bold; margin-bottom: 6px; border-bottom: 1px solid #ddd; padding-bottom: 4px;">Technical Specifications</div>
        <table>
          ${specsList || '<tr><td>Standard Press Specs</td></tr>'}
        </table>
      </div>

      <div class="notes-box">
        <strong style="font-size: 11px; text-transform: uppercase;">Design / Production Instructions:</strong>
        <p style="margin: 4px 0 0 0; font-size: 12px;">${data.designNotes || "No special design notes provided."}</p>
      </div>

      <div style="margin-top: 15px; display: flex; justify-content: space-between; font-size: 11px; color: #555;">
        <div>Operator Sign: __________________</div>
        <div>Finishing & QA Sign: __________________</div>
        <div>Dispatched By: __________________</div>
      </div>
    </body>
    </html>
  `;
}

export function printJobWorkOrder(data: JobCardData) {
  const html = generateJobCardHtml(data);
  let iframe = document.getElementById("job-print-iframe") as HTMLIFrameElement;

  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "job-print-iframe";
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
  }, 60);
}

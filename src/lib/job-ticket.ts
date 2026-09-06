// ====================================================
// CRYSTAL PRESS — JOB PRODUCTION TICKET & WHATSAPP HELPERS
// ====================================================

import { renderWhatsAppTemplate } from "@/lib/whatsapp-templates";

export interface JobTicketData {
  id: string;
  jobOrderNumber: string;
  customerName: string;
  customerPhone?: string | null;
  jobType: string;
  specifications: Record<string, any>;
  quantity: number;
  unitName: string;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  status: string;
  priority?: "NORMAL" | "EXPRESS" | "URGENT";
  designNotes?: string | null;
  expectedDeliveryDate?: string | Date | null;
  createdAt: string | Date;
  createdBy?: {
    fullName?: string;
    username?: string;
  } | null;
}

export interface ShopInfo {
  shopName: string;
  tagline?: string;
  addressLine1?: string;
  phone1?: string;
  email?: string;
  upiId?: string;
}

/**
 * Generates an SVG Barcode string for the Job Order Number.
 */
export function generateBarcodeSvg(code: string): string {
  // Clean alphanumeric code for barcode
  const clean = code.replace(/[^A-Za-z0-9\-]/g, "").toUpperCase();
  
  // High-contrast bar pattern simulation for Code128 / Code39 style
  let barsHtml = "";
  let posX = 10;
  
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    const pattern = [
      (charCode % 2) + 1,
      ((charCode >> 1) % 2) + 1,
      ((charCode >> 2) % 2) + 1,
      ((charCode >> 3) % 2) + 1,
    ];
    
    for (let p = 0; p < pattern.length; p++) {
      const width = pattern[p] * 1.8;
      const isBlack = p % 2 === 0;
      if (isBlack) {
        barsHtml += `<rect x="${posX}" y="5" width="${width}" height="38" fill="#000000" />`;
      }
      posX += width + 1.2;
    }
    posX += 2.5;
  }

  const totalWidth = Math.max(160, posX + 10);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} 55" width="${totalWidth}" height="45" class="barcode-svg">
      <rect width="100%" height="100%" fill="#ffffff" />
      ${barsHtml}
      <text x="${totalWidth / 2}" y="50" font-family="monospace" font-size="9" font-weight="900" text-anchor="middle" fill="#000000" letter-spacing="2">
        *${clean}*
      </text>
    </svg>
  `;
}

/**
 * Builds HTML for full A4 Production Work Order & Job Bag Docket.
 */
export function generateA4JobTicketHtml(job: JobTicketData, shop: ShopInfo): string {
  const shopName = shop.shopName || "CRYSTAL PRESS";
  const address = shop.addressLine1 || "Commercial Complex, Main Market Road";
  const phone = shop.phone1 || "+91 98765 43210";
  const specs = job.specifications || {};

  const priority = job.priority || "NORMAL";
  const priorityColor = priority === "URGENT" ? "#dc2626" : priority === "EXPRESS" ? "#d97706" : "#2563eb";

  const barcodeSvg = generateBarcodeSvg(job.jobOrderNumber);

  // Extract specs keys
  const specsEntries = Object.entries(specs);
  const specsRows = specsEntries.length > 0
    ? specsEntries
        .map(
          ([k, v]) => `
          <tr>
            <td style="padding: 6px 10px; font-weight: 800; color: #475569; text-transform: uppercase; font-size: 10px; border-bottom: 1px solid #f1f5f9; width: 35%;">
              ${k.replace(/([A-Z])/g, " $1").trim()}
            </td>
            <td style="padding: 6px 10px; font-weight: 700; color: #0f172a; font-size: 11px; border-bottom: 1px solid #f1f5f9;">
              ${typeof v === "object" ? JSON.stringify(v) : String(v)}
            </td>
          </tr>
        `
        )
        .join("")
    : `<tr><td colspan="2" style="padding: 8px; color: #94a3b8;">Standard Production Specifications</td></tr>`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Job Docket #${job.jobOrderNumber} - ${job.jobType}</title>
      <style>
        @page { size: A4 portrait; margin: 10mm 12mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        body { color: #0f172a; background: #ffffff; line-height: 1.35; padding: 6px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
        .shop-name { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; }
        .doc-badge { display: inline-block; background: #0f172a; color: #ffffff; font-weight: 900; font-size: 11px; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; margin-top: 4px; }
        .priority-badge { display: inline-block; background: ${priorityColor}; color: #ffffff; font-weight: 900; font-size: 11px; padding: 4px 12px; border-radius: 4px; text-transform: uppercase; }
        .grid-2 { display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px; margin-bottom: 12px; }
        .card { background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; font-size: 11px; }
        .card-title { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; }
        table { width: 100%; border-collapse: collapse; margin-top: 4px; }
        .checklist-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
        .check-box-item { border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 10px; }
        .check-box-header { font-weight: 900; font-size: 9px; text-transform: uppercase; color: #334155; margin-bottom: 4px; }
        .check-square { display: inline-block; width: 12px; height: 12px; border: 1.5px solid #0f172a; margin-right: 4px; vertical-align: middle; }
        .sign-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; padding-top: 12px; border-top: 1.5px dashed #cbd5e1; }
        .sign-box { text-align: center; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; font-size: 9px; min-height: 55px; display: flex; flex-direction: column; justify-content: space-between; }
        .sign-line { border-top: 1px solid #0f172a; margin-top: 25px; padding-top: 2px; font-weight: bold; }
      </style>
    </head>
    <body>
      <!-- Top Header -->
      <div class="header">
        <div>
          <div class="shop-name">${shopName}</div>
          <div style="font-size: 10px; color: #475569;">${address} • Phone: ${phone}</div>
          <div class="doc-badge">PRODUCTION WORK ORDER / JOB BAG DOCKET</div>
        </div>
        <div style="text-align: right; display: flex; align-items: center; justify-content: flex-end; gap: 12px;">
          <div>
            <div style="margin-bottom: 4px;">${barcodeSvg}</div>
            <div class="priority-badge">${priority} PRIORITY</div>
          </div>
          <div style="text-align: center; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 5px 8px;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`http://localhost:3000/track/${job.jobOrderNumber}`)}" style="width: 52px; height: 52px; display: block; margin: 0 auto;" alt="Track QR" />
            <div style="font-size: 7.5px; font-weight: 900; color: #0f172a; margin-top: 2px;">SCAN TO TRACK</div>
            <div style="font-size: 6.5px; color: #64748b;">& APPROVE PROOF</div>
          </div>
        </div>
      </div>

      <!-- Overview Cards Grid -->
      <div class="grid-2">
        <!-- Customer & Order Meta -->
        <div class="card">
          <div class="card-title">CUSTOMER & ORDER DETAILS</div>
          <div style="font-size: 14px; font-weight: 900; color: #0f172a;">${job.customerName}</div>
          ${job.customerPhone ? `<div style="font-weight: bold; color: #334155; margin-top: 2px;">Phone: +91 ${job.customerPhone}</div>` : ""}
          <div style="margin-top: 4px; color: #475569;">
            <span>Order Date: </span><strong>${new Date(job.createdAt).toLocaleDateString("en-IN")}</strong>
          </div>
          ${
            job.expectedDeliveryDate
              ? `<div style="color: #b91c1c; font-weight: 900; margin-top: 2px;">TARGET DELIVERY: ${new Date(job.expectedDeliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>`
              : ""
          }
          <div style="margin-top: 2px; color: #64748b;">Created By: ${job.createdBy?.fullName || "Staff Terminal"}</div>
        </div>

        <!-- Job Scope & Financials -->
        <div class="card">
          <div class="card-title">PRODUCTION QUANTITY & FINANCIALS</div>
          <div style="font-size: 15px; font-weight: 900; color: #0f172a;">${job.jobType}</div>
          <div style="font-size: 18px; font-weight: 900; color: #0284c7; margin-top: 2px;">
            ${job.quantity} <span style="font-size: 12px; color: #64748b; font-weight: bold;">${job.unitName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
            <span>Total Bill: <strong>₹${Number(job.totalAmount).toFixed(2)}</strong></span>
            <span>Advance: <strong style="color: #16a34a;">₹${Number(job.advancePaid).toFixed(2)}</strong></span>
          </div>
          <div style="margin-top: 3px; font-weight: 900; color: ${job.balanceDue > 0 ? "#b91c1c" : "#16a34a"};">
            Balance Collectible on Delivery: ₹${Number(job.balanceDue).toFixed(2)}
          </div>
        </div>
      </div>

      <!-- Technical Specifications Table -->
      <div class="card" style="margin-bottom: 12px;">
        <div class="card-title">JOB PRODUCTION & PAPER CUTTING SPECIFICATIONS</div>
        <table>
          <tbody>
            ${specsRows}
          </tbody>
        </table>
      </div>

      ${
        job.designNotes
          ? `
        <div class="card" style="margin-bottom: 12px; background: #fffbeb; border-color: #fde68a;">
          <div class="card-title" style="color: #92400e;">SPECIAL OPERATOR / DESIGN NOTES</div>
          <div style="font-weight: 700; color: #78350f; font-size: 11px;">${job.designNotes}</div>
        </div>
      `
          : ""
      }

      <!-- Machine & Post-Press Checklists -->
      <div class="card">
        <div class="card-title">WORKSTATION PROCESS ROUTING & CHECKLIST</div>
        <div class="checklist-grid">
          <div class="check-box-item">
            <div class="check-box-header">1. PRE-PRESS / DTP</div>
            <div><span class="check-square"></span> Proof Approved by Client</div>
            <div><span class="check-square"></span> CTP Plates / Masters Ready</div>
          </div>

          <div class="check-box-item">
            <div class="check-box-header">2. PAPER CUTTING</div>
            <div><span class="check-square"></span> Master Sheets Cut to Size</div>
            <div><span class="check-square"></span> Grain & Gripper Checked</div>
          </div>

          <div class="check-box-item">
            <div class="check-box-header">3. PRESS PRINTING</div>
            <div><span class="check-square"></span> Registration & Ink Matched</div>
            <div><span class="check-square"></span> Impression Count Verified</div>
          </div>

          <div class="check-box-item">
            <div class="check-box-header">4. LAMINATION / UV</div>
            <div><span class="check-square"></span> Thermal Matte / Gloss</div>
            <div><span class="check-square"></span> Spot / Full UV Coated</div>
          </div>

          <div class="check-box-item">
            <div class="check-box-header">5. BINDING & FINISHING</div>
            <div><span class="check-square"></span> Creasing / Die Punching</div>
            <div><span class="check-square"></span> Numbering & Pad Binding</div>
          </div>

          <div class="check-box-item">
            <div class="check-box-header">6. QA & DISPATCH</div>
            <div><span class="check-square"></span> Quality Count Checked</div>
            <div><span class="check-square"></span> Bundled & Labeled</div>
          </div>
        </div>
      </div>

      <!-- Multi-Stage Operator Signature Grid -->
      <div class="sign-grid">
        <div class="sign-box">
          <div style="font-weight: bold; color: #475569;">DTP / Designer</div>
          <div class="sign-line">Sign & Date</div>
        </div>

        <div class="sign-box">
          <div style="font-weight: bold; color: #475569;">Cutting Master</div>
          <div class="sign-line">Sign & Date</div>
        </div>

        <div class="sign-box">
          <div style="font-weight: bold; color: #475569;">Pressman / Operator</div>
          <div class="sign-line">Sign & Date</div>
        </div>

        <div class="sign-box">
          <div style="font-weight: bold; color: #475569;">Packing & Dispatch</div>
          <div class="sign-line">Sign & Date</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Builds HTML for 80mm Thermal Job Docket Slip (for parcel labelling).
 */
export function generateThermalJobTicketHtml(job: JobTicketData, shop: ShopInfo): string {
  const shopName = shop.shopName || "CRYSTAL PRESS";
  const priority = job.priority || "NORMAL";

  const specsList = Object.entries(job.specifications || {})
    .slice(0, 5)
    .map(([k, v]) => `<div class="row"><span>${k}:</span><span class="bold">${String(v)}</span></div>`)
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Job Slip #${job.jobOrderNumber}</title>
      <style>
        @page { size: 80mm auto; margin: 2mm 3mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; }
        body { width: 72mm; font-size: 11px; line-height: 1.3; color: #000; padding: 2px; }
        .center { text-align: center; }
        .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
        .row { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 10px; }
        .bold { font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="center">
        <div style="font-size: 13px; font-weight: bold;">${shopName}</div>
        <div style="font-size: 9px;">*** PRODUCTION JOB DOCKET ***</div>
        <div style="font-size: 12px; font-weight: bold; margin-top: 2px;">[${priority} PRIORITY]</div>
      </div>

      <div class="divider"></div>
      <div style="font-size: 11px;">
        <div class="row"><span>Job Ref:</span><span class="bold">${job.jobOrderNumber}</span></div>
        <div class="row"><span>Customer:</span><span class="bold">${job.customerName}</span></div>
        ${job.customerPhone ? `<div class="row"><span>Phone:</span><span>+91 ${job.customerPhone}</span></div>` : ""}
        <div class="row"><span>Job:</span><span class="bold">${job.jobType}</span></div>
        <div class="row" style="font-size: 12px;"><span>Qty:</span><span class="bold">${job.quantity} ${job.unitName}</span></div>
        ${job.expectedDeliveryDate ? `<div class="row" style="color: #000;"><span>Target:</span><span class="bold">${new Date(job.expectedDeliveryDate).toLocaleDateString("en-IN")}</span></div>` : ""}
      </div>

      <div class="divider"></div>
      <div style="font-size: 9px; font-weight: bold; margin-bottom: 2px;">SPECIFICATIONS:</div>
      ${specsList}

      <div class="divider"></div>
      <div class="row"><span>Total Bill:</span><span>₹${Number(job.totalAmount).toFixed(2)}</span></div>
      <div class="row"><span>Advance Paid:</span><span>₹${Number(job.advancePaid).toFixed(2)}</span></div>
      <div class="row bold" style="font-size: 12px; border-top: 1px solid #000; padding-top: 2px;">
        <span>BALANCE DUE:</span>
        <span>₹${Number(job.balanceDue).toFixed(2)}</span>
      </div>

      <div class="divider"></div>
      <div class="center" style="margin: 6px 0;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`http://localhost:3000/track/${job.jobOrderNumber}`)}" style="width: 65px; height: 65px;" alt="QR" />
        <div style="font-size: 8px; font-weight: bold; margin-top: 3px;">SCAN TO TRACK & APPROVE PROOF</div>
        <div style="font-size: 7px; color: #444;">crystalpress.in/track/${job.jobOrderNumber}</div>
      </div>

      <div class="divider"></div>
      <div class="center" style="font-size: 8px;">
        <div>ATTACH THIS SLIP TO JOB BUNDLE</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Builds formatted WhatsApp messages for different Job milestones.
 */
export function buildJobWhatsAppMessage(
  milestone: "PROOF_APPROVAL" | "PRINTING" | "READY_FOR_PICKUP" | "DELIVERED",
  job: JobTicketData,
  shop: ShopInfo,
  customTemplate?: string
): string {
  const shopName = shop.shopName || "Crystal Press";
  const address = shop.addressLine1 || "our shop counter";
  const trackUrl = `http://localhost:3000/track/${job.jobOrderNumber}`;

  if (customTemplate && customTemplate.trim().length > 0) {
    return renderWhatsAppTemplate(customTemplate, {
      CUSTOMER_NAME: job.customerName,
      CUSTOMER_PHONE: job.customerPhone || "",
      ORDER_NUMBER: job.jobOrderNumber,
      JOB_TYPE: job.jobType,
      QUANTITY: job.quantity,
      UNIT: job.unitName,
      TOTAL_AMOUNT: job.totalAmount.toFixed(2),
      ADVANCE_PAID: job.advancePaid.toFixed(2),
      BALANCE_DUE: job.balanceDue.toFixed(2),
      DUE_DATE: job.expectedDeliveryDate
        ? new Date(job.expectedDeliveryDate).toLocaleDateString("en-IN")
        : "",
      TRACK_LINK: trackUrl,
      SHOP_NAME: shopName,
      SHOP_PHONE: shop.phone1 || "",
      SHOP_ADDRESS: address,
    });
  }

  switch (milestone) {
    case "PROOF_APPROVAL":
      return (
        `*DESIGN PROOF READY FOR APPROVAL — ${shopName.toUpperCase()}*\n\n` +
        `Dear *${job.customerName}*,\n\n` +
        `Your design proof for *Order #${job.jobOrderNumber}* (${job.jobType} - ${job.quantity} ${job.unitName}) is prepared and ready for your review!\n\n` +
        `👉 *Click here to review & approve your artwork:*\n` +
        `${trackUrl}\n\n` +
        `🔍 Please inspect the text, spelling, phone numbers, and layout. Once approved online, we will immediately start printing.\n\n` +
        `_Thank you,_\n*${shopName}*`
      );

    case "PRINTING":
      return (
        `*PRINTING PRODUCTION STARTED — ${shopName.toUpperCase()}*\n\n` +
        `Dear *${job.customerName}*,\n\n` +
        `Great news! Your print job *#${job.jobOrderNumber}* (${job.jobType}) has entered production on our printing machines.\n\n` +
        `⚙️ Current Stage: *Printing & Lamination Finishing*\n` +
        (job.expectedDeliveryDate
          ? `📅 Expected Ready Date: *${new Date(job.expectedDeliveryDate).toLocaleDateString("en-IN")}*\n\n`
          : "\n") +
        `👉 *Track Live Progress:* ${trackUrl}\n\n` +
        `_We will notify you once packed & ready for pickup!_\n*${shopName}*`
      );

    case "READY_FOR_PICKUP":
      return (
        `*ORDER READY FOR PICKUP! 📦 — ${shopName.toUpperCase()}*\n\n` +
        `Dear *${job.customerName}*,\n\n` +
        `Your order *#${job.jobOrderNumber}* (${job.jobType} - ${job.quantity} ${job.unitName}) has passed quality check and is *READY FOR PICKUP* at our shop counter.\n\n` +
        `📍 *Pickup Location:* ${address}\n` +
        `💰 *Balance Due:* *₹${Number(job.balanceDue).toFixed(2)}*\n\n` +
        `👉 *View Bill & Pay UPI Online:* ${trackUrl}\n\n` +
        `_Thank you for choosing ${shopName}!_`
      );

    case "DELIVERED":
      return (
        `*ORDER DELIVERED — THANK YOU! — ${shopName.toUpperCase()}*\n\n` +
        `Dear *${job.customerName}*,\n\n` +
        `We are delighted to have completed *Order #${job.jobOrderNumber}* for you.\n\n` +
        `⭐ If you enjoyed our print quality and service, please recommend us to your friends and colleagues!\n\n` +
        `_Warm regards,_\n*${shopName}*`
      );
  }
}

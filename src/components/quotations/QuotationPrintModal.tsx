"use client";

import React, { useState } from "react";
import {
  X,
  Printer,
  Share2,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Send,
  Building2,
  Phone,
  Mail,
  Receipt,
  Sparkles,
  Edit,
  Shield,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { convertQuotationToJobOrder, convertQuotationToInvoice, updateQuotationStatus } from "@/actions/quotations";
import { QuotationStatus } from "@prisma/client";
import { toast } from "@/stores/useSnackbarStore";
import { modal } from "@/stores/useDialogStore";

interface QuotationPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: any;
  shopSettings?: any;
  onRefresh?: () => void;
  onEdit?: () => void;
  isOwner?: boolean;
}

export function QuotationPrintModal({
  isOpen,
  onClose,
  quotation,
  shopSettings,
  onRefresh,
  onEdit,
  isOwner = true,
}: QuotationPrintModalProps) {
  const [printFormat, setPrintFormat] = useState<"A4" | "THERMAL">("A4");
  const [isConverting, setIsConverting] = useState(false);

  if (!isOpen || !quotation) return null;

  const shopName = shopSettings?.shopName || "Crystal Press";
  const tagline = shopSettings?.tagline || "Printing Press & Stationery";
  const address = shopSettings?.addressLine1 || "123 Market Road, Commercial Complex";
  const phone = shopSettings?.phone1 || "+91 98765 43210";
  const email = shopSettings?.email || "orders@crystalpress.in";
  const upiId = shopSettings?.upiId || "crystalpress@upi";

  const isConverted = quotation.status === QuotationStatus.CONVERTED;

  // HTML Generator for A4 Printable Document
  const generateA4Html = () => {
    const itemsRows = quotation.items
      .map((it: any, idx: number) => {
        const specs = it.specifications || {};
        const specTags = [];
        if (specs.size) specTags.push(`<span class="spec-tag">Size: ${specs.size}</span>`);
        if (specs.paper) specTags.push(`<span class="spec-tag">Stock: ${specs.paper}</span>`);
        if (specs.sides) specTags.push(`<span class="spec-tag">Color: ${specs.sides}</span>`);
        if (specs.finishing) specTags.push(`<span class="spec-tag">Finishing: ${specs.finishing}</span>`);

        return `
          <tr>
            <td style="text-align: center; color: #64748b; font-weight: bold; padding: 10px 6px;">${idx + 1}</td>
            <td style="padding: 10px 8px;">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a;">${it.itemDescription}</div>
              ${specTags.length > 0 ? `<div style="margin-top: 4px;">${specTags.join(" ")}</div>` : ""}
            </td>
            <td style="text-align: right; font-weight: 800; color: #0f172a; padding: 10px 8px; white-space: nowrap;">
              ${Number(it.quantity)} ${it.unitName || "pcs"}
            </td>
            <td style="text-align: right; color: #334155; padding: 10px 8px; white-space: nowrap;">
              ₹${Number(it.unitPrice).toFixed(2)}
            </td>
            ${
              quotation.discountAmount > 0
                ? `<td style="text-align: right; color: #64748b; padding: 10px 8px;">${
                    it.discountAmount > 0 ? "₹" + Number(it.discountAmount).toFixed(2) : "-"
                  }</td>`
                : ""
            }
            <td style="text-align: right; font-weight: 800; color: #0f172a; padding: 10px 8px; white-space: nowrap;">
              ₹${Number(it.lineTotal).toFixed(2)}
            </td>
          </tr>
        `;
      })
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Estimate #${quotation.quotationNumber} - ${quotation.customerName}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
          body { color: #0f172a; background: #ffffff; line-height: 1.4; padding: 10px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2.5px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
          .shop-title { font-size: 24px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: -0.5px; }
          .tagline { font-size: 11px; font-weight: 600; color: #64748b; margin-top: 2px; }
          .shop-info { font-size: 11px; color: #475569; margin-top: 6px; line-height: 1.4; }
          .badge { display: inline-block; background: #0f172a; color: #ffffff; font-weight: 900; font-size: 13px; padding: 5px 12px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
          .meta-box { text-align: right; font-size: 11px; margin-top: 8px; }
          .meta-row { margin-bottom: 3px; }
          .customer-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; font-size: 11px; }
          .section-title { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
          .cust-name { font-size: 14px; font-weight: 800; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
          th { border-bottom: 2px solid #cbd5e1; padding: 8px; text-align: left; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          td { border-bottom: 1px solid #f1f5f9; }
          .spec-tag { display: inline-block; background: #f1f5f9; color: #334155; font-size: 9px; font-weight: 600; padding: 2px 6px; border-radius: 4px; margin-right: 4px; margin-top: 2px; }
          .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 24px; }
          .totals-table { width: 280px; font-size: 11px; border-top: 1px solid #cbd5e1; padding-top: 8px; }
          .totals-row { display: flex; justify-content: space-between; margin-bottom: 5px; color: #475569; }
          .grand-total { display: flex; justify-content: space-between; border-top: 2px solid #0f172a; padding-top: 8px; font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 8px; }
          .footer-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 10px; margin-top: 20px; }
          .terms-text { color: #64748b; white-space: pre-wrap; line-height: 1.5; }
          .sign-box { text-align: right; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; min-height: 70px; }
          .sign-line { width: 160px; border-top: 1px solid #0f172a; padding-top: 4px; font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="shop-title">${shopName}</div>
            <div class="tagline">${tagline}</div>
            <div class="shop-info">
              <div>${address}</div>
              <div>Phone: ${phone} • Email: ${email}</div>
              ${upiId ? `<div style="font-weight: bold; margin-top: 2px;">UPI ID: ${upiId}</div>` : ""}
            </div>
          </div>
          <div style="text-align: right;">
            <div class="badge">ESTIMATE / QUOTATION</div>
            <div class="meta-box">
              <div class="meta-row"><span style="color: #64748b;">Quote Ref: </span><span style="font-weight: 900; color: #0f172a;">${quotation.quotationNumber}</span></div>
              <div class="meta-row"><span style="color: #64748b;">Date: </span><span style="font-weight: 700;">${new Date(quotation.quotationDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>
              ${quotation.validUntil ? `<div class="meta-row"><span style="color: #64748b;">Valid Till: </span><span style="font-weight: 800; color: #b91c1c;">${new Date(quotation.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>` : ""}
            </div>
          </div>
        </div>

        <div class="customer-grid">
          <div>
            <div class="section-title">QUOTATION PREPARED FOR:</div>
            <div class="cust-name">${quotation.customerName}</div>
            ${quotation.customerPhone ? `<div style="color: #475569; margin-top: 2px;">Phone: +91 ${quotation.customerPhone}</div>` : ""}
            ${quotation.customerEmail ? `<div style="color: #475569; margin-top: 1px;">${quotation.customerEmail}</div>` : ""}
            ${quotation.customerAddress ? `<div style="color: #475569; margin-top: 1px;">${quotation.customerAddress}</div>` : ""}
          </div>
          <div style="text-align: right;">
            <div class="section-title">SALES & PRODUCTION DESK:</div>
            <div style="font-weight: 700; color: #0f172a;">Sales Rep: ${quotation.createdBy?.fullName || "Staff Terminal"}</div>
            <div style="color: #64748b; margin-top: 2px;">Status: <span style="font-weight: 800; text-transform: uppercase;">${quotation.status}</span></div>
            <div style="color: #94a3b8; margin-top: 2px;">Items: ${quotation.items.length}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th>Item Description & Specifications</th>
              <th style="text-align: right;">Qty</th>
              <th style="text-align: right;">Rate (₹)</th>
              ${quotation.discountAmount > 0 ? `<th style="text-align: right;">Disc</th>` : ""}
              <th style="text-align: right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="totals-wrap">
          <div class="totals-table">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span style="font-weight: 800; color: #0f172a;">₹${Number(quotation.subTotal).toFixed(2)}</span>
            </div>
            ${
              quotation.discountAmount > 0
                ? `<div class="totals-row" style="color: #b91c1c;"><span>Discount:</span><span style="font-weight: 800;">-₹${Number(quotation.discountAmount).toFixed(2)}</span></div>`
                : ""
            }
            ${
              quotation.taxAmount > 0
                ? `<div class="totals-row"><span>GST / Tax (${quotation.taxPercent}%):</span><span style="font-weight: 800; color: #0f172a;">₹${Number(quotation.taxAmount).toFixed(2)}</span></div>`
                : ""
            }
            ${
              quotation.roundOff !== 0
                ? `<div class="totals-row" style="color: #94a3b8; font-size: 10px;"><span>Round Off:</span><span>${quotation.roundOff > 0 ? "+₹" + quotation.roundOff : "-₹" + Math.abs(quotation.roundOff)}</span></div>`
                : ""
            }
            <div class="grand-total">
              <span>GRAND TOTAL:</span>
              <span>₹${Number(quotation.netTotal).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div class="footer-grid">
          <div>
            <div class="section-title">TERMS & CONDITIONS:</div>
            <div class="terms-text">${quotation.termsConditions || "1. 50% advance to start printing.\n2. Delivery within 3-5 days after proof approval."}</div>
          </div>
          <div class="sign-box">
            <div style="font-size: 10px; color: #94a3b8; font-weight: bold;">THANK YOU FOR YOUR BUSINESS!</div>
            <div>
              <div class="sign-line">FOR ${shopName.toUpperCase()}</div>
              <div style="font-size: 9px; color: #94a3b8; text-align: center; margin-top: 2px;">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // HTML Generator for 80mm Thermal Receipt
  const generateThermalHtml = () => {
    const itemsList = quotation.items
      .map(
        (it: any) => `
        <div style="margin-bottom: 5px;">
          <div style="font-weight: bold;">${it.itemDescription}</div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #333;">
            <span>${Number(it.quantity)} ${it.unitName || "pcs"} @ ₹${Number(it.unitPrice).toFixed(2)}</span>
            <span style="font-weight: bold; color: #000;">₹${Number(it.lineTotal).toFixed(2)}</span>
          </div>
        </div>
      `
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Quotation #${quotation.quotationNumber}</title>
        <style>
          @page { size: 80mm auto; margin: 3mm 4mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; }
          body { width: 72mm; font-size: 11px; line-height: 1.3; color: #000; padding: 2px; }
          .center { text-align: center; }
          .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center" style="padding-bottom: 4px;">
          <div style="font-size: 14px; font-weight: bold; text-transform: uppercase;">${shopName}</div>
          <div style="font-size: 9px; color: #444;">${tagline}</div>
          <div style="font-size: 9px;">${phone}</div>
          <div class="divider"></div>
          <div style="font-weight: bold; font-size: 11px; text-transform: uppercase;">*** ESTIMATE / QUOTATION ***</div>
        </div>

        <div style="font-size: 10px; line-height: 1.4;">
          <div class="row"><span>Quote Ref:</span><span class="bold">${quotation.quotationNumber}</span></div>
          <div class="row"><span>Customer:</span><span class="bold">${quotation.customerName}</span></div>
          <div class="row"><span>Date:</span><span>${new Date(quotation.quotationDate).toLocaleDateString("en-IN")}</span></div>
          ${quotation.validUntil ? `<div class="row" style="color: #b91c1c;"><span>Valid Till:</span><span class="bold">${new Date(quotation.validUntil).toLocaleDateString("en-IN")}</span></div>` : ""}
        </div>

        <div class="divider"></div>
        <div>${itemsList}</div>
        <div class="divider"></div>

        <div style="font-size: 11px;">
          <div class="row"><span>Subtotal:</span><span>₹${Number(quotation.subTotal).toFixed(2)}</span></div>
          ${quotation.discountAmount > 0 ? `<div class="row"><span>Discount:</span><span>-₹${Number(quotation.discountAmount).toFixed(2)}</span></div>` : ""}
          ${quotation.taxAmount > 0 ? `<div class="row"><span>GST (${quotation.taxPercent}%):</span><span>₹${Number(quotation.taxAmount).toFixed(2)}</span></div>` : ""}
          <div class="row bold" style="font-size: 13px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px;">
            <span>ESTIMATE TOTAL:</span>
            <span>₹${Number(quotation.netTotal).toFixed(2)}</span>
          </div>
        </div>

        <div class="divider"></div>
        <div class="center" style="font-size: 9px; color: #555; padding-top: 2px;">
          <div>* ESTIMATE ONLY - NOT A TAX INVOICE *</div>
          <div>Prices valid for 15 days from issue date.</div>
          <div style="margin-top: 3px; font-weight: bold;">THANK YOU FOR CHOOSING ${shopName.toUpperCase()}!</div>
        </div>
      </body>
      </html>
    `;
  };

  // Robust Hidden Iframe Print Trigger
  const handleTriggerPrint = () => {
    try {
      const htmlContent = printFormat === "A4" ? generateA4Html() : generateThermalHtml();

      let iframe = document.getElementById("quotation-print-iframe") as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "quotation-print-iframe";
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0px";
        iframe.style.height = "0px";
        iframe.style.border = "none";
        iframe.style.zIndex = "-1000";
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      doc.open();
      doc.write(htmlContent);
      doc.close();

      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        toast.info(
          `Printing ${printFormat === "A4" ? "A4 Proforma Quotation" : "80mm Thermal Slip"} for ${quotation.quotationNumber}`,
          "Print Dialog Opened"
        );
      }, 150);
    } catch (err: any) {
      console.error("Print failed, falling back to window.print():", err);
      window.print();
    }
  };

  // WhatsApp Share Builder
  const handleShareWhatsApp = () => {
    const itemsList = quotation.items
      .map(
        (it: any) =>
          `• *${Number(it.quantity)} ${it.unitName || "pcs"}* - ${it.itemDescription} (${formatCurrency(it.lineTotal)})`
      )
      .join("\n");

    const validText = quotation.validUntil
      ? `\n📅 *Valid Till:* ${new Date(quotation.validUntil).toLocaleDateString("en-IN")}`
      : "";

    const message =
      `*ESTIMATE / QUOTATION — ${shopName.toUpperCase()}*\n` +
      `📄 *Quotation Ref:* #${quotation.quotationNumber}\n` +
      `👤 *Customer:* ${quotation.customerName}\n` +
      `🗓️ *Date:* ${new Date(quotation.quotationDate).toLocaleDateString("en-IN")}${validText}\n\n` +
      `*Scope of Work & Items:*\n${itemsList}\n\n` +
      `-----------------------------\n` +
      `💰 *Subtotal:* ${formatCurrency(quotation.subTotal)}\n` +
      (quotation.discountAmount > 0 ? `🏷️ *Discount:* -${formatCurrency(quotation.discountAmount)}\n` : "") +
      (quotation.taxAmount > 0 ? `🏛️ *GST (${quotation.taxPercent}%):* ${formatCurrency(quotation.taxAmount)}\n` : "") +
      `⭐ *Grand Total:* *${formatCurrency(quotation.netTotal)}*\n` +
      `-----------------------------\n\n` +
      `*Terms & Notes:*\n${quotation.termsConditions || "50% advance required to start printing."}\n\n` +
      `_Thank you for choosing ${shopName}!_`;

    let cleanPhone = (quotation.customerPhone || "").replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, "_blank");
    toast.success("Opened WhatsApp with pre-filled quotation summary", "WhatsApp Ready");

    if (quotation.status === QuotationStatus.DRAFT) {
      updateQuotationStatus(quotation.id, QuotationStatus.SENT).then(() => {
        if (onRefresh) onRefresh();
      });
    }
  };

  // Convert to Job Order Handler
  const handleConvertToJob = async () => {
    const confirmed = await modal.confirm({
      title: "Convert to Live Job Order?",
      message: `Convert Quotation ${quotation.quotationNumber} (${formatCurrency(
        quotation.netTotal
      )}) into an active Work Order in Job Orders kanban?`,
      confirmText: "Convert to Job Order",
      type: "success",
    });

    if (!confirmed) return;

    setIsConverting(true);
    const res = await convertQuotationToJobOrder(quotation.id, 0);
    setIsConverting(false);

    if (res.success) {
      toast.success(
        `Quotation converted to Job Order #${res.job.jobOrderNumber}!`,
        "Work Order Created"
      );
      if (onRefresh) onRefresh();
      onClose();
    } else {
      modal.error(res.error || "Failed to convert quotation");
    }
  };

  // Convert to Tax Invoice Handler
  const handleConvertToInvoice = async () => {
    const confirmed = await modal.confirm({
      title: "Convert to Tax / POS Invoice?",
      message: `Generate a tax invoice for Quotation ${quotation.quotationNumber} (${formatCurrency(
        quotation.netTotal
      )}) and deduct inventory stock?`,
      confirmText: "Convert to Invoice",
      type: "success",
    });

    if (!confirmed) return;

    setIsConverting(true);
    const res = await convertQuotationToInvoice(quotation.id);
    setIsConverting(false);

    if (res.success) {
      toast.success(
        `Quotation converted to Tax Invoice #${res.invoice.invoiceNumber}!`,
        "Invoice Created"
      );
      if (onRefresh) onRefresh();
      onClose();
    } else {
      modal.error(res.error || "Failed to convert quotation");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Controls & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lime-100 text-lime-900 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{quotation.quotationNumber}</h3>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    quotation.status === QuotationStatus.CONVERTED
                      ? "bg-emerald-100 text-emerald-800"
                      : quotation.status === QuotationStatus.ACCEPTED
                      ? "bg-lime-100 text-lime-900"
                      : quotation.status === QuotationStatus.SENT
                      ? "bg-sky-100 text-sky-800"
                      : quotation.status === QuotationStatus.REJECTED
                      ? "bg-rose-100 text-rose-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {quotation.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Issued to <span className="font-bold text-slate-700">{quotation.customerName}</span> on{" "}
                {new Date(quotation.quotationDate).toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Print Format Tabs */}
            <div className="p-1 bg-slate-100 rounded-2xl flex items-center text-xs font-bold">
              <button
                type="button"
                onClick={() => setPrintFormat("A4")}
                className={`px-3 py-1 rounded-xl transition-colors ${
                  printFormat === "A4" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                A4 Proforma
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat("THERMAL")}
                className={`px-3 py-1 rounded-xl transition-colors ${
                  printFormat === "THERMAL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                80mm Slip
              </button>
            </div>

            {/* Owner Edit Action */}
            {isOwner && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Edit this Quotation (Owner / Admin Access)"
              >
                <Edit className="w-3.5 h-3.5 text-amber-700" />
                <span>Edit Quote</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" /> WhatsApp Share
            </button>

            <button
              type="button"
              onClick={handleTriggerPrint}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5 text-lime-400" /> Print
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1-Click Conversion Action Bar */}
        {!isConverted && (
          <div className="my-3 p-3 bg-gradient-to-r from-lime-50 to-emerald-50 rounded-2xl border border-lime-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-lime-700 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Customer Approved this Quote?</span>
                <span className="text-[10px] text-slate-600">
                  Convert this estimate into live production or a completed invoice with 1 click.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isConverting}
                onClick={handleConvertToJob}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Layers className="w-3.5 h-3.5" /> Convert to Work Order
              </button>

              <button
                type="button"
                disabled={isConverting}
                onClick={handleConvertToInvoice}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Receipt className="w-3.5 h-3.5" /> Convert to Tax Invoice
              </button>
            </div>
          </div>
        )}

        {isConverted && (
          <div className="my-3 p-2.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                This quotation was converted to{" "}
                {quotation.convertedType === "JOB_ORDER" ? "Job Order" : "Tax Invoice"} (
                <span className="font-mono text-emerald-950 font-extrabold">{quotation.convertedNumber || "Recorded"}</span>).
              </span>
            </div>
            {isOwner && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="text-[11px] font-bold text-emerald-900 hover:underline flex items-center gap-1"
              >
                <Edit className="w-3 h-3" /> Edit as Owner
              </button>
            )}
          </div>
        )}

        {/* Printable Visual Preview Area */}
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {printFormat === "A4" ? (
            /* A4 Full Sheet Proforma Quotation */
            <div
              id="printable-quotation-a4"
              className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-3xl mx-auto text-slate-900 font-sans"
            >
              {/* Top Shop Banner */}
              <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">{shopName}</h1>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{tagline}</p>
                  <div className="text-[11px] text-slate-600 mt-2 space-y-0.5">
                    <p>{address}</p>
                    <p>Phone: {phone} • Email: {email}</p>
                    {upiId && <p className="font-mono font-bold text-slate-800">UPI: {upiId}</p>}
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-lg bg-slate-900 text-white font-extrabold text-sm tracking-wider uppercase">
                    ESTIMATE / QUOTATION
                  </span>
                  <div className="mt-3 text-xs space-y-1">
                    <div>
                      <span className="text-slate-400 font-semibold">Quote Ref: </span>
                      <span className="font-black text-slate-900">{quotation.quotationNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">Date: </span>
                      <span className="font-bold text-slate-800">
                        {new Date(quotation.quotationDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {quotation.validUntil && (
                      <div>
                        <span className="text-slate-400 font-semibold">Valid Till: </span>
                        <span className="font-bold text-rose-700">
                          {new Date(quotation.validUntil).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bill To & Metadata */}
              <div className="grid grid-cols-2 gap-6 my-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                    QUOTATION PREPARED FOR:
                  </span>
                  <div className="text-sm font-black text-slate-900">{quotation.customerName}</div>
                  {quotation.customerPhone && (
                    <div className="text-slate-600 mt-0.5 font-medium">Phone: +91 {quotation.customerPhone}</div>
                  )}
                  {quotation.customerEmail && (
                    <div className="text-slate-600 mt-0.5">{quotation.customerEmail}</div>
                  )}
                  {quotation.customerAddress && (
                    <div className="text-slate-600 mt-0.5">{quotation.customerAddress}</div>
                  )}
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                    SALES & PRODUCTION DESK:
                  </span>
                  <div className="font-bold text-slate-900">
                    Executive: {quotation.createdBy?.fullName || "Staff Terminal"}
                  </div>
                  <div className="text-slate-500">Status: {quotation.status}</div>
                  <div className="text-[11px] text-slate-400">Total Items: {quotation.items.length}</div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-xs text-left border-collapse mb-6">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-500 uppercase text-[10px] font-black tracking-wider">
                    <th className="py-2.5 px-2 w-8 text-center">#</th>
                    <th className="py-2.5 px-3">Item Description & Specifications</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    {quotation.discountAmount > 0 && <th className="py-2.5 px-3 text-right">Disc</th>}
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotation.items.map((item: any, idx: number) => {
                    const specs = item.specifications || {};
                    return (
                      <tr key={item.id || idx} className="align-top">
                        <td className="py-3 px-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-900 text-xs">{item.itemDescription}</div>
                          {Object.keys(specs).length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-slate-600">
                              {specs.size && (
                                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                                  Size: {specs.size}
                                </span>
                              )}
                              {specs.paper && (
                                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                                  Stock: {specs.paper}
                                </span>
                              )}
                              {specs.sides && (
                                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                                  Color: {specs.sides}
                                </span>
                              )}
                              {specs.finishing && (
                                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                                  Finishing: {specs.finishing}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-slate-900 whitespace-nowrap">
                          {Number(item.quantity)} {item.unitName}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-700 whitespace-nowrap">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        {quotation.discountAmount > 0 && (
                          <td className="py-3 px-3 text-right font-medium text-slate-500 whitespace-nowrap">
                            {item.discountAmount > 0 ? formatCurrency(item.discountAmount) : "-"}
                          </td>
                        )}
                        <td className="py-3 px-3 text-right font-extrabold text-slate-900 whitespace-nowrap">
                          {formatCurrency(item.lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Financial Totals Summary */}
              <div className="flex justify-end my-4">
                <div className="w-64 space-y-2 text-xs border-t-2 border-slate-200 pt-3">
                  <div className="flex justify-between text-slate-600">
                    <span className="font-medium">Subtotal:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(quotation.subTotal)}</span>
                  </div>

                  {quotation.discountAmount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span className="font-medium">Discount:</span>
                      <span className="font-bold">-{formatCurrency(quotation.discountAmount)}</span>
                    </div>
                  )}

                  {quotation.taxAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span className="font-medium">GST / Tax ({quotation.taxPercent}%):</span>
                      <span className="font-bold text-slate-900">{formatCurrency(quotation.taxAmount)}</span>
                    </div>
                  )}

                  {quotation.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Round Off:</span>
                      <span>{quotation.roundOff > 0 ? `+₹${quotation.roundOff}` : `-₹${Math.abs(quotation.roundOff)}`}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-baseline pt-2 border-t-2 border-slate-900">
                    <span className="text-sm font-black uppercase text-slate-900">Grand Total:</span>
                    <span className="text-xl font-black text-slate-900">{formatCurrency(quotation.netTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Terms & Signatures */}
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 text-xs">
                <div>
                  <span className="font-black text-[10px] uppercase text-slate-400 tracking-wider block mb-1">
                    TERMS & CONDITIONS:
                  </span>
                  <div className="text-slate-600 whitespace-pre-wrap text-[11px] leading-relaxed">
                    {quotation.termsConditions || "Standard printing press terms apply. 50% advance for production."}
                  </div>
                </div>

                <div className="flex flex-col justify-between items-end text-right pt-6">
                  <div className="w-48 border-b border-slate-400 pb-1 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      FOR {shopName.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">Authorized Signatory</span>
                </div>
              </div>
            </div>
          ) : (
            /* 80mm Thermal Compact Receipt */
            <div
              id="printable-quotation-thermal"
              className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm max-w-sm mx-auto font-mono text-xs text-slate-900"
            >
              <div className="text-center pb-3 border-b border-dashed border-slate-400 space-y-1">
                <div className="text-base font-black uppercase tracking-tight">{shopName}</div>
                <div className="text-[10px] text-slate-500">{tagline}</div>
                <div className="text-[10px] text-slate-600">{phone}</div>
                <div className="text-[10px] font-extrabold uppercase mt-2 px-2 py-0.5 bg-slate-100 rounded inline-block">
                  *** ESTIMATE / QUOTE ***
                </div>
              </div>

              <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Quote No:</span>
                  <span className="font-black">{quotation.quotationNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-bold truncate max-w-[140px]">{quotation.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{new Date(quotation.quotationDate).toLocaleDateString("en-IN")}</span>
                </div>
                {quotation.validUntil && (
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Valid Till:</span>
                    <span>{new Date(quotation.validUntil).toLocaleDateString("en-IN")}</span>
                  </div>
                )}
              </div>

              <div className="py-2.5 space-y-2 border-b border-dashed border-slate-300">
                {quotation.items.map((it: any, i: number) => (
                  <div key={i} className="text-[11px]">
                    <div className="font-bold leading-tight">{it.itemDescription}</div>
                    <div className="flex justify-between text-slate-600 text-[10px] mt-0.5">
                      <span>{Number(it.quantity)} ${it.unitName || "pcs"} @ ₹${Number(it.unitPrice).toFixed(2)}</span>
                      <span className="font-bold text-slate-900">{formatCurrency(it.lineTotal)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(quotation.subTotal)}</span>
                </div>
                {quotation.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>GST ({quotation.taxPercent}%):</span>
                    <span>{formatCurrency(quotation.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-900">
                  <span>ESTIMATE TOTAL:</span>
                  <span>{formatCurrency(quotation.netTotal)}</span>
                </div>
              </div>

              <div className="text-center pt-3 text-[10px] text-slate-500 space-y-1">
                <div>* THIS IS AN ESTIMATE, NOT A TAX INVOICE *</div>
                <div>Prices valid for 15 days from issue date.</div>
                <div>Thank you for choosing {shopName}!</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

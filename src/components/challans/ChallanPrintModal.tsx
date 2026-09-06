"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Printer,
  Share2,
  FileText,
  Truck,
  Package,
  Calendar,
  Phone,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { getDeliveryChallanById } from "@/actions/challans";
import { toast } from "@/stores/useSnackbarStore";

interface ChallanPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  challanId: string | null;
}

type CopyType = "CONSIGNEE" | "TRANSPORTER" | "OFFICE" | "ALL";

export function ChallanPrintModal({
  isOpen,
  onClose,
  challanId,
}: ChallanPrintModalProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCopy, setSelectedCopy] = useState<CopyType>("CONSIGNEE");
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen && challanId) {
      setLoading(true);
      getDeliveryChallanById(challanId).then((res) => {
        if (res.success && res.challan) {
          setData(res.challan);
        } else {
          toast.error(res.error || "Failed to load challan details");
        }
        setLoading(false);
      });
    }
  }, [isOpen, challanId]);

  if (!isOpen || !challanId) return null;

  const shop = data?.shopSettings || {};
  const shopName = shop.shopName || "Crystal Press";
  const shopTagline = shop.tagline || "Commercial Offset & Digital Printing Press";
  const shopAddress = [shop.addressLine1, shop.addressLine2].filter(Boolean).join(", ");
  const shopPhones = [shop.phone1, shop.phone2].filter(Boolean).join(" / ");
  const shopEmail = shop.email || "crystalpress@gmail.com";

  const getCopyTitle = (type: CopyType) => {
    switch (type) {
      case "CONSIGNEE":
        return "ORIGINAL FOR CONSIGNEE";
      case "TRANSPORTER":
        return "DUPLICATE FOR TRANSPORTER / GATE PASS";
      case "OFFICE":
        return "TRIPLICATE FOR OFFICE COPY";
      case "ALL":
        return "ALL COPIES";
    }
  };

  // Generate Single Copy HTML for A4
  const renderSingleCopyHtml = (copyTitle: string) => {
    if (!data) return "";

    const rowsHtml = data.items
      .map(
        (it: any, idx: number) => `
        <tr>
          <td style="padding: 7px 6px; text-align: center; color: #64748b; font-size: 10px; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
          <td style="padding: 7px 8px; font-size: 11px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
            ${it.itemDescription}
          </td>
          <td style="padding: 7px 8px; text-align: center; font-size: 10px; color: #475569; font-family: monospace; border-bottom: 1px solid #e2e8f0;">
            ${it.hsnCode || "-"}
          </td>
          <td style="padding: 7px 8px; text-align: right; font-weight: 900; color: #0f172a; font-size: 11px; border-bottom: 1px solid #e2e8f0;">
            ${Number(it.quantity).toLocaleString("en-IN")}
          </td>
          <td style="padding: 7px 8px; text-align: center; font-size: 10px; color: #475569; border-bottom: 1px solid #e2e8f0;">
            ${it.unitName || "pcs"}
          </td>
          <td style="padding: 7px 8px; font-size: 10px; color: #64748b; border-bottom: 1px solid #e2e8f0;">
            ${it.remarks || "-"}
          </td>
        </tr>
      `
      )
      .join("");

    const totalQty = data.items.reduce((sum: number, it: any) => sum + Number(it.quantity), 0);

    return `
      <div class="challan-page" style="padding: 10px; margin-bottom: 20px; page-break-after: always;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px;">
          <div>
            <h1 style="font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px;">${shopName}</h1>
            <p style="font-size: 10px; color: #475569; font-weight: 600; margin-top: 2px;">${shopTagline}</p>
            <p style="font-size: 9px; color: #64748b; margin-top: 3px;">
              ${shopAddress ? shopAddress + " • " : ""}Phone: ${shopPhones || "+91 98765 43210"}
            </p>
          </div>
          <div style="text-align: right;">
            <div style="display: inline-block; padding: 4px 10px; background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 900; border-radius: 6px; letter-spacing: 0.5px;">
              DELIVERY CHALLAN
            </div>
            <div style="font-size: 9px; font-weight: 800; color: #475569; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
              ${copyTitle}
            </div>
          </div>
        </div>

        <!-- Meta Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
          <!-- Consignee Box -->
          <div>
            <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">CONSIGNEE / DELIVER TO</span>
            <div style="font-size: 12px; font-weight: 900; color: #0f172a; margin-top: 2px;">${data.customerName}</div>
            ${data.customerPhone ? `<div style="font-size: 10px; color: #475569; margin-top: 2px;">Phone: +91 ${data.customerPhone}</div>` : ""}
            ${data.deliveryAddress ? `<div style="font-size: 9px; color: #64748b; margin-top: 2px; line-height: 1.3;">${data.deliveryAddress}</div>` : ""}
          </div>

          <!-- Dispatch Logistics Box -->
          <div style="border-left: 1px solid #cbd5e1; padding-left: 12px;">
            <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
              <tr>
                <td style="color: #64748b; padding: 2px 0;">Challan No:</td>
                <td style="font-weight: 900; color: #0f172a; text-align: right; padding: 2px 0;">${data.challanNumber}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 2px 0;">Dispatch Date:</td>
                <td style="font-weight: 600; color: #0f172a; text-align: right; padding: 2px 0;">
                  ${new Date(data.dispatchDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </td>
              </tr>
              ${data.jobOrder ? `
                <tr>
                  <td style="color: #64748b; padding: 2px 0;">Job Order Ref:</td>
                  <td style="font-weight: bold; color: #0f172a; text-align: right; padding: 2px 0;">#${data.jobOrder.jobOrderNumber}</td>
                </tr>
              ` : ""}
              <tr>
                <td style="color: #64748b; padding: 2px 0;">Vehicle No:</td>
                <td style="font-weight: bold; color: #0f172a; text-align: right; padding: 2px 0;">${data.vehicleNumber || "Counter Pickup"}</td>
              </tr>
              ${data.transporterName ? `
                <tr>
                  <td style="color: #64748b; padding: 2px 0;">Transporter:</td>
                  <td style="font-weight: 600; color: #0f172a; text-align: right; padding: 2px 0;">${data.transporterName}</td>
                </tr>
              ` : ""}
              ${data.packageCount ? `
                <tr>
                  <td style="color: #64748b; padding: 2px 0;">Packages:</td>
                  <td style="font-weight: 800; color: #0f172a; text-align: right; padding: 2px 0;">${data.packageCount}</td>
                </tr>
              ` : ""}
            </table>
          </div>
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
          <thead>
            <tr style="background: #f1f5f9; color: #475569; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">
              <th style="padding: 8px 6px; text-align: center; width: 30px;">#</th>
              <th style="padding: 8px; text-align: left;">Item Description & Specifications</th>
              <th style="padding: 8px; text-align: center; width: 70px;">HSN</th>
              <th style="padding: 8px; text-align: right; width: 80px;">Quantity</th>
              <th style="padding: 8px; text-align: center; width: 50px;">Unit</th>
              <th style="padding: 8px; text-align: left; width: 120px;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr style="background: #f8fafc; font-weight: bold;">
              <td colspan="3" style="padding: 8px; text-align: right; font-size: 10px; color: #475569;">Total Quantity Dispatched:</td>
              <td style="padding: 8px; text-align: right; font-size: 12px; font-weight: 900; color: #0f172a;">${totalQty.toLocaleString("en-IN")}</td>
              <td colspan="2" style="padding: 8px; font-size: 9px; color: #64748b;">${data.packageCount ? `in ${data.packageCount}` : ""}</td>
            </tr>
          </tbody>
        </table>

        <!-- Packaging Notes & Terms -->
        <div style="font-size: 8.5px; color: #64748b; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 8px; margin-bottom: 24px; line-height: 1.4;">
          <strong>Declaration:</strong> Goods dispatched in sound condition. Subject to verification upon delivery. Any damage or shortage must be reported within 24 hours of receipt.
          ${data.packagingNotes ? `<br/><strong>Packaging Notes:</strong> ${data.packagingNotes}` : ""}
        </div>

        <!-- 3-Column Signature Area -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 30px; padding-top: 10px;">
          <div style="text-align: center; border-top: 1px solid #cbd5e1; padding-top: 8px;">
            <div style="font-size: 9px; font-weight: bold; color: #0f172a;">Prepared By</div>
            <div style="font-size: 8px; color: #64748b; margin-top: 2px;">${data.createdBy?.fullName || "Staff"}</div>
          </div>

          <div style="text-align: center; border-top: 1px solid #cbd5e1; padding-top: 8px;">
            <div style="font-size: 9px; font-weight: bold; color: #0f172a;">For ${shopName}</div>
            <div style="font-size: 8px; color: #64748b; margin-top: 2px;">Authorised Signatory</div>
          </div>

          <div style="text-align: center; border: 1px solid #94a3b8; border-radius: 6px; padding: 8px 6px; background: #ffffff;">
            <div style="font-size: 9px; font-weight: bold; color: #0f172a;">Receiver's Signature & Stamp</div>
            <div style="font-size: 7.5px; color: #64748b; margin-top: 20px;">Name / Date / Time</div>
          </div>
        </div>
      </div>
    `;
  };

  const handlePrint = () => {
    if (!data) return;

    let fullHtml = "";
    if (selectedCopy === "ALL") {
      fullHtml =
        renderSingleCopyHtml("ORIGINAL FOR CONSIGNEE") +
        renderSingleCopyHtml("DUPLICATE FOR TRANSPORTER / GATE PASS") +
        renderSingleCopyHtml("TRIPLICATE FOR OFFICE COPY");
    } else {
      fullHtml = renderSingleCopyHtml(getCopyTitle(selectedCopy));
    }

    const docContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Delivery Challan - ${data.challanNumber}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm 12mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          body { color: #0f172a; background: #ffffff; line-height: 1.4; padding: 0; }
          @media print {
            .challan-page { page-break-after: always; }
            .challan-page:last-child { page-break-after: avoid; }
          }
        </style>
      </head>
      <body>
        ${fullHtml}
      </body>
      </html>
    `;

    const iframe = printFrameRef.current;
    if (!iframe) {
      toast.error("Printer frame not ready");
      return;
    }

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(docContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  };

  const handleShareWhatsApp = () => {
    if (!data) return;

    const totalQty = data.items.reduce((sum: number, it: any) => sum + Number(it.quantity), 0);
    const itemListText = data.items
      .map((it: any) => `• ${it.itemDescription} (${it.quantity} ${it.unitName})`)
      .join("\n");

    const message = `*DELIVERY CHALLAN - ${shopName}*\n\n` +
      `📦 *Challan No:* ${data.challanNumber}\n` +
      `📅 *Dispatch Date:* ${new Date(data.dispatchDate).toLocaleDateString("en-IN")}\n` +
      `👤 *Consignee:* ${data.customerName}\n` +
      (data.vehicleNumber ? `🚚 *Vehicle No:* ${data.vehicleNumber}\n` : "") +
      (data.packageCount ? `📦 *Packages:* ${data.packageCount}\n` : "") +
      `\n*Items Dispatched:*\n${itemListText}\n\n` +
      `*Total Quantity:* ${totalQty.toLocaleString("en-IN")} pcs\n` +
      `Status: ${data.status.replace(/_/g, " ")}\n\n` +
      `Thank you for printing with *${shopName}*!`;

    const cleanPhone = data.customerPhone?.replace(/\D/g, "") || "";
    const url = cleanPhone
      ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-lime-300 to-lime-500 flex items-center justify-center shadow-lime">
              <FileText className="w-4 h-4 text-slate-900" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Print Delivery Challan
              </h2>
              <p className="text-xs text-slate-400">
                {data ? `#${data.challanNumber} • ${data.customerName}` : "Loading..."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Copy Selector Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-500">Copy:</span>
            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-xl">
              {(["CONSIGNEE", "TRANSPORTER", "OFFICE", "ALL"] as CopyType[]).map((cp) => (
                <button
                  key={cp}
                  onClick={() => setSelectedCopy(cp)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                    selectedCopy === cp
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {cp === "CONSIGNEE"
                    ? "Customer"
                    : cp === "TRANSPORTER"
                    ? "Transporter"
                    : cp === "OFFICE"
                    ? "Store Copy"
                    : "All 3"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-lime-400" />
              <span>Print A4</span>
            </button>
          </div>
        </div>

        {/* Preview Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100/70 custom-scrollbar">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading Challan Preview...</div>
          ) : !data ? (
            <div className="py-16 text-center text-xs text-rose-500">Challan not found</div>
          ) : (
            <div
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 mx-auto text-xs"
              dangerouslySetInnerHTML={{ __html: renderSingleCopyHtml(getCopyTitle(selectedCopy)) }}
            />
          )}
        </div>

        {/* Hidden Isolated Iframe for Clean Zero-Blank-Page Printing */}
        <iframe
          ref={printFrameRef}
          title="Print Challan"
          style={{ position: "absolute", width: "0px", height: "0px", border: "none", opacity: 0 }}
        />
      </div>
    </div>
  );
}

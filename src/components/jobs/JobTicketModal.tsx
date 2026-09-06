"use client";

import React, { useState } from "react";
import {
  X,
  Printer,
  FileText,
  Layers,
  Send,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Zap,
  ShieldCheck,
  Scissors,
  Sparkles,
} from "lucide-react";
import {
  JobTicketData,
  ShopInfo,
  generateA4JobTicketHtml,
  generateThermalJobTicketHtml,
  generateBarcodeSvg,
} from "@/lib/job-ticket";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/stores/useSnackbarStore";

interface JobTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  shopSettings?: any;
}

export function JobTicketModal({
  isOpen,
  onClose,
  job,
  shopSettings,
}: JobTicketModalProps) {
  const [ticketFormat, setTicketFormat] = useState<"A4" | "THERMAL">("A4");
  const [priority, setPriority] = useState<"NORMAL" | "EXPRESS" | "URGENT">("NORMAL");

  if (!isOpen || !job) return null;

  const shopInfo: ShopInfo = {
    shopName: shopSettings?.shopName || "Crystal Press",
    addressLine1: shopSettings?.addressLine1 || "123 Market Complex, Commercial Road",
    phone1: shopSettings?.phone1 || "+91 98765 43210",
    email: shopSettings?.email || "orders@crystalpress.in",
  };

  const jobTicketData: JobTicketData = {
    id: job.id,
    jobOrderNumber: job.jobOrderNumber,
    customerName: job.customerName,
    customerPhone: job.customerPhone,
    jobType: job.jobType,
    specifications: job.specifications || {},
    quantity: Number(job.quantity) || 1,
    unitName: job.unitName || "pcs",
    totalAmount: Number(job.totalAmount) || 0,
    advancePaid: Number(job.advancePaid) || 0,
    balanceDue: Number(job.balanceDue) || 0,
    status: job.status,
    priority,
    designNotes: job.designNotes,
    expectedDeliveryDate: job.expectedDeliveryDate,
    createdAt: job.createdAt,
    createdBy: job.createdBy,
  };

  const barcodeSvg = generateBarcodeSvg(job.jobOrderNumber);

  // Hidden Iframe Print Handler
  const handlePrint = () => {
    try {
      const htmlContent =
        ticketFormat === "A4"
          ? generateA4JobTicketHtml(jobTicketData, shopInfo)
          : generateThermalJobTicketHtml(jobTicketData, shopInfo);

      let iframe = document.getElementById("job-ticket-print-iframe") as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "job-ticket-print-iframe";
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
          `Printing ${ticketFormat === "A4" ? "A4 Production Docket" : "80mm Job Slip"} for ${job.jobOrderNumber}`,
          "Print Dialog Opened"
        );
      }, 150);
    } catch (err: any) {
      console.error("Print failed:", err);
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Title & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  Job Production Docket #{job.jobOrderNumber}
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-purple-100 text-purple-800">
                  {job.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {job.jobType} • {job.quantity} {job.unitName} for{" "}
                <span className="font-bold text-slate-700">{job.customerName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Switch */}
            <div className="p-1 bg-slate-100 rounded-2xl flex items-center text-xs font-bold">
              <button
                type="button"
                onClick={() => setTicketFormat("A4")}
                className={`px-3 py-1 rounded-xl transition-colors ${
                  ticketFormat === "A4" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                A4 Docket
              </button>
              <button
                type="button"
                onClick={() => setTicketFormat("THERMAL")}
                className={`px-3 py-1 rounded-xl transition-colors ${
                  ticketFormat === "THERMAL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                80mm Slip
              </button>
            </div>

            {/* Priority Switch */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setPriority("NORMAL")}
                className={`px-2.5 py-1 rounded-xl transition-all ${
                  priority === "NORMAL" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600"
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setPriority("EXPRESS")}
                className={`px-2.5 py-1 rounded-xl transition-all ${
                  priority === "EXPRESS" ? "bg-amber-500 text-white shadow-sm" : "text-slate-600"
                }`}
              >
                Express
              </button>
              <button
                type="button"
                onClick={() => setPriority("URGENT")}
                className={`px-2.5 py-1 rounded-xl transition-all ${
                  priority === "URGENT" ? "bg-rose-600 text-white shadow-sm" : "text-slate-600"
                }`}
              >
                Urgent
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-98"
            >
              <Printer className="w-3.5 h-3.5 text-lime-400" />
              <span>Print Docket</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Visual Printable Preview Canvas */}
        <div className="flex-1 overflow-y-auto py-3 custom-scrollbar">
          {ticketFormat === "A4" ? (
            /* Full Sheet A4 Job Docket Preview */
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-3xl mx-auto text-slate-900 font-sans space-y-4">
              {/* Top Docket Banner */}
              <div className="flex items-start justify-between pb-4 border-b-2 border-slate-900">
                <div>
                  <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    {shopInfo.shopName}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">{shopInfo.addressLine1}</p>
                  <div className="mt-2 inline-block px-2.5 py-1 bg-slate-900 text-white text-[10px] font-extrabold uppercase tracking-wider rounded">
                    PRODUCTION WORK ORDER / JOB BAG DOCKET
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <div
                    dangerouslySetInnerHTML={{ __html: barcodeSvg }}
                    className="mb-1.5"
                  />
                  <span
                    className={`inline-block text-[10px] font-black px-3 py-0.5 rounded uppercase tracking-wider text-white ${
                      priority === "URGENT"
                        ? "bg-rose-600"
                        : priority === "EXPRESS"
                        ? "bg-amber-600"
                        : "bg-blue-600"
                    }`}
                  >
                    {priority} PRIORITY
                  </span>
                </div>
              </div>

              {/* Customer & Scope Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                    CUSTOMER & ORDER DETAILS
                  </span>
                  <div className="text-sm font-black text-slate-900">{job.customerName}</div>
                  {job.customerPhone && (
                    <div className="text-slate-600 font-medium">Phone: +91 {job.customerPhone}</div>
                  )}
                  <div className="text-slate-500 text-[11px]">
                    Order Date: {new Date(job.createdAt).toLocaleDateString("en-IN")}
                  </div>
                  {job.expectedDeliveryDate && (
                    <div className="text-rose-700 font-bold text-[11px]">
                      Target Delivery:{" "}
                      {new Date(job.expectedDeliveryDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                    PRODUCTION QUANTITY & FINANCIALS
                  </span>
                  <div className="text-sm font-black text-slate-900">{job.jobType}</div>
                  <div className="text-lg font-black text-sky-700 font-mono">
                    {job.quantity} {job.unitName}
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 text-[11px] text-slate-600">
                    <span>Total: ₹{Number(job.totalAmount).toFixed(2)}</span>
                    <span className="text-emerald-700 font-bold">
                      Advance: ₹{Number(job.advancePaid).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-amber-800">
                    Balance Due: ₹{Number(job.balanceDue).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">
                  JOB PRODUCTION & PAPER CUTTING SPECIFICATIONS
                </span>
                <table className="w-full text-xs text-left border-collapse">
                  <tbody>
                    {Object.entries(job.specifications || {}).map(([k, v]) => (
                      <tr key={k} className="border-b border-slate-100 last:border-none">
                        <td className="py-1.5 px-2 font-bold text-slate-500 uppercase text-[10px] w-1/3">
                          {k.replace(/([A-Z])/g, " $1").trim()}
                        </td>
                        <td className="py-1.5 px-2 font-black text-slate-900">
                          {typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {job.designNotes && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950">
                  <span className="font-bold uppercase text-[10px] text-amber-800 block mb-0.5">
                    Operator / Design Instructions:
                  </span>
                  <p className="font-medium italic">"{job.designNotes}"</p>
                </div>
              )}

              {/* Shop Floor Workstation Routing Checklist */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">
                  WORKSTATION PROCESS ROUTING & CHECKLIST
                </span>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">1. PRE-PRESS / DTP</span>
                    <label className="flex items-center gap-1.5 text-slate-600">
                      <input type="checkbox" className="rounded" /> Proof Approved
                    </label>
                    <label className="flex items-center gap-1.5 text-slate-600 mt-1">
                      <input type="checkbox" className="rounded" /> CTP Plates Ready
                    </label>
                  </div>

                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">2. PAPER CUTTING</span>
                    <label className="flex items-center gap-1.5 text-slate-600">
                      <input type="checkbox" className="rounded" /> Sheets Cut to Size
                    </label>
                    <label className="flex items-center gap-1.5 text-slate-600 mt-1">
                      <input type="checkbox" className="rounded" /> Grain & Gripper Checked
                    </label>
                  </div>

                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">3. PRESS PRINTING</span>
                    <label className="flex items-center gap-1.5 text-slate-600">
                      <input type="checkbox" className="rounded" /> Ink / Registration Matched
                    </label>
                    <label className="flex items-center gap-1.5 text-slate-600 mt-1">
                      <input type="checkbox" className="rounded" /> Impression Count OK
                    </label>
                  </div>

                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">4. LAMINATION / UV</span>
                    <label className="flex items-center gap-1.5 text-slate-600">
                      <input type="checkbox" className="rounded" /> Thermal Matte / Gloss
                    </label>
                    <label className="flex items-center gap-1.5 text-slate-600 mt-1">
                      <input type="checkbox" className="rounded" /> UV Coated
                    </label>
                  </div>

                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">5. BINDING & FINISHING</span>
                    <label className="flex items-center gap-1.5 text-slate-600">
                      <input type="checkbox" className="rounded" /> Creasing / Die Punch
                    </label>
                    <label className="flex items-center gap-1.5 text-slate-600 mt-1">
                      <input type="checkbox" className="rounded" /> Numbering & Binding
                    </label>
                  </div>

                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">6. QA & DISPATCH</span>
                    <label className="flex items-center gap-1.5 text-slate-600">
                      <input type="checkbox" className="rounded" /> Quality Count Passed
                    </label>
                    <label className="flex items-center gap-1.5 text-slate-600 mt-1">
                      <input type="checkbox" className="rounded" /> Bundled & Tagged
                    </label>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-4 gap-3 pt-3 border-t border-slate-200 text-[10px] text-slate-500 text-center">
                <div className="p-2 border border-slate-200 rounded min-h-[50px] flex flex-col justify-between">
                  <span className="font-bold text-slate-700">DTP / Designer</span>
                  <div className="border-t border-slate-400 pt-1">Sign & Date</div>
                </div>
                <div className="p-2 border border-slate-200 rounded min-h-[50px] flex flex-col justify-between">
                  <span className="font-bold text-slate-700">Cutting Master</span>
                  <div className="border-t border-slate-400 pt-1">Sign & Date</div>
                </div>
                <div className="p-2 border border-slate-200 rounded min-h-[50px] flex flex-col justify-between">
                  <span className="font-bold text-slate-700">Pressman / Operator</span>
                  <div className="border-t border-slate-400 pt-1">Sign & Date</div>
                </div>
                <div className="p-2 border border-slate-200 rounded min-h-[50px] flex flex-col justify-between">
                  <span className="font-bold text-slate-700">Packing & Dispatch</span>
                  <div className="border-t border-slate-400 pt-1">Sign & Date</div>
                </div>
              </div>
            </div>
          ) : (
            /* 80mm Thermal Slip Preview */
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm max-w-xs mx-auto font-mono text-xs text-slate-900 space-y-3">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <div className="text-sm font-black uppercase">{shopInfo.shopName}</div>
                <div className="text-[10px] text-slate-500">PRODUCTION JOB SLIP</div>
                <div className="text-[11px] font-black mt-1">[{priority} PRIORITY]</div>
              </div>

              <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Job Ref:</span>
                  <span className="font-bold">{job.jobOrderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold">{job.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Job:</span>
                  <span className="font-bold">{job.jobType}</span>
                </div>
                <div className="flex justify-between font-black text-sm">
                  <span>Qty:</span>
                  <span>
                    {job.quantity} {job.unitName}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-[10px] pb-2 border-b border-dashed border-slate-300">
                <span className="font-bold text-slate-700 block">SPECS:</span>
                {Object.entries(job.specifications || {})
                  .slice(0, 4)
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between text-slate-600">
                      <span>{k}:</span>
                      <span className="font-bold text-slate-900">{String(v)}</span>
                    </div>
                  ))}
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Total Bill:</span>
                  <span className="font-bold">₹{Number(job.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Advance:</span>
                  <span>₹{Number(job.advancePaid).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300">
                  <span>BALANCE DUE:</span>
                  <span className="text-amber-700">₹{Number(job.balanceDue).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-[9px] text-slate-400 pt-2 border-t border-dashed border-slate-300">
                * ATTACH THIS SLIP TO BUNDLE *
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

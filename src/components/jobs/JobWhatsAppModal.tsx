"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Send,
  MessageSquare,
  Sparkles,
  Phone,
  Copy,
  Check,
  CheckCircle2,
  Building2,
  ExternalLink,
  Edit3,
  RotateCcw,
} from "lucide-react";
import { buildJobWhatsAppMessage, JobTicketData, ShopInfo } from "@/lib/job-ticket";
import { toast } from "@/stores/useSnackbarStore";

interface JobWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  shopSettings?: any;
}

export function JobWhatsAppModal({
  isOpen,
  onClose,
  job,
  shopSettings,
}: JobWhatsAppModalProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<
    "PROOF_APPROVAL" | "PRINTING" | "READY_FOR_PICKUP" | "DELIVERED"
  >("READY_FOR_PICKUP");

  const [copied, setCopied] = useState(false);
  const [customText, setCustomText] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  const shopInfo: ShopInfo = {
    shopName: shopSettings?.shopName || "Crystal Press",
    addressLine1: shopSettings?.addressLine1 || "123 Market Complex, Commercial Road",
    phone1: shopSettings?.phone1 || "+91 98765 43210",
  };

  const jobTicketData: JobTicketData = job
    ? {
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
        designNotes: job.designNotes,
        expectedDeliveryDate: job.expectedDeliveryDate,
        createdAt: job.createdAt,
      }
    : ({} as any);

  // Re-generate default message when milestone changes
  useEffect(() => {
    if (job) {
      const msg = buildJobWhatsAppMessage(selectedMilestone, jobTicketData, shopInfo);
      setCustomText(msg);
      setIsEditing(false);
    }
  }, [selectedMilestone, job?.id]);

  if (!isOpen || !job) return null;

  const handleSendWhatsApp = () => {
    let cleanPhone = (job.customerPhone || "").replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customText)}`
      : `https://wa.me/?text=${encodeURIComponent(customText)}`;

    window.open(waUrl, "_blank");
    toast.success("WhatsApp opened with pre-filled message", "WhatsApp Dispatched");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(customText);
    setCopied(true);
    toast.success("Message copied to clipboard", "Copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetToTemplate = () => {
    const msg = buildJobWhatsAppMessage(selectedMilestone, jobTicketData, shopInfo);
    setCustomText(msg);
    setIsEditing(false);
    toast.success("Message reverted to standard template", "Reverted");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                WhatsApp Milestone Notification
              </h3>
              <p className="text-xs text-slate-400">
                Send 1-click update to <span className="font-bold text-slate-700">{job.customerName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Milestone Template Pills */}
        <div className="my-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">
              Select Notification Milestone
            </label>
            <Link
              href="/whatsapp"
              className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
              target="_blank"
            >
              <span>Manage Templates</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "PROOF_APPROVAL", label: "🎨 1. Proof Ready", desc: "Design inspection & approval" },
              { id: "PRINTING", label: "⚙️ 2. In Production", desc: "Press run & lamination active" },
              { id: "READY_FOR_PICKUP", label: "📦 3. Ready for Pickup", desc: "Packed with balance due" },
              { id: "DELIVERED", label: "🚚 4. Delivered", desc: "Thank you & feedback" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMilestone(m.id as any)}
                className={`p-2.5 rounded-2xl border text-left transition-all ${
                  selectedMilestone === m.id
                    ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-extrabold shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="text-xs font-bold">{m.label}</div>
                <div className="text-[10px] text-slate-500">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Message Live Preview & Quick Edit */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Message Preview:</span>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold underline"
              >
                <Edit3 className="w-3 h-3" />
                <span>{isEditing ? "Done Editing" : "Tweak Text"}</span>
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleResetToTemplate}
                  className="text-[11px] text-rose-600 hover:text-rose-800 flex items-center gap-0.5 font-semibold"
                  title="Reset to template"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {job.customerPhone && (
              <span className="font-mono text-emerald-700 font-bold text-[11px]">
                To: +91 {job.customerPhone}
              </span>
            )}
          </div>

          {isEditing ? (
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={8}
              className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 custom-scrollbar"
            />
          ) : (
            <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 font-sans text-xs whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto custom-scrollbar">
              {customText}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-100 mt-4">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Copy Text"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

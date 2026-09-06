"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  User,
  Phone,
  Calendar,
  FileText,
  Truck,
} from "lucide-react";
import { markChallanDelivered } from "@/actions/challans";
import { toast } from "@/stores/useSnackbarStore";
import { modal } from "@/stores/useDialogStore";

interface MarkDeliveredModalProps {
  isOpen: boolean;
  onClose: () => void;
  challan: any | null;
  onSuccess: () => void;
}

export function MarkDeliveredModal({
  isOpen,
  onClose,
  challan,
  onSuccess,
}: MarkDeliveredModalProps) {
  const [receivedBy, setReceivedBy] = useState(challan?.customerName || "");
  const [receiverPhone, setReceiverPhone] = useState(challan?.customerPhone || "");
  const [receiverNotes, setReceiverNotes] = useState("Received all goods in intact condition.");
  const [receivedAt, setReceivedAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !challan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!receivedBy.trim()) {
      toast.error("Please enter the name of the person who received the goods");
      return;
    }

    setIsSubmitting(true);

    const res = await markChallanDelivered({
      id: challan.id,
      receivedBy: receivedBy.trim(),
      receiverPhone: receiverPhone.trim() || undefined,
      receiverNotes: receiverNotes.trim() || undefined,
      receivedAt,
    });

    setIsSubmitting(false);

    if (res.success) {
      toast.success(
        `Challan #${challan.challanNumber} marked as Delivered!`,
        "Goods Received"
      );
      onSuccess();
      onClose();
    } else {
      modal.error(res.error || "Failed to record delivery proof");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Mark as Delivered
              </h3>
              <p className="text-xs text-slate-400">
                Record goods receipt & proof of delivery
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Challan Quick Card */}
        <div className="my-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-900">
            <span>{challan.challanNumber}</span>
            <span className="text-slate-500 font-normal">
              {challan.items?.length || 1} item(s)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Consignee: <strong className="text-slate-700">{challan.customerName}</strong>
          </div>
          {challan.packageCount && (
            <div className="text-[11px] text-slate-500">
              Packages: <strong className="text-slate-700">{challan.packageCount}</strong>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              Received By (Name / Designation) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Kumar (Store In-Charge)"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              Receiver Contact Phone
            </label>
            <input
              type="text"
              placeholder="e.g. 9876543210"
              value={receiverPhone}
              onChange={(e) => setReceiverPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              Receiving Date & Time
            </label>
            <input
              type="datetime-local"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              Receiver Remarks / Confirmation
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Verified 4 cartons, physical copy signed & stamped"
              value={receiverNotes}
              onChange={(e) => setReceiverNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium resize-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? "Updating..." : "Confirm Delivery"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import {
  X,
  Settings,
  Printer,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  User,
  Layers,
  Sparkles,
  Flame,
} from "lucide-react";
import { JobStatus } from "@prisma/client";
import { updateJobStageWithOperatorLog } from "@/actions/jobs";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/stores/useSnackbarStore";
import { modal } from "@/stores/useDialogStore";

interface JobDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  onSuccess?: () => void;
}

const PRODUCTION_MACHINES = [
  { id: "heidelberg_4c", name: "Heidelberg SM52 (4-Color Offset)", type: "OFFSET" },
  { id: "konica_c6085", name: "Konica Minolta AccurioPress C6085", type: "DIGITAL" },
  { id: "ryobi_2c", name: "Ryobi 3302 (2-Color Offset Press)", type: "OFFSET" },
  { id: "polar_cutter", name: "Polar 78 High-Speed Guillotine Cutter", type: "CUTTING" },
  { id: "thermal_lam", name: "Roll Thermal Laminator 380", type: "FINISHING" },
  { id: "creasing_die", name: "Automatic Creasing & Die Punch", type: "FINISHING" },
  { id: "binding_table", name: "Manual Padding & Binding Table", type: "FINISHING" },
  { id: "other", name: "Other Shop Workstation", type: "GENERAL" },
];

const STAGE_OPTIONS = [
  { id: JobStatus.ORDER_PLACED, label: "1. Order Placed", color: "text-purple-700 bg-purple-50" },
  { id: JobStatus.DESIGNING, label: "2. Design & Proofing", color: "text-sky-700 bg-sky-50" },
  { id: JobStatus.PROOF_APPROVAL, label: "3. Proof Awaiting Approval", color: "text-amber-700 bg-amber-50" },
  { id: JobStatus.PRINTING, label: "4. Press / Printing Run", color: "text-indigo-700 bg-indigo-50" },
  { id: JobStatus.FINISHING, label: "5. Lamination & Finishing", color: "text-teal-700 bg-teal-50" },
  { id: JobStatus.READY_FOR_PICKUP, label: "6. Ready for Customer Pickup", color: "text-lime-800 bg-lime-50" },
  { id: JobStatus.DELIVERED, label: "7. Delivered & Settle Bill", color: "text-emerald-800 bg-emerald-50" },
  { id: JobStatus.CANCELLED, label: "❌ Cancelled", color: "text-rose-800 bg-rose-50" },
];

export function JobDispatchModal({
  isOpen,
  onClose,
  job,
  onSuccess,
}: JobDispatchModalProps) {
  const [targetStatus, setTargetStatus] = useState<JobStatus>(job?.status || JobStatus.PRINTING);
  const [machineAssigned, setMachineAssigned] = useState<string>("Konica Minolta AccurioPress C6085");
  const [operatorName, setOperatorName] = useState<string>("Press Operator");
  const [spoilageQuantity, setSpoilageQuantity] = useState<number>(0);
  const [spoilageReason, setSpoilageReason] = useState<string>("Make-ready color matching");
  const [operatorNotes, setOperatorNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !job) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const res = await updateJobStageWithOperatorLog({
      jobId: job.id,
      targetStatus,
      machineAssigned,
      operatorName,
      spoilageQuantity: spoilageQuantity > 0 ? spoilageQuantity : undefined,
      spoilageReason: spoilageQuantity > 0 ? spoilageReason : undefined,
      operatorNotes: operatorNotes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      toast.success(
        `Job #${job.jobOrderNumber} moved to ${targetStatus.replace(/_/g, " ")}!`,
        "Workstation Dispatched"
      );
      if (onSuccess) onSuccess();
      onClose();
    } else {
      modal.error(res.error || "Failed to update workstation status");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-900 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Operator Dispatch & Stage Check-in
              </h3>
              <p className="text-xs text-slate-400">
                Job #{job.jobOrderNumber} • {job.customerName}
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

        <form onSubmit={handleSubmit} className="space-y-4 my-4">
          {/* Target Production Stage */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Select Production Stage *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STAGE_OPTIONS.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setTargetStatus(st.id as JobStatus)}
                  className={`p-2.5 rounded-2xl border text-left text-xs font-bold transition-all ${
                    targetStatus === st.id
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Machine Assigned */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Assigned Machine / Workstation
            </label>
            <select
              value={machineAssigned}
              onChange={(e) => setMachineAssigned(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
            >
              {PRODUCTION_MACHINES.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} ({m.type})
                </option>
              ))}
            </select>
          </div>

          {/* Operator Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Operator / Pressman Name
            </label>
            <input
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              placeholder="e.g. Ramesh / Suresh Pressman"
            />
          </div>

          {/* Spoilage / Wastage Logger */}
          <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Log Printing Spoilage / Wastage Sheets (Optional)</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-amber-800 block mb-0.5">
                  Spoiled Sheets Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={spoilageQuantity || ""}
                  onChange={(e) => setSpoilageQuantity(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-xl font-bold text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-amber-800 block mb-0.5">
                  Spoilage Reason
                </label>
                <select
                  value={spoilageReason}
                  onChange={(e) => setSpoilageReason(e.target.value)}
                  disabled={spoilageQuantity <= 0}
                  className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-medium text-slate-900 disabled:opacity-50"
                >
                  <option value="Make-ready color matching">Make-ready color matching</option>
                  <option value="Paper feed jam">Paper feed jam</option>
                  <option value="Ink scumming / dirty plate">Ink scumming / dirty plate</option>
                  <option value="Lamination wrinkle">Lamination wrinkle</option>
                  <option value="Die cutting misalignment">Die cutting misalignment</option>
                </select>
              </div>
            </div>
          </div>

          {/* Operator Internal Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Operator Notes / Production Remarks
            </label>
            <textarea
              rows={2}
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              placeholder="e.g. 500 sheets printed front & back. Handed over to lamination crew."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
              <span>{isSubmitting ? "Updating..." : "Confirm Stage Update"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

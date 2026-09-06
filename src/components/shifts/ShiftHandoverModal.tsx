"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  X,
  Clock,
  Coins,
  CheckCircle2,
  AlertCircle,
  Banknote,
  DollarSign,
  ArrowRight,
  Printer,
  ShieldAlert,
  UserCheck,
  Building2,
  Lock,
  Unlock,
} from "lucide-react";
import {
  getActiveShift,
  openNewShift,
  closeActiveShift,
  getShiftDocketData,
  ShiftLiveMetrics,
} from "@/actions/shifts";
import { DenominationCounter } from "./DenominationCounter";
import { ShiftDocketPrintModal } from "./ShiftDocketPrintModal";
import { toast } from "@/stores/useSnackbarStore";
import { modal } from "@/stores/useDialogStore";

interface ShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftUpdated?: () => void;
}

export function ShiftHandoverModal({
  isOpen,
  onClose,
  onShiftUpdated,
}: ShiftHandoverModalProps) {
  const [loading, setLoading] = useState(true);
  const [hasActiveShift, setHasActiveShift] = useState(false);
  const [activeShift, setActiveShift] = useState<any | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<ShiftLiveMetrics | null>(null);

  // Open Shift Form State
  const [openingFloat, setOpeningFloat] = useState<number>(1000);
  const [openNotes, setOpenNotes] = useState("");

  // Close Shift Form State
  const [denominations, setDenominations] = useState<Record<string, number>>({});
  const [countedCash, setCountedCash] = useState<number>(0);
  const [retainedFloat, setRetainedFloat] = useState<number>(1000);
  const [nextCashier, setNextCashier] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  // Print Docket State
  const [docketData, setDocketData] = useState<any | null>(null);
  const [isDocketOpen, setIsDocketOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  const loadShiftData = async () => {
    setLoading(true);
    try {
      const res = await getActiveShift();
      if (res.success) {
        setHasActiveShift(res.hasActiveShift);
        setActiveShift(res.shift);
        setLiveMetrics(res.liveMetrics);
        if (res.shift) {
          setRetainedFloat(Number(res.shift.openingFloat) || 1000);
        }
      } else {
        toast.error(res.error || "Failed to load active shift status");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load shift");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadShiftData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Opening a New Shift
  const handleOpenShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (openingFloat < 0) {
      toast.error("Opening float cannot be negative");
      return;
    }

    startTransition(async () => {
      const res = await openNewShift({
        openingFloat: Number(openingFloat),
        notes: openNotes,
      });

      if (res.success) {
        toast.success(
          `Shift #${res.shift?.shiftNumber} opened with ₹${openingFloat.toLocaleString("en-IN")} float!`,
          "Shift Started"
        );
        onShiftUpdated?.();
        loadShiftData();
      } else {
        toast.error(res.error || "Failed to open shift");
      }
    });
  };

  // Handle Closing Active Shift
  const handleCloseShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeShift || !liveMetrics) return;

    const expectedCash = liveMetrics.expectedCashInDrawer;
    const discrepancy = countedCash - expectedCash;

    // If shortage > ₹50, require explanation note
    if (discrepancy < -50 && !closeNotes.trim()) {
      toast.error("Please provide an explanation in Handover Notes for the cash shortage.", "Notes Required");
      return;
    }

    const confirmed = await modal.confirm({
      title: "Reconcile & Close Shift?",
      message: `Are you sure you want to close Shift #${activeShift.shiftNumber}? Cash counted: ₹${countedCash.toLocaleString(
        "en-IN"
      )} (Discrepancy: ${discrepancy >= 0 ? "+" : ""}₹${discrepancy.toLocaleString("en-IN")}). This action locks the shift.`,
      confirmText: "Close & Reconcile Shift",
      cancelText: "Review Drawer",
      type: Math.abs(discrepancy) > 10 ? "danger" : "info",
    });

    if (!confirmed) return;

    startTransition(async () => {
      const cashBanked = Math.max(0, countedCash - (Number(retainedFloat) || 0));

      const res = await closeActiveShift({
        shiftId: activeShift.id,
        actualCash: countedCash,
        denominations,
        handoverNotes: closeNotes,
        nextCashierName: nextCashier.trim() || "Next Shift Cashier",
        closingFloatKept: Number(retainedFloat) || 0,
        cashBanked,
      });

      if (res.success && res.shift) {
        toast.success(
          `Shift #${res.shift.shiftNumber} successfully reconciled and closed!`,
          "Shift Closed"
        );
        onShiftUpdated?.();

        // Fetch docket data and trigger printable slip
        const docketRes = await getShiftDocketData(res.shift.id);
        if (docketRes.success && docketRes.docket) {
          setDocketData(docketRes.docket);
          setIsDocketOpen(true);
        } else {
          onClose();
        }
      } else {
        toast.error(res.error || "Failed to close shift");
      }
    });
  };

  const expectedCash = liveMetrics?.expectedCashInDrawer || 0;
  const discrepancy = countedCash - expectedCash;
  const isBalanced = Math.abs(discrepancy) < 0.01;
  const isShortage = discrepancy < -0.01;
  const isOverage = discrepancy > 0.01;

  const floatPresets = [500, 1000, 1500, 2000, 5000];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                  hasActiveShift
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {hasActiveShift ? (
                  <Lock className="w-5 h-5" />
                ) : (
                  <Unlock className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {hasActiveShift
                    ? `Shift Handover & Drawer Audit (${activeShift?.shiftNumber})`
                    : "Open New Register Shift"}
                </h3>
                <p className="text-xs text-slate-400">
                  {hasActiveShift
                    ? "Verify physical cash against expected drawer revenue before handover"
                    : "Set opening cash float to begin counter sales"}
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

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 font-semibold">
              Loading register drawer status...
            </div>
          ) : !hasActiveShift ? (
            /* ==================================================== */
            /* MODE 1: OPEN SHIFT FORM */
            /* ==================================================== */
            <form onSubmit={handleOpenShiftSubmit} className="my-5 space-y-5">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 text-amber-950 text-xs flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>No Active Shift Detected:</strong> The cash drawer is currently closed. Enter the initial cash float (notes & coins in till) to activate POS billing and cash tracking.
                </div>
              </div>

              {/* Opening Float Input & Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Opening Cash Float in Till (₹)
                </label>

                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    required
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50 hover:bg-white transition-all"
                  />
                </div>

                {/* Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {floatPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setOpeningFloat(preset)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        openingFloat === preset
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      ₹{preset.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opening Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Shift Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  placeholder="e.g. Morning shift started by Rajesh with ₹1,000 small change..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 custom-scrollbar"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{isPending ? "Opening Shift..." : "Open Register Shift"}</span>
                </button>
              </div>
            </form>
          ) : (
            /* ==================================================== */
            /* MODE 2: RECONCILE & CLOSE ACTIVE SHIFT */
            /* ==================================================== */
            <form onSubmit={handleCloseShiftSubmit} className="my-4 space-y-5">
              {/* Shift Overview Ribbon */}
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Active Shift #{activeShift.shiftNumber}
                  </div>
                  <div className="font-bold text-sm text-lime-400 flex items-center gap-1.5 mt-0.5">
                    <UserCheck className="w-4 h-4" />
                    <span>{activeShift.openedBy?.fullName || "Staff"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-[10px] text-slate-400">Opened At</div>
                    <div className="font-mono text-slate-200">
                      {new Date(activeShift.openedAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400">Opening Float</div>
                    <div className="font-mono font-bold text-white">
                      ₹{Number(activeShift.openingFloat).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Drawer Balance Breakdown */}
              {liveMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70">
                    <span className="text-[10px] text-slate-400 block font-semibold">POS Cash</span>
                    <span className="font-mono font-black text-slate-800 text-sm">
                      +₹{liveMetrics.posCashSales.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70">
                    <span className="text-[10px] text-slate-400 block font-semibold">Job / Udhaar Cash</span>
                    <span className="font-mono font-black text-slate-800 text-sm">
                      +₹{(liveMetrics.jobAdvancesCash + liveMetrics.customerUdhaarCash).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70">
                    <span className="text-[10px] text-rose-500 block font-semibold">Petty Cash Paid</span>
                    <span className="font-mono font-black text-rose-700 text-sm">
                      -₹{liveMetrics.pettyCashExpenses.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950">
                    <span className="text-[10px] text-emerald-700 block font-bold uppercase tracking-wider">
                      Expected in Till
                    </span>
                    <span className="font-mono font-black text-emerald-950 text-sm">
                      ₹{expectedCash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* Physical Cash Denominations Counter */}
              <DenominationCounter
                counts={denominations}
                onChange={(updated, total) => {
                  setDenominations(updated);
                  setCountedCash(total);
                }}
              />

              {/* Discrepancy Status Card */}
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                  isBalanced
                    ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                    : isShortage
                    ? "bg-rose-50 border-rose-200 text-rose-950"
                    : "bg-amber-50 border-amber-200 text-amber-950"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isBalanced ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold">
                      {isBalanced
                        ? "Balanced Register Till (₹0.00 Exact Match)"
                        : isShortage
                        ? `Cash Shortage: -₹${Math.abs(discrepancy).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}`
                        : `Cash Overage: +₹${discrepancy.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}`}
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      {isBalanced
                        ? "Physical cash matches mathematical register total perfectly."
                        : isShortage
                        ? "Counted cash is less than expected drawer balance. Explanation note required."
                        : "Counted cash exceeds expected drawer balance."}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase font-bold opacity-70">
                    Difference
                  </div>
                  <div className="text-sm font-black font-mono">
                    {discrepancy >= 0 ? "+" : ""}₹{discrepancy.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Till Allocation & Handover Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Float Retained for Next Shift (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={retainedFloat}
                    onChange={(e) => setRetainedFloat(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    Cash left in till as change for incoming cashier
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Cash Banked / Deposited in Safe (₹)
                  </label>
                  <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-slate-800">
                    ₹{Math.max(0, countedCash - retainedFloat).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Excess cash dropped into the shop safe
                  </span>
                </div>
              </div>

              {/* Incoming Cashier & Handover Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Incoming Cashier / Taking Over
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh / Evening Shift"
                    value={nextCashier}
                    onChange={(e) => setNextCashier(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Handover Notes {isShortage && <span className="text-rose-600">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      isShortage
                        ? "Mandatory: Explain reason for shortage..."
                        : "Any notes for next shift or manager..."
                    }
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                      isShortage && !closeNotes.trim()
                        ? "border-rose-300 bg-rose-50/50"
                        : "border-slate-200"
                    }`}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Keep Open
                </button>

                <button
                  type="submit"
                  disabled={isPending || countedCash === 0}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isPending ? "Reconciling Shift..." : "Reconcile & Close Shift"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 80mm Printable Docket Modal */}
      <ShiftDocketPrintModal
        isOpen={isDocketOpen}
        onClose={() => {
          setIsDocketOpen(false);
          onClose();
        }}
        docket={docketData}
      />
    </>
  );
}

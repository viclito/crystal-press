"use client";

import React, { useState } from "react";
import {
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  Printer,
  Search,
  Plus,
  Unlock,
  Lock,
  UserCheck,
  Calendar,
  FileText,
  DollarSign,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { ShiftHandoverModal } from "@/components/shifts/ShiftHandoverModal";
import { ShiftDocketPrintModal } from "@/components/shifts/ShiftDocketPrintModal";
import { getShiftDocketData } from "@/actions/shifts";
import { toast } from "@/stores/useSnackbarStore";

interface ShiftsClientProps {
  initialShifts: any[];
  activeShift: any | null;
  metrics: {
    closedShiftsCount: number;
    totalReconciledCash: number;
    totalDiscrepanciesCount: number;
    netDiscrepancyAmount: number;
  };
}

export function ShiftsClient({
  initialShifts,
  activeShift,
  metrics,
}: ShiftsClientProps) {
  const [shifts, setShifts] = useState(initialShifts);
  const [currentActiveShift, setCurrentActiveShift] = useState(activeShift);
  const [search, setSearch] = useState("");
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  // Reprint Docket State
  const [reprintDocket, setReprintDocket] = useState<any | null>(null);
  const [isDocketModalOpen, setIsDocketModalOpen] = useState(false);

  const handleOpenReprint = async (shiftId: string) => {
    try {
      const res = await getShiftDocketData(shiftId);
      if (res.success && res.docket) {
        setReprintDocket(res.docket);
        setIsDocketModalOpen(true);
      } else {
        toast.error("Failed to load docket data");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load docket");
    }
  };

  const filteredShifts = shifts.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.shiftNumber.toLowerCase().includes(q) ||
      (s.openedBy?.fullName || "").toLowerCase().includes(q) ||
      (s.closedBy?.fullName || "").toLowerCase().includes(q) ||
      (s.nextCashierName || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-lime-500/10 text-lime-800 flex items-center justify-center font-bold">
            <Wallet className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Cash Drawer & Shift Reconciliation
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Audit Trail
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Opening floats, denomination counts, drawer discrepancy audits & thermal handover dockets
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setIsHandoverModalOpen(true)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 ${
            currentActiveShift
              ? "bg-slate-900 hover:bg-slate-800 text-white"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }`}
        >
          {currentActiveShift ? (
            <>
              <Lock className="w-4 h-4 text-lime-400" />
              <span>Shift Handover / Close Till</span>
            </>
          ) : (
            <>
              <Unlock className="w-4 h-4 text-white" />
              <span>Open New Shift</span>
            </>
          )}
        </button>
      </div>

      {/* Active Shift Banner */}
      {currentActiveShift ? (
        <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300">
                  ACTIVE TILL OPEN
                </span>
                <span className="text-xs font-bold text-slate-300">
                  #{currentActiveShift.shiftNumber}
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-1">
                Operated by <strong className="text-white">{currentActiveShift.openedBy?.fullName || "Staff"}</strong> • Opened at{" "}
                <span className="font-mono text-slate-200">
                  {new Date(currentActiveShift.openedAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase">Opening Float</span>
              <span className="font-mono font-bold text-lime-400 text-sm">
                ₹{Number(currentActiveShift.openingFloat).toLocaleString("en-IN")}
              </span>
            </div>

            <button
              onClick={() => setIsHandoverModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
            >
              Reconcile Drawer
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 text-amber-950 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Register Closed:</strong> No shift is currently active. Open a shift to begin counter sales and track cash float.
            </span>
          </div>

          <button
            onClick={() => setIsHandoverModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
          >
            Open Shift Now
          </button>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Reconciled Shifts"
          value={metrics.closedShiftsCount}
          subtitle="Total completed cash drawer handovers"
          icon={<ShieldCheck className="w-5 h-5 text-emerald-700" />}
          iconBg="bg-emerald-50 text-emerald-800 border border-emerald-200/60"
        />
        <StatCard
          title="Total Reconciled Cash"
          value={`₹${metrics.totalReconciledCash.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}`}
          subtitle="Physical cash verified across shifts"
          icon={<Wallet className="w-5 h-5 text-emerald-700" />}
          iconBg="bg-emerald-50 text-emerald-800 border border-emerald-200/60"
        />
        <StatCard
          title="Discrepancy Audits"
          value={metrics.totalDiscrepanciesCount}
          subtitle={
            metrics.netDiscrepancyAmount !== 0
              ? `Net variance: ${metrics.netDiscrepancyAmount >= 0 ? "+" : ""}₹${metrics.netDiscrepancyAmount.toFixed(2)}`
              : "100% Balanced Register Records"
          }
          icon={<AlertCircle className="w-5 h-5 text-emerald-700" />}
          iconBg="bg-emerald-50 text-emerald-800 border border-emerald-200/60"
        />
      </div>

      {/* Shifts History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Shift Audit Trail & Handover Log
            </h3>
            <p className="text-xs text-slate-400">
              Permanent register records with physical denomination counts and discrepancies
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search shift # or cashier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        {filteredShifts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold">
            {shifts.length === 0
              ? "No closed shifts recorded yet. Open and close a shift to generate audit logs."
              : "No shifts match your search filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Shift Details</th>
                  <th className="py-3 px-4">Cashier & Handover</th>
                  <th className="py-3 px-4 text-right">Float</th>
                  <th className="py-3 px-4 text-right">Sales Revenue</th>
                  <th className="py-3 px-4 text-right">Expected Cash</th>
                  <th className="py-3 px-4 text-right">Counted Cash</th>
                  <th className="py-3 px-4 text-center">Audit Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredShifts.map((s) => {
                  const disc = s.discrepancy || 0;
                  const isBalanced = Math.abs(disc) < 0.01;
                  const isShortage = disc < -0.01;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Shift Details */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-mono">
                          {s.shiftNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(s.openedAt).toLocaleDateString("en-IN")}{" "}
                          ({new Date(s.openedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          {s.closedAt &&
                            ` - ${new Date(s.closedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
                          )
                        </div>
                      </td>

                      {/* Cashiers */}
                      <td className="py-3 px-4">
                        <div className="text-xs font-semibold text-slate-800">
                          {s.closedBy?.fullName || s.openedBy?.fullName || "Staff"}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>To:</span>
                          <span className="font-medium text-slate-600">
                            {s.nextCashierName || "Next Cashier"}
                          </span>
                        </div>
                      </td>

                      {/* Opening Float */}
                      <td className="py-3 px-4 text-right font-mono">
                        ₹{s.openingFloat.toLocaleString("en-IN")}
                      </td>

                      {/* Total Sales */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-bold text-slate-900">
                          ₹{s.totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Cash: ₹{s.cashSales.toLocaleString("en-IN")}
                        </div>
                      </td>

                      {/* Expected Cash */}
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        ₹{s.expectedCash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Counted Cash */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{s.actualCash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Audit Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isBalanced
                              ? "bg-emerald-100 text-emerald-800"
                              : isShortage
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isBalanced ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Balanced</span>
                            </>
                          ) : isShortage ? (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              <span>-₹{Math.abs(disc).toFixed(2)}</span>
                            </>
                          ) : (
                            <>
                              <TrendingUp className="w-3 h-3" />
                              <span>+₹{disc.toFixed(2)}</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenReprint(s.id)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-xs font-semibold flex items-center gap-1 ml-auto transition-colors shadow-2xs"
                          title="Print 80mm Handover Docket"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Docket</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Handover / Open Shift Modal */}
      <ShiftHandoverModal
        isOpen={isHandoverModalOpen}
        onClose={() => setIsHandoverModalOpen(false)}
        onShiftUpdated={() => {
          window.location.reload();
        }}
      />

      {/* Reprint Docket Modal */}
      <ShiftDocketPrintModal
        isOpen={isDocketModalOpen}
        onClose={() => setIsDocketModalOpen(false)}
        docket={reprintDocket}
      />
    </div>
  );
}

"use client";

import React, { useState } from "react";
import {
  Printer,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Phone,
  Layers,
  Sparkles,
  Settings,
  FileText,
  AlertTriangle,
  Clock,
  LayoutGrid,
  List,
  ExternalLink,
  Search,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { updateJobStatus, convertJobToFinalBill } from "@/actions/jobs";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { toast } from "@/stores/useSnackbarStore";
import { JobTicketModal } from "@/components/jobs/JobTicketModal";
import { JobDispatchModal } from "@/components/jobs/JobDispatchModal";
import { JobWhatsAppModal } from "@/components/jobs/JobWhatsAppModal";
import { JobProofModal } from "@/components/jobs/JobProofModal";

interface JobKanbanBoardProps {
  jobs: any[];
  shopSettings?: any;
  viewMode?: "GRID" | "TABLE";
  onViewModeChange?: (mode: "GRID" | "TABLE") => void;
}

const STAGES = [
  { id: "ORDER_PLACED", label: "1. Order Placed", color: "bg-purple-500" },
  { id: "DESIGNING", label: "2. Design & Proof", color: "bg-sky-500" },
  { id: "PRINTING", label: "3. Press / Printing", color: "bg-amber-500" },
  { id: "READY_FOR_PICKUP", label: "4. Ready for Pickup", color: "bg-lime-500" },
  { id: "DELIVERED", label: "5. Delivered & Billed", color: "bg-emerald-500" },
];

export function JobKanbanBoard({
  jobs = [],
  shopSettings,
  viewMode: controlledViewMode,
  onViewModeChange,
}: JobKanbanBoardProps) {
  const [internalViewMode, setInternalViewMode] = useState<"GRID" | "TABLE">("GRID");
  const viewMode = controlledViewMode !== undefined ? controlledViewMode : internalViewMode;
  const setViewMode = onViewModeChange || setInternalViewMode;

  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [loadingJobId, setLoadingJobId] = useState<string | null>(null);

  // Modals state
  const [ticketModalJob, setTicketModalJob] = useState<any | null>(null);
  const [dispatchModalJob, setDispatchModalJob] = useState<any | null>(null);
  const [whatsappModalJob, setWhatsappModalJob] = useState<any | null>(null);
  const [proofModalJob, setProofModalJob] = useState<any | null>(null);

  const handleAdvanceStatus = async (job: any) => {
    const stageOrder = ["ORDER_PLACED", "DESIGNING", "PRINTING", "READY_FOR_PICKUP", "DELIVERED"];
    const currentIdx = stageOrder.indexOf(job.status);
    if (currentIdx === -1 || currentIdx >= stageOrder.length - 1) return;

    const nextStatus = stageOrder[currentIdx + 1] as any;
    setLoadingJobId(job.id);

    if (nextStatus === "DELIVERED") {
      const res = await convertJobToFinalBill(job.id);
      if (res.success) {
        toast.success(
          `Job #${job.jobOrderNumber} delivered and finalized into sales invoice!`,
          "Order Completed & Billed"
        );
        try {
          confetti({ particleCount: 70, spread: 50 });
        } catch (e) {}
      } else {
        toast.error((res as any).error || "Failed to settle job order", "Error");
      }
    } else {
      const res = await updateJobStatus(job.id, nextStatus);
      if (res.success) {
        toast.success(
          `Job #${job.jobOrderNumber} moved to ${nextStatus.replace(/_/g, " ")}`,
          "Status Updated"
        );
      } else {
        toast.error(res.error || "Failed to update job status");
      }
    }

    setLoadingJobId(null);
  };

  const searchedJobs = jobs.filter(
    (j) =>
      j.jobOrderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      j.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      j.jobType?.toLowerCase().includes(search.toLowerCase()) ||
      (j.customerPhone && j.customerPhone.includes(search))
  );

  const filteredJobs = activeTab === "ALL" ? searchedJobs : searchedJobs.filter((j) => j.status === activeTab);

  return (
    <div className="space-y-4">
      {/* Stage Filter Pills & View Toggle Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setActiveTab("ALL")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
              activeTab === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            )}
          >
            <span>All Orders</span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full",
                activeTab === "ALL" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
              )}
            >
              {jobs.length}
            </span>
          </button>

          {STAGES.map((st) => {
            const count = jobs.filter((j) => j.status === st.id).length;
            const isActive = activeTab === st.id;
            return (
              <button
                key={st.id}
                onClick={() => setActiveTab(st.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", st.color)} />
                <span>{st.label.replace(/^\d+\.\s*/, "")}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full",
                    isActive ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Tools: Search Bar & View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, customer..."
              className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-lime-400 focus:outline-none shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold px-1"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200 shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("GRID")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all",
                viewMode === "GRID"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              )}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all",
                viewMode === "TABLE"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              )}
              title="Spreadsheet List View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredJobs.length === 0 ? (
        <div className="py-16 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              {search ? `No Orders Found for "${search}"` : "No Orders in this Stage"}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {search
                ? "Try searching by customer name, phone number, or job order number"
                : "Select \"All Orders\" or click + New Job Order to start a job"}
            </p>
          </div>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-xs font-bold text-lime-700 bg-lime-50 hover:bg-lime-100 border border-lime-200 px-3 py-1.5 rounded-xl transition-all"
            >
              Clear Search Filter
            </button>
          )}
        </div>
      ) : viewMode === "GRID" ? (
        /* ==================================================== */
        /* COMPACT CARD GRID (NEAT & BALANCED) */
        /* ==================================================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => {
            const isDelivered = job.status === "DELIVERED";
            const isReady = job.status === "READY_FOR_PICKUP";
            const balance = Number(job.balanceDue) || 0;
            const total = Number(job.totalAmount) || 0;
            const advance = Number(job.advancePaid) || 0;

            return (
              <div
                key={job.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
              >
                {/* 1. Header Row */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {job.jobOrderNumber}
                      </span>
                      {job.expectedDeliveryDate && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>
                            {new Date(job.expectedDeliveryDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </span>
                      )}
                    </div>
                    <StatusBadge status={job.status} />
                  </div>

                  {/* Job Type / Title */}
                  <h3 className="text-sm font-bold text-slate-900 mt-2 line-clamp-1 leading-snug">
                    {job.jobType}
                  </h3>

                  {/* Customer & Quantity */}
                  <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                    <span className="font-semibold text-slate-700 truncate max-w-[180px]">
                      {job.customerName}
                    </span>
                    <span className="font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                      {job.quantity} {job.unitName}
                    </span>
                  </div>

                  {/* Specs summary pills (max 2) */}
                  {job.specifications && Object.keys(job.specifications).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(job.specifications)
                        .slice(0, 2)
                        .map(([k, v]) => (
                          <span
                            key={k}
                            className="text-[10px] font-medium bg-slate-50 border border-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded truncate max-w-[130px]"
                          >
                            {String(v)}
                          </span>
                        ))}
                      {Object.keys(job.specifications).length > 2 && (
                        <span className="text-[10px] font-semibold text-slate-400 px-1 py-0.5">
                          +{Object.keys(job.specifications).length - 2} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Proof Status Badge (Clean & Non-Intrusive) */}
                  {job.customerFeedback ? (
                    <div
                      onClick={() => setProofModalJob(job)}
                      className="mt-2.5 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold flex items-center justify-between gap-1.5 cursor-pointer hover:bg-amber-100 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">Revision: "{job.customerFeedback}"</span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 underline shrink-0">
                        View
                      </span>
                    </div>
                  ) : job.proofApproved ? (
                    <div className="mt-2 p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Proof Approved by {job.clientApprovedName || "Client"}</span>
                    </div>
                  ) : job.status === "PROOF_APPROVAL" ? (
                    <div
                      onClick={() => setProofModalJob(job)}
                      className="mt-2 p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-[10px] font-bold flex items-center justify-between gap-1.5 cursor-pointer hover:bg-sky-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-sky-600" />
                        <span>Awaiting Client Proof Sign-Off</span>
                      </div>
                      <span className="underline">Inspect</span>
                    </div>
                  ) : null}
                </div>

                {/* 2. Card Bottom: Financials + 2x2 Clean Actions + Next Stage */}
                <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
                  {/* Financial Row */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">
                      Adv: <strong className="text-slate-700">₹{advance.toFixed(0)}</strong> / Total:{" "}
                      <strong className="text-slate-700">₹{total.toFixed(0)}</strong>
                    </span>
                    <div className="text-right">
                      <span
                        className={cn(
                          "font-black text-xs px-2 py-0.5 rounded-md",
                          balance > 0 ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
                        )}
                      >
                        {balance > 0 ? `Due: ₹${balance.toFixed(0)}` : "Paid in Full"}
                      </span>
                    </div>
                  </div>

                  {/* 2x2 Actions Grid (No text truncation!) */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTicketModalJob(job)}
                      className="py-1.5 px-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>Print Ticket</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProofModalJob(job)}
                      className={cn(
                        "py-1.5 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all",
                        job.customerFeedback
                          ? "bg-amber-50 text-amber-900 border-amber-300 animate-pulse"
                          : job.proofApproved
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <Layers className="w-3.5 h-3.5 text-lime-600 shrink-0" />
                      <span>Proof Hub</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDispatchModalJob(job)}
                      className="py-1.5 px-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span>Dispatch</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWhatsappModalJob(job)}
                      className="py-1.5 px-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>WhatsApp</span>
                    </button>
                  </div>

                  {/* Primary Stage Advancement Button */}
                  {!isDelivered && (
                    <button
                      disabled={loadingJobId === job.id}
                      onClick={() => handleAdvanceStatus(job)}
                      className={cn(
                        "w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-98",
                        isReady
                          ? "bg-slate-900 text-white hover:bg-slate-800 ring-2 ring-lime-400"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      )}
                    >
                      {loadingJobId === job.id ? (
                        <span>Updating...</span>
                      ) : isReady ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-lime-400" />
                          <span>Deliver & Settle (₹{balance.toFixed(0)})</span>
                        </>
                      ) : (
                        <>
                          <span>Next Stage</span>
                          <ArrowRight className="w-3.5 h-3.5 text-lime-400" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ==================================================== */
        /* CLEAN TABLE / SPREADSHEET VIEW */
        /* ==================================================== */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Job Type & Qty</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Proof</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJobs.map((job) => {
                  const balance = Number(job.balanceDue) || 0;
                  const isReady = job.status === "READY_FOR_PICKUP";
                  const isDelivered = job.status === "DELIVERED";

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Order # */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <a
                          href={`/track/${job.jobOrderNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-lime-700 flex items-center gap-1"
                        >
                          <span>{job.jobOrderNumber}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{job.customerName}</p>
                        {job.customerPhone && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            +91 {job.customerPhone}
                          </p>
                        )}
                      </td>

                      {/* Job Type & Qty */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <p className="font-bold text-slate-800 truncate">{job.jobType}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {job.quantity} {job.unitName}
                        </p>
                      </td>

                      {/* Stage */}
                      <td className="py-3 px-4">
                        <StatusBadge status={job.status} />
                      </td>

                      {/* Proof Status */}
                      <td className="py-3 px-4">
                        {job.customerFeedback ? (
                          <button
                            onClick={() => setProofModalJob(job)}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                          >
                            Revision Needed
                          </button>
                        ) : job.proofApproved ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Approved
                          </span>
                        ) : (
                          <button
                            onClick={() => setProofModalJob(job)}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200"
                          >
                            Manage Proof
                          </button>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-4 text-slate-600">
                        {job.expectedDeliveryDate ? (
                          <span className="font-semibold">
                            {new Date(job.expectedDeliveryDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3 px-4 text-right">
                        <span
                          className={cn(
                            "font-black text-xs px-2 py-0.5 rounded-md",
                            balance > 0 ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
                          )}
                        >
                          {balance > 0 ? `₹${balance.toFixed(0)}` : "Paid"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setTicketModalJob(job)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                            title="Print Ticket"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setProofModalJob(job)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                            title="Proof Hub"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDispatchModalJob(job)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                            title="Dispatch"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setWhatsappModalJob(job)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            title="WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {!isDelivered && (
                            <button
                              disabled={loadingJobId === job.id}
                              onClick={() => handleAdvanceStatus(job)}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-[11px] font-bold text-white transition-all ml-1 shadow-xs",
                                isReady ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-900 hover:bg-slate-800"
                              )}
                            >
                              {isReady ? "Deliver" : "Next ➔"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODALS */}
      {/* ==================================================== */}
      {ticketModalJob && (
        <JobTicketModal
          isOpen={Boolean(ticketModalJob)}
          onClose={() => setTicketModalJob(null)}
          job={ticketModalJob}
          shopSettings={shopSettings}
        />
      )}

      {dispatchModalJob && (
        <JobDispatchModal
          isOpen={Boolean(dispatchModalJob)}
          onClose={() => setDispatchModalJob(null)}
          job={dispatchModalJob}
        />
      )}

      {whatsappModalJob && (
        <JobWhatsAppModal
          isOpen={Boolean(whatsappModalJob)}
          onClose={() => setWhatsappModalJob(null)}
          job={whatsappModalJob}
          shopSettings={shopSettings}
        />
      )}

      {proofModalJob && (
        <JobProofModal
          isOpen={Boolean(proofModalJob)}
          onClose={() => setProofModalJob(null)}
          job={proofModalJob}
          shopSettings={shopSettings}
        />
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Plus, Printer, Clock, CheckCircle2 } from "lucide-react";
import { JobKanbanBoard } from "@/components/jobs/JobKanbanBoard";
import { CreateJobModal } from "@/components/jobs/CreateJobModal";

interface JobsPageClientProps {
  initialJobs: any[];
  customers: any[];
  shopSettings: any;
}

export function JobsPageClient({ initialJobs, customers, shopSettings }: JobsPageClientProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const activeJobs = initialJobs.filter((j) => j.status !== "DELIVERED" && j.status !== "CANCELLED");
  const readyJobs = initialJobs.filter((j) => j.status === "READY_FOR_PICKUP");
  const totalBalanceDue = activeJobs.reduce((sum, j) => sum + Number(j.balanceDue || 0), 0);

  return (
    <div className="space-y-4">
      {/* Sleek Executive Metric Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: 3 Compact KPI Indicators */}
        <div className="flex flex-wrap items-center gap-5 sm:gap-7">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100/80">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Production</div>
              <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 leading-tight">
                <span>{activeJobs.length}</span>
                <span className="text-[11px] font-medium text-slate-500">jobs</span>
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200/70 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lime-50 text-lime-700 flex items-center justify-center border border-lime-100/80">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ready for Pickup</div>
              <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 leading-tight">
                <span>{readyJobs.length}</span>
                <span className="text-[11px] font-medium text-slate-500">orders</span>
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200/70 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100/80">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Balance</div>
              <div className="text-sm font-extrabold text-amber-900 leading-tight">
                ₹{totalBalanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Right: + New Job Order Action */}
        <button
          onClick={() => setIsCreateOpen(true)}
          className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-extrabold hover:bg-slate-800 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-98 shrink-0"
        >
          <Plus className="w-4 h-4 text-lime-400" />
          <span>New Job Order</span>
        </button>
      </div>

      {/* Main Kanban & Spreadsheet Table Component */}
      <JobKanbanBoard jobs={initialJobs} shopSettings={shopSettings} />

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        customers={customers}
      />
    </div>
  );
}

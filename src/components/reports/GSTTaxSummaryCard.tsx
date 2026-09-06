"use client";

import React from "react";
import { formatCurrency } from "@/lib/utils";
import { ReceiptText, ShieldCheck, PieChart } from "lucide-react";

interface GSTTaxSummaryCardProps {
  gstSlabs: Array<{
    slabRate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    totalTax: number;
    itemCount: number;
  }>;
  totalTax: number;
  totalRevenue: number;
}

export function GSTTaxSummaryCard({
  gstSlabs,
  totalTax,
  totalRevenue,
}: GSTTaxSummaryCardProps) {
  const totalTaxable = gstSlabs.reduce((sum, s) => sum + s.taxableValue, 0);
  const totalCGST = gstSlabs.reduce((sum, s) => sum + s.cgst, 0);
  const totalSGST = gstSlabs.reduce((sum, s) => sum + s.sgst, 0);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-lime-400 text-slate-950 flex items-center justify-center font-bold shadow-2xs">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              GST Tax Liability Summary (GSTR-1 Ready)
            </h3>
            <p className="text-xs text-slate-400">
              Slab-wise breakdown of taxable sales, CGST, and SGST collections
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/70 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Intra-State GST Compliant</span>
          </span>
        </div>
      </div>

      {/* 3 Overview Metric Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Taxable Turnover
          </span>
          <span className="text-base font-black text-slate-900 font-mono">
            {formatCurrency(totalTaxable)}
          </span>
        </div>

        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Central GST (CGST)
          </span>
          <span className="text-base font-black text-slate-900 font-mono">
            {formatCurrency(totalCGST)}
          </span>
        </div>

        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            State GST (SGST)
          </span>
          <span className="text-base font-black text-slate-900 font-mono">
            {formatCurrency(totalSGST)}
          </span>
        </div>
      </div>

      {/* Tax Slab Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              <th className="pb-3 pl-2">Tax Rate Slab</th>
              <th className="pb-3 text-right">Taxable Turnover</th>
              <th className="pb-3 text-right">CGST (50%)</th>
              <th className="pb-3 text-right">SGST (50%)</th>
              <th className="pb-3 text-right pr-2">Total GST Collected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-medium">
            {gstSlabs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                  No tax records found for this period.
                </td>
              </tr>
            ) : (
              gstSlabs.map((slab) => (
                <tr key={slab.slabRate} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 pl-2">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black ${
                        slab.slabRate === 0
                          ? "bg-slate-100 text-slate-700"
                          : slab.slabRate === 5
                          ? "bg-blue-50 text-blue-800"
                          : slab.slabRate === 12
                          ? "bg-purple-50 text-purple-800"
                          : slab.slabRate === 18
                          ? "bg-amber-50 text-amber-800"
                          : "bg-rose-50 text-rose-800"
                      }`}
                    >
                      {slab.slabRate}% GST {slab.slabRate === 0 ? "(Exempt / 0%)" : ""}
                    </span>
                  </td>
                  <td className="py-3 text-right font-semibold text-slate-800">
                    {formatCurrency(slab.taxableValue)}
                  </td>
                  <td className="py-3 text-right text-slate-600">
                    {formatCurrency(slab.cgst)}
                  </td>
                  <td className="py-3 text-right text-slate-600">
                    {formatCurrency(slab.sgst)}
                  </td>
                  <td className="py-3 text-right font-extrabold text-slate-900 pr-2">
                    {formatCurrency(slab.totalTax)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 font-extrabold text-xs text-slate-900 bg-slate-50/60">
              <td className="py-3 pl-2">Net Period Total:</td>
              <td className="py-3 text-right">{formatCurrency(totalTaxable)}</td>
              <td className="py-3 text-right">{formatCurrency(totalCGST)}</td>
              <td className="py-3 text-right">{formatCurrency(totalSGST)}</td>
              <td className="py-3 text-right font-black text-lime-900 pr-2">
                {formatCurrency(totalTax)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Printer,
  Package,
  ArrowRight,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Sparkles,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { searchPublicJobOrders } from "@/actions/tracking";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

export default function PublicTrackingSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setErrorMsg(null);
    startTransition(async () => {
      const res = await searchPublicJobOrders(query);
      if (res.success) {
        setResults(res.jobs);
        if (res.jobs.length === 0) {
          setErrorMsg(`No active orders found matching "${query}". Please verify your Job Order # or Phone number.`);
        }
      } else {
        setErrorMsg(res.error || "Failed to search orders");
        setResults([]);
      }
    });
  };

  const getStatusBadge = (status: string, proofApproved: boolean) => {
    switch (status) {
      case "ORDER_PLACED":
        return { label: "Order Placed", color: "bg-purple-100 text-purple-800 border-purple-200" };
      case "DESIGNING":
        return { label: "Design In Progress", color: "bg-sky-100 text-sky-800 border-sky-200" };
      case "PROOF_APPROVAL":
        return {
          label: proofApproved ? "Proof Approved ✅" : "Proof Ready for Approval ⚠️",
          color: proofApproved
            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
            : "bg-amber-100 text-amber-800 border-amber-200 animate-pulse",
        };
      case "PRINTING":
        return { label: "Press Printing", color: "bg-indigo-100 text-indigo-800 border-indigo-200" };
      case "READY_FOR_PICKUP":
        return { label: "Ready for Pickup", color: "bg-lime-100 text-lime-800 border-lime-200 font-bold" };
      case "DELIVERED":
        return { label: "Delivered & Completed", color: "bg-emerald-100 text-emerald-800 border-emerald-200" };
      default:
        return { label: status, color: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 flex flex-col">
      {/* Top Branded Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-20 backdrop-blur-md bg-white/95">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-lime-300 to-lime-500 flex items-center justify-center shadow-md">
              <Printer className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-slate-900 leading-none">
                CRYSTAL PRESS
              </h1>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                Customer Order Tracking & Proof Approval
              </p>
            </div>
          </div>

          <a
            href="https://wa.me/919876543210?text=Hi%20Crystal%20Press,%20I%20have%20an%20inquiry%20about%20my%20order"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">WhatsApp Help</span>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-100 text-lime-900 text-xs font-black border border-lime-300">
            <Sparkles className="w-3.5 h-3.5 text-lime-700" />
            <span>Live Production Status & Artwork Sign-Off</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Track Your Print Order
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
            Review design proofs before printing, check real-time press milestones, and settle balance dues effortlessly.
          </p>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handleSearch} className="relative">
          <div className="flex flex-col sm:flex-row gap-2.5 p-2 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
            <div className="relative flex-1 flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-4" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Job Order # (e.g. JO-2026-0003) or Phone Number"
                className="w-full pl-12 pr-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>
            <button
              type="submit"
              disabled={isPending || !query.trim()}
              className="px-7 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
            >
              {isPending ? (
                <span>Searching...</span>
              ) : (
                <>
                  <span>Track Order</span>
                  <ArrowRight className="w-4 h-4 text-lime-400" />
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-2">
            Tip: Your Job Order number is printed on your receipt or job docket (e.g. <span className="font-mono font-bold text-slate-600">JO-2026-0003</span>).
          </p>
        </form>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Order Not Found</p>
              <p className="mt-0.5 text-amber-800">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Search Results List */}
        {results && results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Found {results.length} Order{results.length > 1 ? "s" : ""}
            </h3>
            <div className="space-y-3">
              {results.map((job) => {
                const badge = getStatusBadge(job.status, job.proofApproved);
                const isReady = job.status === "READY_FOR_PICKUP";
                const isProofWaiting = job.status === "PROOF_APPROVAL" && !job.proofApproved;

                return (
                  <Link
                    key={job.id}
                    href={`/track/${job.jobOrderNumber}`}
                    className="block p-5 bg-white rounded-3xl border border-slate-200 hover:border-lime-400 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-slate-900 px-2 py-0.5 rounded-lg bg-slate-100">
                            {job.jobOrderNumber}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2.5 py-0.5 rounded-full border",
                              badge.color
                            )}
                          >
                            {badge.label}
                          </span>
                          {isProofWaiting && (
                            <span className="text-[10px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-full animate-bounce">
                              Action Required
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 mt-2 group-hover:text-slate-900">
                          {job.jobType}
                        </h4>

                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                          <span>Qty: <strong className="text-slate-800">{job.quantity} {job.unitName}</strong></span>
                          <span>•</span>
                          <span>Customer: <strong className="text-slate-800">{job.customerName}</strong></span>
                          {job.expectedDeliveryDate && (
                            <>
                              <span>•</span>
                              <span className="text-amber-700 font-semibold">
                                Ready By: {formatDate(job.expectedDeliveryDate)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 block">Balance Due</span>
                          <span
                            className={cn(
                              "text-sm font-black",
                              job.balanceDue > 0 ? "text-amber-700" : "text-emerald-700"
                            )}
                          >
                            {formatCurrency(job.balanceDue)}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-1 text-xs font-bold text-slate-900 group-hover:text-lime-700 transition-colors">
                          <span>View Proof & Status</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Feature Explainer Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-slate-200">
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
            <FileCheck2 className="w-5 h-5 text-purple-600" />
            <h4 className="text-xs font-bold text-slate-900">Online Proof Approval</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Verify your design layout, spelling, and colors on your phone before printing begins.
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
            <Clock className="w-5 h-5 text-sky-600" />
            <h4 className="text-xs font-bold text-slate-900">Live Stage Milestones</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Know the exact minute your order moves from design to press, cutting, and ready for pickup.
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h4 className="text-xs font-bold text-slate-900">Contactless UPI Pay</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Scan & pay remaining balances directly with GPay, PhonePe, or Paytm for instant pickup.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-auto">
        <p className="font-bold text-slate-800">Crystal Press & Printing Works</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Fast Commercial Printing • Visiting Cards • Letterheads • Packaging Boxes • Books & Stationery
        </p>
      </footer>
    </div>
  );
}

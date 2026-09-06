import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Printer, AlertCircle, ArrowLeft, Search } from "lucide-react";
import { getPublicJobTrackingData } from "@/actions/tracking";
import { JobTrackingClient } from "./JobTrackingClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: {
    orderId: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Track Order #${params.orderId} | Crystal Press`,
    description: `Live production tracking and digital proof approval for Order #${params.orderId}`,
  };
}

export default async function OrderTrackingPage({ params }: PageProps) {
  const { orderId } = params;
  const result = await getPublicJobTrackingData(orderId);

  if (!result.success || !result.job) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Order Not Found</h2>
          <p className="text-xs text-slate-500">
            We couldn't locate any order matching{" "}
            <span className="font-mono font-bold text-slate-800">"{orderId}"</span>.
            Please check your receipt or try searching with your phone number.
          </p>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/track"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Search className="w-4 h-4 text-lime-400" />
              <span>Search Other Orders</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <JobTrackingClient initialJob={result.job} />;
}

"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Phone,
  MessageSquare,
  Share2,
  Download,
  Eye,
  Check,
  X,
  AlertTriangle,
  FileText,
  Sparkles,
  QrCode,
  Copy,
  ChevronRight,
  ExternalLink,
  ZoomIn,
  ShieldCheck,
  Send,
  Layers,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import { PublicJobData, approveJobProofByCustomer, requestProofRevisionsByCustomer } from "@/actions/tracking";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

interface JobTrackingClientProps {
  initialJob: PublicJobData;
}

const STAGES = [
  { id: "ORDER_PLACED", label: "Order Placed", desc: "Specs & deposit logged" },
  { id: "DESIGNING", label: "Design & Artwork", desc: "Typesetting & layout" },
  { id: "PROOF_APPROVAL", label: "Proof Approval", desc: "Customer sign-off" },
  { id: "PRINTING", label: "Press Printing", desc: "Offset/digital machine" },
  { id: "READY_FOR_PICKUP", label: "Ready for Pickup", desc: "Packing & QA complete" },
  { id: "DELIVERED", label: "Delivered", desc: "Handed over & finalized" },
];

export function JobTrackingClient({ initialJob }: JobTrackingClientProps) {
  const [job, setJob] = useState<PublicJobData>(initialJob);
  const [selectedProofIdx, setSelectedProofIdx] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  // Approval Form State
  const [approverName, setApproverName] = useState(job.customerName || "");
  const [checkSpelling, setCheckSpelling] = useState(false);
  const [checkContacts, setCheckContacts] = useState(false);
  const [checkLayout, setCheckLayout] = useState(false);
  const [isApproving, startApproving] = useTransition();

  // Revision Form State
  const [revisionNotes, setRevisionNotes] = useState("");
  const [isSubmittingRevision, startSubmittingRevision] = useTransition();

  // Notification State
  const [toastMsg, setToastMsg] = useState<{ title: string; text: string; type: "success" | "info" | "error" } | null>(null);

  const showToast = (title: string, text: string, type: "success" | "info" | "error" = "success") => {
    setToastMsg({ title, text, type });
    setTimeout(() => setToastMsg(null), 5000);
  };

  const proofs = job.attachments.filter((a) => a.isProof);
  const activeProof = proofs[selectedProofIdx] || proofs[0] || null;

  // Determine Current Stage Index
  const getStageIndex = (status: string) => {
    switch (status) {
      case "ORDER_PLACED":
        return 0;
      case "DESIGNING":
        return 1;
      case "PROOF_APPROVAL":
        return 2;
      case "PRINTING":
      case "FINISHING":
        return 3;
      case "READY_FOR_PICKUP":
        return 4;
      case "DELIVERED":
        return 5;
      default:
        return 0;
    }
  };

  const currentStageIdx = getStageIndex(job.status);

  // UPI Link Details
  const upiId = job.shopSettings.upiId || "crystalpress@upi";
  const shopName = job.shopSettings.shopName || "Crystal Press";
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${encodeURIComponent(
    job.balanceDue.toFixed(2)
  )}&cu=INR&tn=${encodeURIComponent(`Order_${job.jobOrderNumber}`)}`;

  // Handle Approve Submission
  const handleConfirmApproval = () => {
    if (!approverName.trim()) {
      showToast("Name Required", "Please enter your name to confirm approval.", "error");
      return;
    }
    if (!checkSpelling || !checkContacts || !checkLayout) {
      showToast("Verification Required", "Please check all confirmation boxes before approving.", "error");
      return;
    }

    startApproving(async () => {
      const res = await approveJobProofByCustomer(job.id, approverName);
      if (res.success) {
        setJob((prev) => ({
          ...prev,
          proofApproved: true,
          proofApprovedAt: new Date().toISOString(),
          clientApprovedName: approverName.trim(),
          customerFeedback: null,
          status: "PRINTING" as any,
        }));
        setIsApproveModalOpen(false);
        try {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch (e) {}
        showToast(
          "Proof Approved! 🎉",
          "Your design is now approved and queued for printing. Thank you!"
        );
      } else {
        showToast("Error", res.error || "Failed to approve proof.", "error");
      }
    });
  };

  // Handle Revision Submission
  const handleConfirmRevision = () => {
    if (!revisionNotes.trim()) {
      showToast("Feedback Required", "Please describe the changes needed.", "error");
      return;
    }

    startSubmittingRevision(async () => {
      const res = await requestProofRevisionsByCustomer(job.id, revisionNotes);
      if (res.success) {
        setJob((prev) => ({
          ...prev,
          proofApproved: false,
          proofRejectedAt: new Date().toISOString(),
          customerFeedback: revisionNotes.trim(),
          status: "DESIGNING" as any,
        }));
        setIsRevisionModalOpen(false);
        setRevisionNotes("");
        showToast(
          "Changes Submitted ✏️",
          "Our design team has received your revision notes and will update the proof shortly.",
          "info"
        );
      } else {
        showToast("Error", res.error || "Failed to submit revisions.", "error");
      }
    });
  };

  // Handle Share / Copy Link
  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `Crystal Press Order #${job.jobOrderNumber}`,
        text: `Live production tracking and proof for ${job.jobType}`,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      showToast("Link Copied 📋", "Tracking link copied to clipboard.");
    }
  };

  // Print Digital Job Slip
  const handlePrintSlip = () => {
    window.print();
  };

  // Smart UPI Handler (Mobile vs Desktop)
  const handleUpiClick = (e: React.MouseEvent) => {
    const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) {
      e.preventDefault();
      setIsUpiModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 1. Top Branded Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 backdrop-blur-md bg-white/95">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/track" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-lime-300 to-lime-500 flex items-center justify-center shadow-xs">
              <Printer className="w-4 h-4 text-slate-900" />
            </div>
            <div>
              <span className="text-xs font-black tracking-tight text-slate-900 block group-hover:text-lime-700 transition-colors">
                {shopName}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold block">
                Order Tracking Portal
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Share Tracking Link"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Share</span>
            </button>

            <button
              onClick={handlePrintSlip}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              title="Print Order Summary"
            >
              <FileText className="w-3.5 h-3.5 text-lime-400" />
              <span className="hidden sm:inline">Print Receipt</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl border text-xs max-w-sm flex items-start gap-3 transition-all animate-in fade-in slide-in-from-bottom-5",
            toastMsg.type === "success" && "bg-emerald-50 border-emerald-200 text-emerald-900",
            toastMsg.type === "info" && "bg-sky-50 border-sky-200 text-sky-900",
            toastMsg.type === "error" && "bg-red-50 border-red-200 text-red-900"
          )}
        >
          <div className="mt-0.5">
            {toastMsg.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {toastMsg.type === "info" && <Sparkles className="w-4 h-4 text-sky-600" />}
            {toastMsg.type === "error" && <AlertTriangle className="w-4 h-4 text-red-600" />}
          </div>
          <div className="flex-1">
            <p className="font-bold">{toastMsg.title}</p>
            <p className="mt-0.5 text-slate-600">{toastMsg.text}</p>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Order Header Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-slate-100 text-slate-900 border border-slate-200">
                {job.jobOrderNumber}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Placed on {formatDate(job.createdAt)}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {job.jobType}
            </h2>
            <p className="text-xs text-slate-500">
              Customer: <strong className="text-slate-800 font-bold">{job.customerName}</strong>
              {job.customerPhone && <span> • +91 {job.customerPhone}</span>}
            </p>
          </div>

          {/* Delivery Due Indicator */}
          {job.expectedDeliveryDate && (
            <div className="sm:text-right p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 sm:max-w-[200px]">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Estimated Delivery
              </span>
              <span className="text-xs font-black text-amber-950 block mt-0.5">
                {formatDate(job.expectedDeliveryDate)}
              </span>
            </div>
          )}
        </div>

        {/* 2. Production Milestone Stepper */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Live Production Status
            </h3>
            <span className="text-xs font-bold text-slate-700">
              Stage {currentStageIdx + 1} of {STAGES.length}
            </span>
          </div>

          {/* Desktop Horizontal Stepper */}
          <div className="hidden sm:grid grid-cols-6 gap-2 pt-2">
            {STAGES.map((stage, idx) => {
              const isPast = idx < currentStageIdx;
              const isCurrent = idx === currentStageIdx;
              const isFuture = idx > currentStageIdx;

              return (
                <div key={stage.id} className="flex flex-col items-center text-center space-y-2 relative">
                  {/* Connector Line */}
                  {idx < STAGES.length - 1 && (
                    <div
                      className={cn(
                        "absolute top-4 left-1/2 w-full h-1 -z-0",
                        idx < currentStageIdx ? "bg-lime-500" : "bg-slate-200"
                      )}
                    />
                  )}

                  {/* Icon Bubble */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all shadow-xs",
                      isPast && "bg-lime-500 text-slate-950 ring-4 ring-lime-100",
                      isCurrent && "bg-slate-900 text-lime-400 ring-4 ring-slate-200 animate-pulse",
                      isFuture && "bg-slate-100 text-slate-400 border border-slate-200"
                    )}
                  >
                    {isPast ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                  </div>

                  <div>
                    <p
                      className={cn(
                        "text-xs font-bold leading-tight",
                        isCurrent && "text-slate-950 font-black",
                        isPast && "text-slate-800",
                        isFuture && "text-slate-400"
                      )}
                    >
                      {stage.label}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                      {stage.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile Vertical Stepper */}
          <div className="sm:hidden space-y-3 pt-1">
            {STAGES.map((stage, idx) => {
              const isPast = idx < currentStageIdx;
              const isCurrent = idx === currentStageIdx;

              return (
                <div key={stage.id} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                      isPast && "bg-lime-500 text-slate-950",
                      isCurrent && "bg-slate-900 text-lime-400 ring-2 ring-lime-400 animate-pulse",
                      !isPast && !isCurrent && "bg-slate-100 text-slate-400 border border-slate-200"
                    )}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <div className="flex-1">
                    <span
                      className={cn(
                        "text-xs font-bold block",
                        isCurrent && "text-slate-950 font-black",
                        isPast && "text-slate-700",
                        !isPast && !isCurrent && "text-slate-400"
                      )}
                    >
                      {stage.label}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{stage.desc}</span>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-lime-100 text-lime-900 border border-lime-200">
                      In Progress
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Proof Approval & Review Hero Section */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Digital Artwork Proof</span>
                {job.proofApproved && (
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Approved for Press</span>
                  </span>
                )}
                {job.proofRejectedAt && !job.proofApproved && (
                  <span className="text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>Revision In Progress</span>
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect your design before printing to ensure spellings, logos, and phone numbers are 100% accurate.
              </p>
            </div>

            {proofs.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {proofs.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProofIdx(idx);
                      setImageLoadError(false);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all",
                      selectedProofIdx === idx
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                    )}
                  >
                    Side {idx + 1}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Proof Status Banner */}
          {job.proofApproved ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-black text-sm">Design Approved by {job.clientApprovedName || "Client"} ✅</p>
                <p className="mt-0.5 text-emerald-800">
                  Approved on {formatDate(job.proofApprovedAt || "")}. This order is locked for printing and in production.
                </p>
              </div>
            </div>
          ) : job.customerFeedback ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-black text-sm">Revision Requested on {formatDate(job.proofRejectedAt || "")}</p>
                <p className="mt-0.5 text-amber-800 italic">
                  "{job.customerFeedback}"
                </p>
                <p className="mt-1 text-amber-700 font-medium">
                  Our DTP designer is incorporating your requested changes into a new proof.
                </p>
              </div>
            </div>
          ) : activeProof ? (
            <div className="p-4 rounded-2xl bg-lime-50 border border-lime-300 text-slate-900 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-lime-700 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-black text-sm text-slate-900">Sign-Off Required Before Printing</p>
                  <p className="text-slate-700 mt-0.5">
                    Please review the proof below. If everything looks correct, click <strong>Approve Artwork</strong> to authorize immediate press printing.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsApproveModalOpen(true)}
                className="hidden sm:flex px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold items-center gap-1.5 shrink-0 shadow-sm"
              >
                <Check className="w-4 h-4 text-lime-400" />
                <span>Approve Now</span>
              </button>
            </div>
          ) : null}

          {/* Proof Visual Display */}
          {activeProof ? (
            <div className="space-y-3">
              <div className="relative group bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center min-h-[260px] max-h-[500px]">
                {activeProof.fileType.includes("pdf") ? (
                  <div className="p-8 text-center text-white space-y-3">
                    <FileText className="w-16 h-16 text-lime-400 mx-auto" />
                    <div>
                      <p className="font-bold text-sm">{activeProof.fileName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">PDF Design Document</p>
                    </div>
                    <a
                      href={activeProof.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-lime-400 text-slate-950 hover:bg-lime-300 rounded-xl text-xs font-bold transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Open Fullscreen PDF</span>
                    </a>
                  </div>
                ) : imageLoadError ? (
                  <div className="p-8 text-center text-white space-y-3">
                    <FileText className="w-14 h-14 text-lime-400 mx-auto" />
                    <div>
                      <p className="font-bold text-sm text-white">{activeProof.fileName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Design Proof Document</p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <a
                        href={activeProof.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-lime-400 text-slate-950 hover:bg-lime-300 rounded-xl text-xs font-bold transition-all"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Open Proof in New Tab</span>
                      </a>
                      <a
                        href={activeProof.fileUrl}
                        download={activeProof.fileName}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-700 rounded-xl text-xs font-bold transition-all"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <>
                    <img
                      src={activeProof.fileUrl}
                      alt={activeProof.fileName}
                      onError={() => setImageLoadError(true)}
                      className="w-auto h-auto max-h-[480px] max-w-full object-contain cursor-zoom-in"
                      onClick={() => setIsZoomOpen(true)}
                    />
                    {/* Hover Overlay */}
                    <div
                      onClick={() => setIsZoomOpen(true)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-zoom-in"
                    >
                      <div className="px-4 py-2 bg-white/90 text-slate-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg">
                        <ZoomIn className="w-4 h-4" />
                        <span>Click to Zoom & Inspect (Full Resolution)</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Bottom Proof Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsZoomOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Zoom & Inspect</span>
                  </button>

                  <a
                    href={activeProof.fileUrl}
                    download={activeProof.fileName}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Original</span>
                  </a>
                </div>

                {!job.proofApproved && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsRevisionModalOpen(true)}
                      className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span>✏️ Request Changes</span>
                    </button>

                    <button
                      onClick={() => setIsApproveModalOpen(true)}
                      className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98"
                    >
                      <Check className="w-4 h-4 text-lime-400" />
                      <span>Approve Artwork</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="text-sm font-bold text-slate-800">Artwork Proof in Preparation</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Our graphic designers are creating your layout. Once uploaded, your high-resolution proof will appear right here for your final sign-off.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 4. Specifications & Financials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Technical Job Specifications */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Technical Specifications
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Item Quantity:</span>
                <span className="font-bold text-slate-900">
                  {job.quantity} {job.unitName}
                </span>
              </div>

              {job.specifications &&
                Object.entries(job.specifications).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 capitalize">{key.replace(/([A-Z])/g, " $1")}:</span>
                    <span className="font-bold text-slate-800 text-right max-w-[200px] truncate">
                      {String(val)}
                    </span>
                  </div>
                ))}

              {job.designNotes && (
                <div className="py-2">
                  <span className="text-slate-400 block text-[11px] mb-1">Production Notes:</span>
                  <p className="p-3 bg-slate-50 rounded-xl text-slate-700 italic border border-slate-100 text-[11px]">
                    {job.designNotes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Balance Due & Contactless UPI Settlement */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Payment & Balance Status
              </h3>

              <div className="space-y-2 mt-3 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Total Order Amount:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(job.totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Advance Deposit Paid:</span>
                  <span className="font-bold text-emerald-700">-{formatCurrency(job.advancePaid)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="font-black text-sm text-slate-900">Remaining Balance:</span>
                  <span
                    className={cn(
                      "font-black text-base",
                      job.balanceDue > 0 ? "text-amber-700" : "text-emerald-700"
                    )}
                  >
                    {formatCurrency(job.balanceDue)}
                  </span>
                </div>
              </div>
            </div>

            {/* UPI QR Code Block */}
            {job.balanceDue > 0 ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/70 border border-slate-200 text-center space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  <QrCode className="w-3 h-3 text-emerald-600" />
                  <span>Instant Contactless UPI Settlement</span>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs inline-block mx-auto">
                  <QRCodeSVG value={upiUrl} size={140} level="M" />
                </div>

                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Scan with <strong>GPay, PhonePe, or Paytm</strong> to settle balance prior to shop collection.
                </p>

                <div className="flex items-center justify-center gap-2">
                  <a
                    href={upiUrl}
                    onClick={handleUpiClick}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Pay ₹{job.balanceDue.toFixed(2)} in UPI App</span>
                  </a>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(upiId);
                      showToast("UPI ID Copied", upiId);
                    }}
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold"
                    title="Copy UPI ID"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <h4 className="text-xs font-bold text-emerald-950">Payment Completed</h4>
                <p className="text-[11px] text-emerald-800">
                  No balance pending on this order. You're all set for pickup!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 5. Shop Assistance & Location Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">{job.shopSettings.shopName}</h4>
            <p className="text-xs text-slate-500">{job.shopSettings.addressLine1}</p>
            <p className="text-xs text-slate-500">
              Questions? Call <strong className="text-slate-800">{job.shopSettings.phone1}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${job.shopSettings.phone1}`}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Phone className="w-4 h-4 text-slate-600" />
              <span>Call Shop</span>
            </a>

            <a
              href={`https://wa.me/${job.shopSettings.phone1.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                `Hello Crystal Press, inquiring about my Job Order #${job.jobOrderNumber} (${job.jobType})`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Shop</span>
            </a>
          </div>
        </div>
      </main>

      {/* ==================================================== */}
      {/* FULLSCREEN LIGHTBOX MODAL */}
      {/* ==================================================== */}
      {isZoomOpen && activeProof && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col p-4 backdrop-blur-sm animate-in fade-in">
          <div className="flex items-center justify-between text-white pb-3 border-b border-white/10">
            <div>
              <p className="text-xs font-bold text-white">{activeProof.fileName}</p>
              <p className="text-[10px] text-slate-400">Order #{job.jobOrderNumber} Proof Inspection</p>
            </div>
            <button
              onClick={() => setIsZoomOpen(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-auto p-2">
            <img
              src={activeProof.fileUrl}
              alt="Proof Fullscreen"
              className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* APPROVE PROOF CONFIRMATION MODAL */}
      {/* ==================================================== */}
      {isApproveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-md w-full space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-lime-100 text-lime-800 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-lime-700" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Confirm Artwork Approval</h3>
              </div>
              <button onClick={() => setIsApproveModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Once approved, your job will be immediately queued on our printing presses. Please confirm the following verification checklist:
            </p>

            {/* Checklist */}
            <div className="space-y-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkSpelling}
                  onChange={(e) => setCheckSpelling(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-lime-600 focus:ring-lime-400"
                />
                <span className="font-semibold text-slate-800">
                  I have checked all spellings, names, titles, and body text.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkContacts}
                  onChange={(e) => setCheckContacts(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-lime-600 focus:ring-lime-400"
                />
                <span className="font-semibold text-slate-800">
                  I have verified all phone numbers, email addresses, and locations.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkLayout}
                  onChange={(e) => setCheckLayout(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-lime-600 focus:ring-lime-400"
                />
                <span className="font-semibold text-slate-800">
                  I approve the layout, margins, logo alignment, and color scheme.
                </span>
              </label>
            </div>

            {/* Approver Name Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Your Full Name (Sign-off record) *
              </label>
              <input
                type="text"
                required
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isApproving || !approverName.trim() || !checkSpelling || !checkContacts || !checkLayout}
                onClick={handleConfirmApproval}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
              >
                {isApproving ? <span>Submitting...</span> : <span>Confirm & Print</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* REQUEST REVISIONS MODAL */}
      {/* ==================================================== */}
      {isRevisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-md w-full space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <span className="text-sm">✏️</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">Request Design Changes</h3>
              </div>
              <button onClick={() => setIsRevisionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Please specify the corrections or layout changes needed. Our graphic designer will prepare an updated proof.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Requested Changes & Notes *
              </label>
              <textarea
                rows={4}
                required
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="e.g. Please change mobile number to 98765 43210 and make the shop address line larger."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRevisionModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingRevision || !revisionNotes.trim()}
                onClick={handleConfirmRevision}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
              >
                {isSubmittingRevision ? <span>Submitting...</span> : <span>Send Changes to Designer</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* UPI QR PAYMENT MODAL (DESKTOP & MOBILE ASSIST) */}
      {/* ==================================================== */}
      {isUpiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-md w-full space-y-4 animate-in zoom-in-95 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-left">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Scan & Pay with Any UPI App</h3>
                  <p className="text-[11px] text-slate-400">GPay • PhonePe • Paytm • BHIM</p>
                </div>
              </div>
              <button onClick={() => setIsUpiModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Code Container */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block mx-auto">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <QRCodeSVG value={upiUrl} size={180} level="M" />
              </div>
              <p className="text-xs font-black text-slate-900 mt-2">
                Pay Exactly: <span className="text-emerald-700 font-black">₹{job.balanceDue.toFixed(2)}</span>
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Order Ref: {job.jobOrderNumber}</p>
            </div>

            {/* How to Pay on Computer */}
            <div className="text-left p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1.5">
              <p className="font-bold text-slate-800">📱 How to Pay:</p>
              <ol className="list-decimal list-inside text-slate-600 space-y-1 text-[11px]">
                <li>Open <strong>GPay, PhonePe, or Paytm</strong> on your mobile phone.</li>
                <li>Tap <strong>Scan QR</strong> and point your camera at the code above.</li>
                <li>Verify payee: <strong>{shopName}</strong> ({upiId}).</li>
                <li>Enter your UPI PIN to finalize payment.</li>
              </ol>
            </div>

            {/* Actions: Send to WhatsApp or Copy */}
            <div className="space-y-2 pt-1">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `*Crystal Press Order Payment*\nOrder #${job.jobOrderNumber} (${job.jobType})\nRemaining Balance: ₹${job.balanceDue.toFixed(2)}\n\nTap to pay on UPI App:\n${upiUrl}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send Payment Link to My WhatsApp</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(upiId);
                    showToast("UPI ID Copied", upiId);
                  }}
                  className="flex-1 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy UPI ID ({upiId})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsUpiModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
                >
                  Done
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 italic">
              Note: Payee account is configured in Shop Settings ({upiId}).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

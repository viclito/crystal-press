"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import {
  X,
  Upload,
  Layers,
  FileText,
  Trash2,
  Share2,
  MessageSquare,
  CheckCircle2,
  Clock,
  ExternalLink,
  Sparkles,
  Link2,
  Eye,
  AlertCircle,
  Plus,
} from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { getJobAttachments, attachProofUrlToJob, deleteJobAttachment, setJobProofApprovalStage } from "@/actions/jobs";
import { toast } from "@/stores/useSnackbarStore";
import { modal } from "@/stores/useDialogStore";
import { useRouter } from "next/navigation";

interface JobProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  shopSettings?: any;
}

export function JobProofModal({ isOpen, onClose, job, shopSettings }: JobProofModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchAttachments = async () => {
    if (!job?.id) return;
    setLoading(true);
    const res = await getJobAttachments(job.id);
    if (res.success) {
      setAttachments(res.attachments || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && job?.id) {
      fetchAttachments();
    }
  }, [isOpen, job?.id]);

  if (!isOpen || !job) return null;

  const shopName = shopSettings?.shopName || "Crystal Press";
  const trackingUrl = typeof window !== "undefined" ? `${window.location.origin}/track/${job.jobOrderNumber}` : `/track/${job.jobOrderNumber}`;

  // Handle File Upload via API
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("jobOrderId", job.id);
      formData.append("isProof", "true");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.attachment) {
        toast.success(`Uploaded "${file.name}" as proof!`, "Proof Uploaded");
        await fetchAttachments();
        router.refresh();
      } else {
        toast.error(data.error || "Failed to upload proof");
      }
    } catch (err: any) {
      toast.error(err.message || "Upload error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle Add Image URL
  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsAddingUrl(true);
    const res = await attachProofUrlToJob(job.id, urlInput.trim(), "Artwork Proof (URL)");
    setIsAddingUrl(false);

    if (res.success) {
      toast.success("Proof URL added and job moved to Proof Approval!", "Proof Attached");
      setUrlInput("");
      await fetchAttachments();
      router.refresh();
    } else {
      toast.error(res.error || "Failed to attach proof URL");
    }
  };

  // Delete Attachment
  const handleDelete = async (attId: string, name: string) => {
    const confirmed = await modal.confirm({
      title: "Delete Attachment?",
      message: `Are you sure you want to remove "${name}"?`,
      confirmText: "Delete",
      type: "danger",
    });

    if (!confirmed) return;

    const res = await deleteJobAttachment(attId);
    if (res.success) {
      toast.info("Attachment removed", "Deleted");
      await fetchAttachments();
      router.refresh();
    } else {
      toast.error(res.error || "Failed to delete");
    }
  };

  // Move stage to PROOF_APPROVAL
  const handleMoveToProofApproval = () => {
    startTransition(async () => {
      const res = await setJobProofApprovalStage(job.id);
      if (res.success) {
        toast.success("Job order stage updated to Proof Approval!", "Stage Updated");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update stage");
      }
    });
  };

  // Generate WhatsApp Message
  const handleSendWhatsApp = () => {
    const phone = job.customerPhone ? job.customerPhone.replace(/[^0-9]/g, "") : "";
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;

    const message =
      `*DESIGN PROOF READY FOR APPROVAL — ${shopName.toUpperCase()}*\n\n` +
      `Dear *${job.customerName}*,\n\n` +
      `Your digital design proof for *${job.jobType}* (Order #${job.jobOrderNumber}) is ready for your review!\n\n` +
      `👉 *Click here to review & approve your artwork:*\n` +
      `${trackingUrl}\n\n` +
      `📦 *Order Details:*\n` +
      `• *Job No:* ${job.jobOrderNumber}\n` +
      `• *Quantity:* ${job.quantity} ${job.unitName}\n` +
      `• *Total Amount:* ${formatCurrency(job.totalAmount)}\n` +
      `• *Balance Due:* ${formatCurrency(job.balanceDue)}\n\n` +
      `_Please inspect spelling and phone numbers carefully before approving._\n\n` +
      `Thank you,\n*${shopName}*`;

    const encoded = encodeURIComponent(message);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(waUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-lime-300 to-lime-500 flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                  {job.jobOrderNumber}
                </span>
                <span className="text-xs font-bold text-slate-700">{job.jobType}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-500 mt-0.5">
                Artwork Proof & Customer Sign-Off Hub
              </h3>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Customer Approval Status Banner */}
          {job.proofApproved ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Client Approved for Printing ✅</p>
                <p className="text-emerald-800 mt-0.5">
                  Approved by <strong>{job.clientApprovedName || job.customerName}</strong> on{" "}
                  {formatDate(job.proofApprovedAt || "")}. Ready for press run.
                </p>
              </div>
            </div>
          ) : job.customerFeedback ? (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Customer Requested Changes ⚠️</p>
                <p className="text-amber-800 italic mt-0.5">"{job.customerFeedback}"</p>
                <p className="text-amber-700 text-[11px] mt-1 font-semibold">
                  Upload an updated design proof below to resolve client feedback.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Status: <strong>Awaiting Proof Approval</strong></span>
              </div>
              <button
                onClick={handleMoveToProofApproval}
                disabled={isPending || job.status === "PROOF_APPROVAL"}
                className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-[11px] font-bold transition-all"
              >
                {job.status === "PROOF_APPROVAL" ? "In Proof Stage" : "Set Stage to Proof Approval"}
              </button>
            </div>
          )}

          {/* Quick Tracking Link & WhatsApp Action */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Public Customer Tracking URL
              </span>
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono font-bold text-slate-800 hover:text-lime-700 flex items-center gap-1 truncate max-w-sm"
              >
                <span>{trackingUrl}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>

            <button
              onClick={handleSendWhatsApp}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all shrink-0"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Share on WhatsApp</span>
            </button>
          </div>

          {/* Upload New Proof File Box */}
          <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-slate-200 hover:border-lime-400 transition-colors text-center space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
              className="hidden"
              id="proof-upload-input"
            />
            <label
              htmlFor="proof-upload-input"
              className="cursor-pointer block space-y-1.5"
            >
              <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto group-hover:bg-lime-100 group-hover:text-slate-900 transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                {isUploading ? "Uploading Proof..." : "Click to Upload Design Proof (PNG, JPG, PDF)"}
              </p>
              <p className="text-[11px] text-slate-400">
                Max 25MB • Automatically generates customer review card
              </p>
            </label>
          </div>

          {/* Or Paste Image URL */}
          <form onSubmit={handleAddUrl} className="flex gap-2 text-xs">
            <div className="relative flex-1">
              <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Or paste an image / Canva / Google Drive direct URL..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>
            <button
              type="submit"
              disabled={isAddingUrl || !urlInput.trim()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all"
            >
              {isAddingUrl ? "Adding..." : "Attach"}
            </button>
          </form>

          {/* List of Attachments */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Attached Proofs & Files ({attachments.length})</span>
              {loading && <span className="text-[10px] text-slate-400 font-normal">Refreshing...</span>}
            </h4>

            {attachments.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                No proofs uploaded yet. Upload a proof above to let the client inspect & sign off.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {att.fileType.includes("image") ? (
                        <img
                          src={att.fileUrl}
                          alt={att.fileName}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                          {att.fileName}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {att.isProof ? "Artwork Proof" : "Attachment"} • {formatDate(att.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                        title="View Full Size"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDelete(att.id, att.fileName)}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                        title="Delete Attachment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Order #{job.jobOrderNumber} • {job.customerName}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

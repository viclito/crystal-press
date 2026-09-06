"use client";

import React, { useState, useTransition, useRef } from "react";
import {
  MessageSquare,
  Send,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Smartphone,
  Users,
  CheckCircle2,
  Filter,
  Search,
  ExternalLink,
  Clock,
  ArrowRight,
  FileText,
  AlertCircle,
  Printer,
  PackageCheck,
  Truck,
  Receipt,
  Palette,
  CreditCard,
  Layers,
  Save,
  Phone,
  HelpCircle,
} from "lucide-react";
import {
  WhatsAppTemplate,
  WhatsAppTemplateKey,
  renderWhatsAppTemplate,
  createWhatsAppUrl,
  DEFAULT_WHATSAPP_TEMPLATES,
} from "@/lib/whatsapp-templates";
import {
  updateWhatsAppTemplateAction,
  resetWhatsAppTemplateAction,
  getBatchWhatsAppQueueAction,
  BatchRecipientItem,
} from "@/actions/whatsapp";
import { StatCard } from "@/components/ui/StatCard";
import { toast } from "@/stores/useSnackbarStore";
import { modal } from "@/stores/useDialogStore";

interface WhatsAppHubClientProps {
  initialTemplates: WhatsAppTemplate[];
  shopSettings: {
    shopName: string;
    phone1: string;
    addressLine1: string;
    upiId: string;
  };
}

export function WhatsAppHubClient({
  initialTemplates,
  shopSettings,
}: WhatsAppHubClientProps) {
  const [activeTab, setActiveTab] = useState<"STUDIO" | "BATCH">("STUDIO");
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(initialTemplates);
  const [selectedKey, setSelectedKey] = useState<WhatsAppTemplateKey>("PROOF_APPROVAL");

  // Selected template editor state
  const selectedTemplate =
    templates.find((t) => t.key === selectedKey) || templates[0];
  const [editorText, setEditorText] = useState<string>(
    selectedTemplate.customMessage || selectedTemplate.defaultMessage
  );
  const [copiedText, setCopiedText] = useState(false);
  const [useSampleData, setUseSampleData] = useState(true);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPending, startTransition] = useTransition();

  // Batch Messaging State
  const [batchType, setBatchType] = useState<"OVERDUE_UDHAAR" | "READY_FOR_PICKUP">("OVERDUE_UDHAAR");
  const [batchRecipients, setBatchRecipients] = useState<BatchRecipientItem[]>([]);
  const [batchTotalAmount, setBatchTotalAmount] = useState(0);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchSearch, setBatchSearch] = useState("");
  const [dispatchedIds, setDispatchedIds] = useState<Set<string>>(new Set());

  // Handle selecting a template
  const handleSelectTemplate = (key: WhatsAppTemplateKey) => {
    setSelectedKey(key);
    const tmpl = templates.find((t) => t.key === key);
    if (tmpl) {
      setEditorText(tmpl.customMessage || tmpl.defaultMessage);
    }
  };

  // Insert token at cursor position
  const handleInsertToken = (token: string) => {
    if (!textareaRef.current) {
      setEditorText((prev) => prev + " " + token);
      return;
    }

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;

    const updated = currentVal.substring(0, start) + token + currentVal.substring(end);
    setEditorText(updated);

    // Reposition cursor after the inserted token
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 10);
  };

  // Save template customization
  const handleSaveTemplate = () => {
    startTransition(async () => {
      const res = await updateWhatsAppTemplateAction(selectedKey, editorText);
      if (res.success) {
        setTemplates((prev) =>
          prev.map((t) =>
            t.key === selectedKey ? { ...t, customMessage: editorText } : t
          )
        );
        toast.success(
          `Template "${selectedTemplate.name}" saved successfully!`,
          "Template Saved"
        );
      } else {
        toast.error(res.error || "Failed to save template", "Save Failed");
      }
    });
  };

  // Reset template to default
  const handleResetTemplate = async () => {
    const confirmed = await modal.confirm({
      title: "Reset Template to Default?",
      message: `Are you sure you want to reset "${selectedTemplate.name}" back to the factory standard text? Any customizations will be cleared.`,
      confirmText: "Reset to Default",
      cancelText: "Keep Changes",
      type: "danger",
    });

    if (!confirmed) return;

    startTransition(async () => {
      const res = await resetWhatsAppTemplateAction(selectedKey);
      if (res.success) {
        const defText = selectedTemplate.defaultMessage;
        setEditorText(defText);
        setTemplates((prev) =>
          prev.map((t) =>
            t.key === selectedKey ? { ...t, customMessage: defText } : t
          )
        );
        toast.success("Template reset to factory default", "Reset Completed");
      } else {
        toast.error(res.error || "Failed to reset template", "Reset Failed");
      }
    });
  };

  // Copy raw template
  const handleCopyRaw = () => {
    navigator.clipboard.writeText(editorText);
    setCopiedText(true);
    toast.success("Template text copied to clipboard", "Copied");
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Sample data generator for live preview
  const sampleTokens: Record<string, string> = {
    CUSTOMER_NAME: "Rajesh Sharma",
    CUSTOMER_PHONE: "+91 98230 11223",
    ORDER_NUMBER: "JO-2026-0042",
    JOB_TYPE: "Visiting Cards (350 GSM Velvet Touch)",
    QUANTITY: "1,000",
    UNIT: "pcs",
    TOTAL_AMOUNT: "2,500.00",
    ADVANCE_PAID: "1,000.00",
    BALANCE_DUE: "1,500.00",
    DUE_DATE: "10/09/2026",
    TRACK_LINK: "http://localhost:3000/track/JO-2026-0042",
    SHOP_NAME: shopSettings.shopName,
    SHOP_PHONE: shopSettings.phone1,
    SHOP_ADDRESS: shopSettings.addressLine1,
    UPI_ID: shopSettings.upiId,
    INVOICE_NUMBER: "CP-2026-0248",
    ITEM_COUNT: "3",
    PAYMENT_METHOD: "UPI / GPay",
    QUOTATION_NUMBER: "QT-2026-0089",
    VALID_UNTIL: "15/09/2026",
    CHALLAN_NUMBER: "DC-2026-0034",
    VEHICLE_NO: "MH 12 AB 4589 (Ramesh)",
  };

  const previewRenderedMessage = useSampleData
    ? renderWhatsAppTemplate(editorText, sampleTokens)
    : editorText;

  // Send test message
  const handleSendTestMessage = () => {
    const url = createWhatsAppUrl(testPhoneNumber || "919876543210", previewRenderedMessage);
    window.open(url, "_blank");
    toast.success("WhatsApp opened with preview message", "Test Dispatched");
  };

  // Load Batch Queue
  const loadBatchQueue = async (type: "OVERDUE_UDHAAR" | "READY_FOR_PICKUP") => {
    setBatchLoading(true);
    setBatchType(type);
    try {
      const res = await getBatchWhatsAppQueueAction(type);
      if (res.success) {
        setBatchRecipients(res.recipients);
        setBatchTotalAmount(res.totalAmount);
      } else {
        toast.error(res.error || "Failed to load batch queue", "Queue Error");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load batch recipients", "Error");
    } finally {
      setBatchLoading(false);
    }
  };

  // Trigger batch queue load when switching to batch tab
  const handleSwitchTab = (tab: "STUDIO" | "BATCH") => {
    setActiveTab(tab);
    if (tab === "BATCH" && batchRecipients.length === 0) {
      loadBatchQueue(batchType);
    }
  };

  // Mark recipient as dispatched
  const handleDispatchRecipient = (item: BatchRecipientItem) => {
    window.open(item.whatsappUrl, "_blank");
    setDispatchedIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
    toast.success(`WhatsApp message triggered for ${item.title}`, "Dispatched");
  };

  // Categories list
  const categories = [
    "ALL",
    "Production & Jobs",
    "Retail & Billing",
    "Credit & Recovery",
    "Quotations & Dispatch",
  ];

  const filteredTemplates =
    selectedCategory === "ALL"
      ? templates
      : templates.filter((t) => t.category === selectedCategory);

  // Filtered batch recipients
  const filteredBatch = batchRecipients.filter((item) => {
    if (!batchSearch.trim()) return true;
    const q = batchSearch.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.phone.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q)
    );
  });

  const isCustomized =
    Boolean(selectedTemplate.customMessage) &&
    selectedTemplate.customMessage !== selectedTemplate.defaultMessage;

  return (
    <div className="space-y-6">
      {/* Header & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                WhatsApp Notification Hub
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                wa.me Direct
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Customize shop templates with dynamic variables & run 1-click batch messaging
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/70 shrink-0">
          <button
            onClick={() => handleSwitchTab("STUDIO")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "STUDIO"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-emerald-600" />
            <span>Template Studio</span>
          </button>
          <button
            onClick={() => handleSwitchTab("BATCH")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "BATCH"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>1-Click Batch Queue</span>
            {dispatchedIds.size > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {dispatchedIds.size}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: TEMPLATE STUDIO */}
      {activeTab === "STUDIO" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Template Selector (3 Cols) */}
          <div className="lg:col-span-3 space-y-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Templates ({templates.length})
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Select to edit</span>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      selectedCategory === cat
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat === "ALL" ? "All" : cat.split(" ")[0]}
                  </button>
                ))}
              </div>

              {/* Template List */}
              <div className="space-y-1.5 max-h-[560px] overflow-y-auto custom-scrollbar pr-1">
                {filteredTemplates.map((item) => {
                  const isSelected = item.key === selectedKey;
                  const itemIsCustomized =
                    Boolean(item.customMessage) &&
                    item.customMessage !== item.defaultMessage;

                  return (
                    <button
                      key={item.key}
                      onClick={() => handleSelectTemplate(item.key)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-emerald-50/80 border-emerald-300 shadow-xs text-slate-900"
                          : "bg-white border-slate-200/70 hover:border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="text-xs font-bold leading-tight truncate">
                          {item.name}
                        </span>
                        {itemIsCustomized && (
                          <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shop Quick Context Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Shop Branding Tokens</span>
              </div>
              <div className="space-y-1 font-mono text-[11px] text-slate-500">
                <div className="flex justify-between">
                  <span className="text-slate-400">Shop:</span>
                  <span className="font-semibold text-slate-700">{shopSettings.shopName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-semibold text-slate-700">{shopSettings.phone1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">UPI ID:</span>
                  <span className="font-semibold text-slate-700">{shopSettings.upiId}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 pt-1">
                Edit shop details anytime under <strong>Settings</strong> to update branding across all messages.
              </p>
            </div>
          </div>

          {/* Middle Column: Template Editor (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              {/* Template Title & Details */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-slate-900">
                      {selectedTemplate.name}
                    </h2>
                    {isCustomized ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Customized
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedTemplate.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Copy raw template text"
                >
                  {copiedText ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Dynamic Tokens Quick Chips */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Available Dynamic Tokens</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    Click to insert at cursor
                  </span>
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-2 bg-slate-50 rounded-xl border border-slate-200/60">
                  {selectedTemplate.availableTokens.map((t) => (
                    <button
                      key={t.token}
                      type="button"
                      onClick={() => handleInsertToken(t.token)}
                      className="group flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200/80 hover:border-emerald-400 hover:bg-emerald-50 text-[11px] font-medium text-slate-700 transition-all shadow-2xs"
                      title={`Example: ${t.example}`}
                    >
                      <span className="text-emerald-600 font-bold group-hover:scale-110 transition-transform">
                        +
                      </span>
                      <span className="font-mono font-semibold">{t.token}</span>
                      <span className="text-[10px] text-slate-400 hidden group-hover:inline">
                        ({t.label})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Message Template
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {editorText.length} characters
                  </span>
                </div>

                <textarea
                  ref={textareaRef}
                  value={editorText}
                  onChange={(e) => setEditorText(e.target.value)}
                  rows={13}
                  className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50 hover:bg-white transition-all custom-scrollbar resize-y"
                  placeholder="Enter message text with tokens like {CUSTOMER_NAME}..."
                />
              </div>

              {/* Bottom Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetTemplate}
                  disabled={isPending || !isCustomized}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isCustomized
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      : "bg-slate-50 text-slate-300 cursor-not-allowed"
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Default</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isPending ? "Saving..." : "Save Template"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Realistic WhatsApp Phone Mockup (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Phone Mockup Frame */}
            <div className="bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl border-4 border-slate-800 relative mx-auto max-w-[340px]">
              {/* Speaker / Camera Notch */}
              <div className="w-24 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-700" />
              </div>

              {/* WhatsApp App Screen Container */}
              <div className="bg-[#EFEAE2] rounded-3xl overflow-hidden flex flex-col h-[560px] border border-slate-700">
                {/* WhatsApp Top Header Bar */}
                <div className="bg-[#075E54] text-white px-3 py-2.5 flex items-center justify-between shadow-md shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-emerald-200 text-[#075E54] flex items-center justify-center font-bold text-xs shrink-0">
                      CP
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold leading-tight truncate">
                        {shopSettings.shopName}
                      </div>
                      <div className="text-[10px] text-emerald-200/90 leading-none">
                        online
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-white/80">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* WhatsApp Chat Area */}
                <div className="flex-1 p-3 overflow-y-auto custom-scrollbar flex flex-col justify-start space-y-2">
                  {/* Encrypted Security Notice */}
                  <div className="bg-[#FFEECD] text-[#54656F] text-[10px] rounded-lg p-2 text-center shadow-2xs leading-snug border border-[#F2DEB5]">
                    🔒 Messages and calls are end-to-end encrypted. No one outside of this chat can read or listen.
                  </div>

                  {/* Date Pill */}
                  <div className="text-center">
                    <span className="bg-white/80 text-[#54656F] text-[10px] px-2.5 py-0.5 rounded-md shadow-2xs font-semibold">
                      TODAY
                    </span>
                  </div>

                  {/* Outgoing Message Bubble (Right-aligned green bubble) */}
                  <div className="self-end max-w-[92%] bg-[#D9FDD3] text-slate-900 rounded-xl rounded-tr-none p-2.5 shadow-2xs text-xs whitespace-pre-wrap leading-relaxed font-sans relative border border-[#C2ECC0]">
                    {previewRenderedMessage}

                    {/* Timestamp & Double Checkmark */}
                    <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 font-mono mt-1 select-none">
                      <span>10:45 AM</span>
                      <span className="text-sky-500 font-bold">✓✓</span>
                    </div>
                  </div>
                </div>

                {/* Bottom WhatsApp Input Bar Mock */}
                <div className="bg-[#F0F2F5] px-2.5 py-2 flex items-center gap-2 border-t border-slate-200/60 shrink-0">
                  <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-[11px] text-slate-400 shadow-2xs truncate">
                    Type a message...
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#00A884] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Send className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>

            {/* Mockup Options & Test Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Preview Controls</span>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSampleData}
                    onChange={(e) => setUseSampleData(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                  />
                  <span>Render Sample Data</span>
                </label>
              </div>

              {/* Test WhatsApp Number */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <label className="text-[11px] font-semibold text-slate-500 block">
                  Test Send to WhatsApp Number
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="tel"
                    placeholder="9876543210 (10-digit)"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleSendTestMessage}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors shrink-0"
                  >
                    <Send className="w-3 h-3" />
                    <span>Test</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 1-CLICK BATCH QUEUE */}
      {activeTab === "BATCH" && (
        <div className="space-y-6">
          {/* Sub-Header & Batch Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => loadBatchQueue("OVERDUE_UDHAAR")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  batchType === "OVERDUE_UDHAAR"
                    ? "bg-rose-50 text-rose-800 border border-rose-200 shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Overdue Udhaar Debtors</span>
              </button>

              <button
                onClick={() => loadBatchQueue("READY_FOR_PICKUP")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  batchType === "READY_FOR_PICKUP"
                    ? "bg-purple-50 text-purple-800 border border-purple-200 shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <PackageCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>Ready for Pickup Jobs</span>
              </button>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search recipient or phone..."
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Metric Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Eligible in Queue"
              value={batchRecipients.length}
              subtitle={batchType === "OVERDUE_UDHAAR" ? "Customers with debt > ₹0" : "Jobs ready at counter"}
              icon={<Users className="w-5 h-5 text-emerald-700" />}
              iconBg="bg-emerald-50 text-emerald-800 border border-emerald-200/60"
            />
            <StatCard
              title={batchType === "OVERDUE_UDHAAR" ? "Total Recoverable Balance" : "Total Pending Balance"}
              value={`₹${batchTotalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
              subtitle="Across all queued recipients"
              icon={<CreditCard className="w-5 h-5 text-emerald-700" />}
              iconBg="bg-emerald-50 text-emerald-800 border border-emerald-200/60"
            />
            <StatCard
              title="Dispatched (This Session)"
              value={dispatchedIds.size}
              subtitle={`${Math.max(0, batchRecipients.length - dispatchedIds.size)} remaining`}
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-700" />}
              iconBg="bg-emerald-50 text-emerald-800 border border-emerald-200/60"
            />
          </div>

          {/* Recipient Queue Table / Cards */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {batchType === "OVERDUE_UDHAAR"
                    ? "Udhaar Payment Due Messaging Queue"
                    : "Order Ready Pickup Notification Queue"}
                </h3>
                <p className="text-xs text-slate-400">
                  Clicking "Send WhatsApp" opens WhatsApp with the pre-filled customized message and marks contact as dispatched.
                </p>
              </div>

              {dispatchedIds.size > 0 && (
                <button
                  onClick={() => setDispatchedIds(new Set())}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline"
                >
                  Reset Dispatched Status
                </button>
              )}
            </div>

            {batchLoading ? (
              <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                Loading recipients from database...
              </div>
            ) : filteredBatch.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                {batchRecipients.length === 0
                  ? "No recipients eligible for this batch queue right now! Everything is up to date."
                  : "No recipients match your search filter."}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredBatch.map((item, idx) => {
                  const isSent = dispatchedIds.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`p-4 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        isSent ? "bg-emerald-50/40" : "hover:bg-slate-50/80"
                      }`}
                    >
                      {/* Left Details */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSent
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {isSent ? <Check className="w-4 h-4" /> : idx + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {item.title}
                            </h4>
                            {isSent ? (
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Dispatched
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-800">
                                Pending
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span className="font-mono text-slate-700 font-semibold">
                              📞 +91 {item.phone}
                            </span>
                            <span>•</span>
                            <span className="text-slate-600">{item.subtitle}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action */}
                      <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end shrink-0">
                        <div className="text-right mr-2">
                          <div className="text-xs font-black text-slate-900">
                            ₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {batchType === "OVERDUE_UDHAAR" ? "Udhaar Due" : "Balance Due"}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDispatchRecipient(item)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                            isSent
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-xs"
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSent ? "Resend Message" : "Send WhatsApp"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

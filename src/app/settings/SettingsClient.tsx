"use client";

import React, { useState } from "react";
import { Save, Store, QrCode, Shield, Download, UserPlus, Edit3, CheckCircle2, User, KeyRound, Sparkles, Star, Coins, Percent, FolderTree, List, Smartphone, Menu } from "lucide-react";
import { updateShopSettings } from "@/actions/settings";
import { UserFormModal } from "@/components/settings/UserFormModal";
import { formatDate, cn } from "@/lib/utils";
import { modal } from "@/stores/useDialogStore";
import { toast } from "@/stores/useSnackbarStore";
import { useSidebarStore } from "@/stores/useSidebarStore";

interface SettingsClientProps {
  initialSettings: any;
  users: any[];
  auditLogs: any[];
}

export function SettingsClient({ initialSettings, users = [], auditLogs = [] }: SettingsClientProps) {
  const [shopName, setShopName] = useState(initialSettings?.shopName || "Crystal Press");
  const [tagline, setTagline] = useState(initialSettings?.tagline || "Printing Press & Stationery");
  const [addressLine1, setAddressLine1] = useState(initialSettings?.addressLine1 || "");
  const [phone1, setPhone1] = useState(initialSettings?.phone1 || "");
  const [upiId, setUpiId] = useState(initialSettings?.upiId || "");
  const [invoicePrefix, setInvoicePrefix] = useState(initialSettings?.invoicePrefix || "CP");
  const [jobOrderPrefix, setJobOrderPrefix] = useState(initialSettings?.jobOrderPrefix || "JO");
  const [receiptFooter, setReceiptFooter] = useState(initialSettings?.receiptFooter || "");
  const [isTaxEnabled, setIsTaxEnabled] = useState(initialSettings?.isTaxEnabled || false);
  const [defaultTaxRate, setDefaultTaxRate] = useState(Number(initialSettings?.defaultTaxRate) || 0);

  // Loyalty Points & Store Credit Settings
  const [isLoyaltyEnabled, setIsLoyaltyEnabled] = useState(
    initialSettings?.isLoyaltyEnabled ?? true
  );
  const [loyaltyDiscountType, setLoyaltyDiscountType] = useState<"RUPEES" | "PERCENT">(
    initialSettings?.loyaltyDiscountType || "RUPEES"
  );
  const [loyaltySpendPerPoint, setLoyaltySpendPerPoint] = useState(
    Number(initialSettings?.loyaltySpendPerPoint ?? 100)
  );
  const [loyaltyPointValue, setLoyaltyPointValue] = useState(
    Number(initialSettings?.loyaltyPointValue ?? 1)
  );
  const [maxLoyaltyDiscountPercent, setMaxLoyaltyDiscountPercent] = useState(
    Number(initialSettings?.maxLoyaltyDiscountPercent ?? 50)
  );

  const { layout, setLayout, mobileNavStyle, setMobileNavStyle } = useSidebarStore();

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // User management modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    const res = await updateShopSettings({
      shopName,
      tagline,
      addressLine1,
      phone1,
      upiId,
      invoicePrefix,
      jobOrderPrefix,
      receiptFooter,
      isTaxEnabled,
      defaultTaxRate: Number(defaultTaxRate),
      isLoyaltyEnabled,
      loyaltySpendPerPoint: Number(loyaltySpendPerPoint),
      loyaltyPointValue: Number(loyaltyPointValue),
      maxLoyaltyDiscountPercent: Number(maxLoyaltyDiscountPercent),
      loyaltyDiscountType,
    });

    setIsSaving(false);
    if (res.success) {
      setSavedSuccess(true);
      toast.success("Shop settings & invoice template saved", "Settings Saved");
      setTimeout(() => setSavedSuccess(false), 3000);
    } else {
      modal.error((res as any).error || "Failed to save settings");
    }
  };

  const handleExportData = () => {
    const jsonStr = JSON.stringify({ shopName, users: users.map(u => ({ username: u.username, role: u.role })), exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crystal-press-backup-${Date.now()}.json`;
    a.click();
    toast.info("System configuration backup downloaded", "Backup Exported");
  };

  return (
    <div className="space-y-6">
      {/* 1. Shop Branding & Details Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-[0_2px_14px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Store className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">Shop Profile & Bill Letterhead</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Business / Shop Name *</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Tagline / Sub-heading</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Store Address</label>
              <input
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Primary Phone</label>
              <input
                type="tel"
                value={phone1}
                onChange={(e) => setPhone1(e.target.value)}
                className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Payment QR & Invoicing Config */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-[0_2px_14px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <QrCode className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">UPI Payment QR & Bill Templates</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Shop UPI VPA ID (For Instant QR Code)</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. crystalpress@okaxis"
                className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Invoice Number Prefix</label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Job Order Prefix</label>
              <input
                type="text"
                value={jobOrderPrefix}
                onChange={(e) => setJobOrderPrefix(e.target.value)}
                className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Receipt Footer Message</label>
            <input
              type="text"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="e.g. Thank you for visiting Crystal Press!"
              className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
            />
          </div>

          {/* Optional Tax / GST Toggle */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900">Optional Flat Tax (%)</span>
              <p className="text-[11px] text-slate-400">Keep disabled if not registered for GST</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="28"
                disabled={!isTaxEnabled}
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-right"
              />
              <button
                type="button"
                onClick={() => setIsTaxEnabled(!isTaxEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  isTaxEnabled ? "bg-lime-500" : "bg-slate-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    isTaxEnabled ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 2. Loyalty Program & Store Credit Discount Rules */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-[0_2px_14px_rgba(0,0,0,0.02)] space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Star className="w-5 h-5 fill-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Customer Loyalty Points & Store Credit Rules</h3>
                <p className="text-xs text-slate-400">Configure spend-to-point accrual and admin discount mode (Rupees vs Percentage)</p>
              </div>
            </div>

            {/* Master Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">
                {isLoyaltyEnabled ? "Enabled" : "Disabled"}
              </span>
              <button
                type="button"
                onClick={() => setIsLoyaltyEnabled(!isLoyaltyEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  isLoyaltyEnabled ? "bg-amber-500" : "bg-slate-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    isLoyaltyEnabled ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Discount Mode Selector (Rupees vs Percentage) */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                Redemption Discount Mode (Admin Configurable) *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLoyaltyDiscountType("RUPEES")}
                  className={cn(
                    "p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3",
                    loyaltyDiscountType === "RUPEES"
                      ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/30 shadow-xs"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-sm",
                      loyaltyDiscountType === "RUPEES"
                        ? "bg-amber-500 text-white"
                        : "bg-slate-200 text-slate-600"
                    )}
                  >
                    ₹
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Rupees (₹) Discount</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Each point redeemed deducts a flat Rupee amount (e.g. 1 point = ₹1.00)
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setLoyaltyDiscountType("PERCENT")}
                  className={cn(
                    "p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3",
                    loyaltyDiscountType === "PERCENT"
                      ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/30 shadow-xs"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-sm",
                      loyaltyDiscountType === "PERCENT"
                        ? "bg-amber-500 text-white"
                        : "bg-slate-200 text-slate-600"
                    )}
                  >
                    %
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Percentage (%) Discount</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Points convert to a percentage discount on the bill subtotal (e.g. 1 point = 1%)
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Inputs: Spend per point, Point value, Max cap */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-700 block">
                  Spend Required per Point (₹) *
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={loyaltySpendPerPoint}
                    onChange={(e) => setLoyaltySpendPerPoint(Number(e.target.value))}
                    className="w-full pl-7 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Customer spends ₹{loyaltySpendPerPoint} to earn 1 point</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block">
                  {loyaltyDiscountType === "PERCENT"
                    ? "Discount % per Point *"
                    : "Redemption Value per Point (₹) *"}
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {loyaltyDiscountType === "PERCENT" ? "%" : "₹"}
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={loyaltyPointValue}
                    onChange={(e) => setLoyaltyPointValue(Number(e.target.value))}
                    className="w-full pl-7 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {loyaltyDiscountType === "PERCENT"
                    ? `1 point = ${loyaltyPointValue}% bill discount`
                    : `1 point = ₹${loyaltyPointValue} bill discount`}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block">
                  Max Loyalty Discount Cap (%) *
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    %
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={maxLoyaltyDiscountPercent}
                    onChange={(e) => setMaxLoyaltyDiscountPercent(Number(e.target.value))}
                    className="w-full pl-7 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Max discount capped at {maxLoyaltyDiscountPercent}% of bill subtotal</p>
              </div>
            </div>

            {/* Live Example Box */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-2xl text-xs text-amber-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Live Example:</strong> A bill of ₹1,000 earns{" "}
                <strong>{Math.floor(1000 / (loyaltySpendPerPoint || 1))} points</strong>. When redeeming 10 points, the customer receives{" "}
                <strong>
                  {loyaltyDiscountType === "PERCENT"
                    ? `${(10 * loyaltyPointValue).toFixed(1)}% (₹${((1000 * 10 * loyaltyPointValue) / 100).toFixed(2)})`
                    : `₹${(10 * loyaltyPointValue).toFixed(2)}`}
                </strong>{" "}
                discount (capped at max {maxLoyaltyDiscountPercent}%).
              </span>
            </div>
          </div>
        </div>

        {/* Save Button Bar */}
        <div className="flex items-center justify-end gap-3">
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Settings updated successfully
            </span>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-extrabold text-xs hover:bg-slate-800 shadow-md flex items-center gap-2 active:scale-98"
          >
            <Save className="w-4 h-4 text-lime-400" />
            <span>{isSaving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </form>

      {/* 2. Sidebar Navigation Layout Preference (Admin Choice) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-[0_2px_14px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-lime-100 text-lime-800 flex items-center justify-center">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sidebar Navigation Layout</h3>
              <p className="text-xs text-slate-400">Choose how menu items are organized in the left sidebar</p>
            </div>
          </div>

          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
            Active: {layout === "tree" ? "Organized Tree Structure" : "Classic Flat List"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Tree View */}
          <div
            onClick={() => {
              setLayout("tree");
              toast.success("Sidebar switched to Organized Tree Structure", "Layout Changed");
            }}
            className={cn(
              "p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3",
              layout === "tree"
                ? "border-lime-500 bg-lime-50/50 shadow-xs ring-2 ring-lime-400/20"
                : "border-slate-200 hover:border-slate-300 bg-white"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={cn("p-2 rounded-xl", layout === "tree" ? "bg-lime-200 text-slate-900" : "bg-slate-100 text-slate-500")}>
                  <FolderTree className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Organized Categorized Tree</h4>
                  <span className="text-[10px] font-semibold text-lime-700 bg-lime-100 px-1.5 py-0.5 rounded">Recommended</span>
                </div>
              </div>
              <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", layout === "tree" ? "border-lime-600 bg-lime-600" : "border-slate-300")}>
                {layout === "tree" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Groups all 17 navigation tools into 5 structured modules (Counter, Print Hub, Stock, Parties, Admin) with collapsible tree branches and category indicators.
            </p>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-[10px] text-slate-400 font-mono">
              <div className="text-slate-500 font-bold">▼ COUNTER & OPERATIONS (3)</div>
              <div className="pl-3 text-slate-700 font-bold">• POS Counter (F8)</div>
              <div className="text-slate-400">▶ PRINT & ORDER HUB (6)</div>
            </div>
          </div>

          {/* Option 2: Classic Flat List */}
          <div
            onClick={() => {
              setLayout("classic");
              toast.success("Sidebar switched to Classic Flat List", "Layout Changed");
            }}
            className={cn(
              "p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3",
              layout === "classic"
                ? "border-lime-500 bg-lime-50/50 shadow-xs ring-2 ring-lime-400/20"
                : "border-slate-200 hover:border-slate-300 bg-white"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={cn("p-2 rounded-xl", layout === "classic" ? "bg-lime-200 text-slate-900" : "bg-slate-100 text-slate-500")}>
                  <List className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Classic Flat List</h4>
                  <span className="text-[10px] text-slate-400 font-medium">Original linear order</span>
                </div>
              </div>
              <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", layout === "classic" ? "border-lime-600 bg-lime-600" : "border-slate-300")}>
                {layout === "classic" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Keeps all navigation items in a single sequential list without category headers or accordion grouping, preserving the original layout.
            </p>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-[10px] text-slate-600 font-mono">
              <div>• Dashboard</div>
              <div>• POS Counter (F8)</div>
              <div>• Cash Drawer & Shifts (F10)</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Mobile Navigation Mode Preference (Admin & Manager Choice) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-[0_2px_14px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Mobile Navigation System</h3>
              <p className="text-xs text-slate-400">Choose between Down Side Navbar (Bottom Bar) or Drawer Sheet on phone screens</p>
            </div>
          </div>

          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
            Active: {mobileNavStyle === "bottom_bar" ? "Down Side Navbar" : "Slide Drawer"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Down Side Navbar */}
          <div
            onClick={() => {
              setMobileNavStyle("bottom_bar");
              toast.success("Mobile navigation switched to Down Side Navbar", "Mobile Nav Changed");
            }}
            className={cn(
              "p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3",
              mobileNavStyle === "bottom_bar"
                ? "border-sky-500 bg-sky-50/50 shadow-xs ring-2 ring-sky-400/20"
                : "border-slate-200 hover:border-slate-300 bg-white"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={cn("p-2 rounded-xl", mobileNavStyle === "bottom_bar" ? "bg-sky-200 text-slate-900" : "bg-slate-100 text-slate-500")}>
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Down Side Navbar (Bottom Bar)</h4>
                  <span className="text-[10px] font-semibold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">Recommended</span>
                </div>
              </div>
              <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", mobileNavStyle === "bottom_bar" ? "border-sky-600 bg-sky-600" : "border-slate-300")}>
                {mobileNavStyle === "bottom_bar" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Native app-style floating bar docked at the bottom of the phone screen. Thumb-reachable buttons for Instant POS, Jobs, Customers, Shifts, and a quick &quot;More&quot; sheet for remaining tools.
            </p>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-around text-[10px] text-slate-500 font-bold">
              <span className="text-sky-600">⚡ POS</span>
              <span>📦 Jobs</span>
              <span>👥 Customers</span>
              <span>⋯ More</span>
            </div>
          </div>

          {/* Option 2: Slide Drawer Navigation */}
          <div
            onClick={() => {
              setMobileNavStyle("drawer");
              toast.success("Mobile navigation switched to Slide-Over Drawer Sheet", "Mobile Nav Changed");
            }}
            className={cn(
              "p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3",
              mobileNavStyle === "drawer"
                ? "border-sky-500 bg-sky-50/50 shadow-xs ring-2 ring-sky-400/20"
                : "border-slate-200 hover:border-slate-300 bg-white"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={cn("p-2 rounded-xl", mobileNavStyle === "drawer" ? "bg-sky-200 text-slate-900" : "bg-slate-100 text-slate-500")}>
                  <Menu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Header Slide-Over Drawer</h4>
                  <span className="text-[10px] text-slate-400 font-medium">Classic menu drawer</span>
                </div>
              </div>
              <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", mobileNavStyle === "drawer" ? "border-sky-600 bg-sky-600" : "border-slate-300")}>
                {mobileNavStyle === "drawer" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Taps open a full-height slide-over drawer from the left header hamburger icon, displaying all modules, shortcuts, and shop status with an overlay backdrop.
            </p>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-600 font-mono">
              ☰ Hamburger Icon → Slide Drawer Sheet
            </div>
          </div>
        </div>
      </div>

      {/* 4. Staff Accounts & Handover Management */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-slate-200/60">
        {/* Left 7 Cols: Staff Accounts Master */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Staff Accounts & Permissions</h3>
                <p className="text-xs text-slate-400">Manage cashier, manager, and owner credentials</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedUser(null);
                setIsUserModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-sm flex items-center gap-1.5 active:scale-98"
            >
              <UserPlus className="w-3.5 h-3.5 text-lime-400" />
              <span>+ Add User</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {users.map((u) => {
              const isAdmin = u.role === "ADMIN";
              const isManager = u.role === "MANAGER";
              const isCashier = u.role === "CASHIER";

              return (
                <div
                  key={u.id}
                  className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-100/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isAdmin
                          ? "bg-purple-100 text-purple-900"
                          : isManager
                          ? "bg-sky-100 text-sky-900"
                          : "bg-lime-100 text-lime-900"
                      }`}
                    >
                      {isAdmin ? "👑" : isManager ? "👔" : "🧾"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{u.fullName}</span>
                        {!u.isActive && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Username: <strong>{u.username}</strong></span>
                        <span>•</span>
                        <span>Created: {formatDate(u.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        isAdmin
                          ? "bg-purple-100 text-purple-800"
                          : isManager
                          ? "bg-sky-100 text-sky-800"
                          : "bg-lime-100 text-lime-800"
                      }`}
                    >
                      {u.role}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(u);
                        setIsUserModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-slate-200"
                      title="Edit Account / Reset Password"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Handover Guide & Data Export */}
        <div className="lg:col-span-5 space-y-6">
          {/* Owner Handover Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-lime-400">
              <Sparkles className="w-4 h-4" />
              <h3 className="text-sm font-bold tracking-tight">Client / Owner Handover Guide</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              When handing over this system to the shop owner:
            </p>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed bg-white/5 p-3.5 rounded-2xl border border-white/10">
              <li>
                <strong>Option A (Google OAuth)</strong>: Have the owner click <em>"Sign in with Google"</em> on the login screen. They will automatically be granted **Admin (Owner)** access.
              </li>
              <li>
                <strong>Option B (Custom Password)</strong>: Click <em>"+ Add User"</em> above, enter the owner's name, username, and password with role **Admin (Owner)**.
              </li>
              <li>
                Once the owner has verified their account, click <em>Edit</em> on the demo `admin` user to delete or change its password.
              </li>
            </ol>
          </div>

          {/* Backup Download Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.02)] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">Database Backup & Export</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Download a JSON archive of all product records, customer balances, and staff logs for safe offline storage.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportData}
              className="mt-4 w-full py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Download Store Data (.json)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Staff User Add / Edit Modal */}
      <UserFormModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setSelectedUser(null);
        }}
        userToEdit={selectedUser}
      />
    </div>
  );
}

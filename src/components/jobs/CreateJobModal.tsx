"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Settings2, CheckCircle2 } from "lucide-react";
import { createJobOrder } from "@/actions/jobs";
import { JobCategoryManagerModal, JobPreset } from "./JobCategoryManagerModal";
import { modal } from "@/stores/useDialogStore";
import { toast } from "@/stores/useSnackbarStore";
import { SearchableSelect, SearchableOption } from "@/components/ui/SearchableSelect";

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: any[];
}

const DEFAULT_JOB_PRESETS: JobPreset[] = [
  {
    name: "Visiting Cards (Matte/Gloss)",
    unit: "pcs",
    defaultQty: 1000,
    defaultPrice: 1500,
    specs: { size: "3.5 x 2.0 inches", paperType: "350 GSM Art Card", colors: "4+4 Both Sides", finishing: "Thermal Matte Lamination" },
  },
  {
    name: "Wedding / Invitation Cards",
    unit: "cards",
    defaultQty: 300,
    defaultPrice: 9000,
    specs: { size: "7 x 9 inches Tri-Fold", paperType: "280 GSM Metallic Sheet", colors: "Screen Print Gold Foil", finishing: "Die Cut Floral Pattern" },
  },
  {
    name: "Flex Banner / Vinyl Print",
    unit: "sq_ft",
    defaultQty: 48,
    defaultPrice: 1200,
    specs: { size: "8ft x 6ft", paperType: "Star Flex Backlit", colors: "Full Color Solvent", finishing: "Side Eyelets + Border Hemming" },
  },
  {
    name: "Doctor Prescription Pads",
    unit: "pads",
    defaultQty: 10,
    defaultPrice: 1200,
    specs: { size: "A5 (5.8 x 8.3 in)", paperType: "80 GSM Executive Bond", colors: "2+0 Single Side", finishing: "Top Padded 100 Sheets/Pad" },
  },
  {
    name: "Bill Books & Invoice Sets",
    unit: "books",
    defaultQty: 10,
    defaultPrice: 1800,
    specs: { size: "8.5 x 7.0 in", paperType: "Carbonless NCR Paper (1+2)", colors: "1+0 Offset Single Color", finishing: "Perforated & Numbered" },
  },
];

export function CreateJobModal({ isOpen, onClose, customers = [] }: CreateJobModalProps) {
  const [presets, setPresets] = useState<JobPreset[]>(DEFAULT_JOB_PRESETS);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [selectedPreset, setSelectedPreset] = useState(DEFAULT_JOB_PRESETS[0].name);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1000);
  const [unitName, setUnitName] = useState("pcs");
  const [totalAmount, setTotalAmount] = useState<number>(1500);
  const [advancePaid, setAdvancePaid] = useState<number>(500);
  const [expectedDate, setExpectedDate] = useState("");
  const [designNotes, setDesignNotes] = useState("");
  const [specs, setSpecs] = useState<Record<string, any>>(DEFAULT_JOB_PRESETS[0].specs);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load custom presets from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("crystalpress_job_presets");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPresets(parsed);
        }
      }
    } catch (e) {}
  }, []);

  const handleSavePresets = (newPresets: JobPreset[]) => {
    setPresets(newPresets);
    try {
      localStorage.setItem("crystalpress_job_presets", JSON.stringify(newPresets));
    } catch (e) {}
  };

  if (!isOpen) return null;

  const handlePresetSelect = (presetName: string) => {
    const found = presets.find((p) => p.name === presetName);
    if (found) {
      setSelectedPreset(found.name);
      setQuantity(found.defaultQty);
      setUnitName(found.unit);
      setTotalAmount(found.defaultPrice);
      setAdvancePaid(Math.round(found.defaultPrice * 0.4)); // 40% advance default
      setSpecs(found.specs);
    }
  };

  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    const found = customers.find((c) => c.id === custId);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone || "");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      modal.alert("Please enter the customer's name for this printing job order.", "Customer Name Required");
      return;
    }

    setIsSubmitting(true);
    const res = await createJobOrder({
      customerId: selectedCustomerId || undefined,
      customerName,
      customerPhone,
      jobType: selectedPreset,
      specifications: specs,
      quantity: Number(quantity),
      unitName,
      totalAmount: Number(totalAmount),
      advancePaid: Number(advancePaid),
      expectedDeliveryDate: expectedDate || undefined,
      designNotes,
    });

    setIsSubmitting(false);
    if (res.success) {
      toast.success(
        `Work order created for ${customerName} (${selectedPreset})`,
        "Job Order Placed"
      );
      onClose();
    } else {
      modal.error(res.error || "Failed to create job");
    }
  };

  const customerOptions: SearchableOption[] = customers.map((c) => ({
    value: c.id,
    label: c.name,
    subLabel: c.phone ? `+91 ${c.phone}` : "No phone",
    badge: "Customer",
  }));

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">New Custom Job Order</h3>
              <p className="text-xs text-slate-400">Record printing press work order with specs and token advance</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 my-4">
            {/* Preset Buttons Header with Manage Button */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Select Job Category / Preset</label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-xs font-bold text-lime-700 hover:text-lime-800 bg-lime-50 hover:bg-lime-100 px-2.5 py-1 rounded-xl flex items-center gap-1 transition-colors"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>+ Manage / Add Categories</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button
                    type="button"
                    key={p.name}
                    onClick={() => handlePresetSelect(p.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedPreset === p.name
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Pick Existing Customer</label>
                <SearchableSelect
                  options={customerOptions}
                  value={selectedCustomerId}
                  onChange={(val) => handleCustomerSelect(val)}
                  placeholder="-- Search or choose customer --"
                  searchPlaceholder="Type customer name, phone..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Apex Hospital / Rajesh"
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-lime-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">WhatsApp / Contact Phone</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-lime-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Expected Delivery Date</label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-lime-400"
                />
              </div>
            </div>

            {/* Technical Specs Customization */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <h4 className="text-xs font-bold text-slate-900">Technical Press Specifications</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Size</span>
                  <input
                    type="text"
                    value={specs.size || ""}
                    onChange={(e) => setSpecs({ ...specs, size: e.target.value })}
                    className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Paper / GSM</span>
                  <input
                    type="text"
                    value={specs.paperType || ""}
                    onChange={(e) => setSpecs({ ...specs, paperType: e.target.value })}
                    className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Colors</span>
                  <input
                    type="text"
                    value={specs.colors || ""}
                    onChange={(e) => setSpecs({ ...specs, colors: e.target.value })}
                    className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Finishing</span>
                  <input
                    type="text"
                    value={specs.finishing || ""}
                    onChange={(e) => setSpecs({ ...specs, finishing: e.target.value })}
                    className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Quantity & Financials */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Unit</label>
                <input
                  type="text"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Total Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Advance Token (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 bg-lime-50 border border-lime-300 rounded-xl text-xs font-bold text-lime-900"
                />
              </div>
            </div>

            {/* Design Notes */}
            <div>
              <label className="text-xs font-bold text-slate-700">Design Instructions & Notes</label>
              <textarea
                rows={2}
                value={designNotes}
                onChange={(e) => setDesignNotes(e.target.value)}
                placeholder="e.g. Logo file on WhatsApp, rounded corners, delivery urgent by 4 PM"
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-lime-400 focus:outline-none"
              />
            </div>

            {/* Balance Due Notice */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100/70 rounded-2xl text-xs">
              <span className="text-slate-600 font-semibold">Balance Due on Delivery:</span>
              <span className="text-sm font-black text-slate-900">
                ₹{Math.max(0, totalAmount - advancePaid).toFixed(2)}
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-md flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-lime-400" />
                <span>{isSubmitting ? "Creating Order..." : "Create & Collect Advance"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Category & Preset Manager Modal */}
      <JobCategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        presets={presets}
        onSavePresets={handleSavePresets}
      />
    </>
  );
}

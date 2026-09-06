"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Truck,
  Package,
  FileText,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  Search,
  Layers,
  Sparkles,
} from "lucide-react";
import { ChallanStatus, DispatchMode } from "@prisma/client";
import {
  createDeliveryChallan,
  getJobOrdersForChallan,
  ChallanPayloadInput,
} from "@/actions/challans";
import { toast } from "@/stores/useSnackbarStore";
import { modal } from "@/stores/useDialogStore";

interface CreateChallanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialJobId?: string;
}

interface ItemRow {
  id: string;
  itemDescription: string;
  quantity: number;
  unitName: string;
  hsnCode?: string;
  remarks?: string;
}

export function CreateChallanModal({
  isOpen,
  onClose,
  onSuccess,
  initialJobId,
}: CreateChallanModalProps) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobSearch, setJobSearch] = useState("");
  const [isJobDropdownOpen, setIsJobDropdownOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);

  const [dispatchMode, setDispatchMode] = useState<DispatchMode>(DispatchMode.COMPANY_VEHICLE);
  const [transporterName, setTransporterName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [lrNumber, setLrNumber] = useState("");
  const [packageCount, setPackageCount] = useState("");
  const [packagingNotes, setPackagingNotes] = useState("");
  const [status, setStatus] = useState<ChallanStatus>(ChallanStatus.PREPARED);

  const [items, setItems] = useState<ItemRow[]>([
    {
      id: "1",
      itemDescription: "",
      quantity: 100,
      unitName: "pcs",
      hsnCode: "4911",
      remarks: "",
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available job orders on open
  useEffect(() => {
    if (isOpen) {
      getJobOrdersForChallan().then((res) => {
        if (res.success && res.jobs) {
          setJobs(res.jobs);
          if (initialJobId) {
            const match = res.jobs.find((j: any) => j.id === initialJobId);
            if (match) handleSelectJob(match);
          }
        }
      });
    }
  }, [isOpen, initialJobId]);

  if (!isOpen) return null;

  const handleSelectJob = (job: any) => {
    setSelectedJob(job);
    setCustomerId(job.customerId || null);
    setCustomerName(job.customerName || "");
    setCustomerPhone(job.customerPhone || "");
    setDeliveryAddress(job.customerAddress || "");
    setJobSearch(`${job.jobOrderNumber} - ${job.jobType} (${job.customerName})`);
    setIsJobDropdownOpen(false);

    // Auto-populate item line from job order
    setItems([
      {
        id: "1",
        itemDescription: `${job.jobType} (Job #${job.jobOrderNumber})`,
        quantity: job.quantity || 100,
        unitName: job.unitName || "pcs",
        hsnCode: "4911",
        remarks: `Complete batch of ${job.quantity} ${job.unitName}`,
      },
    ]);

    setPackageCount("1 Carton Box");
  };

  const handleClearJob = () => {
    setSelectedJob(null);
    setCustomerId(null);
    setCustomerName("");
    setCustomerPhone("");
    setDeliveryAddress("");
    setJobSearch("");
    setItems([
      {
        id: "1",
        itemDescription: "",
        quantity: 100,
        unitName: "pcs",
        hsnCode: "4911",
        remarks: "",
      },
    ]);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        id: String(Date.now()),
        itemDescription: "",
        quantity: 1,
        unitName: "pcs",
        hsnCode: "4911",
        remarks: "",
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) {
      toast.warning("Challan must contain at least one line item");
      return;
    }
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof ItemRow, val: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: val };
    setItems(updated);
  };

  const filteredJobs = jobs.filter((j) => {
    const q = jobSearch.toLowerCase();
    return (
      j.jobOrderNumber.toLowerCase().includes(q) ||
      j.jobType.toLowerCase().includes(q) ||
      j.customerName.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error("Customer / Consignee name is required");
      return;
    }

    const invalidItem = items.find((it) => !it.itemDescription.trim() || it.quantity <= 0);
    if (invalidItem) {
      toast.error("All items must have a valid description and quantity > 0");
      return;
    }

    setIsSubmitting(true);

    const payload: ChallanPayloadInput = {
      jobOrderId: selectedJob?.id || null,
      customerId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || null,
      deliveryAddress: deliveryAddress.trim() || null,
      dispatchMode,
      transporterName: transporterName.trim() || null,
      vehicleNumber: vehicleNumber.trim() || null,
      lrNumber: lrNumber.trim() || null,
      packageCount: packageCount.trim() || null,
      packagingNotes: packagingNotes.trim() || null,
      status,
      items: items.map((it) => ({
        itemDescription: it.itemDescription.trim(),
        quantity: Number(it.quantity),
        unitName: it.unitName || "pcs",
        hsnCode: it.hsnCode?.trim() || null,
        remarks: it.remarks?.trim() || null,
      })),
    };

    const res = await createDeliveryChallan(payload);
    setIsSubmitting(false);

    if (res.success && res.challan) {
      toast.success(
        `Delivery Challan #${res.challan.challanNumber} created successfully!`,
        "Challan Created"
      );
      onSuccess();
      onClose();
    } else {
      modal.error(res.error || "Failed to create delivery challan");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-lime-300 to-lime-500 flex items-center justify-center shadow-lime">
              <Truck className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                New Delivery Challan
              </h2>
              <p className="text-xs text-slate-400">
                Official goods dispatch note & transporter gate pass
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          {/* Section 1: Link to Job Order (Optional) */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-lime-600" />
                <span>Link to Job Order (Optional)</span>
              </label>
              {selectedJob && (
                <button
                  type="button"
                  onClick={handleClearJob}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Searchable Job Dropdown */}
            <div className="relative">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Type to search job by #, customer, or print item..."
                  value={jobSearch}
                  onChange={(e) => {
                    setJobSearch(e.target.value);
                    setIsJobDropdownOpen(true);
                  }}
                  onFocus={() => setIsJobDropdownOpen(true)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400 font-medium text-slate-800"
                />
              </div>

              {isJobDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {filteredJobs.length === 0 ? (
                    <div className="py-3 text-center text-xs text-slate-400">
                      No matching job orders found
                    </div>
                  ) : (
                    filteredJobs.map((j) => (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => handleSelectJob(j)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-lime-50 flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{j.jobOrderNumber}</span>
                          <span className="text-slate-500 ml-2">({j.jobType})</span>
                          <div className="text-[10px] text-slate-400">
                            {j.customerName} • {j.quantity} {j.unitName}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {j.status.replace(/_/g, " ")}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Consignee / Delivery Address */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Consignee & Delivery Destination
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Customer / Consignee Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Corporation"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Delivery Site / Office Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Street, Landmark, City, Pincode"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400 font-medium resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Transporter & Vehicle Logistics */}
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/60 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              Dispatch Logistics & Gate Pass
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Dispatch Mode
                </label>
                <select
                  value={dispatchMode}
                  onChange={(e) => setDispatchMode(e.target.value as DispatchMode)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-400 font-medium"
                >
                  <option value={DispatchMode.COMPANY_VEHICLE}>Shop Delivery Van / Bike</option>
                  <option value={DispatchMode.SHOP_PICKUP}>Customer Counter Pickup</option>
                  <option value={DispatchMode.TRANSPORTER}>Transporter / Porter / Auto</option>
                  <option value={DispatchMode.COURIER}>Courier / Speed Post / Cargo</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. MH 02 AB 1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-400 font-medium uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Driver / Transporter Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar / Porter"
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-400 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  LR / Tracking Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. LR-98421 / Waybill"
                  value={lrNumber}
                  onChange={(e) => setLrNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-400 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Package / Bundle Count
                </label>
                <input
                  type="text"
                  placeholder="e.g. 4 Boxes, 2 Rolls"
                  value={packageCount}
                  onChange={(e) => setPackageCount(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-400 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Challan Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ChallanStatus)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-400 font-bold text-slate-800"
                >
                  <option value={ChallanStatus.PREPARED}>Prepared (Packed in Shop)</option>
                  <option value={ChallanStatus.IN_TRANSIT}>In Transit (Out for Delivery)</option>
                  <option value={ChallanStatus.DELIVERED}>Delivered (Direct Receipt)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                Dispatched Goods & Materials
              </h3>
              <button
                type="button"
                onClick={addItemRow}
                className="px-2.5 py-1 rounded-xl bg-lime-100 hover:bg-lime-200 text-lime-900 text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item Line
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 pl-3">Item Description</th>
                    <th className="p-2.5 w-24">HSN Code</th>
                    <th className="p-2.5 w-24">Quantity</th>
                    <th className="p-2.5 w-24">Unit</th>
                    <th className="p-2.5">Remarks</th>
                    <th className="p-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((it, idx) => (
                    <tr key={it.id} className="hover:bg-slate-50/50">
                      <td className="p-2 pl-3">
                        <input
                          type="text"
                          required
                          placeholder="e.g. 4-Color Brochure 130 GSM Gloss"
                          value={it.itemDescription}
                          onChange={(e) => updateItem(idx, "itemDescription", e.target.value)}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400 font-medium"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="4911"
                          value={it.hsnCode || ""}
                          onChange={(e) => updateItem(idx, "hsnCode", e.target.value)}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400 text-center font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400 text-right font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={it.unitName}
                          onChange={(e) => updateItem(idx, "unitName", e.target.value)}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400 text-center font-medium"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="Batch #1, shrink wrapped"
                          value={it.remarks || ""}
                          onChange={(e) => updateItem(idx, "remarks", e.target.value)}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400 font-medium"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 5: Packaging Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              Packaging & Gate Pass Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. Goods inspected and packed in moisture-proof corrugated cartons"
              value={packagingNotes}
              onChange={(e) => setPackagingNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400 font-medium"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Generating Challan...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-lime-400" />
                  <span>Generate Delivery Challan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

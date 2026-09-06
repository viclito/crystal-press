"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Building2,
  User,
  Phone,
  MapPin,
  DollarSign,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { createVendor, updateVendor, VendorInput } from "@/actions/vendors";
import { toast } from "@/stores/useSnackbarStore";
import { modal } from "@/stores/useDialogStore";

interface VendorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorToEdit?: any | null;
  onSuccess?: () => void;
}

export function VendorFormModal({
  isOpen,
  onClose,
  vendorToEdit,
  onSuccess,
}: VendorFormModalProps) {
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [outstandingBalance, setOutstandingBalance] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (vendorToEdit) {
      setName(vendorToEdit.name || "");
      setContactPerson(vendorToEdit.contactPerson || "");
      setPhone(vendorToEdit.phone || "");
      setAddress(vendorToEdit.address || "");
      setOutstandingBalance(Number(vendorToEdit.outstandingBalance) || 0);
    } else {
      setName("");
      setContactPerson("");
      setPhone("");
      setAddress("");
      setOutstandingBalance(0);
    }
  }, [vendorToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      modal.alert("Please provide the vendor / paper mill name.", "Name Required");
      return;
    }

    setIsSubmitting(true);

    const payload: VendorInput = {
      name: name.trim(),
      contactPerson: contactPerson.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      outstandingBalance: Number(outstandingBalance) || 0,
    };

    let res;
    if (vendorToEdit?.id) {
      res = await updateVendor(vendorToEdit.id, payload);
    } else {
      res = await createVendor(payload);
    }

    setIsSubmitting(false);

    if (res.success) {
      toast.success(
        vendorToEdit?.id ? "Vendor updated successfully" : "Vendor added successfully",
        "Supplier Saved"
      );
      if (onSuccess) onSuccess();
      onClose();
    } else {
      modal.error(res.error || "Failed to save vendor");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {vendorToEdit ? "Edit Paper Supplier" : "Add New Paper Mill / Supplier"}
              </h3>
              <p className="text-xs text-slate-400">
                {vendorToEdit ? "Update supplier profile & contact" : "Register a new raw material vendor"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 my-4">
          {/* Supplier Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Supplier / Paper Mill Name *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. JK Paper Mills & Boards Ltd"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-lime-400"
              />
            </div>
          </div>

          {/* Contact Person */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Contact Person / Sales Executive
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Anand Sharma (Sales Head)"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-lime-400"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Phone / WhatsApp Number (+91)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-lime-400"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Warehouse / Mill Address
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Plot 45, Industrial Estate, Paper Market Road"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-lime-400"
              />
            </div>
          </div>

          {/* Opening Outstanding Balance */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Opening Outstanding Balance (₹)
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                min="0"
                step="50"
                value={outstandingBalance || ""}
                onChange={(e) => setOutstandingBalance(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-lime-400"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Amount your shop currently owes to this vendor from past unpaid bills.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
              <span>{isSubmitting ? "Saving..." : vendorToEdit ? "Update Vendor" : "Save Vendor"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

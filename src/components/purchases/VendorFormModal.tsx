"use client";

import React, { useState, useEffect } from "react";
import { X, Building2, User, Phone, MapPin, Loader2, Save } from "lucide-react";
import { upsertVendor } from "@/actions/purchases";
import { modal } from "@/stores/useDialogStore";
import { toast } from "@/stores/useSnackbarStore";

interface VendorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor?: {
    id: string;
    name: string;
    contactPerson?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
  onSuccess?: (savedVendor: any) => void;
}

export function VendorFormModal({
  isOpen,
  onClose,
  vendor,
  onSuccess,
}: VendorFormModalProps) {
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vendor) {
      setName(vendor.name || "");
      setContactPerson(vendor.contactPerson || "");
      setPhone(vendor.phone || "");
      setAddress(vendor.address || "");
    } else {
      setName("");
      setContactPerson("");
      setPhone("");
      setAddress("");
    }
  }, [vendor, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      await modal.alert("Please enter the supplier / vendor company name", "Validation Error");
      return;
    }

    setLoading(true);
    try {
      const res = await upsertVendor({
        id: vendor?.id,
        name: name.trim(),
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });

      if (res.success) {
        toast.success(
          vendor ? `Updated supplier ${res.vendor.name}` : `Added supplier ${res.vendor.name}`,
          "Supplier Saved"
        );
        onSuccess?.(res.vendor);
        onClose();
      } else {
        await modal.error(res.error || "Failed to save supplier", "Supplier Error");
      }
    } catch (err: any) {
      await modal.error(err.message || "An unexpected error occurred", "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lime-100 text-lime-900 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {vendor ? "Edit Supplier / Vendor" : "New Supplier / Vendor"}
              </h3>
              <p className="text-xs text-slate-400">Paper mill, ink vendor, or stationery distributor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Supplier / Company Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. JK Paper Mills Ltd / Camlin Distributors"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Contact Person / Representative</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Rajesh Sharma (Area Manager)"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Warehouse / Office Address</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Plot 42, Industrial Area Phase II"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
              ) : (
                <Save className="w-4 h-4 text-lime-400" />
              )}
              <span>{vendor ? "Update Supplier" : "Save Supplier"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { upsertCustomer } from "@/actions/customers";
import { modal } from "@/stores/useDialogStore";
import { toast } from "@/stores/useSnackbarStore";

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: any | null;
}

export function CustomerFormModal({ isOpen, onClose, customerToEdit }: CustomerFormModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name || "");
      setPhone(customerToEdit.phone || "");
      setEmail(customerToEdit.email || "");
      setAddress(customerToEdit.address || "");
      setCreditLimit(Number(customerToEdit.creditLimit) || 0);
      setNotes(customerToEdit.notes || "");
    } else {
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setCreditLimit(10000);
      setNotes("");
    }
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const res = await upsertCustomer({
      id: customerToEdit?.id,
      name,
      phone,
      email: email || undefined,
      address,
      creditLimit: Number(creditLimit),
      notes,
    });

    setIsSubmitting(false);
    if (res.success) {
      toast.success(
        customerToEdit ? `Customer profile for "${name}" updated` : `Added "${name}" to customer ledger`,
        customerToEdit ? "Customer Updated" : "Customer Created"
      );
      onClose();
    } else {
      modal.error(res.error || "Failed to save customer");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {customerToEdit ? "Edit Customer" : "New Customer Profile"}
            </h3>
            <p className="text-xs text-slate-400">Account & credit limit settings</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 my-4">
          <div>
            <label className="text-xs font-bold text-slate-700">Customer / Business Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Hospital / Rajesh Graphics"
              className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-lime-400 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">WhatsApp / Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit number"
                className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@gmail.com"
                className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Address / Location</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Shop No, Complex, Street"
              className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Credit (Udhaar) Limit (₹)</label>
            <input
              type="number"
              min="0"
              value={creditLimit}
              onChange={(e) => setCreditLimit(Number(e.target.value))}
              className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
            />
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
              <Check className="w-4 h-4 text-lime-400" />
              <span>{isSubmitting ? "Saving..." : "Save Customer"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

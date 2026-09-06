"use client";

import React, { useState } from "react";
import { X, Search, UserPlus, Phone, UserCheck, Check, AlertTriangle } from "lucide-react";
import { usePOSStore } from "@/stores/usePOSStore";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/stores/useSnackbarStore";

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  currentBalance: number | string;
  walletBalance?: number | string;
  loyaltyPoints?: number;
}

interface CustomerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onQuickAddCustomer?: (name: string, phone: string) => Promise<any>;
}

export function CustomerSelectModal({
  isOpen,
  onClose,
  customers = [],
  onQuickAddCustomer,
}: CustomerSelectModalProps) {
  const { setCustomer, customerId } = usePOSStore();
  const [search, setSearch] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const matchingExisting = React.useMemo(() => {
    if (!isOpen) return null;
    const cleanP = newPhone.replace(/\D/g, "");
    const cleanN = newName.trim().toLowerCase();
    if (!cleanP && !cleanN) return null;

    return customers.find((c) => {
      const cPhone = (c.phone || "").replace(/\D/g, "");
      if (cleanP && cleanP.length >= 7 && cPhone.length >= 7) {
        if (cPhone === cleanP || cPhone.endsWith(cleanP.slice(-10)) || cleanP.endsWith(cPhone.slice(-10))) {
          return true;
        }
      }
      if (cleanN && cleanN.length >= 2 && c.name.trim().toLowerCase() === cleanN) {
        return true;
      }
      return false;
    });
  }, [isOpen, newPhone, newName, customers]);

  if (!isOpen) return null;

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search))
  );

  const handleSelect = (cust: Customer) => {
    setCustomer(
      cust.id,
      cust.name,
      cust.phone || "",
      Number(cust.currentBalance) || 0,
      Number(cust.walletBalance) || 0,
      Number(cust.loyaltyPoints) || 0
    );
    onClose();
  };

  const handleSelectWalkIn = () => {
    setCustomer(null, "Walk-in Customer", "", 0, 0, 0);
    onClose();
  };

  const handleCreateAndSelect = async () => {
    if (!newName.trim() || isSubmitting) return;

    // If customer already exists in list, select them instead of duplicating
    if (matchingExisting) {
      toast.info(`Customer "${matchingExisting.name}" is already registered. Selecting existing customer.`);
      handleSelect(matchingExisting);
      setNewName("");
      setNewPhone("");
      setIsAddingNew(false);
      return;
    }

    setIsSubmitting(true);
    try {
      if (onQuickAddCustomer) {
        const created = await onQuickAddCustomer(newName.trim(), newPhone.trim());
        if (created) {
          setCustomer(
            created.id,
            created.name,
            created.phone || "",
            Number(created.currentBalance) || 0,
            Number(created.walletBalance) || 0,
            Number(created.loyaltyPoints) || 0
          );
          setNewName("");
          setNewPhone("");
          setIsAddingNew(false);
          onClose();
          return;
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Select Customer</h3>
            <p className="text-xs text-slate-400">Attach customer to current bill (F4)</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isAddingNew ? (
          /* Quick Add New Customer Form */
          <div className="my-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Customer Name *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Ramesh Kumar / Star Graphics"
                className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-lime-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Phone Number (WhatsApp)</label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-lime-400 focus:outline-none"
              />
            </div>

            {matchingExisting && (
              <div className="p-3 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-center justify-between gap-2.5 text-xs animate-in fade-in">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">Customer already registered!</span>
                  </div>
                  <div className="text-[11px] text-amber-800 font-medium mt-0.5 truncate">
                    {matchingExisting.name} ({matchingExisting.phone || "No phone"})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleSelect(matchingExisting);
                    setNewName("");
                    setNewPhone("");
                    setIsAddingNew(false);
                  }}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] shrink-0 transition-colors shadow-2xs"
                >
                  Select Existing
                </button>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsAddingNew(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting || !newName.trim()}
                onClick={handleCreateAndSelect}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save & Select</span>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Search & List Existing Customers */
          <div className="my-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-lime-400 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSelectWalkIn}
                className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  !customerId
                    ? "border-lime-500 bg-lime-50 text-slate-900 ring-1 ring-lime-400"
                    : "border-slate-200 bg-slate-100 hover:bg-slate-200/70 text-slate-700"
                }`}
              >
                {!customerId && <Check className="w-3.5 h-3.5 text-lime-600 stroke-[3]" />}
                <span>Default Walk-in</span>
              </button>
              <button
                onClick={() => setIsAddingNew(true)}
                className="flex-1 py-2 rounded-xl border border-dashed border-lime-400 bg-lime-50 text-slate-900 font-bold text-xs hover:bg-lime-100 flex items-center justify-center gap-1 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-lime-700" />
                <span>+ New Customer</span>
              </button>
            </div>

            {filtered.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <p className="text-xs font-medium">No customers found</p>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="mt-2 text-xs font-bold text-lime-600 hover:text-lime-700 underline"
                >
                  + Add &quot;{search}&quot; as new customer
                </button>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {filtered.map((c) => {
                  const bal = Number(c.currentBalance) || 0;
                  const isSelected = customerId === c.id;

                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelect(c)}
                      className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                        isSelected
                          ? "border-lime-500 bg-lime-50/70 shadow-xs ring-1 ring-lime-400"
                          : "border-slate-100 bg-slate-50/60 hover:bg-white hover:border-lime-400"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {isSelected && (
                          <div className="mt-0.5 p-0.5 rounded-full bg-lime-500 text-white shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{c.name}</span>
                            {isSelected && (
                              <span className="text-[9px] font-bold text-lime-700 bg-lime-100/80 px-1.5 py-0.2 rounded">
                                Active Cart
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">{c.phone || "No phone"}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            {(c.loyaltyPoints ?? 0) > 0 && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded-md">
                                ⭐ {c.loyaltyPoints} pts
                              </span>
                            )}
                            {Number(c.walletBalance || 0) > 0 && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-md">
                                💳 {formatCurrency(Number(c.walletBalance))}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {bal > 0 ? (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                            Due: {formatCurrency(bal)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">Clear</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

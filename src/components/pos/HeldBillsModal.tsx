"use client";

import React from "react";
import { X, Play, Trash2, Clock, User, Layers } from "lucide-react";
import { usePOSStore } from "@/stores/usePOSStore";
import { formatCurrency } from "@/lib/utils";

interface HeldBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HeldBillsModal({ isOpen, onClose }: HeldBillsModalProps) {
  const { heldBills, resumeBill, deleteHeldBill } = usePOSStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Held / Parked Bills</h3>
            <p className="text-xs text-slate-400">Resume an earlier parked customer order</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-4 space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
          {heldBills.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <p className="text-xs font-semibold">No bills currently on hold</p>
            </div>
          ) : (
            heldBills.map((bill) => (
              <div
                key={bill.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 hover:bg-slate-100/60 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>{bill.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {bill.savedAt}
                    </span>
                    <span>•</span>
                    <span>{bill.items.length} items</span>
                  </div>
                  <div className="text-xs font-extrabold text-slate-900 mt-1">
                    ₹{bill.netTotal.toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      resumeBill(bill.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center gap-1 shadow-sm"
                  >
                    <Play className="w-3 h-3 text-lime-400 fill-lime-400" />
                    <span>Resume</span>
                  </button>

                  <button
                    onClick={() => deleteHeldBill(bill.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </div>
  );
}

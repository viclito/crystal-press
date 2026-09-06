"use client";

import React, { useState } from "react";
import {
  Truck,
  Plus,
  Building2,
  Search,
  DollarSign,
  FileText,
  Clock,
  Eye,
  CreditCard,
  Edit2,
  Trash2,
  Phone,
  Layers,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { VendorFormModal } from "@/components/purchases/VendorFormModal";
import { CreatePurchaseOrderModal } from "@/components/purchases/CreatePurchaseOrderModal";
import { RecordVendorPaymentModal } from "@/components/purchases/RecordVendorPaymentModal";
import { PurchaseOrderDetailModal } from "@/components/purchases/PurchaseOrderDetailModal";
import { deleteVendor } from "@/actions/purchases";
import { modal } from "@/stores/useDialogStore";
import { toast } from "@/stores/useSnackbarStore";
import { useRouter } from "next/navigation";

interface PurchasesClientProps {
  vendors: any[];
  purchaseOrders: any[];
  products: any[];
}

export function PurchasesClient({
  vendors,
  purchaseOrders,
  products,
}: PurchasesClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [selectedVendorForEdit, setSelectedVendorForEdit] = useState<any | null>(null);
  const [selectedVendorForPay, setSelectedVendorForPay] = useState<any | null>(null);
  const [selectedPOForDetail, setSelectedPOForDetail] = useState<any | null>(null);

  // Financial KPIs
  const totalPurchasesAmount = purchaseOrders.reduce(
    (sum, po) => sum + (Number(po.totalAmount) || 0),
    0
  );
  const totalVendorPayables = vendors.reduce(
    (sum, v) => sum + (Number(v.outstandingBalance) || 0),
    0
  );

  // Filter Purchase Orders
  const filteredPOs = purchaseOrders.filter((po) => {
    const q = searchQuery.toLowerCase();
    return (
      po.poNumber.toLowerCase().includes(q) ||
      po.vendor.name.toLowerCase().includes(q) ||
      (po.vendorBillNo && po.vendorBillNo.toLowerCase().includes(q))
    );
  });

  const handleDeleteVendor = async (v: any) => {
    const confirmed = await modal.confirm({
      title: "Delete Supplier",
      message: `Are you sure you want to remove supplier "${v.name}"? If they have past purchase orders, they will be archived.`,
      confirmText: "Delete",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      const res = await deleteVendor(v.id);
      if (res.success) {
        toast.success(`Removed supplier ${v.name}`, "Supplier Removed");
        router.refresh();
      } else {
        await modal.error(res.error || "Failed to remove supplier", "Error");
      }
    } catch (err: any) {
      await modal.error(err.message || "Failed to remove supplier", "Error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action & KPI Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-300 to-lime-500 flex items-center justify-center shadow-lime">
            <Truck className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Purchases & Inward Restocking
            </h1>
            <p className="text-xs text-slate-400">
              Manage suppliers, log inventory replenishment & track payables
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setSelectedVendorForEdit(null);
              setIsVendorModalOpen(true);
            }}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-2xl text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
          >
            <Building2 className="w-4 h-4 text-slate-500" />
            <span>+ Add Supplier</span>
          </button>

          <button
            onClick={() => setIsPOModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-98"
          >
            <Plus className="w-4 h-4 text-lime-400" />
            <span>Record Purchase / Restock</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
            Total Spend
          </span>
          <div className="text-xl font-black text-slate-900">
            {formatCurrency(totalPurchasesAmount)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {purchaseOrders.length} Shipments Received
          </span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500 block mb-1">
            Payables Due
          </span>
          <div className="text-xl font-black text-rose-600">
            {formatCurrency(totalVendorPayables)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Outstanding to suppliers
          </span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
            Active Suppliers
          </span>
          <div className="text-xl font-black text-slate-900">{vendors.length}</div>
          <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
            Mills & Distributors
          </span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
            Catalog SKUs
          </span>
          <div className="text-xl font-black text-slate-900">{products.length}</div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Available to restock
          </span>
        </div>
      </div>

      {/* Suppliers / Vendors Overview Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Registered Suppliers & Mills</h3>
            <p className="text-xs text-slate-400">Track outstanding balances and pay dues</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {vendors.length === 0 ? (
            <div className="col-span-3 py-6 text-center text-slate-400 text-xs">
              No suppliers added yet. Click <strong>+ Add Supplier</strong> to register paper mills and vendors.
            </div>
          ) : (
            vendors.map((v) => {
              const balance = Number(v.outstandingBalance) || 0;
              return (
                <div
                  key={v.id}
                  className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60 flex flex-col justify-between hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-sm">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{v.name}</h4>
                          {v.contactPerson && (
                            <span className="text-[10px] text-slate-400 block">
                              {v.contactPerson}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedVendorForEdit(v);
                            setIsVendorModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white"
                          title="Edit Supplier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteVendor(v)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white"
                          title="Delete Supplier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {v.phone && (
                      <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{v.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                        Payable Due
                      </span>
                      <span
                        className={`text-xs font-extrabold ${
                          balance > 0 ? "text-rose-600" : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(balance)}
                      </span>
                    </div>

                    {balance > 0 && (
                      <button
                        onClick={() => {
                          setSelectedVendorForPay(v);
                        }}
                        className="px-2.5 py-1 bg-lime-300 hover:bg-lime-400 text-slate-900 rounded-lg text-[10px] font-extrabold transition-colors shadow-sm"
                      >
                        Pay Due
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Purchase Orders & Restock History Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Inward Purchase Orders & Stock Receipts
            </h3>
            <p className="text-xs text-slate-400">
              Complete historical record of incoming stock and payments
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PO#, supplier..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pl-2">PO Number</th>
                <th className="pb-3">Supplier</th>
                <th className="pb-3">Bill / Challan</th>
                <th className="pb-3">Items Restocked</th>
                <th className="pb-3">Received Date</th>
                <th className="pb-3 text-right">Total Value</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No purchase orders matching your search.
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => {
                  const total = Number(po.totalAmount) || 0;
                  const paid = Number(po.paidAmount) || 0;
                  const due = Math.max(0, total - paid);

                  return (
                    <tr key={po.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pl-2 font-mono font-bold text-slate-900">
                        {po.poNumber}
                      </td>
                      <td className="py-3 font-semibold text-slate-800">
                        {po.vendor.name}
                      </td>
                      <td className="py-3 text-slate-500 font-mono">
                        {po.vendorBillNo || "—"}
                      </td>
                      <td className="py-3 text-slate-600">
                        {po.items.length} product{po.items.length > 1 ? "s" : ""}
                      </td>
                      <td className="py-3 text-slate-400">{formatDate(po.purchaseDate)}</td>
                      <td className="py-3 text-right font-black text-slate-900">
                        {formatCurrency(total)}
                      </td>
                      <td className="py-3 text-center">
                        {due === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3" />
                            Due: {formatCurrency(due)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right pr-2">
                        <button
                          onClick={() => setSelectedPOForDetail(po)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <CreatePurchaseOrderModal
        isOpen={isPOModalOpen}
        onClose={() => {
          setIsPOModalOpen(false);
          router.refresh();
        }}
        vendors={vendors}
        products={products}
        onOpenVendorModal={() => {
          setSelectedVendorForEdit(null);
          setIsVendorModalOpen(true);
        }}
      />

      <VendorFormModal
        isOpen={isVendorModalOpen}
        onClose={() => {
          setIsVendorModalOpen(false);
          setSelectedVendorForEdit(null);
          router.refresh();
        }}
        vendor={selectedVendorForEdit}
      />

      <RecordVendorPaymentModal
        isOpen={!!selectedVendorForPay}
        onClose={() => {
          setSelectedVendorForPay(null);
          router.refresh();
        }}
        vendor={selectedVendorForPay}
      />

      <PurchaseOrderDetailModal
        isOpen={!!selectedPOForDetail}
        onClose={() => setSelectedPOForDetail(null)}
        po={selectedPOForDetail}
      />
    </div>
  );
}

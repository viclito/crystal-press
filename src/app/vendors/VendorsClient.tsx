"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Search,
  DollarSign,
  Phone,
  FileText,
  Trash2,
  Edit,
  TrendingDown,
  Truck,
  CheckCircle2,
  Clock,
  Send,
  ArrowRight,
  Layers,
  Sparkles,
} from "lucide-react";
import { getVendors, deleteVendor } from "@/actions/vendors";
import { formatCurrency } from "@/lib/utils";
import { VendorFormModal } from "@/components/vendors/VendorFormModal";
import { VendorPaymentModal } from "@/components/vendors/VendorPaymentModal";
import { VendorLedgerModal } from "@/components/vendors/VendorLedgerModal";
import { toast } from "@/stores/useSnackbarStore";
import { modal } from "@/stores/useDialogStore";

interface VendorsClientProps {
  initialVendors: any[];
  initialKpis: any;
  shopSettings?: any;
}

export function VendorsClient({
  initialVendors = [],
  initialKpis = {},
  shopSettings,
}: VendorsClientProps) {
  const [vendors, setVendors] = useState<any[]>(initialVendors);
  const [kpis, setKpis] = useState<any>(initialKpis);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"ALL" | "WITH_BALANCE" | "CLEAN">("ALL");

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [vendorToEdit, setVendorToEdit] = useState<any | null>(null);

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [vendorToPay, setVendorToPay] = useState<any | null>(null);

  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  const refreshData = async () => {
    setLoading(true);
    const res = await getVendors({
      search: searchQuery,
      hasBalanceOnly: filterMode === "WITH_BALANCE",
    });
    if (res.success) {
      setVendors(res.vendors || []);
      setKpis(res.kpis || {});
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, [filterMode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    refreshData();
  };

  const handleDelete = async (vendor: any) => {
    const confirmed = await modal.confirm({
      title: "Remove Supplier?",
      message: `Are you sure you want to remove ${vendor.name}?`,
      confirmText: "Remove Supplier",
      type: "danger",
    });

    if (!confirmed) return;

    const res = await deleteVendor(vendor.id);
    if (res.success) {
      toast.success(`${vendor.name} removed`, "Supplier Removed");
      refreshData();
    } else {
      modal.error(res.error || "Failed to delete vendor");
    }
  };

  const displayedVendors = vendors.filter((v) => {
    if (filterMode === "WITH_BALANCE") return Number(v.outstandingBalance) > 0;
    if (filterMode === "CLEAN") return Number(v.outstandingBalance) <= 0;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-slate-900 shadow-md">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Vendors & Paper Mills
            </h1>
            <p className="text-xs font-semibold text-slate-500">
              Manage raw paper suppliers, credit balances, payment vouchers, and ledger statements
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setVendorToEdit(null);
            setIsFormOpen(true);
          }}
          className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-md flex items-center justify-center gap-2 transition-all active:scale-98"
        >
          <Plus className="w-4 h-4 text-lime-400" />
          <span>+ Add Supplier / Mill</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Payables */}
        <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Outstanding Payables
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center font-bold">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-700 font-mono">
              {formatCurrency(kpis.totalOutstanding || 0)}
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Total credit owed to suppliers
            </p>
          </div>
        </div>

        {/* Total Suppliers */}
        <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active Suppliers
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {kpis.totalVendors || 0} Mills
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Paper mills, board & ink vendors
            </p>
          </div>
        </div>

        {/* Purchases this Month */}
        <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Purchases This Month
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-800 flex items-center justify-center font-bold">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono">
              {formatCurrency(kpis.monthPurchases || 0)}
            </div>
            <p className="text-xs font-semibold text-sky-700 mt-0.5">
              Raw materials restocked
            </p>
          </div>
        </div>

        {/* Payments Cleared this Month */}
        <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Payments Cleared
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-800 font-mono">
              {formatCurrency(kpis.monthPayments || 0)}
            </div>
            <p className="text-xs font-semibold text-emerald-700 mt-0.5">
              Cleared this month
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold w-fit">
            {[
              { id: "ALL", label: `All Suppliers (${vendors.length})` },
              { id: "WITH_BALANCE", label: "⚠️ Outstanding Balance" },
              { id: "CLEAN", label: "✅ Settled / Clean" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterMode === tab.id
                    ? "bg-white text-slate-900 shadow-sm font-extrabold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by supplier name, contact person, or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-lime-400"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Vendors Data Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Supplier / Paper Mill</th>
                <th className="py-3.5 px-4">Contact Person</th>
                <th className="py-3.5 px-4">Phone / WhatsApp</th>
                <th className="py-3.5 px-4">Address / Location</th>
                <th className="py-3.5 px-4 text-center">Orders</th>
                <th className="py-3.5 px-4 text-right">Outstanding Credit</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedVendors.map((vendor) => {
                const balance = Number(vendor.outstandingBalance) || 0;
                const ordersCount = vendor._count?.purchaseOrders || 0;

                return (
                  <tr key={vendor.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Supplier Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{vendor.name}</span>
                      </div>
                    </td>

                    {/* Contact Person */}
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {vendor.contactPerson || "—"}
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4">
                      {vendor.phone ? (
                        <span className="font-mono text-slate-700 font-semibold text-[11px]">
                          +91 {vendor.phone}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Address */}
                    <td className="py-3.5 px-4 text-slate-500 max-w-[200px] truncate" title={vendor.address || ""}>
                      {vendor.address || "—"}
                    </td>

                    {/* Orders Count */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-slate-100 text-slate-700">
                        {ordersCount} bills
                      </span>
                    </td>

                    {/* Outstanding Credit */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span
                        className={`font-black text-sm font-mono ${
                          balance > 0 ? "text-rose-700" : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(balance)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Record Payment Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setVendorToPay(vendor);
                            setIsPaymentOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-colors"
                          title="Record Payment to Supplier"
                        >
                          <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Pay</span>
                        </button>

                        {/* Ledger Statement Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVendorId(vendor.id);
                            setIsLedgerOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 transition-colors"
                          title="View Supplier Ledger Statement"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-600" />
                          <span>Ledger</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setVendorToEdit(vendor);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Edit Supplier"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(vendor)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove Supplier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {displayedVendors.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">No suppliers found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Add your first paper mill or raw material supplier.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Vendor Form (Add / Edit) */}
      {isFormOpen && (
        <VendorFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setVendorToEdit(null);
          }}
          vendorToEdit={vendorToEdit}
          onSuccess={refreshData}
        />
      )}

      {/* Modal 2: Vendor Payment Modal */}
      {isPaymentOpen && vendorToPay && (
        <VendorPaymentModal
          isOpen={isPaymentOpen}
          onClose={() => {
            setIsPaymentOpen(false);
            setVendorToPay(null);
          }}
          vendor={vendorToPay}
          onSuccess={refreshData}
        />
      )}

      {/* Modal 3: Vendor Ledger Statement Modal */}
      {isLedgerOpen && selectedVendorId && (
        <VendorLedgerModal
          isOpen={isLedgerOpen}
          onClose={() => {
            setIsLedgerOpen(false);
            setSelectedVendorId(null);
          }}
          vendorId={selectedVendorId}
          onRefreshParent={refreshData}
        />
      )}
    </div>
  );
}

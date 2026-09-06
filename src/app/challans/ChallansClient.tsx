"use client";

import React, { useState, useTransition } from "react";
import {
  Truck,
  Plus,
  Search,
  Printer,
  Share2,
  CheckCircle2,
  Clock,
  Package,
  Calendar,
  Filter,
  FileText,
  AlertCircle,
  MoreVertical,
  XCircle,
  MapPin,
  Phone,
  Trash2,
} from "lucide-react";
import { ChallanStatus, DispatchMode } from "@prisma/client";
import {
  getDeliveryChallans,
  updateChallanStatus,
  deleteDeliveryChallan,
} from "@/actions/challans";
import { StatCard } from "@/components/ui/StatCard";
import { CreateChallanModal } from "@/components/challans/CreateChallanModal";
import { ChallanPrintModal } from "@/components/challans/ChallanPrintModal";
import { MarkDeliveredModal } from "@/components/challans/MarkDeliveredModal";
import { toast } from "@/stores/useSnackbarStore";
import { modal } from "@/stores/useDialogStore";
import { formatDate } from "@/lib/utils";

interface ChallansClientProps {
  initialData: {
    challans: any[];
    metrics: {
      total: number;
      inTransit: number;
      delivered: number;
      prepared: number;
      thisMonth: number;
    };
  };
}

export function ChallansClient({ initialData }: ChallansClientProps) {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState("ALL");

  const [isPending, startTransition] = useTransition();

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [printChallanId, setPrintChallanId] = useState<string | null>(null);
  const [deliverTargetChallan, setDeliverTargetChallan] = useState<any | null>(null);

  const refreshData = (status = statusFilter, q = search, dr = dateRange) => {
    startTransition(async () => {
      const res = await getDeliveryChallans({
        status,
        search: q,
        dateRange: dr,
      });
      if (res.success && res.challans && res.metrics) {
        setData({ challans: res.challans, metrics: res.metrics });
      } else {
        toast.error("Failed to refresh delivery challans");
      }
    });
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    refreshData(statusFilter, val, dateRange);
  };

  const handleStatusFilter = (val: string) => {
    setStatusFilter(val);
    refreshData(val, search, dateRange);
  };

  const handleDateRangeFilter = (val: string) => {
    setDateRange(val);
    refreshData(statusFilter, search, val);
  };

  const handleDispatchChallan = async (challan: any) => {
    const confirmed = await modal.confirm({
      title: "Dispatch Challan",
      message: `Mark Challan #${challan.challanNumber} as In Transit (Goods leaving the shop)?`,
      confirmText: "Yes, Out for Delivery",
    });

    if (confirmed) {
      const res = await updateChallanStatus(challan.id, ChallanStatus.IN_TRANSIT);
      if (res.success) {
        toast.success(`Challan #${challan.challanNumber} is now In Transit`);
        refreshData();
      } else {
        toast.error(res.error || "Failed to update status");
      }
    }
  };

  const handleDelete = async (challan: any) => {
    const confirmed = await modal.confirm({
      title: "Delete Challan",
      message: `Are you sure you want to delete Challan #${challan.challanNumber}? This action cannot be undone.`,
      confirmText: "Delete Challan",
      type: "danger",
    });

    if (confirmed) {
      const res = await deleteDeliveryChallan(challan.id);
      if (res.success) {
        toast.success("Delivery challan deleted");
        refreshData();
      } else {
        toast.error(res.error || "Failed to delete challan");
      }
    }
  };

  const handleWhatsAppQuickShare = (challan: any) => {
    const itemList = challan.items
      .map((it: any) => `• ${it.itemDescription} (${it.quantity} ${it.unitName})`)
      .join("\n");

    const message = `*DELIVERY CHALLAN - Crystal Press*\n\n` +
      `📦 *Challan No:* ${challan.challanNumber}\n` +
      `📅 *Date:* ${new Date(challan.dispatchDate).toLocaleDateString("en-IN")}\n` +
      `👤 *Consignee:* ${challan.customerName}\n` +
      (challan.vehicleNumber ? `🚚 *Vehicle No:* ${challan.vehicleNumber}\n` : "") +
      (challan.packageCount ? `📦 *Packages:* ${challan.packageCount}\n` : "") +
      `\n*Items Dispatched:*\n${itemList}\n\n` +
      `Status: *${challan.status.replace(/_/g, " ")}*\n\n` +
      `Goods dispatched in sound condition. Please check and acknowledge receipt upon delivery.`;

    const cleanPhone = challan.customerPhone?.replace(/\D/g, "") || "";
    const url = cleanPhone
      ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
  };

  const { challans, metrics } = data;

  const getStatusBadge = (st: ChallanStatus) => {
    switch (st) {
      case ChallanStatus.PREPARED:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Packed in Shop
          </span>
        );
      case ChallanStatus.IN_TRANSIT:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1">
            <Truck className="w-3 h-3" />
            In Transit
          </span>
        );
      case ChallanStatus.DELIVERED:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Delivered & Signed
          </span>
        );
      case ChallanStatus.CANCELLED:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-300 to-lime-500 flex items-center justify-center shadow-lime">
            <Truck className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Delivery Challans & Gate Passes
            </h1>
            <p className="text-xs text-slate-400">
              Goods dispatch notes, transporter gate passes & consignee proof of delivery
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-98"
        >
          <Plus className="w-4 h-4 text-lime-400" />
          <span>New Delivery Challan</span>
        </button>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Total Dispatches"
          value={metrics.total.toString()}
          subtitle={`${metrics.thisMonth} created this month`}
          icon={<Package className="w-5 h-5 text-slate-900" />}
          iconBg="bg-slate-100 text-slate-900 border border-slate-200/80"
          badge="Total"
          badgeColor="bg-slate-100 text-slate-700 border border-slate-200/80"
        />

        <StatCard
          title="In Transit"
          value={metrics.inTransit.toString()}
          subtitle="Out on delivery vehicle"
          icon={<Truck className="w-5 h-5 text-sky-700" />}
          iconBg="bg-sky-50 text-sky-800 border border-sky-200/80"
          badge="On the Road"
          badgeColor="bg-sky-50 text-sky-800 border border-sky-200/80"
        />

        <StatCard
          title="Delivered & Signed"
          value={metrics.delivered.toString()}
          subtitle="Proof of receipt acknowledged"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-700" />}
          iconBg="bg-emerald-50 text-emerald-800 border border-emerald-200/80"
          badge="Completed"
          badgeColor="bg-emerald-50 text-emerald-800 border border-emerald-200/80"
        />

        <StatCard
          title="Packed / Ready"
          value={metrics.prepared.toString()}
          subtitle="Awaiting pickup or driver"
          icon={<Clock className="w-5 h-5 text-amber-700" />}
          iconBg="bg-amber-50 text-amber-800 border border-amber-200/80"
          badge="Shop Floor"
          badgeColor="bg-amber-50 text-amber-800 border border-amber-200/80"
        />
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
          {[
            { id: "ALL", label: "All Dispatches" },
            { id: ChallanStatus.IN_TRANSIT, label: "In Transit" },
            { id: ChallanStatus.PREPARED, label: "Packed in Shop" },
            { id: ChallanStatus.DELIVERED, label: "Delivered" },
            { id: ChallanStatus.CANCELLED, label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Date Filter */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search challan, customer, vehicle..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 rounded-2xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400 font-medium"
            />
          </div>

          <select
            value={dateRange}
            onChange={(e) => handleDateRangeFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 rounded-2xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400 font-medium text-slate-700"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="THIS_WEEK">This Week</option>
            <option value="THIS_MONTH">This Month</option>
          </select>
        </div>
      </div>

      {/* Challans List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {challans.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
              <Truck className="w-7 h-7" />
            </div>
            <div className="text-slate-900 font-bold text-sm">No delivery challans found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search
                ? `No dispatches match "${search}". Try adjusting your filters.`
                : "Generate official delivery challans for job orders, boxes, and bulk printed goods."}
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              + Create First Challan
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[660px] text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Challan & Date</th>
                  <th className="py-3.5 px-4">Consignee / Deliver To</th>
                  <th className="py-3.5 px-4">Items & Packages</th>
                  <th className="py-3.5 px-4">Logistics & Vehicle</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {challans.map((challan) => (
                  <tr key={challan.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Challan Number & Date */}
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-lime-600" />
                        <span>{challan.challanNumber}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(challan.dispatchDate)}</span>
                      </div>
                      {challan.jobOrder && (
                        <div className="text-[10px] font-semibold text-purple-700 mt-1">
                          Job #{challan.jobOrder.jobOrderNumber}
                        </div>
                      )}
                    </td>

                    {/* Consignee */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{challan.customerName}</div>
                      {challan.customerPhone && (
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>+91 {challan.customerPhone}</span>
                        </div>
                      )}
                      {challan.deliveryAddress && (
                        <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span>{challan.deliveryAddress}</span>
                        </div>
                      )}
                    </td>

                    {/* Dispatched Items */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {challan.items[0]?.itemDescription}
                        {challan.items.length > 1 && (
                          <span className="text-slate-400 font-normal ml-1">
                            (+{challan.items.length - 1} more)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span className="font-bold text-slate-700">
                          {challan.totalQuantity.toLocaleString("en-IN")} pcs
                        </span>
                        {challan.packageCount && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600 font-medium">
                              {challan.packageCount}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Logistics */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-1">
                        <Truck className="w-3 h-3 text-slate-400" />
                        <span>{challan.vehicleNumber || "Counter Pickup"}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {challan.transporterName ? `${challan.transporterName} ` : ""}
                        {challan.lrNumber ? `(LR: ${challan.lrNumber})` : ""}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(challan.status)}
                      {challan.receivedBy && (
                        <div className="text-[10px] text-emerald-700 mt-1 font-medium">
                          Rcvd: {challan.receivedBy}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Print Button */}
                        <button
                          onClick={() => setPrintChallanId(challan.id)}
                          title="Print A4 Delivery Challan"
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span>Print</span>
                        </button>

                        {/* WhatsApp Button */}
                        <button
                          onClick={() => handleWhatsAppQuickShare(challan)}
                          title="Share via WhatsApp"
                          className="p-1.5 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Mark In-Transit if Prepared */}
                        {challan.status === ChallanStatus.PREPARED && (
                          <button
                            onClick={() => handleDispatchChallan(challan)}
                            className="px-2.5 py-1.5 bg-sky-50 text-sky-800 hover:bg-sky-100 rounded-xl text-xs font-bold transition-colors"
                          >
                            Dispatch
                          </button>
                        )}

                        {/* Mark Delivered if not delivered */}
                        {challan.status !== ChallanStatus.DELIVERED &&
                          challan.status !== ChallanStatus.CANCELLED && (
                            <button
                              onClick={() => setDeliverTargetChallan(challan)}
                              className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors"
                            >
                              Delivered
                            </button>
                          )}

                        {/* Delete option if not delivered */}
                        {challan.status !== ChallanStatus.DELIVERED && (
                          <button
                            onClick={() => handleDelete(challan)}
                            title="Delete Challan"
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateChallanModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => refreshData()}
      />

      <ChallanPrintModal
        isOpen={!!printChallanId}
        onClose={() => setPrintChallanId(null)}
        challanId={printChallanId}
      />

      <MarkDeliveredModal
        isOpen={!!deliverTargetChallan}
        onClose={() => setDeliverTargetChallan(null)}
        challan={deliverTargetChallan}
        onSuccess={() => refreshData()}
      />
    </div>
  );
}

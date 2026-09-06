"use client";

import React, { useState, useMemo } from "react";
import {
  UserPlus,
  Search,
  Phone,
  FileText,
  Banknote,
  Edit3,
  AlertTriangle,
  Users2,
  ShieldAlert,
  Share2,
  Printer,
  TrendingDown,
  Clock,
  CheckCircle2,
  QrCode,
  DollarSign,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { CustomerFormModal } from "@/components/customers/CustomerFormModal";
import { CollectPaymentModal } from "@/components/customers/CollectPaymentModal";
import { CustomerLedgerModal } from "@/components/customers/CustomerLedgerModal";
import { CustomerStatementModal } from "@/components/customers/CustomerStatementModal";
import { WalletRechargeModal } from "@/components/customers/WalletRechargeModal";
import { CustomerWalletPassbookModal } from "@/components/customers/CustomerWalletPassbookModal";
import { formatCurrency, cn } from "@/lib/utils";
import { Wallet, Star, Coins } from "lucide-react";

interface CustomersPageClientProps {
  initialCustomers: any[];
  initialMetrics?: {
    totalCustomers: number;
    totalReceivables: number;
    overdue30Amount: number;
    overdueCount: number;
    limitBreachedCount: number;
    collectionsThisMonth: number;
  };
  shopSettings?: any;
}

type FilterTab = "ALL" | "DUE_ONLY" | "OVERDUE_30" | "LIMIT_BREACHED";

export function CustomersPageClient({
  initialCustomers,
  initialMetrics,
  shopSettings,
}: CustomersPageClientProps) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [collectingCustomer, setCollectingCustomer] = useState<any | null>(null);
  const [viewingLedgerCustomer, setViewingLedgerCustomer] = useState<any | null>(null);
  const [statementCustomerId, setStatementCustomerId] = useState<string | null>(null);
  const [rechargeCustomer, setRechargeCustomer] = useState<any | null>(null);
  const [passbookCustomerId, setPassbookCustomerId] = useState<string | null>(null);

  // Compute or read metrics
  const metrics = initialMetrics || {
    totalCustomers: customers.length,
    totalReceivables: customers.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0),
    overdue30Amount: customers.filter((c) => c.isOverdue30).reduce((sum, c) => sum + c.currentBalance, 0),
    overdueCount: customers.filter((c) => c.isOverdue30).length,
    limitBreachedCount: customers.filter((c) => c.isLimitBreached).length,
    collectionsThisMonth: 0,
  };

  const filtered = useMemo(() => {
    let list = customers;

    if (activeTab === "DUE_ONLY") {
      list = list.filter((c) => c.currentBalance > 0);
    } else if (activeTab === "OVERDUE_30") {
      list = list.filter((c) => c.isOverdue30);
    } else if (activeTab === "LIMIT_BREACHED") {
      list = list.filter((c) => c.isLimitBreached);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q))
      );
    }
    return list;
  }, [customers, activeTab, search]);

  const handleWhatsAppQuickShare = (c: any) => {
    const shopName = shopSettings?.shopName || "Crystal Press";
    const shopPhones = [shopSettings?.phone1, shopSettings?.phone2].filter(Boolean).join(" / ");
    const upiId = shopSettings?.upiId || "crystalpress@upi";

    const message = `*ACCOUNT BALANCE - ${shopName}*\n\n` +
      `Dear *${c.name}*,\n\n` +
      `This is a gentle reminder that your current outstanding balance is: *${formatCurrency(c.currentBalance)}*.\n\n` +
      (c.currentBalance > 0
        ? `Kindly clear this at your earliest convenience via UPI:\n` +
          `🔹 *UPI ID:* \`${upiId}\`\n\n`
        : `Your balance is fully clear. Thank you for your partnership!\n\n`) +
      `Thank you,\n*${shopName}*\n${shopPhones || ""}`;

    const cleanPhone = c.phone?.replace(/\D/g, "") || "";
    const url = cleanPhone
      ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Udhaar & Credit Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Total Market Udhaar"
          value={formatCurrency(metrics.totalReceivables)}
          subtitle="Pending customer balances"
          icon={<Banknote className="w-5 h-5 text-amber-700" />}
          iconBg="bg-amber-50 text-amber-800 border border-amber-200/80"
          badge="Udhaar Book"
          badgeColor="bg-amber-50 text-amber-800 border border-amber-200/80"
        />

        <StatCard
          title="Overdue (> 30 Days)"
          value={formatCurrency(metrics.overdue30Amount)}
          subtitle={`${metrics.overdueCount} accounts high risk`}
          icon={<Clock className="w-5 h-5 text-rose-700" />}
          iconBg="bg-rose-50 text-rose-800 border border-rose-200/80"
          badge="High Risk"
          badgeColor="bg-rose-50 text-rose-800 border border-rose-200/80"
        />

        <StatCard
          title="Credit Limit Breached"
          value={`${metrics.limitBreachedCount} Accounts`}
          subtitle="Exceeded approved limit"
          icon={<ShieldAlert className="w-5 h-5 text-purple-700" />}
          iconBg="bg-purple-50 text-purple-800 border border-purple-200/80"
          badge="Over Limit"
          badgeColor="bg-purple-50 text-purple-800 border border-purple-200/80"
        />

        <StatCard
          title="Month's Recoveries"
          value={formatCurrency(metrics.collectionsThisMonth)}
          subtitle="Collections this month"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-700" />}
          iconBg="bg-emerald-50 text-emerald-800 border border-emerald-200/80"
          badge="Recovered"
          badgeColor="bg-emerald-50 text-emerald-800 border border-emerald-200/80"
        />
      </div>

      {/* Control Toolbar & Filter Tabs */}
      <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
          {[
            { id: "ALL", label: `All Accounts (${customers.length})` },
            { id: "DUE_ONLY", label: "Pending Udhaar" },
            { id: "OVERDUE_30", label: `Overdue >30d (${metrics.overdueCount})` },
            { id: "LIMIT_BREACHED", label: `Limit Exceeded (${metrics.limitBreachedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as FilterTab)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar & Add Button */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, address..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 rounded-2xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400 font-medium"
            />
          </div>

          <button
            onClick={() => {
              setEditingCustomer(null);
              setIsAddOpen(true);
            }}
            className="px-4 py-2 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 shadow-sm flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-4 h-4 text-lime-400" />
            <span>+ Add Customer</span>
          </button>
        </div>
      </div>

      {/* Customers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-16 bg-white rounded-3xl border border-slate-100 text-center text-slate-400">
            <Users2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No Customers Match Filter</h4>
            <p className="text-xs text-slate-400 mt-0.5">Adjust your search or filter criteria</p>
          </div>
        ) : (
          filtered.map((c) => {
            const hasDue = c.currentBalance > 0;
            const isNearLimit = c.creditLimit > 0 && c.currentBalance >= c.creditLimit * 0.8;

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-slate-900">{c.name}</h3>
                        {c.isLimitBreached && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-800 uppercase">
                            Limit Exceeded
                          </span>
                        )}
                        {c.isOverdue30 && !c.isLimitBreached && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 uppercase">
                            &gt;30d Overdue
                          </span>
                        )}
                      </div>

                      {c.phone && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>+91 {c.phone}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setEditingCustomer(c);
                        setIsAddOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                      title="Edit Profile"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {c.address && (
                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-1">📍 {c.address}</p>
                  )}

                  {/* Balance / Udhaar Status Card */}
                  <div
                    className={cn(
                      "mt-4 p-3 rounded-2xl border text-xs flex items-center justify-between",
                      hasDue
                        ? c.isLimitBreached || isNearLimit
                          ? "bg-rose-50 border-rose-200 text-rose-900"
                          : "bg-amber-50 border-amber-200 text-amber-900"
                        : "bg-slate-50 border-slate-100 text-slate-700"
                    )}
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                        {hasDue ? "Balance Due (Udhaar)" : "Account Balance"}
                      </span>
                      <div className="text-base font-black mt-0.5">
                        {formatCurrency(c.currentBalance)}
                      </div>
                    </div>

                    <div className="text-right text-[11px]">
                      {c.creditLimit > 0 ? (
                        <>
                          <span className="opacity-70">Limit:</span>
                          <div className="font-bold">{formatCurrency(c.creditLimit)}</div>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400">No Limit</span>
                      )}
                    </div>
                  </div>

                  {/* Store Credit Wallet & Loyalty Points Strip */}
                  <div className="mt-2.5 px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">
                          Store Credit
                        </span>
                        <span className="font-extrabold text-slate-800 text-xs">
                          {formatCurrency(c.walletBalance || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="h-6 w-px bg-slate-200" />

                    <div className="flex items-center gap-1.5 text-right">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">
                          Loyalty Points
                        </span>
                        <span className="font-extrabold text-amber-700 text-xs flex items-center gap-0.5 justify-end">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                          {(c.loyaltyPoints || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Controls */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                  {/* WhatsApp Reminder */}
                  {hasDue ? (
                    <button
                      onClick={() => handleWhatsAppQuickShare(c)}
                      title="Send WhatsApp Due Reminder"
                      className="p-2 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors shrink-0"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  ) : null}

                  {/* Top-Up Wallet Button */}
                  <button
                    onClick={() => setRechargeCustomer(c)}
                    title="Top-Up Store Credit Wallet"
                    className="p-2 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors shrink-0"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                  </button>

                  {/* Passbook Button */}
                  <button
                    onClick={() => setPassbookCustomerId(c.id)}
                    title="View Digital Passbook Ledger"
                    className="p-2 rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors shrink-0"
                  >
                    <Coins className="w-3.5 h-3.5" />
                  </button>

                  {/* Statement & UPI QR */}
                  <button
                    onClick={() => setStatementCustomerId(c.id)}
                    className="flex-1 min-w-[90px] py-1.5 px-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Statement</span>
                  </button>

                  {/* Collect Payment */}
                  {hasDue ? (
                    <button
                      onClick={() => setCollectingCustomer(c)}
                      className="flex-1 min-w-[70px] py-1.5 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 flex items-center justify-center gap-1 shadow-sm transition-colors"
                    >
                      <Banknote className="w-3.5 h-3.5 text-lime-400" />
                      <span>Pay</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setViewingLedgerCustomer(c)}
                      className="flex-1 min-w-[70px] py-1.5 px-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200 transition-colors"
                    >
                      Ledger
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Customer Form Modal */}
      <CustomerFormModal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEditingCustomer(null);
        }}
        customerToEdit={editingCustomer}
      />

      {/* Collect Payment Modal */}
      <CollectPaymentModal
        isOpen={!!collectingCustomer}
        onClose={() => setCollectingCustomer(null)}
        customer={collectingCustomer}
      />

      {/* Ledger Modal */}
      <CustomerLedgerModal
        isOpen={!!viewingLedgerCustomer}
        onClose={() => setViewingLedgerCustomer(null)}
        customer={viewingLedgerCustomer}
        onOpenCollectPayment={(cust) => setCollectingCustomer(cust)}
      />

      {/* Official A4 Statement & UPI QR Modal */}
      <CustomerStatementModal
        isOpen={!!statementCustomerId}
        onClose={() => setStatementCustomerId(null)}
        customerId={statementCustomerId}
        onOpenCollectPayment={(cust) => setCollectingCustomer(cust)}
      />

      {/* Wallet Recharge Modal */}
      <WalletRechargeModal
        isOpen={!!rechargeCustomer}
        onClose={() => setRechargeCustomer(null)}
        customer={rechargeCustomer}
        onSuccess={(newBalance) => {
          setCustomers((prev) =>
            prev.map((it) =>
              it.id === rechargeCustomer?.id ? { ...it, walletBalance: newBalance } : it
            )
          );
        }}
      />

      {/* Customer Wallet & Points Passbook Modal */}
      <CustomerWalletPassbookModal
        isOpen={!!passbookCustomerId}
        onClose={() => setPassbookCustomerId(null)}
        customerId={passbookCustomerId}
        onOpenTopUp={(cust) => {
          setPassbookCustomerId(null);
          setRechargeCustomer(cust);
        }}
      />
    </div>
  );
}

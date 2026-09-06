"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Printer,
  Send,
  Building2,
  Calendar,
  Phone,
  DollarSign,
  Plus,
  Loader2,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  CreditCard,
  Layers,
} from "lucide-react";
import { getVendorDetails } from "@/actions/vendors";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/stores/useSnackbarStore";
import { VendorPaymentModal } from "@/components/vendors/VendorPaymentModal";

interface VendorLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;
  onRefreshParent?: () => void;
}

export function VendorLedgerModal({
  isOpen,
  onClose,
  vendorId,
  onRefreshParent,
}: VendorLedgerModalProps) {
  const [loading, setLoading] = useState(true);
  const [vendorData, setVendorData] = useState<any | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [shopSettings, setShopSettings] = useState<any | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const res = await getVendorDetails(vendorId);
    if (res.success) {
      setVendorData(res.vendor);
      setLedger(res.ledger || []);
      setShopSettings(res.shopSettings);
    } else {
      toast.error(res.error || "Failed to load vendor ledger");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && vendorId) {
      loadData();
    }
  }, [isOpen, vendorId]);

  if (!isOpen) return null;

  const shopName = shopSettings?.shopName || "Crystal Press";
  const shopPhone = shopSettings?.phone1 || "+91 98765 43210";

  // HTML Generator for A4 Printable Vendor Statement
  const generateA4StatementHtml = () => {
    if (!vendorData) return "";

    const ledgerRows = [...ledger]
      .reverse() // Print in chronological order
      .map(
        (it: any, idx: number) => `
        <tr>
          <td style="padding: 8px 6px; text-align: center; color: #64748b; font-size: 10px;">${idx + 1}</td>
          <td style="padding: 8px; font-size: 10px; color: #0f172a; white-space: nowrap;">
            ${new Date(it.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </td>
          <td style="padding: 8px; font-weight: bold; font-size: 10px; color: #0f172a;">
            ${it.referenceNumber}
          </td>
          <td style="padding: 8px; font-size: 10px; color: #334155;">
            ${it.description}
          </td>
          <td style="padding: 8px; text-align: right; font-weight: bold; color: #0f172a; font-size: 10px;">
            ${it.debitAmount > 0 ? "₹" + Number(it.debitAmount).toFixed(2) : "-"}
          </td>
          <td style="padding: 8px; text-align: right; font-weight: bold; color: #16a34a; font-size: 10px;">
            ${it.creditAmount > 0 ? "₹" + Number(it.creditAmount).toFixed(2) : "-"}
          </td>
          <td style="padding: 8px; text-align: right; font-weight: 900; color: #0f172a; font-size: 10px; white-space: nowrap;">
            ₹${Number(it.runningBalance).toFixed(2)}
          </td>
        </tr>
      `
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Supplier Statement - ${vendorData.name}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          body { color: #0f172a; background: #ffffff; line-height: 1.4; padding: 6px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2.5px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
          .shop-title { font-size: 20px; font-weight: 900; text-transform: uppercase; }
          .badge { display: inline-block; background: #0f172a; color: #ffffff; font-weight: 900; font-size: 11px; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; }
          .vendor-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 16px; display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { border-bottom: 2px solid #cbd5e1; padding: 8px; text-align: left; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; }
          td { border-bottom: 1px solid #f1f5f9; }
          .total-box { display: flex; justify-content: flex-end; }
          .total-card { width: 260px; border-top: 2px solid #0f172a; padding-top: 8px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="shop-title">${shopName}</div>
            <div style="font-size: 10px; color: #64748b;">Phone: ${shopPhone}</div>
          </div>
          <div style="text-align: right;">
            <div class="badge">SUPPLIER STATEMENT OF ACCOUNT</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Date: ${new Date().toLocaleDateString("en-IN")}</div>
          </div>
        </div>

        <div class="vendor-box">
          <div>
            <div style="font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase;">SUPPLIER / PAPER MILL:</div>
            <div style="font-size: 14px; font-weight: 900; color: #0f172a;">${vendorData.name}</div>
            ${vendorData.contactPerson ? `<div>Contact: ${vendorData.contactPerson}</div>` : ""}
            ${vendorData.phone ? `<div>Phone: +91 ${vendorData.phone}</div>` : ""}
            ${vendorData.address ? `<div>Address: ${vendorData.address}</div>` : ""}
          </div>
          <div style="text-align: right;">
            <div style="font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase;">OUTSTANDING BALANCE:</div>
            <div style="font-size: 20px; font-weight: 900; color: #b91c1c;">₹${Number(vendorData.outstandingBalance).toFixed(2)}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Total Transactions: ${ledger.length}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th>Date</th>
              <th>Ref #</th>
              <th>Description</th>
              <th style="text-align: right;">Purchases (+)</th>
              <th style="text-align: right;">Payments (-)</th>
              <th style="text-align: right;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${ledgerRows}
          </tbody>
        </table>

        <div class="total-box">
          <div class="total-card">
            <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 14px;">
              <span>NET PAYABLE:</span>
              <span style="color: #b91c1c;">₹${Number(vendorData.outstandingBalance).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Hidden Iframe Print Handler
  const handlePrintStatement = () => {
    try {
      const htmlContent = generateA4StatementHtml();

      let iframe = document.getElementById("vendor-statement-iframe") as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "vendor-statement-iframe";
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0px";
        iframe.style.height = "0px";
        iframe.style.border = "none";
        iframe.style.zIndex = "-1000";
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      doc.open();
      doc.write(htmlContent);
      doc.close();

      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        toast.info(
          `Printing statement for ${vendorData?.name}`,
          "Print Dialog Opened"
        );
      }, 150);
    } catch (err: any) {
      console.error("Print failed:", err);
      window.print();
    }
  };

  // WhatsApp Share Builder
  const handleShareWhatsApp = () => {
    if (!vendorData) return;

    const message =
      `*SUPPLIER STATEMENT SUMMARY — ${shopName.toUpperCase()}*\n` +
      `🏢 *Supplier:* ${vendorData.name}\n` +
      `📅 *Statement Date:* ${new Date().toLocaleDateString("en-IN")}\n` +
      `-----------------------------\n` +
      `💰 *Current Outstanding Balance:* *${formatCurrency(vendorData.outstandingBalance)}*\n` +
      `📄 *Total Invoices / Vouchers:* ${ledger.length}\n` +
      `-----------------------------\n\n` +
      `_For detailed statement or bill reconciliation, please contact our accounts desk._\n*${shopName}*`;

    let cleanPhone = (vendorData.phone || "").replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, "_blank");
    toast.success("Opened WhatsApp with supplier statement summary", "WhatsApp Ready");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  {vendorData?.name || "Supplier Ledger"}
                </h3>
                {vendorData?.contactPerson && (
                  <span className="text-[11px] font-semibold text-slate-400">
                    ({vendorData.contactPerson})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Purchase bills, payment vouchers & statement of account
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              title="Share via WhatsApp"
            >
              <Send className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              type="button"
              onClick={handlePrintStatement}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-3.5 h-3.5 text-lime-400" />
              <span>Print Statement</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-20 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-lime-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading supplier ledger...</p>
          </div>
        ) : vendorData ? (
          <div className="flex-1 overflow-y-auto py-3 custom-scrollbar space-y-4">
            {/* Vendor Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Outstanding Balance
                </span>
                <div className="text-xl font-black text-rose-700 font-mono mt-1">
                  {formatCurrency(vendorData.outstandingBalance)}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Purchase Orders
                </span>
                <div className="text-xl font-black text-slate-900 font-mono mt-1">
                  {vendorData.purchaseOrders?.length || 0} bills
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Payments Cleared
                </span>
                <div className="text-xl font-black text-emerald-700 font-mono mt-1">
                  {vendorData.vendorPayments?.length || 0} vouchers
                </div>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center text-xs font-bold text-slate-600">
                <span>Transaction Timeline ({ledger.length} entries)</span>
                <span className="text-[11px] text-slate-400">Newest first</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/30 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Reference / Bill</th>
                      <th className="py-2.5 px-3">Details</th>
                      <th className="py-2.5 px-3 text-right">Debit (+)</th>
                      <th className="py-2.5 px-3 text-right">Credit (-)</th>
                      <th className="py-2.5 px-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledger.map((item) => {
                      const isPurchase = item.type === "PURCHASE_BILL";
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {new Date(item.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>

                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                isPurchase
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-emerald-100 text-emerald-900"
                              }`}
                            >
                              {isPurchase ? (
                                <ArrowDownRight className="w-3 h-3 text-amber-700" />
                              ) : (
                                <ArrowUpRight className="w-3 h-3 text-emerald-700" />
                              )}
                              <span>{isPurchase ? "Purchase" : "Payment"}</span>
                            </span>
                          </td>

                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {item.referenceNumber}
                          </td>

                          <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                            {item.description}
                          </td>

                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                            {item.debitAmount > 0 ? formatCurrency(item.debitAmount) : "-"}
                          </td>

                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700 font-mono">
                            {item.creditAmount > 0 ? formatCurrency(item.creditAmount) : "-"}
                          </td>

                          <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono">
                            {formatCurrency(item.runningBalance)}
                          </td>
                        </tr>
                      );
                    })}

                    {ledger.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-bold text-slate-600">No transactions recorded</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Purchases and payments for this vendor will appear here.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Embedded Payment Modal */}
      {isPaymentModalOpen && vendorData && (
        <VendorPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            loadData();
            if (onRefreshParent) onRefreshParent();
          }}
          vendor={vendorData}
          onSuccess={() => {
            loadData();
            if (onRefreshParent) onRefreshParent();
          }}
        />
      )}
    </div>
  );
}

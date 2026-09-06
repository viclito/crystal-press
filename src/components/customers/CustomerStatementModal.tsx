"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Printer,
  Share2,
  Banknote,
  QrCode,
  FileText,
  Calendar,
  Phone,
  MapPin,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { getCustomerStatementDetails } from "@/actions/customers";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/stores/useSnackbarStore";

interface CustomerStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
  onOpenCollectPayment?: (customer: any) => void;
}

export function CustomerStatementModal({
  isOpen,
  onClose,
  customerId,
  onOpenCollectPayment,
}: CustomerStatementModalProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen && customerId) {
      setLoading(true);
      getCustomerStatementDetails(customerId).then((res) => {
        if (res.success && res.customer) {
          setData(res);
        } else {
          toast.error(res.error || "Failed to load customer statement");
        }
        setLoading(false);
      });
    }
  }, [isOpen, customerId]);

  if (!isOpen || !customerId) return null;

  const customer = data?.customer;
  const ledger = data?.ledger || [];
  const totals = data?.totals || { totalDebit: 0, totalCredit: 0, balanceDue: 0 };
  const shop = data?.shopSettings || {};

  const shopName = shop.shopName || "Crystal Press";
  const shopTagline = shop.tagline || "Commercial Offset & Digital Printing Press";
  const shopAddress = [shop.addressLine1, shop.addressLine2].filter(Boolean).join(", ");
  const shopPhones = [shop.phone1, shop.phone2].filter(Boolean).join(" / ");
  const upiId = shop.upiId || "crystalpress@upi";
  const upiPayeeName = shop.upiPayeeName || shopName;

  // Dynamic UPI Payment Link & QR Code
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiPayeeName)}&am=${Math.max(0, totals.balanceDue)}&cu=INR&tn=${encodeURIComponent(`Payment for ${customer?.name || "Print Order"}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUrl)}`;

  // Generate A4 Statement HTML for Hidden Iframe
  const generateA4Html = () => {
    if (!customer) return "";

    const ledgerRows = ledger
      .map(
        (it: any, idx: number) => `
        <tr>
          <td style="padding: 7px 6px; text-align: center; color: #64748b; font-size: 10px; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
          <td style="padding: 7px 8px; font-size: 10px; color: #0f172a; white-space: nowrap; border-bottom: 1px solid #e2e8f0;">
            ${new Date(it.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </td>
          <td style="padding: 7px 8px; font-weight: bold; font-size: 10px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
            ${it.referenceType}
          </td>
          <td style="padding: 7px 8px; font-size: 10px; color: #334155; border-bottom: 1px solid #e2e8f0;">
            ${it.notes || "-"}
          </td>
          <td style="padding: 7px 8px; text-align: right; font-weight: bold; color: #dc2626; font-size: 10px; border-bottom: 1px solid #e2e8f0;">
            ${it.debitAmount > 0 ? "₹" + it.debitAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "-"}
          </td>
          <td style="padding: 7px 8px; text-align: right; font-weight: bold; color: #16a34a; font-size: 10px; border-bottom: 1px solid #e2e8f0;">
            ${it.creditAmount > 0 ? "₹" + it.creditAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "-"}
          </td>
          <td style="padding: 7px 8px; text-align: right; font-weight: 900; color: #0f172a; font-size: 10px; border-bottom: 1px solid #e2e8f0;">
            ₹${it.runningBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
        <title>Account Statement - ${customer.name}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          body { color: #0f172a; background: #ffffff; line-height: 1.4; padding: 4px; }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px;">
          <div>
            <h1 style="font-size: 22px; font-weight: 900; color: #0f172a; text-transform: uppercase;">${shopName}</h1>
            <p style="font-size: 10px; color: #475569; font-weight: 600; margin-top: 2px;">${shopTagline}</p>
            <p style="font-size: 9px; color: #64748b; margin-top: 3px;">
              ${shopAddress ? shopAddress + " • " : ""}Phone: ${shopPhones || "+91 98765 43210"}
            </p>
          </div>
          <div style="text-align: right;">
            <div style="display: inline-block; padding: 4px 10px; background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 900; border-radius: 6px;">
              CUSTOMER ACCOUNT STATEMENT
            </div>
            <div style="font-size: 9px; color: #64748b; margin-top: 4px;">
              Statement Date: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>

        <!-- Meta Grid -->
        <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 14px; margin-bottom: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
          <div>
            <span style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">ACCOUNT HOLDER</span>
            <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 2px;">${customer.name}</div>
            ${customer.phone ? `<div style="font-size: 10px; color: #475569; margin-top: 2px;">Phone: +91 ${customer.phone}</div>` : ""}
            ${customer.address ? `<div style="font-size: 9.5px; color: #64748b; margin-top: 2px; line-height: 1.3;">Address: ${customer.address}</div>` : ""}
          </div>

          <!-- Balance Summary & UPI Box -->
          <div style="border-left: 1px solid #cbd5e1; padding-left: 14px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #dc2626;">OUTSTANDING BALANCE (UDHAAR)</span>
              <div style="font-size: 18px; font-weight: 900; color: #dc2626; margin-top: 2px;">
                ₹${totals.balanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div style="font-size: 9px; color: #64748b; margin-top: 3px;">
                Total Billed: ₹${totals.totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}<br/>
                Total Paid: ₹${totals.totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>

            <!-- UPI QR -->
            ${totals.balanceDue > 0 ? `
              <div style="text-align: center; margin-left: 10px;">
                <img src="${qrCodeUrl}" style="width: 75px; height: 75px; border-radius: 6px; border: 1px solid #cbd5e1;" alt="UPI QR" />
                <div style="font-size: 7.5px; font-weight: bold; color: #0f172a; margin-top: 2px;">Scan & Pay (UPI)</div>
              </div>
            ` : ""}
          </div>
        </div>

        <!-- Ledger Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
          <thead>
            <tr style="background: #f1f5f9; color: #475569; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">
              <th style="padding: 8px 6px; text-align: center; width: 30px;">#</th>
              <th style="padding: 8px; text-align: left; width: 85px;">Date</th>
              <th style="padding: 8px; text-align: left; width: 90px;">Type</th>
              <th style="padding: 8px; text-align: left;">Details / Notes</th>
              <th style="padding: 8px; text-align: right; width: 80px;">Debit (+Bill)</th>
              <th style="padding: 8px; text-align: right; width: 80px;">Credit (-Paid)</th>
              <th style="padding: 8px; text-align: right; width: 85px;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${ledgerRows.length > 0 ? ledgerRows : `
              <tr><td colspan="7" style="padding: 16px; text-align: center; font-size: 10px; color: #64748b;">No transaction entries found</td></tr>
            `}
            <tr style="background: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1;">
              <td colspan="4" style="padding: 8px; text-align: right; font-size: 10px; color: #475569;">Closing Balance Due:</td>
              <td style="padding: 8px; text-align: right; font-size: 10px; color: #dc2626;">₹${totals.totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              <td style="padding: 8px; text-align: right; font-size: 10px; color: #16a34a;">₹${totals.totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              <td style="padding: 8px; text-align: right; font-size: 11px; font-weight: 900; color: #0f172a;">₹${totals.balanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <!-- Payment Instructions & Signatures -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; padding-top: 12px;">
          <div style="font-size: 8.5px; color: #64748b; line-height: 1.4;">
            <strong>UPI ID:</strong> ${upiId}<br/>
            <strong>Payee Name:</strong> ${upiPayeeName}<br/>
            Please quote your customer account name when paying via NEFT/UPI.
          </div>

          <div style="text-align: center; border-top: 1px solid #cbd5e1; padding-top: 8px; width: 180px;">
            <div style="font-size: 9.5px; font-weight: bold; color: #0f172a;">For ${shopName}</div>
            <div style="font-size: 8px; color: #64748b; margin-top: 2px;">Authorised Signatory</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const iframe = printFrameRef.current;
    if (!iframe) {
      toast.error("Printer frame not ready");
      return;
    }

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(generateA4Html());
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  };

  const handleShareWhatsApp = () => {
    if (!customer) return;

    const message = `*ACCOUNT STATEMENT - ${shopName}*\n\n` +
      `Dear *${customer.name}*,\n\n` +
      `Here is your account statement balance summary:\n` +
      `📌 *Total Invoiced:* ₹${totals.totalDebit.toLocaleString("en-IN")}\n` +
      `✅ *Total Paid:* ₹${totals.totalCredit.toLocaleString("en-IN")}\n` +
      `⚠️ *Outstanding Due:* *₹${totals.balanceDue.toLocaleString("en-IN")}*\n\n` +
      (totals.balanceDue > 0
        ? `Please settle the outstanding balance via UPI:\n` +
          `🔹 *UPI ID:* \`${upiId}\`\n` +
          `🔹 *Payee Name:* ${upiPayeeName}\n\n`
        : `Your account is fully clear. Thank you for your business!\n\n`) +
      `Thank you,\n*${shopName}*\n${shopPhones || ""}`;

    const cleanPhone = customer.phone?.replace(/\D/g, "") || "";
    const url = cleanPhone
      ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-lime-300 to-lime-500 flex items-center justify-center shadow-lime">
              <FileText className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Customer Account Statement
              </h2>
              <p className="text-xs text-slate-400">
                {customer ? `${customer.name} (+91 ${customer.phone || "N/A"})` : "Loading..."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="p-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Total Udhaar:</span>
            <span className="text-sm font-black text-rose-600">
              {formatCurrency(totals.balanceDue)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {totals.balanceDue > 0 && onOpenCollectPayment && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCollectPayment(customer);
                }}
                className="px-3 py-1.5 bg-lime-400 hover:bg-lime-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Collect Payment</span>
              </button>
            )}

            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp Due Reminder</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-lime-400" />
              <span>Print A4 Statement</span>
            </button>
          </div>
        </div>

        {/* Statement Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-50/50">
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400">Loading statement details...</div>
          ) : !customer ? (
            <div className="py-20 text-center text-xs text-rose-500">Customer not found</div>
          ) : (
            <>
              {/* Account Balance & UPI Payment Box */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Outstanding Balance Due (Udhaar)
                  </span>
                  <div className="text-2xl font-black text-rose-600">
                    {formatCurrency(totals.balanceDue)}
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Total Invoiced: <strong>{formatCurrency(totals.totalDebit)}</strong></span>
                    <span>Total Paid: <strong className="text-emerald-600">{formatCurrency(totals.totalCredit)}</strong></span>
                  </div>
                </div>

                {/* Scannable Dynamic UPI QR Code */}
                {totals.balanceDue > 0 && (
                  <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                    <img
                      src={qrCodeUrl}
                      alt="UPI QR Code"
                      className="w-20 h-20 rounded-xl border border-slate-200 bg-white"
                    />
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1">
                        <QrCode className="w-3.5 h-3.5 text-lime-600" />
                        <span>Scan with any UPI App</span>
                      </div>
                      <div className="text-[10px] text-slate-400">GPay, PhonePe, Paytm, BHIM</div>
                      <div className="font-mono text-[10px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 inline-block mt-1">
                        {upiId}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Transactions Timeline */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
                  Transaction & Ledger History ({ledger.length})
                </div>

                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto custom-scrollbar">
                  {ledger.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No transaction entries recorded yet
                    </div>
                  ) : (
                    ledger.map((it: any) => {
                      const isDebit = it.debitAmount > 0;
                      return (
                        <div
                          key={it.id}
                          className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                                isDebit ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {isDebit ? (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">
                                {it.notes || it.referenceType}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                <span>{formatDate(it.createdAt)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className={`font-bold ${isDebit ? "text-rose-600" : "text-emerald-600"}`}>
                              {isDebit ? `+${formatCurrency(it.debitAmount)}` : `-${formatCurrency(it.creditAmount)}`}
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold">
                              Bal: {formatCurrency(it.runningBalance)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Hidden Isolated Iframe for Clean A4 Printing */}
        <iframe
          ref={printFrameRef}
          title="Print Customer Statement"
          style={{ position: "absolute", width: "0px", height: "0px", border: "none", opacity: 0 }}
        />
      </div>
    </div>
  );
}

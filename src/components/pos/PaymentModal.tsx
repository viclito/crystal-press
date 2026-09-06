"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, QrCode, Banknote, CreditCard, Clock, Printer, MessageSquare, Sparkles, X, FileText, Wallet } from "lucide-react";
import { usePOSStore } from "@/stores/usePOSStore";
import { processCheckout } from "@/actions/pos";
import { printThermalReceipt } from "@/utils/thermalPrinter";
import { generateWhatsAppBillUrl } from "@/utils/whatsapp";
import { toast } from "@/stores/useSnackbarStore";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { modal } from "@/stores/useDialogStore";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopSettings?: any;
}

export function PaymentModal({ isOpen, onClose, shopSettings }: PaymentModalProps) {
  const {
    items,
    customerId,
    customerName,
    customerPhone,
    customerWalletBalance,
    customerLoyaltyPoints,
    redeemedPoints,
    pointsDiscount,
    subTotal,
    totalDiscount,
    taxTotal,
    roundOff,
    netTotal,
    clearCart,
    setLastCompletedInvoice,
  } = usePOSStore();

  const total = Number(netTotal()) || 0;
  const walletBal = Number(customerWalletBalance) || 0;
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CARD" | "WALLET" | "CREDIT_UDHAAR">("CASH");
  const [cashTendered, setCashTendered] = useState<number>(total);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<any | null>(null);

  if (!isOpen) return null;

  const changeDue = Math.max(0, cashTendered - total);
  const upiVpa = shopSettings?.upiId || "crystalpress@okaxis";
  const payeeName = shopSettings?.shopName || "Crystal Press";
  const upiQrString = `upi://pay?pa=${upiVpa}&pn=${encodeURIComponent(payeeName)}&am=${total.toFixed(2)}&cu=INR&tn=POS%20Bill`;

  const handleCompleteSale = async () => {
    const isUuid = (val?: string | null) =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

    const validCustomerId = isUuid(customerId) ? customerId : undefined;

    if (paymentMode === "WALLET") {
      if (!validCustomerId) {
        toast.error("Please select a registered customer to pay using Store Credit Wallet");
        return;
      }
      if (walletBal < total) {
        toast.error(`Insufficient wallet balance (Available: ₹${walletBal.toFixed(2)})`);
        return;
      }
    }

    setIsProcessing(true);

    const paidAmount = paymentMode === "CREDIT_UDHAAR" ? 0 : total;

    const payload = {
      customerId: validCustomerId,
      customerName: customerName || "Walk-in Customer",
      customerPhone: customerPhone || undefined,
      items: items.map((i) => ({
        productId: i.productId,
        skuCode: i.skuCode,
        name: i.name,
        unitPrice: i.unitPrice,
        costPrice: i.costPrice || 0,
        quantity: i.quantity,
        unitName: i.unitName,
        discountAmount: i.discountAmount,
        taxPercent: i.taxPercent,
      })),
      subTotal: subTotal(),
      discountAmount: totalDiscount(),
      taxAmount: taxTotal(),
      roundOff: roundOff(),
      netTotal: total,
      paidAmount,
      paymentMethod: paymentMode as any,
      pointsRedeemed: redeemedPoints,
      pointsDiscount: pointsDiscount,
      walletPaid: paymentMode === "WALLET" ? total : 0,
    };

    const res = await processCheckout(payload);

    if (res.success) {
      setCompletedInvoice(res);
      setLastCompletedInvoice(res);

      // Trigger Confetti Feedback
      try {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      } catch (e) {}

      // Auto-trigger clean modern Thermal Print
      printThermalReceipt({
        shopName: shopSettings?.shopName || "CRYSTAL PRESS",
        tagline: shopSettings?.tagline || "Printing Press & Stationery Retail",
        address: shopSettings?.addressLine1 || "Market Complex, Opp. Town Hall",
        phone: shopSettings?.phone1 || "+91 98765 43210",
        email: shopSettings?.email || "billing@crystalpress.com",
        upiId: shopSettings?.upiId || "crystalpress@okaxis",
        invoiceNumber: res.invoiceNumber!,
        customerName: res.customerName,
        customerPhone: res.customerPhone || undefined,
        items: (res.items || []).map((it: any) => ({
          name: it.itemDescription || it.name || "Item",
          qty: Number(it.quantity || it.qty || 1),
          price: Number(it.unitSalePrice || it.price || 0),
          total: Number(it.lineTotal || it.total || 0),
          unit: it.unitName || it.unit || "pcs",
        })),
        subTotal: subTotal(),
        discountAmount: totalDiscount(),
        taxAmount: taxTotal(),
        roundOff: roundOff(),
        netTotal: total,
        paidAmount: Number(res.paidAmount),
        balanceDue: Number(res.balanceDue),
        paymentMethod: res.paymentMethod!,
      }, "thermal");

      toast.success(
        `Invoice ${res.invoiceNumber} generated for ₹${total.toFixed(2)}`,
        "Checkout Successful"
      );
    } else {
      let errorMsg = (res as any).error || "Checkout failed";
      try {
        if (typeof errorMsg === "string" && errorMsg.startsWith("[") && errorMsg.endsWith("]")) {
          const parsed = JSON.parse(errorMsg);
          if (Array.isArray(parsed) && parsed[0]?.message) {
            errorMsg = parsed
              .map((p: any) => `${p.path && p.path.length ? p.path.join(".") + ": " : ""}${p.message}`)
              .join(", ");
          }
        }
      } catch {}
      modal.error(errorMsg, "Checkout Issue");
      toast.error(errorMsg, "Payment Error");
    }

    setIsProcessing(false);
  };

  const handleReprint = (format: "thermal" | "a4") => {
    if (!completedInvoice) return;
    printThermalReceipt({
      shopName: shopSettings?.shopName || "CRYSTAL PRESS",
      tagline: shopSettings?.tagline || "Printing Press & Stationery Retail",
      address: shopSettings?.addressLine1 || "Market Complex, Opp. Town Hall",
      phone: shopSettings?.phone1 || "+91 98765 43210",
      email: shopSettings?.email || "billing@crystalpress.com",
      upiId: shopSettings?.upiId || "crystalpress@okaxis",
      invoiceNumber: completedInvoice.invoiceNumber,
      customerName: completedInvoice.customerName,
      customerPhone: completedInvoice.customerPhone || undefined,
      items: (completedInvoice.items || []).map((it: any) => ({
        name: it.itemDescription || it.name || "Item",
        qty: Number(it.quantity || it.qty || 1),
        price: Number(it.unitSalePrice || it.price || 0),
        total: Number(it.lineTotal || it.total || 0),
        unit: it.unitName || it.unit || "pcs",
      })),
      subTotal: Number(completedInvoice.netTotal),
      netTotal: Number(completedInvoice.netTotal),
      paidAmount: Number(completedInvoice.paidAmount),
      balanceDue: Number(completedInvoice.balanceDue),
      paymentMethod: completedInvoice.paymentMethod,
    }, format);
  };

  const handleFinishAndReset = () => {
    clearCart();
    setCompletedInvoice(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        {/* If Checkout is Completed */}
        {completedInvoice ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-lime-100 text-lime-800 rounded-3xl mx-auto flex items-center justify-center shadow-lime">
              <Sparkles className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                Sale Completed Successfully
              </span>
              <h3 className="text-2xl font-black text-slate-900 mt-2">
                Invoice #{completedInvoice.invoiceNumber}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Net Total: <strong className="text-slate-900">₹{Number(completedInvoice.netTotal || 0).toFixed(2)}</strong> via {completedInvoice.paymentMethod}
              </p>
            </div>

            {/* Quick Post-Sale Actions (Thermal / A4 / WhatsApp) */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleReprint("thermal")}
                className="py-3 rounded-2xl border border-slate-200 text-slate-800 font-bold text-xs hover:bg-slate-50 flex flex-col items-center justify-center gap-1 shadow-sm"
              >
                <Printer className="w-4 h-4 text-slate-700" />
                <span>80mm Thermal</span>
              </button>

              <button
                type="button"
                onClick={() => handleReprint("a4")}
                className="py-3 rounded-2xl border border-slate-200 text-slate-800 font-bold text-xs hover:bg-slate-50 flex flex-col items-center justify-center gap-1 shadow-sm"
              >
                <FileText className="w-4 h-4 text-slate-700" />
                <span>A4 Tax Invoice</span>
              </button>

              {customerPhone ? (
                <a
                  href={generateWhatsAppBillUrl(customerPhone, {
                    customerName: completedInvoice.customerName,
                    invoiceNumber: completedInvoice.invoiceNumber,
                    netTotal: completedInvoice.netTotal,
                    itemCount: completedInvoice.items.length,
                    paymentMethod: completedInvoice.paymentMethod,
                    balanceDue: completedInvoice.balanceDue,
                  })}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 flex flex-col items-center justify-center gap-1 shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              ) : (
                <div className="py-3 rounded-2xl bg-slate-50 text-slate-400 font-medium text-xs flex flex-col items-center justify-center gap-1 border border-slate-100">
                  <MessageSquare className="w-4 h-4 text-slate-300" />
                  <span>No Phone</span>
                </div>
              )}
            </div>

            <button
              onClick={handleFinishAndReset}
              className="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-extrabold text-sm hover:bg-slate-800 shadow-md transition-transform active:scale-98 mt-2"
            >
              Next Customer (Enter)
            </button>
          </div>
        ) : (
          /* Payment Selection Step */
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Tender & Complete Sale</h3>
                <p className="text-xs text-slate-400">Total Payable: <strong className="text-slate-900">₹{total.toFixed(2)}</strong></p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Payment Method Selector Grid */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {[
                { id: "CASH", label: "Cash", icon: Banknote },
                { id: "UPI", label: "UPI QR", icon: QrCode },
                { id: "CARD", label: "Card", icon: CreditCard },
                { id: "WALLET", label: "Wallet", icon: Wallet },
                { id: "CREDIT_UDHAAR", label: "Udhaar", icon: Clock },
              ].map((m) => {
                const Icon = m.icon;
                const active = paymentMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMode(m.id as any)}
                    className={cn(
                      "p-2.5 sm:p-3 rounded-2xl border flex flex-col items-center gap-1 text-xs font-bold transition-all",
                      active
                        ? "border-slate-900 bg-slate-900 text-white shadow-md"
                        : "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", active ? "text-lime-400" : "text-slate-500")} />
                    <span className="truncate max-w-full text-[11px] sm:text-xs">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Cash Mode Change Calculator */}
            {paymentMode === "CASH" && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Cash Given by Customer (₹):</span>
                  <input
                    type="number"
                    value={cashTendered || ""}
                    onChange={(e) => setCashTendered(Number(e.target.value) || 0)}
                    className="w-28 text-right px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>

                {/* Quick denomination pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {[100, 200, 500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setCashTendered(amt)}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                    >
                      ₹{amt}
                    </button>
                  ))}
                  <button
                    onClick={() => setCashTendered(total)}
                    className="px-2.5 py-1 bg-lime-100 text-lime-900 rounded-lg text-[11px] font-bold"
                  >
                    Exact
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500">Change to Return:</span>
                  <span className="text-base font-extrabold text-emerald-700">
                    ₹{changeDue.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* UPI QR Mode */}
            {paymentMode === "UPI" && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col items-center text-center">
                <p className="text-xs font-bold text-slate-700 mb-2">Scan & Pay via GPay / PhonePe / Paytm</p>
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <QRCodeSVG value={upiQrString} size={150} level="M" />
                </div>
                <div className="text-sm font-black text-slate-900 mt-2">₹{total.toFixed(2)}</div>
                <span className="text-[10px] text-slate-400">{upiVpa}</span>
              </div>
            )}

            {/* Store Credit Wallet Mode */}
            {paymentMode === "WALLET" && (
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{customerName}</div>
                      <div className="text-[10px] text-slate-500">Store Credit Wallet</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 font-medium">Available Balance</div>
                    <div className="text-sm font-black text-emerald-700">
                      ₹{walletBal.toFixed(2)}
                    </div>
                  </div>
                </div>

                {!customerId ? (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-semibold">
                    ⚠️ Walk-in customers cannot pay with Store Credit. Please press F4 or select a registered customer first.
                  </div>
                ) : walletBal >= total ? (
                  <div className="p-2.5 bg-emerald-100/60 border border-emerald-300/80 rounded-xl text-emerald-900 text-[11px] space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <span>✓ Wallet balance is sufficient</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-emerald-800">
                      <span>Remaining Balance after deduction:</span>
                      <strong className="font-mono">₹{(walletBal - total).toFixed(2)}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-100/70 border border-amber-300/80 rounded-xl text-amber-900 text-[11px] space-y-1">
                    <div className="font-bold">⚠️ Insufficient Wallet Balance</div>
                    <div>
                      This bill is <strong>₹{total.toFixed(2)}</strong>, but the customer only has{" "}
                      <strong>₹{walletBal.toFixed(2)}</strong>.
                    </div>
                    <p className="text-[10px] text-amber-800">
                      Please top up the wallet in the Customers page, or choose Cash/UPI/Card.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Udhaar / Credit Mode */}
            {paymentMode === "CREDIT_UDHAAR" && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/70 text-xs text-amber-900 space-y-1">
                <div className="font-bold">Customer Credit (Udhaar) Billing:</div>
                <p>
                  This bill of <strong>₹{total.toFixed(2)}</strong> will be added as an outstanding balance to{" "}
                  <strong>{customerName}</strong>.
                </p>
              </div>
            )}

            {/* Complete Sale Button */}
            <button
              disabled={isProcessing}
              onClick={handleCompleteSale}
              className="w-full py-4 rounded-2xl bg-slate-900 text-white font-extrabold text-sm hover:bg-slate-800 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isProcessing ? (
                <span>Recording Sale...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 text-lime-400" />
                  <span>Confirm Payment & Print (F8)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

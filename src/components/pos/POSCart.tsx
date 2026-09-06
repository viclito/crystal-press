"use client";

import React, { useState } from "react";
import {
  Trash2,
  Plus,
  Minus,
  UserCheck,
  PauseCircle,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  Camera,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Star,
  Wallet,
  Coins,
  X,
} from "lucide-react";
import { usePOSStore } from "@/stores/usePOSStore";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "@/stores/useSnackbarStore";

interface POSCartProps {
  onOpenPayment: () => void;
  onOpenCustomerModal: () => void;
  onOpenHeldBills: () => void;
  onOpenScanner?: () => void;
  shopSettings?: any;
}

export function POSCart({
  onOpenPayment,
  onOpenCustomerModal,
  onOpenHeldBills,
  onOpenScanner,
  shopSettings,
}: POSCartProps) {
  const {
    items,
    customerId,
    customerName,
    customerPhone,
    customerBalance,
    customerWalletBalance,
    customerLoyaltyPoints,
    redeemedPoints,
    pointsDiscount,
    globalDiscount,
    heldBills,
    subTotal,
    totalDiscount,
    taxTotal,
    roundOff,
    netTotal,
    updateQuantity,
    removeItem,
    clearCart,
    holdCurrentBill,
    setGlobalDiscount,
    setRedeemedPoints,
  } = usePOSStore();

  const walletBal = Number(customerWalletBalance) || 0;
  const loyaltyPts = Number(customerLoyaltyPoints) || 0;
  const ptsRedeemed = Number(redeemedPoints) || 0;
  const ptsDiscount = Number(pointsDiscount) || 0;
  const cartSub = Number(subTotal()) || 0;

  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [pointsInput, setPointsInput] = useState<string>("");

  const isLoyaltyEnabled = shopSettings?.isLoyaltyEnabled ?? true;
  const loyaltyPointValue = Number(shopSettings?.loyaltyPointValue ?? 1);
  const loyaltyDiscountType = shopSettings?.loyaltyDiscountType || "RUPEES";
  const maxLoyaltyDiscountPercent = Number(shopSettings?.maxLoyaltyDiscountPercent ?? 50);

  // Calculate discount based on admin rules
  const calculatePointsDiscount = (pts: number) => {
    if (cartSub <= 0 || pts <= 0) return 0;
    const maxDiscountCap = (cartSub * maxLoyaltyDiscountPercent) / 100;
    let disc = 0;
    if (loyaltyDiscountType === "PERCENT") {
      const pct = Math.min(maxLoyaltyDiscountPercent, pts * loyaltyPointValue);
      disc = (cartSub * pct) / 100;
    } else {
      disc = Math.min(maxDiscountCap, pts * loyaltyPointValue);
    }
    return Math.min(cartSub, Math.round(disc * 100) / 100);
  };

  const maxRedeemablePoints = React.useMemo(() => {
    if (!loyaltyPts || loyaltyPts <= 0) return 0;
    if (cartSub <= 0) return 0;
    const maxDiscountCap = (cartSub * maxLoyaltyDiscountPercent) / 100;
    if (loyaltyDiscountType === "PERCENT") {
      if (loyaltyPointValue <= 0) return 0;
      const ptsForMax = Math.ceil(maxLoyaltyDiscountPercent / loyaltyPointValue);
      return Math.min(loyaltyPts, ptsForMax);
    } else {
      if (loyaltyPointValue <= 0) return 0;
      const ptsForMax = Math.floor(maxDiscountCap / loyaltyPointValue);
      return Math.min(loyaltyPts, ptsForMax);
    }
  }, [loyaltyPts, cartSub, maxLoyaltyDiscountPercent, loyaltyDiscountType, loyaltyPointValue]);

  const handleApplyRedeem = () => {
    const pts = Math.min(maxRedeemablePoints, Math.max(0, parseInt(pointsInput) || 0));
    if (pts <= 0) {
      setRedeemedPoints(0, 0);
      setIsRedeemModalOpen(false);
      return;
    }
    const disc = calculatePointsDiscount(pts);
    setRedeemedPoints(pts, disc);
    setIsRedeemModalOpen(false);
    toast.success(`Applied ${pts} loyalty points (-₹${disc.toFixed(2)})!`);
  };

  const total = netTotal();
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl p-3.5 sm:p-4 border border-slate-100/90 shadow-[0_2px_14px_rgba(0,0,0,0.02)] select-none">
      {/* 1. Customer Info & Quick Action Bar (Pinned Top) */}
      <div className="shrink-0">
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 gap-2">
          {/* Customer Button */}
          <button
            onClick={onOpenCustomerModal}
            className="flex items-center gap-2 text-left p-1.5 rounded-2xl hover:bg-slate-50 transition-colors group flex-1 min-w-0"
            title="Click or press F4 to select customer"
          >
            <div className="w-8 h-8 rounded-xl bg-lime-100 text-lime-800 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-lime-200 transition-colors">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-slate-900 group-hover:text-lime-700 transition-colors truncate">
                {customerName}
              </div>
              <div className="text-[10px] text-slate-400 font-medium truncate">
                {customerPhone ? `+91 ${customerPhone}` : "Walk-in (Press F4 to change)"}
              </div>
            </div>
          </button>

          {/* Quick Header Actions: Camera Scanner & Held Bills */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                title="Scan Barcode via Camera / Webcam"
                className="px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
              >
                <Camera className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Scan</span>
              </button>
            )}

            <button
              onClick={onOpenHeldBills}
              title="View Held Bills (Press F7 to hold current bill)"
              className="relative px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs active:scale-95"
            >
              <PauseCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>Held ({heldBills.length})</span>
              {heldBills.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute -top-1 -right-1" />
              )}
            </button>
          </div>
        </div>

        {/* Customer Wallet & Loyalty Points Badge Strip */}
        {customerId && (
          <div className="flex items-center justify-between gap-1.5 px-3 py-1.5 mb-2 bg-slate-50/80 border border-slate-200/70 rounded-2xl text-[11px]">
            <div className="flex items-center gap-3">
              <span className="font-medium text-slate-600 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Wallet:</span>
                <strong className={walletBal > 0 ? "text-emerald-700 font-bold" : "text-slate-700 font-bold"}>
                  {formatCurrency(walletBal)}
                </strong>
              </span>
              <span className="font-medium text-slate-600 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span>Points:</span>
                <strong className={loyaltyPts > 0 ? "text-amber-700 font-bold" : "text-slate-700 font-bold"}>
                  {loyaltyPts}
                </strong>
              </span>
            </div>

            {/* Loyalty Points Redemption Badge or Button */}
            {isLoyaltyEnabled && loyaltyPts > 0 && (
              <div>
                {ptsRedeemed > 0 ? (
                  <div className="flex items-center gap-1 bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-amber-200">
                    <span>{ptsRedeemed} pts (-₹{ptsDiscount.toFixed(2)})</span>
                    <button
                      type="button"
                      onClick={() => setRedeemedPoints(0, 0)}
                      className="text-amber-700 hover:text-rose-600 ml-0.5 p-0.5 rounded hover:bg-amber-200"
                      title="Cancel points discount"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPointsInput(String(maxRedeemablePoints));
                      setIsRedeemModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] shadow-2xs transition-all active:scale-95 flex items-center gap-1"
                  >
                    <Coins className="w-3 h-3" />
                    <span>Redeem</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Existing Udhaar Warning if regular customer has balance */}
        {customerBalance > 0 && (
          <div className="mb-2 px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200/80 flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
            <span className="flex items-center gap-1 font-semibold text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Prior Udhaar Due:
            </span>
            <span className="font-black text-xs text-rose-700">{formatCurrency(customerBalance)}</span>
          </div>
        )}

        {/* Cart Column Header */}
        <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-b border-slate-100">
          <span className="col-span-6">Item / SKU</span>
          <span className="col-span-3 text-center">Qty</span>
          <span className="col-span-3 text-right">Total</span>
        </div>
      </div>

      {/* 2. Scrollable Cart Items List (Fills Remaining Height) */}
      <div className="flex-1 overflow-y-auto pr-1 my-1 custom-scrollbar min-h-0 space-y-1.5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-10 px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-2 text-2xl shadow-2xs">
              <ShoppingBag className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-xs font-extrabold text-slate-700">Active Cart is Empty</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
              Tap products on the left or scan a barcode to ring up this bill
            </p>
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={`${item.productId || item.skuCode}-${idx}`}
              className="p-2.5 rounded-2xl bg-slate-50/70 hover:bg-slate-50 border border-slate-100 transition-all flex flex-col gap-1 text-xs group"
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex-1 min-w-0 pr-1">
                  <div className="font-black text-slate-900 truncate text-xs leading-tight">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                    <span>{item.skuCode}</span>
                    <span>•</span>
                    <span>₹{item.unitPrice.toFixed(2)} ea</span>
                  </div>
                </div>

                <button
                  onClick={() => removeItem(idx)}
                  title="Remove item"
                  className="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quantity Stepper & Line Total */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                {/* Touch-Friendly Stepper */}
                <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 px-1 py-0.5 shadow-2xs">
                  <button
                    onClick={() => updateQuantity(idx, item.quantity - 1)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 active:scale-90 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-black text-slate-900 text-xs select-none">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(idx, item.quantity + 1)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 active:scale-90 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Line Total */}
                <div className="text-right font-black text-xs text-slate-900">
                  ₹{item.lineTotal.toFixed(2)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 3. Pinned Bottom: Summary & Large Payment Tender (Never Scrolled Off-Screen) */}
      <div className="shrink-0 pt-2 border-t border-slate-100 space-y-2">
        {/* Totals Breakdown */}
        <div className="space-y-1 text-xs text-slate-600">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Subtotal ({itemCount} units):</span>
            <span className="font-bold text-slate-800">₹{subTotal().toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Discount (₹):</span>
            <input
              type="number"
              min="0"
              value={globalDiscount || ""}
              onChange={(e) => setGlobalDiscount(Number(e.target.value) || 0)}
              placeholder="0"
              className="w-16 text-right px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-rose-600 focus:outline-none focus:ring-1 focus:ring-lime-400"
            />
          </div>

          {ptsDiscount > 0 && (
            <div className="flex justify-between items-center text-[11px] text-amber-800 bg-amber-50 border border-amber-200/70 px-2 py-1 rounded-lg">
              <span className="flex items-center gap-1 font-bold">
                <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                Points Discount ({ptsRedeemed} pts):
              </span>
              <span className="font-extrabold">-₹{ptsDiscount.toFixed(2)}</span>
            </div>
          )}

          {taxTotal() > 0 && (
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Tax Total:</span>
              <span className="font-bold text-slate-800">+₹{taxTotal().toFixed(2)}</span>
            </div>
          )}

          {roundOff() !== 0 && (
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span>Round-off:</span>
              <span>{roundOff() > 0 ? "+" : ""}₹{roundOff().toFixed(2)}</span>
            </div>
          )}

          {/* Large High-Contrast Net Payable */}
          <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Net Payable:
            </span>
            <span className="text-2xl font-black text-slate-950 tracking-tight">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Action Controls: Clear, Hold, Pay */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            disabled={items.length === 0}
            onClick={() => {
              clearCart();
              toast.info("Cart reset");
            }}
            title="Clear Cart"
            className="py-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-40 transition-all active:scale-95 shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <button
            disabled={items.length === 0}
            onClick={() => {
              holdCurrentBill();
              toast.info("Current bill parked on hold. Press F7 to recall.");
            }}
            title="Hold Bill (F7)"
            className="py-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 text-amber-900 hover:bg-amber-100 font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-40 transition-all active:scale-95 shadow-2xs"
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-700" />
            <span>Hold (F7)</span>
          </button>

          <button
            disabled={items.length === 0}
            onClick={onOpenPayment}
            title="Complete Payment Tender (F8)"
            className="py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg disabled:opacity-40 transition-all active:scale-98"
          >
            <CheckCircle2 className="w-4 h-4 text-lime-400" />
            <span className="tracking-wide">Pay (F8)</span>
          </button>
        </div>
      </div>

      {/* Loyalty Points Redemption Modal */}
      {isRedeemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Redeem Points</h4>
                  <p className="text-[10px] text-slate-400">Available: {customerLoyaltyPoints} pts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRedeemModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-4 space-y-3">
              {/* Program conversion terms */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-2xl text-xs space-y-1 text-amber-900">
                <div className="font-bold flex items-center justify-between">
                  <span>Redemption Rate:</span>
                  <span className="text-amber-800 font-extrabold">
                    {loyaltyDiscountType === "PERCENT"
                      ? `1 pt = ${loyaltyPointValue}% discount`
                      : `1 pt = ₹${loyaltyPointValue.toFixed(2)}`}
                  </span>
                </div>
                <div className="text-[11px] text-amber-700">
                  Max allowed: {maxLoyaltyDiscountPercent}% of subtotal (₹{((subTotal() * maxLoyaltyDiscountPercent) / 100).toFixed(2)})
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  Points to Redeem (Max: {maxRedeemablePoints})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={maxRedeemablePoints}
                    value={pointsInput}
                    onChange={(e) => setPointsInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => setPointsInput(String(maxRedeemablePoints))}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Calculated Discount Preview */}
              {Number(pointsInput) > 0 && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200/60 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-800">Calculated Discount:</span>
                  <span className="font-extrabold text-emerald-700 text-sm">
                    -₹{calculatePointsDiscount(Number(pointsInput) || 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRedeemModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyRedeem}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md active:scale-95"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

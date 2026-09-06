"use client";

import React, { useState, useEffect } from "react";
import { VirtualizedProductGrid } from "@/components/pos/VirtualizedProductGrid";
import { POSCart } from "@/components/pos/POSCart";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { HeldBillsModal } from "@/components/pos/HeldBillsModal";
import { CustomerSelectModal } from "@/components/pos/CustomerSelectModal";
import { BarcodeCameraModal } from "@/components/barcodes/BarcodeCameraModal";
import { ShiftHandoverModal } from "@/components/shifts/ShiftHandoverModal";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { usePOSStore } from "@/stores/usePOSStore";
import { printThermalReceipt } from "@/utils/thermalPrinter";
import { toast } from "@/stores/useSnackbarStore";
import { upsertCustomer } from "@/actions/customers";
import { Boxes, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface POSCounterClientProps {
  initialProducts: any[];
  categories: any[];
  customers: any[];
  shopSettings: any;
}

export function POSCounterClient({
  initialProducts,
  categories,
  customers,
  shopSettings,
}: POSCounterClientProps) {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isHeldBillsOpen, setIsHeldBillsOpen] = useState(false);
  const [isCustomerSelectOpen, setIsCustomerSelectOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"CATALOG" | "CART">("CATALOG");

  const [customerList, setCustomerList] = useState<any[]>(customers);

  useEffect(() => {
    setCustomerList(customers);
  }, [customers]);

  const router = useRouter();
  const { items, holdCurrentBill, lastCompletedInvoice, addItem, netTotal } = usePOSStore();
  const totalCartItems = items.reduce((sum, it) => sum + it.quantity, 0);
  const cartTotal = netTotal();

  const handleQuickAddCustomer = async (name: string, phone: string) => {
    try {
      const res = await upsertCustomer({ name, phone, creditLimit: 0 });
      if (res.success && res.customer) {
        toast.success(`Customer "${name}" registered successfully`, "Customer Added");
        const newCust = {
          id: res.customer.id,
          name: res.customer.name,
          phone: res.customer.phone || "",
          currentBalance: Number(res.customer.currentBalance || 0),
          walletBalance: Number(res.customer.walletBalance || 0),
          loyaltyPoints: Number(res.customer.loyaltyPoints || 0),
        };
        setCustomerList((prev) => [newCust, ...prev.filter((c) => c.id !== newCust.id)]);
        router.refresh();
        return newCust;
      } else {
        toast.error(res.error || "Failed to register customer");
        if (res.existingCustomer) {
          const existCust = {
            id: res.existingCustomer.id,
            name: res.existingCustomer.name,
            phone: res.existingCustomer.phone || "",
            currentBalance: Number(res.existingCustomer.currentBalance || 0),
            walletBalance: Number(res.existingCustomer.walletBalance || 0),
            loyaltyPoints: Number(res.existingCustomer.loyaltyPoints || 0),
          };
          setCustomerList((prev) => [existCust, ...prev.filter((c) => c.id !== existCust.id)]);
          return existCust;
        }
        return null;
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to register customer");
      return null;
    }
  };

  const handleCameraScanDetected = (barcode: string, product?: any) => {
    if (product) {
      addItem(product, 1);
      toast.success(`Added "${product.name}" to cart!`);
    } else {
      const matched = initialProducts.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === barcode.toLowerCase()) ||
          (p.skuCode && p.skuCode.toLowerCase() === barcode.toLowerCase())
      );
      if (matched) {
        addItem(matched, 1);
        toast.success(`Added "${matched.name}" to cart!`);
      }
    }
  };

  // Activate Hardware Barcode Scanner Listener
  useBarcodeScanner({
    productCatalog: initialProducts,
    enabled: !isPaymentOpen && !isHeldBillsOpen && !isCustomerSelectOpen,
  });

  // Global Keyboard Shortcuts (F2, F4, F7, F8, F9, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F8" || (e.ctrlKey && e.key === "Enter")) {
        e.preventDefault();
        if (items.length > 0) setIsPaymentOpen(true);
      } else if (e.key === "F7") {
        e.preventDefault();
        holdCurrentBill();
      } else if (e.key === "F4") {
        e.preventDefault();
        setIsCustomerSelectOpen(true);
      } else if (e.key === "F9") {
        e.preventDefault();
        if (lastCompletedInvoice) {
          printThermalReceipt({
            shopName: shopSettings?.shopName || "CRYSTAL PRESS",
            invoiceNumber: lastCompletedInvoice.invoiceNumber,
            items: lastCompletedInvoice.items,
            subTotal: lastCompletedInvoice.netTotal,
            netTotal: lastCompletedInvoice.netTotal,
            paymentMethod: lastCompletedInvoice.paymentMethod,
          });
        }
      } else if (e.key === "F10") {
        e.preventDefault();
        setIsShiftModalOpen(true);
      } else if (e.key === "Escape") {
        setIsPaymentOpen(false);
        setIsHeldBillsOpen(false);
        setIsCustomerSelectOpen(false);
        setIsShiftModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, holdCurrentBill, lastCompletedInvoice, shopSettings]);

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] sm:h-[calc(100vh-6.75rem)] overflow-hidden gap-2">
      {/* Mobile Top View Switcher (Catalog vs Cart) */}
      <div className="lg:hidden shrink-0 flex items-center p-1 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
        <button
          type="button"
          onClick={() => setMobileTab("CATALOG")}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
            mobileTab === "CATALOG"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          <Boxes className="w-3.5 h-3.5 text-lime-400" />
          <span>Product Catalog</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("CART")}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 relative",
            mobileTab === "CART"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          <ShoppingCart className="w-3.5 h-3.5 text-lime-400" />
          <span>Cart</span>
          {totalCartItems > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-lime-400 text-slate-950">
              {totalCartItems}
            </span>
          )}
        </button>
      </div>

      {/* Main Cockpit Split: Left Product Catalog & Right Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 flex-1 min-h-0 overflow-hidden relative">
        {/* Left 7 Columns: Virtualized 1,500 SKU Catalog */}
        <div
          className={cn(
            "lg:col-span-7 h-full overflow-hidden",
            mobileTab === "CATALOG" ? "block" : "hidden lg:block"
          )}
        >
          <VirtualizedProductGrid products={initialProducts} categories={categories} />
        </div>

        {/* Right 5 Columns: Active POS Cart & Billing Controls */}
        <div
          className={cn(
            "lg:col-span-5 h-full overflow-hidden",
            mobileTab === "CART" ? "block" : "hidden lg:block"
          )}
        >
          <POSCart
            onOpenPayment={() => setIsPaymentOpen(true)}
            onOpenCustomerModal={() => setIsCustomerSelectOpen(true)}
            onOpenHeldBills={() => setIsHeldBillsOpen(true)}
            onOpenScanner={() => setIsCameraScannerOpen(true)}
            shopSettings={shopSettings}
          />
        </div>

        {/* Floating Bottom Cart Bar for mobile when on Catalog tab and has items */}
        {mobileTab === "CATALOG" && totalCartItems > 0 && (
          <div className="lg:hidden absolute bottom-3 inset-x-3 z-30 animate-in fade-in slide-in-from-bottom-3">
            <button
              type="button"
              onClick={() => setMobileTab("CART")}
              className="w-full py-2.5 px-4 bg-slate-950 text-white rounded-2xl shadow-xl border border-slate-800 flex items-center justify-between font-black text-xs active:scale-98 transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-lime-400 text-slate-950 flex items-center justify-center text-xs font-black">
                  {totalCartItems}
                </span>
                <span>{totalCartItems} item{totalCartItems > 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-2 text-lime-400">
                <span className="text-sm font-black">₹{Number(cartTotal || 0).toFixed(2)}</span>
                <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded-lg text-white font-bold">
                  Cart & Pay →
                </span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* POS Cockpit Keyboard Shortcuts Bar */}
      <div className="shrink-0 hidden sm:flex items-center justify-between px-3 py-1.5 bg-slate-900 text-white rounded-2xl text-[11px] font-medium shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono font-bold text-lime-400">
              F2
            </kbd>
            <span className="text-slate-300">Search</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono font-bold text-lime-400">
              F4
            </kbd>
            <span className="text-slate-300">Customer</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono font-bold text-lime-400">
              F7
            </kbd>
            <span className="text-slate-300">Hold Bill</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono font-bold text-lime-400">
              F8
            </kbd>
            <span className="text-slate-300">Pay Tender</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono font-bold text-lime-400">
              F9
            </kbd>
            <span className="text-slate-300">Re-Print</span>
          </div>
          <button
            type="button"
            onClick={() => setIsShiftModalOpen(true)}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono font-bold text-emerald-400">
              F10
            </kbd>
            <span className="text-slate-300">Shift / Handover</span>
          </button>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono font-bold text-slate-400">
              Esc
            </kbd>
            <span className="text-slate-400">Close</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-slate-300 text-[10px] font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Scanner Ready</span>
        </div>
      </div>

      {/* Camera Barcode & QR Scanner Modal */}
      <BarcodeCameraModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onDetected={handleCameraScanDetected}
        title="POS Camera Barcode Scanner"
      />

      {/* Payment Tender Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        shopSettings={shopSettings}
      />

      {/* Held / Parked Bills Modal */}
      <HeldBillsModal
        isOpen={isHeldBillsOpen}
        onClose={() => setIsHeldBillsOpen(false)}
      />

      {/* Customer Selector Modal */}
      <CustomerSelectModal
        isOpen={isCustomerSelectOpen}
        onClose={() => setIsCustomerSelectOpen(false)}
        customers={customerList}
        onQuickAddCustomer={handleQuickAddCustomer}
      />

      {/* Shift Handover & Drawer Modal */}
      <ShiftHandoverModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
      />
    </div>
  );
}

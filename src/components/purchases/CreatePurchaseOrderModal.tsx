"use client";

import React, { useState } from "react";
import {
  X,
  Truck,
  Plus,
  Trash2,
  Calendar,
  FileText,
  DollarSign,
  Loader2,
  CheckCircle2,
  Building2,
  CreditCard,
  Layers,
} from "lucide-react";
import { recordPurchaseOrder } from "@/actions/purchases";
import { formatCurrency } from "@/lib/utils";
import { modal } from "@/stores/useDialogStore";
import { toast } from "@/stores/useSnackbarStore";
import { PaymentMethod } from "@prisma/client";
import { SearchableSelect, SearchableOption } from "@/components/ui/SearchableSelect";

interface ProductItem {
  id: string;
  name: string;
  skuCode: string;
  costPrice: any;
  currentStock: any;
}

interface VendorItem {
  id: string;
  name: string;
  phone?: string | null;
  outstandingBalance: any;
}

interface LineItem {
  productId: string;
  quantity: number;
  unitCostPrice: number;
}

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendors: VendorItem[];
  products: ProductItem[];
  onOpenVendorModal: () => void;
}

export function CreatePurchaseOrderModal({
  isOpen,
  onClose,
  vendors,
  products,
  onOpenVendorModal,
}: CreatePurchaseOrderModalProps) {
  const [vendorId, setVendorId] = useState("");
  const [vendorBillNo, setVendorBillNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [updateCostPrice, setUpdateCostPrice] = useState(true);

  const [items, setItems] = useState<LineItem[]>([
    { productId: "", quantity: 1, unitCostPrice: 0 },
  ]);

  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    PaymentMethod.UPI
  );
  const [transactionRef, setTransactionRef] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleProductSelect = (index: number, pId: string) => {
    const product = products.find((p) => p.id === pId);
    const updated = [...items];
    updated[index] = {
      productId: pId,
      quantity: updated[index]?.quantity || 1,
      unitCostPrice: product ? Number(product.costPrice) : 0,
    };
    setItems(updated);
  };

  const handleItemChange = (
    index: number,
    field: "quantity" | "unitCostPrice",
    val: number
  ) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: val,
    };
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { productId: "", quantity: 1, unitCostPrice: 0 }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCostPrice) || 0),
    0
  );

  const balanceDue = Math.max(0, totalAmount - (Number(paidAmount) || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorId) {
      await modal.alert("Please select a supplier / vendor", "Validation Error");
      return;
    }

    const invalidItems = items.some(
      (item) => !item.productId || item.quantity <= 0 || item.unitCostPrice < 0
    );
    if (invalidItems) {
      await modal.alert(
        "Please specify a valid product, quantity (> 0), and purchase price for each row",
        "Invalid Items"
      );
      return;
    }

    setLoading(true);
    try {
      const res = await recordPurchaseOrder({
        vendorId,
        vendorBillNo: vendorBillNo.trim() || undefined,
        purchaseDate,
        notes: notes.trim() || undefined,
        updateProductCostPrice: updateCostPrice,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          unitCostPrice: Number(it.unitCostPrice),
        })),
        paidAmount: Number(paidAmount) || 0,
        paymentMethod,
        transactionRef: transactionRef.trim() || undefined,
      });

      if (res.success) {
        toast.success(
          `Recorded Purchase Order ${res.poNumber} (${formatCurrency(res.totalAmount)})`,
          "Stock Restocked"
        );
        onClose();
      } else {
        await modal.error(res.error || "Failed to record purchase order", "Purchase Error");
      }
    } catch (err: any) {
      await modal.error(err.message || "An unexpected error occurred", "Error");
    } finally {
      setLoading(false);
    }
  };

  const vendorOptions: SearchableOption[] = vendors.map((v) => ({
    value: v.id,
    label: v.name,
    subLabel: `Due: ${formatCurrency(Number(v.outstandingBalance))}${v.phone ? " • +91 " + v.phone : ""}`,
    badge: "Supplier",
  }));

  const productOptions: SearchableOption[] = products.map((p) => ({
    value: p.id,
    label: p.name,
    subLabel: `SKU: ${p.skuCode} • Current Stock: ${Number(p.currentStock)}`,
    badge: `Cost: ₹${Number(p.costPrice)}`,
    badgeColor: "bg-slate-100 text-slate-800",
  }));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-lime-100 text-lime-900 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Record Inward Stock Purchase
              </h3>
              <p className="text-xs text-slate-400">
                Restock inventory and record supplier bills & payments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Supplier <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={onOpenVendorModal}
                  className="text-[10px] font-bold text-lime-700 hover:text-lime-800"
                >
                  + New Supplier
                </button>
              </div>
              <SearchableSelect
                options={vendorOptions}
                value={vendorId}
                onChange={(val) => setVendorId(val)}
                placeholder="-- Type or choose Supplier --"
                searchPlaceholder="Search vendor name, phone..."
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Supplier Bill / Challan No
              </label>
              <input
                type="text"
                value={vendorBillNo}
                onChange={(e) => setVendorBillNo(e.target.value)}
                placeholder="e.g. INV-9842"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                📦 Products Received
              </span>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-lime-800 bg-lime-200 hover:bg-lime-300 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const selectedProd = products.find((p) => p.id === item.productId);
                const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitCostPrice) || 0);

                return (
                  <div
                    key={idx}
                    className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-2"
                  >
                    {/* Searchable Product Selector */}
                    <div className="flex-1 w-full sm:w-auto">
                      <SearchableSelect
                        options={productOptions}
                        value={item.productId}
                        onChange={(val) => handleProductSelect(idx, val)}
                        placeholder="-- Search product to restock --"
                        searchPlaceholder="Type product name, SKU..."
                      />
                      {selectedProd && (
                        <div className="text-[10px] text-slate-400 mt-0.5 pl-1">
                          Current Cost: {formatCurrency(Number(selectedProd.costPrice))}
                        </div>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="w-24">
                      <label className="text-[9px] font-bold text-slate-400 block mb-0.5">
                        Qty Inward
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={item.quantity || ""}
                        onChange={(e) =>
                          handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-lime-400"
                      />
                    </div>

                    {/* Unit Cost Price */}
                    <div className="w-28">
                      <label className="text-[9px] font-bold text-slate-400 block mb-0.5">
                        Inward Rate (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={item.unitCostPrice || ""}
                        onChange={(e) =>
                          handleItemChange(
                            idx,
                            "unitCostPrice",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-lime-400"
                      />
                    </div>

                    {/* Line Total */}
                    <div className="w-24 text-right pt-2 sm:pt-0">
                      <span className="text-[9px] font-bold text-slate-400 block">Total</span>
                      <span className="text-xs font-extrabold text-slate-900">
                        {formatCurrency(lineTotal)}
                      </span>
                    </div>

                    {/* Remove Row */}
                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => removeItemRow(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Cost Price Update Checkbox */}
            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center gap-2">
              <input
                type="checkbox"
                id="updateCostPrice"
                checked={updateCostPrice}
                onChange={(e) => setUpdateCostPrice(e.target.checked)}
                className="w-4 h-4 accent-lime-500 rounded cursor-pointer"
              />
              <label
                htmlFor="updateCostPrice"
                className="text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Update catalog product cost price to these inward rates
              </label>
            </div>
          </div>

          {/* Payment Breakdown & Settlement */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Total Purchase Amount:</span>
              <span className="text-base font-extrabold text-white">
                {formatCurrency(totalAmount)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Amount Paid Now (₹)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    max={totalAmount}
                    step="0.01"
                    value={paidAmount || ""}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                  <button
                    type="button"
                    onClick={() => setPaidAmount(totalAmount)}
                    className="text-[10px] font-bold px-2 py-1 bg-lime-300 text-slate-900 rounded-lg shrink-0 hover:bg-lime-400 transition-colors"
                  >
                    Pay Full
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  disabled={paidAmount <= 0}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-lime-400 disabled:opacity-50"
                >
                  <option value={PaymentMethod.UPI}>UPI / Online Transfer</option>
                  <option value={PaymentMethod.CASH}>Cash</option>
                  <option value={PaymentMethod.CARD}>Card / NetBanking</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <span className="text-slate-400 font-medium">Unpaid Balance (Due to Vendor):</span>
              <span
                className={`font-black ${
                  balanceDue > 0 ? "text-rose-400 font-bold" : "text-emerald-400"
                }`}
              >
                {formatCurrency(balanceDue)}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Remarks</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Delivery truck arrived 11am, batch 4"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || totalAmount <= 0}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-lime-400" />
              )}
              <span>Complete Inward Restock</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

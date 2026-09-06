"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  FileText,
  Printer,
  Boxes,
  Sparkles,
  Calculator,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Check,
  Search,
} from "lucide-react";
import { QuotationStatus } from "@prisma/client";
import { createQuotation, updateQuotation } from "@/actions/quotations";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/stores/useSnackbarStore";
import { modal } from "@/stores/useDialogStore";
import { SearchableSelect, SearchableOption } from "@/components/ui/SearchableSelect";

interface QuotationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationToEdit?: any | null;
  customers: Array<{ id: string; name: string; phone?: string | null; email?: string | null; address?: string | null }>;
  products: Array<{ id: string; name: string; skuCode: string; sellingPrice: number; currentStock: number; unit?: { code: string } | null; taxPercent?: number }>;
  defaultTaxRate?: number;
}

const PRINT_PRESETS = [
  { name: "Visiting Cards", size: '3.5" x 2"', paper: "350 GSM Matte Art Card", sides: "Both Sides (4+4)", finishing: "Thermal Matte Lamination" },
  { name: "Letterheads", size: "A4 (8.27 x 11.69 in)", paper: "100 GSM Executive Bond", sides: "Single Side (4+0)", finishing: "Gummed Padding" },
  { name: "Brochures / Flyers", size: "A4 Tri-Fold", paper: "170 GSM Gloss Art Paper", sides: "Both Sides (4+4)", finishing: "Creasing & Folding" },
  { name: "Wedding / Invitation Cards", size: '5" x 7" Multi-fold', paper: "300 GSM Metallic Textured Board", sides: "Both Sides Multi-Color", finishing: "Gold Foil Stamping" },
  { name: "Flex / Vinyl Banners", size: '6 ft x 3 ft', paper: "Star Blackout Flex 340 GSM", sides: "Front Lit", finishing: "Eyelets & Hemming" },
  { name: "Bill Books / Invoices", size: '1/5 Demy (7" x 8.5")', paper: "NCR Carbonless Paper (1+1)", sides: "Single Color Black/Red", finishing: "Perforation, Numbering & Binding" },
  { name: "Custom Print Job", size: "", paper: "", sides: "", finishing: "" },
];

export function QuotationFormModal({
  isOpen,
  onClose,
  quotationToEdit,
  customers = [],
  products = [],
  defaultTaxRate = 0,
}: QuotationFormModalProps) {
  // Customer Info
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [customerAddress, setCustomerAddress] = useState<string>("");

  // Quotation Dates & Validity
  const [quotationDate, setQuotationDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState<string>("");

  // Status & Notes
  const [status, setStatus] = useState<QuotationStatus>(QuotationStatus.DRAFT);
  const [notes, setNotes] = useState<string>("");
  const [termsConditions, setTermsConditions] = useState<string>(
    "1. 50% advance payment required to commence printing production.\n2. Final color may vary 5-10% from digital screen proof.\n3. Delivery within 3-5 working days following proof approval.\n4. Estimates are valid for 15 days from issue date."
  );

  // Line Items
  const [items, setItems] = useState<
    Array<{
      id?: string;
      productId?: string | null;
      itemType: "CUSTOM_JOB" | "INVENTORY_PRODUCT" | "SERVICE";
      itemDescription: string;
      specifications?: Record<string, any>;
      quantity: number;
      unitName: string;
      unitPrice: number;
      discountAmount: number;
      taxPercent: number;
      taxAmount: number;
      lineTotal: number;
    }>
  >([
    {
      itemType: "CUSTOM_JOB",
      itemDescription: "Visiting Cards (1,000 Pcs)",
      specifications: {
        size: '3.5" x 2"',
        paper: "350 GSM Matte Art Card",
        sides: "Both Sides (4+4)",
        finishing: "Thermal Matte Lamination",
      },
      quantity: 1000,
      unitName: "pcs",
      unitPrice: 0.95,
      discountAmount: 0,
      taxPercent: defaultTaxRate,
      taxAmount: 0,
      lineTotal: 950,
    },
  ]);

  // Overall Discount & Tax
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(defaultTaxRate);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Customer Search Filter
  const [custSearch, setCustSearch] = useState("");
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  useEffect(() => {
    if (quotationToEdit) {
      setSelectedCustomerId(quotationToEdit.customerId || "");
      setCustomerName(quotationToEdit.customerName || "Valued Customer");
      setCustomerPhone(quotationToEdit.customerPhone || "");
      setCustomerEmail(quotationToEdit.customerEmail || "");
      setCustomerAddress(quotationToEdit.customerAddress || "");
      setQuotationDate(
        quotationToEdit.quotationDate
          ? new Date(quotationToEdit.quotationDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setValidUntil(
        quotationToEdit.validUntil
          ? new Date(quotationToEdit.validUntil).toISOString().split("T")[0]
          : ""
      );
      setStatus(quotationToEdit.status || QuotationStatus.DRAFT);
      setNotes(quotationToEdit.notes || "");
      setTermsConditions(
        quotationToEdit.termsConditions ||
          "1. 50% advance payment required to commence printing production.\n2. Final color may vary 5-10% from digital screen proof.\n3. Delivery within 3-5 working days following proof approval.\n4. Estimates are valid for 15 days from issue date."
      );
      setTaxPercent(Number(quotationToEdit.taxPercent) || 0);
      setOverallDiscount(Number(quotationToEdit.discountAmount) || 0);

      if (quotationToEdit.items && quotationToEdit.items.length > 0) {
        setItems(
          quotationToEdit.items.map((it: any) => ({
            id: it.id,
            productId: it.productId || null,
            itemType: it.itemType || "CUSTOM_JOB",
            itemDescription: it.itemDescription,
            specifications: it.specifications || {},
            quantity: Number(it.quantity) || 1,
            unitName: it.unitName || "pcs",
            unitPrice: Number(it.unitPrice) || 0,
            discountAmount: Number(it.discountAmount) || 0,
            taxPercent: Number(it.taxPercent) || 0,
            taxAmount: Number(it.taxAmount) || 0,
            lineTotal: Number(it.lineTotal) || 0,
          }))
        );
      }
    } else {
      // Default: 15 days validity
      const d = new Date();
      d.setDate(d.getDate() + 15);
      setValidUntil(d.toISOString().split("T")[0]);
    }
  }, [quotationToEdit, isOpen, defaultTaxRate]);

  if (!isOpen) return null;

  // Set Validity Shortcut helper
  const handleSetValidityDays = (days: number) => {
    const base = quotationDate ? new Date(quotationDate) : new Date();
    base.setDate(base.getDate() + days);
    setValidUntil(base.toISOString().split("T")[0]);
  };

  // Select Customer from Autocomplete
  const handleSelectCustomer = (c: any) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone || "");
    setCustomerEmail(c.email || "");
    setCustomerAddress(c.address || "");
    setShowCustDropdown(false);
  };

  // Line Item Operations
  const handleAddItem = (type: "CUSTOM_JOB" | "INVENTORY_PRODUCT" | "SERVICE") => {
    if (type === "CUSTOM_JOB") {
      setItems([
        ...items,
        {
          itemType: "CUSTOM_JOB",
          itemDescription: "Custom Printing Work",
          specifications: { size: "", paper: "", sides: "", finishing: "" },
          quantity: 1,
          unitName: "pcs",
          unitPrice: 0,
          discountAmount: 0,
          taxPercent: 0,
          taxAmount: 0,
          lineTotal: 0,
        },
      ]);
    } else if (type === "INVENTORY_PRODUCT") {
      const firstProd = products[0];
      setItems([
        ...items,
        {
          itemType: "INVENTORY_PRODUCT",
          productId: firstProd?.id || null,
          itemDescription: firstProd?.name || "Stationery Item",
          specifications: undefined,
          quantity: 1,
          unitName: firstProd?.unit?.code || "pcs",
          unitPrice: Number(firstProd?.sellingPrice) || 0,
          discountAmount: 0,
          taxPercent: Number(firstProd?.taxPercent) || 0,
          taxAmount: 0,
          lineTotal: Number(firstProd?.sellingPrice) || 0,
        },
      ]);
    } else {
      setItems([
        ...items,
        {
          itemType: "SERVICE",
          itemDescription: "Graphic Designing & Typesetting",
          specifications: undefined,
          quantity: 1,
          unitName: "job",
          unitPrice: 350,
          discountAmount: 0,
          taxPercent: 0,
          taxAmount: 0,
          lineTotal: 350,
        },
      ]);
    }
  };

  const handleUpdateItem = (index: number, updates: Partial<(typeof items)[0]>) => {
    const updated = [...items];
    const curr = { ...updated[index], ...updates };

    // Auto-recalculate line total
    const qty = Number(curr.quantity) || 0;
    const rate = Number(curr.unitPrice) || 0;
    const disc = Number(curr.discountAmount) || 0;
    curr.lineTotal = Math.max(0, qty * rate - disc);

    updated[index] = curr;
    setItems(updated);
  };

  const handleSelectProduct = (index: number, prodId: string) => {
    const found = products.find((p) => p.id === prodId);
    if (!found) return;

    handleUpdateItem(index, {
      productId: found.id,
      itemDescription: found.name,
      unitName: found.unit?.code || "pcs",
      unitPrice: Number(found.sellingPrice) || 0,
      taxPercent: Number(found.taxPercent) || 0,
    });
  };

  const handleApplyPrintPreset = (index: number, presetName: string) => {
    const found = PRINT_PRESETS.find((p) => p.name === presetName);
    if (!found) return;

    const curr = items[index];
    handleUpdateItem(index, {
      itemDescription: `${found.name}`,
      specifications: {
        size: found.size,
        paper: found.paper,
        sides: found.sides,
        finishing: found.finishing,
      },
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.error("Quotation must have at least one line item");
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Grand Totals Computation
  const itemsSubTotal = items.reduce((sum, it) => sum + (Number(it.lineTotal) || 0), 0);
  const netBeforeTax = Math.max(0, itemsSubTotal - overallDiscount);
  const taxAmount = (netBeforeTax * (Number(taxPercent) || 0)) / 100;
  const rawGrandTotal = netBeforeTax + taxAmount;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((grandTotal - rawGrandTotal).toFixed(2));

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      modal.alert("Please provide the customer name for this quotation.", "Customer Name Required");
      return;
    }

    if (items.length === 0) {
      modal.alert("Please add at least one line item to this quotation.", "Line Items Required");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      customerId: selectedCustomerId || null,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || null,
      customerEmail: customerEmail.trim() || null,
      customerAddress: customerAddress.trim() || null,
      quotationDate: quotationDate || undefined,
      validUntil: validUntil || null,
      subTotal: itemsSubTotal,
      discountAmount: overallDiscount,
      taxPercent,
      taxAmount,
      roundOff,
      netTotal: grandTotal,
      status,
      termsConditions,
      notes,
      items: items.map((it) => ({
        id: it.id,
        productId: it.productId || null,
        itemType: it.itemType,
        itemDescription: it.itemDescription.trim(),
        specifications: it.specifications || undefined,
        quantity: Number(it.quantity),
        unitName: it.unitName || "pcs",
        unitPrice: Number(it.unitPrice),
        discountAmount: Number(it.discountAmount),
        taxPercent: Number(it.taxPercent),
        taxAmount: Number(it.taxAmount),
        lineTotal: Number(it.lineTotal),
      })),
    };

    let res;
    if (quotationToEdit?.id) {
      res = await updateQuotation(quotationToEdit.id, payload);
    } else {
      res = await createQuotation(payload);
    }

    setIsSubmitting(false);

    if (res.success) {
      toast.success(
        quotationToEdit?.id ? "Quotation updated successfully!" : "Quotation generated successfully!",
        "Quotation Saved"
      );
      onClose();
    } else {
      modal.error(res.error || "Failed to save quotation");
    }
  };

  const productOptions: SearchableOption[] = products.map((p) => ({
    value: p.id,
    label: p.name,
    subLabel: `SKU: ${p.skuCode} • Stock: ${p.currentStock} ${p.unit?.code || "pcs"}`,
    badge: `₹${p.sellingPrice}`,
    badgeColor: "bg-lime-100 text-lime-900 font-bold",
  }));

  const customerOptions: SearchableOption[] = customers.map((c) => ({
    value: c.id,
    label: c.name,
    subLabel: c.phone ? `+91 ${c.phone}${c.address ? " • " + c.address : ""}` : (c.address || "No phone"),
    badge: "Customer",
  }));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-lime-300 to-lime-500 text-slate-900 flex items-center justify-center font-bold shadow-lime">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {quotationToEdit ? `Edit Quotation (${quotationToEdit.quotationNumber})` : "Create New Quotation / Estimate"}
              </h3>
              <p className="text-xs text-slate-400">
                Generate professional print shop estimates with custom specs & instant pricing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 my-4">
          {/* Section 1: Customer Details & Autocomplete */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-lime-700" /> Customer Information
              </span>
              <div className="w-full sm:w-72">
                <SearchableSelect
                  options={customerOptions}
                  value={selectedCustomerId}
                  onChange={(val) => {
                    const found = customers.find((c) => c.id === val);
                    if (found) {
                      handleSelectCustomer(found);
                    } else {
                      setSelectedCustomerId("");
                    }
                  }}
                  placeholder="🔍 Search & Pick Customer..."
                  searchPlaceholder="Type customer name or phone..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma / ABC Traders"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-lime-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">+91</span>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-lime-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="client@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-lime-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Billing / Delivery Address</label>
                <input
                  type="text"
                  placeholder="Shop #4, MG Road, Pune"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-lime-400"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Dates, Validity & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Quotation Date</label>
              <input
                type="date"
                value={quotationDate}
                onChange={(e) => setQuotationDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-600">Valid Until</label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleSetValidityDays(7)}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700"
                  >
                    +7d
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetValidityDays(15)}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700"
                  >
                    +15d
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetValidityDays(30)}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700"
                  >
                    +30d
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Quote Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as QuotationStatus)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-lime-400"
              >
                <option value={QuotationStatus.DRAFT}>📝 Draft Estimate</option>
                <option value={QuotationStatus.SENT}>📤 Sent to Customer</option>
                <option value={QuotationStatus.ACCEPTED}>✅ Accepted by Customer</option>
                <option value={QuotationStatus.REJECTED}>❌ Rejected / Cancelled</option>
                {quotationToEdit?.status === QuotationStatus.CONVERTED && (
                  <option value={QuotationStatus.CONVERTED}>🔄 Converted to Live Order</option>
                )}
              </select>
            </div>
          </div>

          {/* Section 3: Line Items Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-lime-700" /> Quotation Line Items ({items.length})
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddItem("CUSTOM_JOB")}
                  className="px-2.5 py-1.5 rounded-xl bg-lime-100 hover:bg-lime-200 text-lime-900 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> + Custom Print Job
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem("INVENTORY_PRODUCT")}
                  className="px-2.5 py-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-900 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Boxes className="w-3.5 h-3.5" /> + Store Product
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem("SERVICE")}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" /> + Design/Service
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-2.5 transition-all hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          item.itemType === "CUSTOM_JOB"
                            ? "bg-lime-100 text-lime-900"
                            : item.itemType === "INVENTORY_PRODUCT"
                            ? "bg-sky-100 text-sky-900"
                            : "bg-purple-100 text-purple-900"
                        }`}
                      >
                        {item.itemType === "CUSTOM_JOB"
                          ? "Custom Print"
                          : item.itemType === "INVENTORY_PRODUCT"
                          ? "Inventory Item"
                          : "Service / Design"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Remove line item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Print Job Preset Dropdown if Custom Job */}
                  {item.itemType === "CUSTOM_JOB" && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[11px] font-bold text-slate-500 shrink-0">Preset:</span>
                      <div className="flex flex-wrap gap-1">
                        {PRINT_PRESETS.map((p) => (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => handleApplyPrintPreset(idx, p.name)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-lime-500 hover:text-lime-800 text-slate-700 transition-colors"
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Searchable Inventory Product Selector */}
                  {item.itemType === "INVENTORY_PRODUCT" && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Select Product from Catalog (Type to search 1,500+ items)
                      </label>
                      <SearchableSelect
                        options={productOptions}
                        value={item.productId || ""}
                        onChange={(val) => handleSelectProduct(idx, val)}
                        placeholder="-- Type product name, SKU, or barcode --"
                        searchPlaceholder="Type product name, SKU code..."
                      />
                    </div>
                  )}

                  {/* Item Title & Specs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Item Title / Work Description *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 1000 Visiting Cards 350 GSM Matte"
                        value={item.itemDescription}
                        onChange={(e) => handleUpdateItem(idx, { itemDescription: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                      />
                    </div>

                    {item.itemType === "CUSTOM_JOB" && (
                      <>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Dimensions / Size</label>
                          <input
                            type="text"
                            placeholder="e.g. 3.5 x 2 inch / A4"
                            value={item.specifications?.size || ""}
                            onChange={(e) =>
                              handleUpdateItem(idx, {
                                specifications: { ...item.specifications, size: e.target.value },
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Paper / Media Stock</label>
                          <input
                            type="text"
                            placeholder="e.g. 350 GSM Matte Art Card"
                            value={item.specifications?.paper || ""}
                            onChange={(e) =>
                              handleUpdateItem(idx, {
                                specifications: { ...item.specifications, paper: e.target.value },
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Color / Sides</label>
                          <input
                            type="text"
                            placeholder="e.g. Both Sides (4+4)"
                            value={item.specifications?.sides || ""}
                            onChange={(e) =>
                              handleUpdateItem(idx, {
                                specifications: { ...item.specifications, sides: e.target.value },
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Finishing / Lamination</label>
                          <input
                            type="text"
                            placeholder="e.g. Thermal Matte / Spot UV"
                            value={item.specifications?.finishing || ""}
                            onChange={(e) =>
                              handleUpdateItem(idx, {
                                specifications: { ...item.specifications, finishing: e.target.value },
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Quantity, Unit, Price, Discount, Line Total */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-slate-200/60 items-center">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Quantity</label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        required
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, { quantity: Number(e.target.value) })}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 text-right"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Unit (UOM)</label>
                      <input
                        type="text"
                        placeholder="pcs / sets / pkts"
                        value={item.unitName}
                        onChange={(e) => handleUpdateItem(idx, { unitName: e.target.value })}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Unit Rate (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(idx, { unitPrice: Number(e.target.value) })}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 text-right"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Discount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.discountAmount}
                        onChange={(e) => handleUpdateItem(idx, { discountAmount: Number(e.target.value) })}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 text-right"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Line Total</label>
                      <div className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 text-right">
                        {formatCurrency(item.lineTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Terms & Notes + Calculation Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Terms & Conditions</label>
                <textarea
                  rows={4}
                  value={termsConditions}
                  onChange={(e) => setTermsConditions(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 leading-relaxed custom-scrollbar"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Internal Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Customer requested high gloss finish sample"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>
            </div>

            {/* Calculations Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2.5 h-fit">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-600">Subtotal ({items.length} items):</span>
                <span className="font-bold text-slate-900">{formatCurrency(itemsSubTotal)}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Additional Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  value={overallDiscount}
                  onChange={(e) => setOverallDiscount(Number(e.target.value))}
                  className="w-24 px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-right"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600">GST / Tax (%):</span>
                  <select
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    className="px-1.5 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                  >
                    <option value={0}>0% (Tax Exempt)</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST (Standard)</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>
                <span className="font-bold text-slate-900">{formatCurrency(taxAmount)}</span>
              </div>

              {roundOff !== 0 && (
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Round Off:</span>
                  <span>{roundOff > 0 ? `+₹${roundOff}` : `-₹${Math.abs(roundOff)}`}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Grand Total</span>
                  <span className="text-[10px] text-slate-400">Net payable if accepted</span>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatCurrency(grandTotal)}
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-md active:scale-98 transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Saving Quotation...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{quotationToEdit ? "Update Quotation" : "Generate Quotation"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { create } from "zustand";

export interface POSCartItem {
  productId?: string;
  skuCode: string;
  barcode?: string | null;
  name: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  unitName: string;
  discountAmount: number;
  taxPercent: number;
  lineTotal: number;
  currentStock?: number;
  version?: number;
}

export interface HeldBill {
  id: string;
  savedAt: string;
  customerName: string;
  customerPhone?: string;
  items: POSCartItem[];
  subTotal: number;
  netTotal: number;
}

interface POSState {
  items: POSCartItem[];
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerBalance: number;
  customerWalletBalance: number;
  customerLoyaltyPoints: number;
  redeemedPoints: number;
  pointsDiscount: number;
  globalDiscount: number;
  taxRate: number;
  isTaxEnabled: boolean;
  heldBills: HeldBill[];
  lastCompletedInvoice: any | null;

  // Computed Values
  subTotal: () => number;
  totalDiscount: () => number;
  taxTotal: () => number;
  roundOff: () => number;
  netTotal: () => number;

  // Actions
  addItem: (product: any, qty?: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  updatePrice: (index: number, newPrice: number) => void;
  updateItemDiscount: (index: number, discount: number) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
  setCustomer: (
    id: string | null,
    name: string,
    phone: string,
    balance?: number,
    walletBalance?: number,
    loyaltyPoints?: number
  ) => void;
  setRedeemedPoints: (points: number, discountAmount: number) => void;
  setGlobalDiscount: (discount: number) => void;
  setTaxRate: (rate: number, enabled?: boolean) => void;
  
  // Hold / Resume Bills
  holdCurrentBill: () => void;
  resumeBill: (heldBillId: string) => void;
  deleteHeldBill: (heldBillId: string) => void;
  setLastCompletedInvoice: (inv: any) => void;
}

export const usePOSStore = create<POSState>((set, get) => ({
  items: [],
  customerId: null,
  customerName: "Walk-in Customer",
  customerPhone: "",
  customerBalance: 0,
  customerWalletBalance: 0,
  customerLoyaltyPoints: 0,
  redeemedPoints: 0,
  pointsDiscount: 0,
  globalDiscount: 0,
  taxRate: 0,
  isTaxEnabled: false,
  heldBills: [],
  lastCompletedInvoice: null,

  subTotal: () => {
    return get().items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  },

  totalDiscount: () => {
    const itemDiscounts = get().items.reduce((sum, i) => sum + i.discountAmount, 0);
    return itemDiscounts + get().globalDiscount + (get().pointsDiscount || 0);
  },

  taxTotal: () => {
    if (!get().isTaxEnabled || get().taxRate <= 0) return 0;
    const taxable = Math.max(0, get().subTotal() - get().totalDiscount());
    return (taxable * get().taxRate) / 100;
  },

  roundOff: () => {
    const rawTotal = get().subTotal() - get().totalDiscount() + get().taxTotal();
    return Math.round(rawTotal) - rawTotal;
  },

  netTotal: () => {
    const rawTotal = get().subTotal() - get().totalDiscount() + get().taxTotal();
    return Math.max(0, Math.round(rawTotal));
  },

  addItem: (product, qty = 1) => {
    set((state) => {
      const existingIndex = state.items.findIndex(
        (i) => (product.id && i.productId === product.id) || (product.skuCode && i.skuCode === product.skuCode)
      );

      if (existingIndex > -1) {
        const updated = [...state.items];
        const item = updated[existingIndex];
        const newQty = item.quantity + qty;
        const lineTotal = newQty * item.unitPrice - item.discountAmount;
        updated[existingIndex] = { ...item, quantity: newQty, lineTotal };
        return { items: updated };
      }

      const unitPrice = Number(product.sellingPrice) || 0;
      const costPrice = Number(product.costPrice) || 0;
      const lineTotal = qty * unitPrice;

      const newItem: POSCartItem = {
        productId: product.id,
        skuCode: product.skuCode || "GEN-01",
        barcode: product.barcode,
        name: product.name,
        unitPrice,
        costPrice,
        quantity: qty,
        unitName: product.unit?.code || "pcs",
        discountAmount: 0,
        taxPercent: Number(product.taxPercent || 0),
        lineTotal,
        currentStock: Number(product.currentStock || 0),
        version: product.version || 0,
      };

      return { items: [newItem, ...state.items] };
    });
  },

  updateQuantity: (index, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((_, i) => i !== index) };
      }
      const updated = [...state.items];
      const item = updated[index];
      const lineTotal = quantity * item.unitPrice - item.discountAmount;
      updated[index] = { ...item, quantity, lineTotal };
      return { items: updated };
    });
  },

  updatePrice: (index, newPrice) => {
    set((state) => {
      const updated = [...state.items];
      const item = updated[index];
      const lineTotal = item.quantity * newPrice - item.discountAmount;
      updated[index] = { ...item, unitPrice: newPrice, lineTotal };
      return { items: updated };
    });
  },

  updateItemDiscount: (index, discount) => {
    set((state) => {
      const updated = [...state.items];
      const item = updated[index];
      const lineTotal = item.quantity * item.unitPrice - discount;
      updated[index] = { ...item, discountAmount: discount, lineTotal };
      return { items: updated };
    });
  },

  removeItem: (index) => {
    set((state) => ({ items: state.items.filter((_, i) => i !== index) }));
  },

  clearCart: () => {
    set({
      items: [],
      customerId: null,
      customerName: "Walk-in Customer",
      customerPhone: "",
      customerBalance: 0,
      customerWalletBalance: 0,
      customerLoyaltyPoints: 0,
      redeemedPoints: 0,
      pointsDiscount: 0,
      globalDiscount: 0,
    });
  },

  setCustomer: (id, name, phone, balance = 0, walletBalance = 0, loyaltyPoints = 0) => {
    set({
      customerId: id,
      customerName: name || "Walk-in Customer",
      customerPhone: phone || "",
      customerBalance: balance,
      customerWalletBalance: Number(walletBalance) || 0,
      customerLoyaltyPoints: Number(loyaltyPoints) || 0,
      redeemedPoints: 0,
      pointsDiscount: 0,
    });
  },

  setRedeemedPoints: (points, discountAmount) => {
    set({
      redeemedPoints: Math.max(0, points),
      pointsDiscount: Math.max(0, discountAmount),
    });
  },

  setGlobalDiscount: (discount) => set({ globalDiscount: Math.max(0, discount) }),
  setTaxRate: (rate, enabled = true) => set({ taxRate: rate, isTaxEnabled: enabled }),

  holdCurrentBill: () => {
    const { items, customerName, customerPhone, subTotal, netTotal } = get();
    if (items.length === 0) return;

    const newHeldBill: HeldBill = {
      id: `HOLD-${Date.now()}`,
      savedAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      customerName,
      customerPhone,
      items: [...items],
      subTotal: subTotal(),
      netTotal: netTotal(),
    };

    set((state) => ({
      heldBills: [newHeldBill, ...state.heldBills].slice(0, 10), // Keep up to 10 held bills
      items: [],
      customerId: null,
      customerName: "Walk-in Customer",
      customerPhone: "",
      customerBalance: 0,
      globalDiscount: 0,
    }));
  },

  resumeBill: (heldBillId) => {
    const { heldBills } = get();
    const target = heldBills.find((b) => b.id === heldBillId);
    if (!target) return;

    set((state) => ({
      items: target.items,
      customerName: target.customerName,
      customerPhone: target.customerPhone || "",
      heldBills: state.heldBills.filter((b) => b.id !== heldBillId),
    }));
  },

  deleteHeldBill: (heldBillId) => {
    set((state) => ({
      heldBills: state.heldBills.filter((b) => b.id !== heldBillId),
    }));
  },

  setLastCompletedInvoice: (inv) => set({ lastCompletedInvoice: inv }),
}));

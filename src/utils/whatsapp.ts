import {
  renderWhatsAppTemplate,
  createWhatsAppUrl,
  DEFAULT_WHATSAPP_TEMPLATES,
} from "@/lib/whatsapp-templates";

export function generateWhatsAppBillUrl(
  phone: string,
  data: {
    customerName: string;
    invoiceNumber: string;
    netTotal: number;
    itemCount: number;
    paymentMethod: string;
    balanceDue?: number;
    shopName?: string;
    shopPhone?: string;
    customTemplate?: string;
  }
): string {
  const template =
    data.customTemplate || DEFAULT_WHATSAPP_TEMPLATES.POS_BILL.defaultMessage;

  const text = renderWhatsAppTemplate(template, {
    CUSTOMER_NAME: data.customerName || "Customer",
    INVOICE_NUMBER: data.invoiceNumber,
    TOTAL_AMOUNT: data.netTotal.toFixed(2),
    ITEM_COUNT: data.itemCount,
    PAYMENT_METHOD: data.paymentMethod,
    BALANCE_DUE: data.balanceDue ? data.balanceDue.toFixed(2) : "0.00",
    SHOP_NAME: data.shopName || "Crystal Press",
    SHOP_PHONE: data.shopPhone || "+91 98765 43210",
  });

  return createWhatsAppUrl(phone, text);
}

export function generateWhatsAppJobReadyUrl(
  phone: string,
  data: {
    customerName: string;
    jobOrderNumber: string;
    jobType: string;
    quantity: number;
    unit?: string;
    balanceDue: number;
    shopName?: string;
    shopAddress?: string;
    shopPhone?: string;
    upiId?: string;
    customTemplate?: string;
  }
): string {
  const template =
    data.customTemplate || DEFAULT_WHATSAPP_TEMPLATES.READY_FOR_PICKUP.defaultMessage;

  const text = renderWhatsAppTemplate(template, {
    CUSTOMER_NAME: data.customerName || "Customer",
    ORDER_NUMBER: data.jobOrderNumber,
    JOB_TYPE: data.jobType,
    QUANTITY: data.quantity,
    UNIT: data.unit || "pcs",
    BALANCE_DUE: data.balanceDue.toFixed(2),
    SHOP_NAME: data.shopName || "Crystal Press",
    SHOP_ADDRESS: data.shopAddress || "Main Commercial Road, Shop #4",
    SHOP_PHONE: data.shopPhone || "+91 98765 43210",
    UPI_ID: data.upiId || "crystalpress@icici",
  });

  return createWhatsAppUrl(phone, text);
}

export function generateWhatsAppCustomerStatementUrl(data: {
  phone: string;
  customerName: string;
  balanceDue: number;
  shopName?: string;
  shopPhone?: string;
  upiId?: string;
  customTemplate?: string;
}): string {
  const template =
    data.customTemplate || DEFAULT_WHATSAPP_TEMPLATES.UDHAAR_REMINDER.defaultMessage;

  const text = renderWhatsAppTemplate(template, {
    CUSTOMER_NAME: data.customerName || "Customer",
    BALANCE_DUE: Number(data.balanceDue).toFixed(2),
    SHOP_NAME: data.shopName || "Crystal Press",
    SHOP_PHONE: data.shopPhone || "+91 98765 43210",
    UPI_ID: data.upiId || "crystalpress@icici",
  });

  return createWhatsAppUrl(data.phone, text);
}

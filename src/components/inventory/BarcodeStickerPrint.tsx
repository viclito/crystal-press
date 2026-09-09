import { generateBarcodeSvgString } from "@/utils/barcodeSvg";
import { toast } from "@/stores/useSnackbarStore";

export interface PrintBarcodeOptions {
  count?: number;
  template?: "A4_24_UP" | "THERMAL_50x25";
  shopName?: string;
}

export function printBarcodeSticker(
  product: {
    name: string;
    skuCode: string;
    barcode?: string | null;
    sellingPrice: number | string;
    currentStock?: number | string;
  },
  options: number | PrintBarcodeOptions = 24
) {
  const count = typeof options === "number" ? options : options.count || 24;
  const template = typeof options === "object" && options.template ? options.template : "A4_24_UP";
  const shopName = typeof options === "object" && options.shopName ? options.shopName : "CRYSTAL PRESS";

  const safeCount = Math.max(1, Math.min(500, Math.round(Number(count) || 1)));
  const barcodeText = product.barcode?.trim() || product.skuCode?.trim() || "CP-000000";

  let fullHtml = "";

  if (template === "THERMAL_50x25") {
    // 50 x 25mm continuous thermal labels
    const barcodeSvg = generateBarcodeSvgString(barcodeText, {
      height: 28,
      moduleWidth: 1.1,
      quietZone: 4,
      showText: false,
    });

    const labelsHtml = Array.from({ length: safeCount }, () => `
      <div class="thermal-label">
        <div class="shop-name">${shopName}</div>
        <div class="prod-name">${product.name}</div>
        <div class="barcode-box">${barcodeSvg}</div>
        <div class="barcode-footer">
          <span class="barcode-num">${barcodeText}</span>
          <span class="price">MRP: ₹${Number(product.sellingPrice).toFixed(2)}</span>
        </div>
      </div>
    `).join("");

    fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Barcode Labels - ${product.skuCode}</title>
        <style>
          @page {
            size: 50mm 25mm;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #fff;
          }
          .thermal-label {
            width: 50mm;
            height: 25mm;
            padding: 1.5mm 2mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
            page-break-after: always;
            break-after: page;
            overflow: hidden;
            box-sizing: border-box;
          }
          .thermal-label:last-of-type {
            page-break-after: auto;
            break-after: auto;
          }
          .shop-name {
            font-size: 5.5pt;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #334155;
            line-height: 1;
          }
          .prod-name {
            font-size: 7pt;
            font-weight: 700;
            line-height: 1.1;
            color: #0f172a;
            max-height: 5.5mm;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            width: 100%;
          }
          .barcode-box {
            width: 100%;
            height: 10mm;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .barcode-box svg {
            width: 100%;
            height: 100%;
            max-height: 10mm;
            display: block;
          }
          .barcode-footer {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 6pt;
            font-weight: 700;
            color: #0f172a;
            line-height: 1;
            padding: 0 0.5mm;
          }
          .barcode-num {
            font-family: monospace;
            letter-spacing: 0.5px;
          }
          .price {
            font-weight: 800;
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
      </body>
      </html>
    `;
  } else {
    // A4_24_UP: 24 labels per sheet (3 columns x 8 rows)
    const barcodeSvg = generateBarcodeSvgString(barcodeText, {
      height: 30,
      moduleWidth: 1.12,
      quietZone: 4,
      showText: false,
    });

    const singleStickerHtml = `
      <div class="sticker">
        <div class="shop-name">${shopName}</div>
        <div class="prod-name" title="${product.name}">${product.name}</div>
        <div class="barcode-box">
          ${barcodeSvg}
        </div>
        <div class="barcode-footer">
          <span class="barcode-num">${barcodeText}</span>
          <span class="price">MRP: ₹${Number(product.sellingPrice).toFixed(2)}</span>
        </div>
      </div>
    `;

    // Group into pages of 24 stickers
    const pagesCount = Math.ceil(safeCount / 24);
    let sheetsHtml = "";

    for (let p = 0; p < pagesCount; p++) {
      const stickersOnThisPage = Math.min(24, safeCount - p * 24);
      const pageStickers = Array.from({ length: stickersOnThisPage }, () => singleStickerHtml).join("");

      sheetsHtml += `
        <div class="a4-sheet">
          ${pageStickers}
        </div>
      `;
    }

    fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Barcode Stickers - ${product.skuCode}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm 6mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #fff;
          }
          .a4-sheet {
            width: 100%;
            height: 266mm;
            max-height: 266mm;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(8, 31.5mm);
            gap: 2mm 3mm;
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: always;
            break-after: page;
            box-sizing: border-box;
            overflow: hidden;
            margin: 0 auto;
          }
          .a4-sheet:last-of-type {
            page-break-after: auto;
            break-after: auto;
          }
          .sticker {
            width: 100%;
            height: 31.5mm;
            border: 1px dashed #cbd5e1;
            border-radius: 3px;
            padding: 1.5mm 2.5mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
            box-sizing: border-box;
            overflow: hidden;
            background: #fff;
            break-inside: avoid;
          }
          .shop-name {
            font-size: 5.5pt;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            line-height: 1;
          }
          .prod-name {
            font-size: 7pt;
            font-weight: 700;
            line-height: 1.15;
            color: #0f172a;
            max-height: 7mm;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            word-break: break-word;
            width: 100%;
          }
          .barcode-box {
            width: 100%;
            height: 11.5mm;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0.3mm 0;
          }
          .barcode-box svg {
            width: 100%;
            height: 100%;
            max-height: 11.5mm;
            display: block;
          }
          .barcode-footer {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 6pt;
            font-weight: 700;
            color: #0f172a;
            line-height: 1;
            padding: 0 0.5mm;
          }
          .barcode-num {
            font-family: monospace;
            letter-spacing: 0.5px;
            color: #334155;
          }
          .price {
            font-weight: 800;
            color: #000;
          }
        </style>
      </head>
      <body>
        ${sheetsHtml}
      </body>
      </html>
    `;
  }

  let iframe = document.getElementById("barcode-print-iframe") as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "barcode-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(fullHtml);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  }, 100);

  try {
    toast.info(
      `Printing ${safeCount} barcode sticker${safeCount > 1 ? "s" : ""} for ${product.name}`,
      "Barcode Print"
    );
  } catch (e) {}
}

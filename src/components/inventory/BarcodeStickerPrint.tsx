export function printBarcodeSticker(product: {
  name: string;
  skuCode: string;
  barcode: string;
  sellingPrice: number;
}, count = 24) {
  const stickers = Array(count).fill(product);

  const stickersHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Barcode Stickers - ${product.skuCode}</title>
      <style>
        @page { size: A4; margin: 10mm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; }
        .sticker {
          border: 1px dashed #ccc;
          border-radius: 4px;
          padding: 6mm 4mm;
          text-align: center;
          height: 32mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .shop-name { font-size: 8px; font-weight: bold; text-transform: uppercase; color: #555; }
        .prod-name { font-size: 10px; font-weight: bold; line-height: 1.1; margin: 2px 0; overflow: hidden; max-height: 22px; }
        .barcode-font { font-family: 'Libre Barcode 39', 'Courier New', monospace; font-size: 22px; letter-spacing: 2px; }
        .barcode-num { font-size: 8px; font-weight: bold; }
        .price { font-size: 11px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="grid">
        ${stickers
          .map(
            (s) => `
          <div class="sticker">
            <div class="shop-name">CRYSTAL PRESS</div>
            <div class="prod-name">${s.name}</div>
            <div class="barcode-font">*${s.barcode || s.skuCode}*</div>
            <div class="barcode-num">${s.barcode || s.skuCode}</div>
            <div class="price">MRP: ₹${Number(s.sellingPrice).toFixed(2)}</div>
          </div>
        `
          )
          .join("")}
      </div>
    </body>
    </html>
  `;

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
  doc.write(stickersHtml);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
  }, 60);

  try {
    const { toast } = require("@/stores/useSnackbarStore");
    toast.info(`Printing 24 barcode stickers for ${product.name}`, "Barcode Print");
  } catch (e) {}
}

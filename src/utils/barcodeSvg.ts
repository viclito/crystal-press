/**
 * Pure TypeScript Code 128 (Subset B) & QR Code SVG Generator
 * Generates crisp vector SVGs optimized for 203 DPI thermal label printers and A4 sheets.
 */

// Code 128 patterns (index 0 to 106)
// Each pattern represents 6 widths (alternating bar, space, bar, space, bar, space)
const CODE128_PATTERNS: number[][] = [
  [2, 1, 2, 2, 2, 2], // 0
  [2, 2, 2, 1, 2, 2], // 1
  [2, 2, 2, 2, 2, 1], // 2
  [1, 2, 1, 2, 2, 3], // 3
  [1, 2, 1, 3, 2, 2], // 4
  [1, 3, 1, 2, 2, 2], // 5
  [1, 2, 2, 2, 1, 3], // 6
  [1, 2, 2, 3, 1, 2], // 7
  [1, 3, 2, 2, 1, 2], // 8
  [2, 2, 1, 2, 1, 3], // 9
  [2, 2, 1, 3, 1, 2], // 10
  [2, 3, 1, 2, 1, 2], // 11
  [1, 1, 2, 2, 3, 2], // 12
  [1, 2, 2, 1, 3, 2], // 13
  [1, 2, 2, 2, 3, 1], // 14
  [1, 1, 3, 2, 2, 2], // 15
  [1, 2, 3, 1, 2, 2], // 16
  [1, 2, 3, 2, 2, 1], // 17
  [2, 2, 3, 2, 1, 1], // 18
  [2, 2, 1, 1, 3, 2], // 19
  [2, 2, 1, 2, 3, 1], // 20
  [2, 1, 3, 2, 1, 2], // 21
  [2, 2, 3, 1, 1, 2], // 22
  [3, 1, 2, 1, 3, 1], // 23
  [3, 1, 1, 2, 2, 2], // 24
  [3, 2, 1, 1, 2, 2], // 25
  [3, 2, 1, 2, 2, 1], // 26
  [3, 1, 2, 2, 1, 2], // 27
  [3, 2, 2, 1, 1, 2], // 28
  [3, 2, 2, 2, 1, 1], // 29
  [2, 1, 2, 1, 2, 3], // 30
  [2, 1, 2, 3, 2, 1], // 31
  [2, 3, 2, 1, 2, 1], // 32
  [1, 1, 1, 3, 2, 3], // 33
  [1, 3, 1, 1, 2, 3], // 34
  [1, 3, 1, 3, 2, 1], // 35
  [1, 1, 2, 3, 1, 3], // 36
  [1, 3, 2, 1, 1, 3], // 37
  [1, 3, 2, 3, 1, 1], // 38
  [2, 1, 1, 3, 1, 3], // 39
  [2, 3, 1, 1, 1, 3], // 40
  [2, 3, 1, 3, 1, 1], // 41
  [1, 1, 2, 1, 3, 3], // 42
  [1, 1, 2, 3, 3, 1], // 43
  [1, 3, 2, 1, 3, 1], // 44
  [1, 1, 3, 1, 2, 3], // 45
  [1, 1, 3, 3, 2, 1], // 46
  [1, 3, 3, 1, 2, 1], // 47
  [3, 1, 3, 1, 2, 1], // 48
  [2, 1, 1, 3, 3, 1], // 49
  [2, 3, 1, 1, 3, 1], // 50
  [2, 1, 3, 1, 1, 3], // 51
  [2, 1, 3, 3, 1, 1], // 52
  [2, 1, 3, 1, 3, 1], // 53
  [3, 1, 1, 1, 2, 3], // 54
  [3, 1, 1, 3, 2, 1], // 55
  [3, 3, 1, 1, 2, 1], // 56
  [3, 1, 2, 1, 1, 3], // 57
  [3, 1, 2, 3, 1, 1], // 58
  [3, 3, 2, 1, 1, 1], // 59
  [3, 1, 4, 1, 1, 1], // 60
  [2, 2, 1, 4, 1, 1], // 61
  [4, 3, 1, 1, 1, 1], // 62
  [1, 1, 1, 2, 2, 4], // 63
  [1, 1, 1, 4, 2, 2], // 64
  [1, 2, 1, 1, 2, 4], // 65
  [1, 2, 1, 4, 2, 1], // 66
  [1, 4, 1, 1, 2, 2], // 67
  [1, 4, 1, 2, 2, 1], // 68
  [1, 1, 2, 2, 1, 4], // 69
  [1, 1, 2, 4, 1, 2], // 70
  [1, 2, 2, 1, 1, 4], // 71
  [1, 2, 2, 4, 1, 1], // 72
  [1, 4, 2, 1, 1, 2], // 73
  [1, 4, 2, 2, 1, 1], // 74
  [2, 4, 1, 2, 1, 1], // 75
  [2, 2, 1, 1, 1, 4], // 76
  [4, 1, 3, 1, 1, 1], // 77
  [2, 4, 1, 1, 1, 2], // 78
  [1, 3, 4, 1, 1, 1], // 79
  [1, 1, 1, 2, 4, 2], // 80
  [1, 2, 1, 1, 4, 2], // 81
  [1, 2, 1, 2, 4, 1], // 82
  [1, 1, 4, 2, 1, 2], // 83
  [1, 2, 4, 1, 1, 2], // 84
  [1, 2, 4, 2, 1, 1], // 85
  [4, 1, 1, 2, 1, 2], // 86
  [4, 2, 1, 1, 1, 2], // 87
  [4, 2, 1, 2, 1, 1], // 88
  [2, 1, 2, 1, 4, 1], // 89
  [2, 1, 4, 1, 2, 1], // 90
  [4, 1, 2, 1, 2, 1], // 91
  [1, 1, 1, 1, 4, 3], // 92
  [1, 1, 1, 3, 4, 1], // 93
  [1, 3, 1, 1, 4, 1], // 94
  [1, 1, 4, 1, 1, 3], // 95
  [1, 1, 4, 3, 1, 1], // 96
  [4, 1, 1, 1, 1, 3], // 97
  [4, 1, 1, 3, 1, 1], // 98
  [1, 1, 3, 1, 4, 1], // 99
  [1, 1, 4, 1, 3, 1], // 100
  [3, 1, 1, 1, 4, 1], // 101
  [4, 1, 1, 1, 3, 1], // 102
  [2, 1, 1, 4, 1, 2], // 103: Start Code A
  [2, 1, 1, 2, 1, 4], // 104: Start Code B
  [2, 1, 1, 2, 3, 2], // 105: Start Code C
  [2, 3, 3, 1, 1, 1], // 106: Stop (followed by 2 modules bar)
];

/**
 * Generate Code 128 (Subset B) binary modules array (1s for black bars, 0s for white spaces)
 */
export function encodeCode128B(text: string, quietZone: number = 10): number[] {
  const cleanText = text || "CP-000000";
  const startCodeB = 104;

  const codes: number[] = [startCodeB];
  let checkSum = startCodeB;

  for (let i = 0; i < cleanText.length; i++) {
    const charCode = cleanText.charCodeAt(i);
    const code = charCode - 32; // Code 128B mapping
    if (code >= 0 && code <= 95) {
      codes.push(code);
      checkSum += code * (i + 1);
    } else {
      // Fallback for unmapped characters
      const fallback = 31; // '?'
      codes.push(fallback);
      checkSum += fallback * (i + 1);
    }
  }

  const checkDigit = checkSum % 103;
  codes.push(checkDigit);
  codes.push(106); // Stop pattern

  // Convert codes to 1s and 0s
  const modules: number[] = [];
  for (let q = 0; q < quietZone; q++) modules.push(0);

  codes.forEach((c, idx) => {
    const pattern = CODE128_PATTERNS[c] || CODE128_PATTERNS[0];
    let isBar = true;
    for (const width of pattern) {
      for (let w = 0; w < width; w++) {
        modules.push(isBar ? 1 : 0);
      }
      isBar = !isBar;
    }
    // Stop code has an extra 2-width bar at the very end
    if (idx === codes.length - 1) {
      modules.push(1, 1);
    }
  });

  // Ending quiet zone
  for (let q = 0; q < quietZone; q++) modules.push(0);

  return modules;
}

/**
 * Generate vector SVG string for Code 128 barcode
 */
export function generateBarcodeSvgString(
  text: string,
  options: {
    height?: number;
    moduleWidth?: number;
    showText?: boolean;
    color?: string;
    quietZone?: number;
  } = {}
): string {
  const {
    height = 45,
    moduleWidth = 1.4,
    showText = false,
    color = "#000000",
    quietZone = 10,
  } = options;
  const modules = encodeCode128B(text, quietZone);
  const totalWidth = modules.length * moduleWidth;

  let rects = "";
  let x = 0;
  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === 1) {
      // Lookahead to combine adjacent bars into a single wider rect for cleaner SVG
      let barWidth = moduleWidth;
      while (i + 1 < modules.length && modules[i + 1] === 1) {
        barWidth += moduleWidth;
        i++;
      }
      rects += `<rect x="${x.toFixed(1)}" y="0" width="${barWidth.toFixed(1)}" height="${height}" fill="${color}" />`;
      x += barWidth;
    } else {
      x += moduleWidth;
    }
  }

  const svgHeight = showText ? height + 14 : height;
  const textElement = showText
    ? `<text x="${(totalWidth / 2).toFixed(1)}" y="${height + 11}" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold" fill="${color}">${text}</text>`
    : "";

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(1)} ${svgHeight}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      ${rects}
      ${textElement}
    </svg>
  `.trim();
}

/**
 * Generates an auto EAN / Code-128 barcode string from product ID / timestamp
 */
export function generateAutoBarcodeString(skuCode?: string): string {
  const prefix = "CP";
  const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
  return skuCode ? `${skuCode.toUpperCase()}` : `${prefix}-${randomDigits}`;
}

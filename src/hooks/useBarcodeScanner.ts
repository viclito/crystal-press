"use client";

import { useEffect, useRef } from "react";
import { usePOSStore } from "@/stores/usePOSStore";
import { searchProductByBarcode } from "@/actions/barcodes";
import { toast } from "@/stores/useSnackbarStore";

interface BarcodeScannerOptions {
  productCatalog?: any[];
  onScanSuccess?: (barcode: string, product?: any) => void;
  enabled?: boolean;
}

/**
 * Universal Handheld Barcode Scanner ("Gun" type: USB, 2.4GHz Wireless Dongle, Bluetooth)
 *
 * Physical barcode scanners operate as HID Keyboard Wedges:
 * 1. They emit characters at rapid hardware burst speeds (typically 5ms - 40ms per character).
 * 2. They terminate the sequence with an Enter or Tab key.
 *
 * This hook captures hardware burst sequences globally, verifies them against local inventory
 * and server catalog, plays positive/negative audio tones, and adds products to the POS cart.
 */
export function useBarcodeScanner({
  productCatalog = [],
  onScanSuccess,
  enabled = true,
}: BarcodeScannerOptions) {
  const addItem = usePOSStore((s) => s.addItem);
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });
  const isProcessingRef = useRef<boolean>(false);

  // Keep latest references for callbacks to avoid effect churn
  const onScanSuccessRef = useRef(onScanSuccess);
  const productCatalogRef = useRef(productCatalog);
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
    productCatalogRef.current = productCatalog;
  }, [onScanSuccess, productCatalog]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      const currentTime = Date.now();
      const diff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // 100ms threshold safely accommodates all handheld scanners (including 2.4GHz wireless
      // & Bluetooth scanners with power-saving latency) while cleanly ignoring human typing (>180ms).
      if (diff > 100) {
        bufferRef.current = "";
      }

      // Handheld scanners send Enter (or Tab / Carriage Return) at the end of the barcode
      if (e.key === "Enter" || e.key === "Tab") {
        if (bufferRef.current.length >= 3) {
          const barcode = bufferRef.current.trim();
          bufferRef.current = "";

          // Debounce duplicate trigger pulls within 300ms
          if (
            lastScannedRef.current.code === barcode &&
            currentTime - lastScannedRef.current.time < 300
          ) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }

          if (isProcessingRef.current) return;
          isProcessingRef.current = true;

          // Intercept event in capture phase to prevent accidental form submits or input corruption
          e.preventDefault();
          e.stopPropagation();

          // If the user was focused on an <input> (e.g. POS search bar), clear the barcode characters
          const target = e.target as HTMLElement;
          if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
            const inputEl = target as HTMLInputElement;
            if (inputEl.value && (inputEl.value === barcode || inputEl.value.endsWith(barcode))) {
              inputEl.value = "";
              inputEl.dispatchEvent(new Event("input", { bubbles: true }));
            }
          }

          lastScannedRef.current = { code: barcode, time: currentTime };

          // Step 1: Instant synchronous lookup in preloaded in-memory product catalog (0ms latency)
          const matched = productCatalogRef.current.find(
            (p) =>
              (p.barcode && p.barcode.toLowerCase() === barcode.toLowerCase()) ||
              (p.skuCode && p.skuCode.toLowerCase() === barcode.toLowerCase())
          );

          if (matched) {
            addItem(matched, 1);
            playScannerBeep();
            toast.success(`Scanned: "${matched.name}" added to cart`);
            if (onScanSuccessRef.current) onScanSuccessRef.current(barcode, matched);
            isProcessingRef.current = false;
            return;
          }

          // Step 2: Asynchronous Server Lookup Fallback (for unlisted or newly added items)
          try {
            const res = await searchProductByBarcode(barcode);
            if (res.success && res.product) {
              addItem(res.product, 1);
              playScannerBeep();
              toast.success(`Scanned: "${res.product.name}" added to cart`);
              if (onScanSuccessRef.current) onScanSuccessRef.current(barcode, res.product);
            } else {
              playErrorBeep();
              toast.warning(`Barcode "${barcode}" not found in catalog`);
            }
          } catch (err) {
            playErrorBeep();
            toast.error(`Lookup failed for barcode: ${barcode}`);
          } finally {
            isProcessingRef.current = false;
          }
        }
      } else if (e.key.length === 1) {
        // Accumulate single printable character into scan buffer
        bufferRef.current += e.key;
      }
    };

    // Use capture phase (true) so physical scanner gun strokes are intercepted before any nested input handlers
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [addItem, enabled]);
}

/**
 * Positive scanner confirmation beep (crisp 1800Hz POS sine beep)
 */
export function playScannerBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1800, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (err) {
    // Audio context may be restricted before first user interaction
  }
}

/**
 * Negative error tone (low 400Hz sawtooth alert)
 */
export function playErrorBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (err) {
    // Audio context may be restricted before first user interaction
  }
}

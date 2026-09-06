"use client";

import { useEffect, useRef } from "react";
import { usePOSStore } from "@/stores/usePOSStore";

interface BarcodeScannerOptions {
  productCatalog?: any[];
  onScanSuccess?: (barcode: string, product?: any) => void;
  enabled?: boolean;
}

export function useBarcodeScanner({
  productCatalog = [],
  onScanSuccess,
  enabled = true,
}: BarcodeScannerOptions) {
  const addItem = usePOSStore((s) => s.addItem);
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an explicit text search input unless it allows barcode capture
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      const currentTime = Date.now();
      const diff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Barcode scanners type at hardware burst speeds (usually 10-50ms between characters)
      if (diff > 75) {
        bufferRef.current = ""; // Reset buffer if normal human typing cadence
      }

      if (e.key === "Enter") {
        if (bufferRef.current.length >= 3) {
          const barcode = bufferRef.current.trim();
          e.preventDefault();
          e.stopPropagation();

          // Instant lookup in product catalog
          const matched = productCatalog.find(
            (p) =>
              (p.barcode && p.barcode.toLowerCase() === barcode.toLowerCase()) ||
              (p.skuCode && p.skuCode.toLowerCase() === barcode.toLowerCase())
          );

          if (matched) {
            addItem(matched, 1);
            playScannerBeep();
            if (onScanSuccess) onScanSuccess(barcode, matched);
          } else {
            playErrorBeep();
          }

          bufferRef.current = "";
        }
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [productCatalog, addItem, onScanSuccess, enabled]);
}

export function playScannerBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1800, ctx.currentTime); // High crisp POS frequency
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (err) {
    // Audio might be blocked by browser policy until first interaction
  }
}

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
    // Ignore audio error
  }
}

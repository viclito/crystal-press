"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Camera,
  Scan,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  Volume2,
  RefreshCw,
} from "lucide-react";
import { searchProductByBarcode } from "@/actions/barcodes";
import { playScannerBeep, playErrorBeep } from "@/hooks/useBarcodeScanner";
import { toast } from "@/stores/useSnackbarStore";

interface BarcodeCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (barcode: string, product?: any) => void;
  title?: string;
}

export function BarcodeCameraModal({
  isOpen,
  onClose,
  onDetected,
  title = "Camera Barcode & QR Scanner",
}: BarcodeCameraModalProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [detectedProduct, setDetectedProduct] = useState<any | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  // Initialize Camera Stream
  useEffect(() => {
    if (!isOpen) return;

    let activeStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setHasCameraPermission(false);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment", // Use rear camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        activeStream = stream;
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        setHasCameraPermission(true);

        // Check if native BarcodeDetector API is available (Chrome, Edge, Android)
        if ("BarcodeDetector" in window) {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ["code_128", "ean_13", "ean_8", "qr_code", "upc_a", "upc_e"],
          });

          scanIntervalRef.current = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const rawValue = barcodes[0].rawValue;
                  if (rawValue) {
                    handleCodeFound(rawValue);
                  }
                }
              } catch (e) {
                // Ignore detection frame drops
              }
            }
          }, 350);
        }
      } catch (err: any) {
        console.warn("Camera access failed:", err);
        setHasCameraPermission(false);
      }
    };

    startCamera();

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCodeFound = async (code: string) => {
    if (isSearching) return;
    setIsSearching(true);

    playScannerBeep();
    toast.info(`Scanned Code: ${code}`, "Barcode Detected");

    const res = await searchProductByBarcode(code);
    setIsSearching(false);

    if (res.success && res.product) {
      setDetectedProduct(res.product);
      onDetected(code, res.product);
      setTimeout(() => {
        onClose();
      }, 700);
    } else {
      // Still notify parent of scanned string even if not in catalog
      onDetected(code);
      playErrorBeep();
      toast.warning(`Scanned: ${code} (Not found in catalog)`);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await handleCodeFound(manualCode.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lime-400 text-slate-950 flex items-center justify-center shadow-sm font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">{title}</h3>
              <p className="text-[10px] text-slate-400">Scan 1D Barcodes, EAN, or QR Codes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewport Area */}
        <div className="relative bg-slate-950 aspect-video w-full flex items-center justify-center overflow-hidden">
          {hasCameraPermission === false ? (
            <div className="p-6 text-center text-slate-400 space-y-2">
              <Camera className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-xs font-bold text-slate-300">Camera Unavailable or Denied</div>
              <p className="text-[11px] text-slate-500 max-w-xs">
                You can use a hardware USB laser scanner or enter the barcode manually below.
              </p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Aiming Reticle Frame */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-32 border-2 border-dashed border-lime-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(163,230,53,0.3)] flex items-center justify-center">
                  <div className="w-full h-0.5 bg-lime-400 shadow-[0_0_8px_#a3e635] animate-pulse" />
                  <span className="absolute bottom-2 text-[9px] font-bold text-lime-300 bg-slate-900/80 px-2 py-0.5 rounded-full">
                    ALIGN BARCODE HERE
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Scanned Badge Notification Overlay */}
          {detectedProduct && (
            <div className="absolute inset-x-4 bottom-4 bg-emerald-500/90 backdrop-blur-sm text-white p-2.5 rounded-2xl flex items-center gap-2 text-xs shadow-lg animate-in slide-in-from-bottom-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <div className="truncate">
                <div className="font-bold">{detectedProduct.name}</div>
                <div className="text-[10px] opacity-80">₹{detectedProduct.sellingPrice} • Stock: {detectedProduct.currentStock}</div>
              </div>
            </div>
          )}
        </div>

        {/* Manual Barcode Fallback Box */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Scan className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Type or scan with USB barcode scanner..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400 font-mono font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim() || isSearching}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shrink-0"
            >
              Lookup
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Supports standard 1D & 2D QR codes</span>
            <span className="flex items-center gap-1 font-semibold text-lime-700">
              <Volume2 className="w-3 h-3" /> Audio Beep Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

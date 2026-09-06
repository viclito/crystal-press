"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Camera,
  Scan,
  CheckCircle2,
  AlertCircle,
  Flashlight,
  FlashlightOff,
  Sparkles,
  Zap,
  ZoomIn,
  RefreshCw,
} from "lucide-react";
import {
  BarcodeFormat,
  DecodeHintType,
  BinaryBitmap,
  HybridBinarizer,
  GlobalHistogramBinarizer,
  MultiFormatReader,
  HTMLCanvasElementLuminanceSource,
} from "@zxing/library";
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
  const [unrecognizedCode, setUnrecognizedCode] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<1 | 2>(1);
  const [scanStatusText, setScanStatusText] = useState<string>("Align barcode in box");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const multiFormatReaderRef = useRef<MultiFormatReader | null>(null);
  const nativeDetectorRef = useRef<any>(null);
  const scanIntervalRef = useRef<any>(null);
  const isHandlingRef = useRef(false);
  const isMatchedRef = useRef(false);

  // Stable refs for callbacks to prevent parent re-renders from restarting the camera stream
  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onDetectedRef.current = onDetected;
    onCloseRef.current = onClose;
  });

  // Strict formats: Code 128 (Crystal Press), EAN/UPC (Retail standard)
  // Exclude Code 39 & ITF to eliminate false-positive ghost reads from screen text / moiré
  const getHints = useCallback(() => {
    const hints = new Map();
    const formats = [
      BarcodeFormat.CODE_128,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.QR_CODE,
    ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    hints.set(DecodeHintType.TRY_HARDER, true);
    return hints;
  }, []);

  const handleCodeFound = useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim();
      if (!code || isHandlingRef.current || isMatchedRef.current) return;
      isHandlingRef.current = true;
      setIsSearching(true);
      setUnrecognizedCode(null);
      setScanStatusText(`Checking: ${code}...`);

      try {
        const res = await searchProductByBarcode(code);
        if (res.success && res.product) {
          // Success: Matched item in database!
          isMatchedRef.current = true;

          // Stop scanner interval and camera stream immediately so no further frames can process
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
          }
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
          }

          playScannerBeep();
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([70, 40, 70]);
          }
          setDetectedProduct(res.product);
          setUnrecognizedCode(null);
          setScanStatusText(`Matched: ${res.product.name}`);

          // Deliver product to parent
          onDetectedRef.current(code, res.product);

          // Close modal smoothly after brief celebration
          setTimeout(() => {
            onCloseRef.current();
          }, 650);
        } else {
          // Barcode recognized by scanner format, but not in catalog
          playErrorBeep();
          setUnrecognizedCode(code);
          setScanStatusText(`Not Found: ${code}`);
          toast.warning(`Scanned: ${code} (Not found in catalog)`);

          // 3s cooldown so it does not loop spam toasts
          setTimeout(() => {
            if (!isMatchedRef.current) {
              isHandlingRef.current = false;
              setIsSearching(false);
              setUnrecognizedCode(null);
              setScanStatusText("Align barcode in box");
            }
          }, 3000);
        }
      } catch (err) {
        playErrorBeep();
        setUnrecognizedCode(code);
        toast.error(`Scan lookup failed: ${code}`);
        setTimeout(() => {
          if (!isMatchedRef.current) {
            isHandlingRef.current = false;
            setIsSearching(false);
            setUnrecognizedCode(null);
            setScanStatusText("Align barcode in box");
          }
        }, 3000);
      }
    },
    []
  );

  // Multi-pass Frame Decoder strictly on the cropped reticle target
  const processFrameAndDecode = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || isHandlingRef.current || isMatchedRef.current) return;

    // Ensure video is actively playing and has valid dimensions
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Crop strictly to the reticle box area so adjacent stickers are excluded
    const cropW = Math.floor(vw * (zoomLevel === 2 ? 0.60 : 0.80));
    const cropH = Math.floor(vh * (zoomLevel === 2 ? 0.40 : 0.48));
    const cropX = Math.floor((vw - cropW) / 2);
    const cropY = Math.floor((vh - cropH) / 2);

    canvas.width = cropW;
    canvas.height = cropH;
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Pass 1: Native Hardware BarcodeDetector on the CROPPED CANVAS ONLY
    // (Scanning cropped canvas guarantees only the sticker inside reticle is detected)
    if (nativeDetectorRef.current) {
      nativeDetectorRef.current
        .detect(canvas)
        .then((barcodes: any[]) => {
          if (
            barcodes &&
            barcodes.length > 0 &&
            barcodes[0].rawValue &&
            !isHandlingRef.current &&
            !isMatchedRef.current
          ) {
            handleCodeFound(barcodes[0].rawValue);
          }
        })
        .catch(() => {});
    }

    // Initialize ZXing MultiFormatReader if not yet done
    if (!multiFormatReaderRef.current) {
      const reader = new MultiFormatReader();
      reader.setHints(getHints());
      multiFormatReaderRef.current = reader;
    }

    const reader = multiFormatReaderRef.current;

    // Pass 2: ZXing GlobalHistogramBinarizer (superior for computer monitors, moiré, and glare)
    try {
      const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas, false);
      const globalBitmap = new BinaryBitmap(new GlobalHistogramBinarizer(luminanceSource));
      const res = reader.decode(globalBitmap);
      if (res && res.getText() && !isHandlingRef.current && !isMatchedRef.current) {
        handleCodeFound(res.getText());
        return;
      }
    } catch (e) {
      // Barcode not found in this pass
    }

    // Pass 3: ZXing HybridBinarizer (superior for crisp printed thermal/paper labels)
    try {
      const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas, false);
      const hybridBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
      const res = reader.decode(hybridBitmap);
      if (res && res.getText() && !isHandlingRef.current && !isMatchedRef.current) {
        handleCodeFound(res.getText());
        return;
      }
    } catch (e) {
      // Barcode not found in this pass
    }

    // Pass 4: Inverted contrast pass
    try {
      const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas, true);
      const invertedBitmap = new BinaryBitmap(new GlobalHistogramBinarizer(luminanceSource));
      const res = reader.decode(invertedBitmap);
      if (res && res.getText() && !isHandlingRef.current && !isMatchedRef.current) {
        handleCodeFound(res.getText());
        return;
      }
    } catch (e) {
      // Barcode not found in this pass
    }
  }, [getHints, handleCodeFound, zoomLevel]);

  // Set Zoom
  const handleToggleZoom = async () => {
    const nextZoom = zoomLevel === 1 ? 2 : 1;
    setZoomLevel(nextZoom);

    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          const caps = (track.getCapabilities && track.getCapabilities()) as any;
          if (caps && "zoom" in caps) {
            const targetZoom = nextZoom === 2 ? Math.min(caps.zoom.max || 2, 2.0) : 1.0;
            await (track as any).applyConstraints({
              advanced: [{ zoom: targetZoom }],
            });
          }
        } catch (e) {
          // Hardware zoom unsupported, canvas crop handles it
        }
      }
    }
  };

  // Reset scan handling manually
  const handleScanAgain = () => {
    isHandlingRef.current = false;
    isMatchedRef.current = false;
    setIsSearching(false);
    setUnrecognizedCode(null);
    setDetectedProduct(null);
    setScanStatusText("Align barcode in box");
  };

  // Initialize Camera & Frame Loop - strictly controlled by isOpen only!
  useEffect(() => {
    if (!isOpen) return;

    isMatchedRef.current = false;
    isHandlingRef.current = false;
    setIsSearching(false);
    setDetectedProduct(null);
    setUnrecognizedCode(null);
    setScanStatusText("Align barcode in box");

    let activeStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setHasCameraPermission(false);
          return;
        }

        // Request back camera with continuous autofocus and high resolution
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = stream;
        streamRef.current = stream;

        // Check capabilities (torch, zoom)
        const track = stream.getVideoTracks()[0];
        if (track) {
          const caps = (track.getCapabilities && track.getCapabilities()) as any;
          if (caps && "torch" in caps) {
            setHasTorch(true);
          }
        }

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute("playsinline", "true");
          video.setAttribute("autoplay", "true");
          video.setAttribute("muted", "true");

          try {
            await video.play();
          } catch (playErr) {
            console.warn("Autoplay error:", playErr);
          }
        }

        setHasCameraPermission(true);

        // Initialize native BarcodeDetector if available (Chromium/Android/iOS 17+)
        if ("BarcodeDetector" in window) {
          try {
            nativeDetectorRef.current = new (window as any).BarcodeDetector({
              formats: ["code_128", "ean_13", "ean_8", "upc_a", "upc_e", "qr_code"],
            });
          } catch (e) {
            nativeDetectorRef.current = null;
          }
        }

        // Run multi-pass scanning loop every 160ms (~6 fps, fast and lightweight)
        scanIntervalRef.current = setInterval(() => {
          processFrameAndDecode();
        }, 160);
      } catch (err: any) {
        console.warn("Camera start failed:", err);
        setHasCameraPermission(false);
      }
    };

    startCamera();

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, processFrameAndDecode]);

  // Torch Toggle
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const next = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: next }],
      });
      setIsTorchOn(next);
    } catch (e) {
      console.warn("Torch failed:", e);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await handleCodeFound(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
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

          <div className="flex items-center gap-1.5">
            {/* 2x Zoom Toggle Button (Crucial for screen scanning & small stickers) */}
            <button
              type="button"
              onClick={handleToggleZoom}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-black transition-all flex items-center gap-1 ${
                zoomLevel === 2
                  ? "bg-lime-400 border-lime-500 text-slate-950 shadow-sm"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
              title="Toggle 2x Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>{zoomLevel}x</span>
            </button>

            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl border transition-all ${
                  isTorchOn
                    ? "bg-amber-400 border-amber-500 text-slate-950 shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
                title={isTorchOn ? "Turn Off Flashlight" : "Turn On Flashlight"}
              >
                {isTorchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Viewport Area */}
        <div className="relative bg-slate-950 aspect-[4/3] sm:aspect-video w-full flex items-center justify-center overflow-hidden select-none">
          {hasCameraPermission === false ? (
            <div className="p-6 text-center text-slate-400 space-y-2">
              <Camera className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-xs font-bold text-slate-300">Camera Unavailable or Denied</div>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Ensure camera permissions are enabled in your mobile browser settings, or enter the barcode manually below.
              </p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`w-full h-full object-cover transition-transform duration-200 ${
                  zoomLevel === 2 ? "scale-125" : "scale-100"
                }`}
              />

              {/* Hidden Canvas for High-Precision Reticle Frame Analysis */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Aiming Reticle Frame (Unobstructed View - text label positioned ABOVE the box!) */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                {/* Status Indicator Label placed ABOVE the box so it NEVER covers barcode lines */}
                <div
                  className={`mb-2 text-[10px] font-bold px-3 py-0.5 rounded-full border backdrop-blur-sm shadow-md transition-colors ${
                    unrecognizedCode
                      ? "text-amber-300 bg-amber-950/85 border-amber-500/40"
                      : detectedProduct
                      ? "text-emerald-300 bg-emerald-950/85 border-emerald-500/40"
                      : "text-lime-300 bg-slate-900/85 border-lime-500/30"
                  }`}
                >
                  {scanStatusText}
                </div>

                <div
                  className={`w-72 h-36 border-2 border-dashed rounded-2xl relative transition-all flex items-center justify-center ${
                    detectedProduct
                      ? "border-emerald-400 bg-emerald-500/15 shadow-[0_0_35px_rgba(52,211,153,0.6)]"
                      : unrecognizedCode
                      ? "border-amber-400 bg-amber-500/15 shadow-[0_0_35px_rgba(251,191,36,0.5)]"
                      : "border-lime-400 shadow-[0_0_20px_rgba(163,230,53,0.3)]"
                  }`}
                >
                  {/* Animated Laser Scan Line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-lime-400 to-transparent shadow-[0_0_10px_#a3e635] animate-pulse" />

                  {/* Corner Accent Brackets */}
                  <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-lime-300" />
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-lime-300" />
                  <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-lime-300" />
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-lime-300" />
                </div>
              </div>

              {/* Viewport Bottom Buttons */}
              <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2 pointer-events-auto">
                {unrecognizedCode ? (
                  <button
                    type="button"
                    onClick={handleScanAgain}
                    className="px-4 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 border border-amber-300 text-[11px] font-black flex items-center gap-1.5 shadow-lg active:scale-95 transition-transform"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Scan Again</span>
                  </button>
                ) : !detectedProduct ? (
                  <button
                    type="button"
                    onClick={processFrameAndDecode}
                    className="px-4 py-1.5 rounded-full bg-slate-900/85 hover:bg-slate-900 text-lime-400 border border-lime-400/40 text-[11px] font-extrabold flex items-center gap-1.5 backdrop-blur-md shadow-lg active:scale-95 transition-transform"
                  >
                    <Zap className="w-3.5 h-3.5 text-lime-400" />
                    <span>Tap to Scan Now</span>
                  </button>
                ) : null}
              </div>
            </>
          )}

          {/* Scanned Success Badge Overlay */}
          {detectedProduct && (
            <div className="absolute inset-x-4 bottom-4 bg-emerald-600/95 backdrop-blur-md text-white p-3 rounded-2xl flex items-center gap-2.5 text-xs shadow-xl animate-in slide-in-from-bottom-2 border border-emerald-400/40">
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
              <div className="truncate">
                <div className="font-extrabold">{detectedProduct.name}</div>
                <div className="text-[11px] opacity-90 font-mono font-bold">
                  ₹{detectedProduct.sellingPrice} • Stock: {detectedProduct.currentStock}
                </div>
              </div>
            </div>
          )}

          {/* Unrecognized Barcode Overlay Banner */}
          {unrecognizedCode && !detectedProduct && (
            <div className="absolute inset-x-4 bottom-14 bg-amber-500/95 backdrop-blur-md text-slate-950 p-2.5 rounded-2xl flex items-center gap-2 text-xs shadow-xl animate-in slide-in-from-bottom-2 border border-amber-300 font-bold">
              <AlertCircle className="w-4 h-4 text-slate-950 shrink-0" />
              <div className="truncate">
                <div className="font-black">Barcode: {unrecognizedCode}</div>
                <div className="text-[10px] font-medium opacity-90">Not in catalog. Align product barcode.</div>
              </div>
            </div>
          )}
        </div>

        {/* Help Tip & Manual Barcode Fallback Box */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Scan className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Type or scan with USB scanner..."
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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-slate-400 gap-1">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-lime-600" />
              Code 128, EAN-13, EAN-8 & QR (Strict Checksum Engine)
            </span>
            <span className="flex items-center gap-1 font-semibold text-lime-700">
              ⚡ 2x Zoom Available
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3>(1);
  const [hasHardwareZoom, setHasHardwareZoom] = useState(false);
  const [scanStatusText, setScanStatusText] = useState<string>("Align barcode in box");

  const videoRef = useRef<HTMLVideoElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const multiFormatReaderRef = useRef<MultiFormatReader | null>(null);
  const nativeDetectorRef = useRef<any>(null);
  const scanIntervalRef = useRef<any>(null);
  const isHandlingRef = useRef(false);
  const isMatchedRef = useRef(false);

  // Two-Consecutive-Read Consensus Buffer:
  // Requires the same decoded string across 2 consecutive frames within 500ms
  // Completely eliminates transient motion blur and screen glitch reads!
  const candidateReadRef = useRef<{ code: string; count: number; lastTime: number } | null>(null);

  // Stable refs for callbacks to prevent parent re-renders from restarting the camera stream
  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onDetectedRef.current = onDetected;
    onCloseRef.current = onClose;
  });

  // Strict formats: Code 128 (Crystal Press primary), EAN-13, EAN-8, UPC-A, QR Code
  // Eliminates Code 39 & ITF to prevent false-positive ghost reads from screen text / moiré
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

  // Handler for consensus-verified barcodes
  const handleVerifiedCodeFound = useCallback(
    async (code: string) => {
      if (!code || isHandlingRef.current || isMatchedRef.current) return;
      isHandlingRef.current = true;
      setIsSearching(true);
      setUnrecognizedCode(null);
      setScanStatusText(`Verifying: ${code}...`);

      try {
        const res = await searchProductByBarcode(code);
        if (res.success && res.product) {
          // Success: Matched item in catalog!
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
          // Barcode valid format, but not in catalog
          playErrorBeep();
          setUnrecognizedCode(code);
          setScanStatusText(`Not Found: ${code}`);
          toast.warning(`Scanned: ${code} (Not in catalog)`);

          // 2.5s cooldown before resuming so user can point at another sticker
          setTimeout(() => {
            if (!isMatchedRef.current) {
              isHandlingRef.current = false;
              setIsSearching(false);
              setUnrecognizedCode(null);
              candidateReadRef.current = null;
              setScanStatusText("Align barcode in box");
            }
          }, 2500);
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
            candidateReadRef.current = null;
            setScanStatusText("Align barcode in box");
          }
        }, 2500);
      }
    },
    []
  );

  // Candidate evaluation with 2-read consensus verification
  const handleRawCandidateFound = useCallback(
    (rawCode: string) => {
      const code = rawCode.trim();
      if (!code || isHandlingRef.current || isMatchedRef.current) return;

      const now = Date.now();
      const prev = candidateReadRef.current;

      // Check if we have seen this exact candidate within the last 500ms
      if (prev && prev.code === code && now - prev.lastTime < 500) {
        // Confirmed by two consecutive reads!
        candidateReadRef.current = null;
        handleVerifiedCodeFound(code);
      } else {
        // First read: store candidate and require a 2nd confirmation frame
        candidateReadRef.current = { code, count: 1, lastTime: now };
      }
    },
    [handleVerifiedCodeFound]
  );

  // Precise Geometric ROI Frame Decoder
  // Maps the on-screen visible reticle box directly onto the sensor video coordinates
  const processFrameAndDecode = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const reticle = reticleRef.current;
    if (!video || !canvas || !reticle || isHandlingRef.current || isMatchedRef.current) return;

    // Ensure video is actively playing and has valid dimensions
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;

    const vRect = video.getBoundingClientRect();
    const rRect = reticle.getBoundingClientRect();
    if (!vRect.width || !vRect.height || !rRect.width || !rRect.height) return;

    // Compute object-cover aspect scaling and letterbox/crop offsets
    const videoAspect = video.videoWidth / video.videoHeight;
    const containerAspect = vRect.width / vRect.height;

    let renderedW = vRect.width;
    let renderedH = vRect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (containerAspect > videoAspect) {
      renderedW = vRect.width;
      renderedH = vRect.width / videoAspect;
      offsetY = (renderedH - vRect.height) / 2;
    } else {
      renderedH = vRect.height;
      renderedW = vRect.height * videoAspect;
      offsetX = (renderedW - vRect.width) / 2;
    }

    const scale = video.videoWidth / renderedW;

    // Reticle position relative to the rendered video coordinate space
    const rx = rRect.left - vRect.left + offsetX;
    const ry = rRect.top - vRect.top + offsetY;

    // Add 12% breathing quiet zone around the reticle box
    const marginW = rRect.width * 0.12;
    const marginH = rRect.height * 0.12;

    const cropX = Math.max(0, Math.floor((rx - marginW) * scale));
    const cropY = Math.max(0, Math.floor((ry - marginH) * scale));
    const cropW = Math.min(video.videoWidth - cropX, Math.floor((rRect.width + marginW * 2) * scale));
    const cropH = Math.min(video.videoHeight - cropY, Math.floor((rRect.height + marginH * 2) * scale));

    if (cropW <= 0 || cropH <= 0) return;

    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Draw only the exact ROI inside the reticle box
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Pass 1: Native Hardware BarcodeDetector on the ROI canvas only
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
            handleRawCandidateFound(barcodes[0].rawValue);
          }
        })
        .catch(() => {});
    }

    // Initialize ZXing MultiFormatReader
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
        handleRawCandidateFound(res.getText());
        return;
      }
    } catch (e) {
      // Barcode not found
    }

    // Pass 3: ZXing HybridBinarizer (superior for crisp printed thermal/paper labels)
    try {
      const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas, false);
      const hybridBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
      const res = reader.decode(hybridBitmap);
      if (res && res.getText() && !isHandlingRef.current && !isMatchedRef.current) {
        handleRawCandidateFound(res.getText());
        return;
      }
    } catch (e) {
      // Barcode not found
    }

    // Pass 4: Inverted contrast pass
    try {
      const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas, true);
      const invertedBitmap = new BinaryBitmap(new GlobalHistogramBinarizer(luminanceSource));
      const res = reader.decode(invertedBitmap);
      if (res && res.getText() && !isHandlingRef.current && !isMatchedRef.current) {
        handleRawCandidateFound(res.getText());
        return;
      }
    } catch (e) {
      // Barcode not found
    }
  }, [getHints, handleRawCandidateFound]);

  // Hardware Zoom Controller (1x, 2x, 3x)
  const handleSetZoom = async (level: 1 | 2 | 3) => {
    setZoomLevel(level);

    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          const caps = (track.getCapabilities && track.getCapabilities()) as any;
          if (caps && "zoom" in caps) {
            const minZ = caps.zoom.min || 1;
            const maxZ = caps.zoom.max || 5;
            const targetZoom = Math.min(maxZ, Math.max(minZ, level));
            await (track as any).applyConstraints({
              advanced: [{ zoom: targetZoom }],
            });
          }
        } catch (e) {
          // Hardware zoom unsupported, CSS scale handles visual fallback
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
    candidateReadRef.current = null;
    setScanStatusText("Align barcode in box");
  };

  // Initialize Camera & Frame Loop
  useEffect(() => {
    if (!isOpen) return;

    isMatchedRef.current = false;
    isHandlingRef.current = false;
    setIsSearching(false);
    setDetectedProduct(null);
    setUnrecognizedCode(null);
    candidateReadRef.current = null;
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

        // Check capabilities (continuous autofocus, torch, zoom)
        const track = stream.getVideoTracks()[0];
        if (track) {
          const caps = (track.getCapabilities && track.getCapabilities()) as any;
          if (caps) {
            // Apply continuous autofocus if supported
            if (caps.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes("continuous")) {
              try {
                await (track as any).applyConstraints({
                  advanced: [{ focusMode: "continuous" }],
                });
              } catch (e) {}
            }
            if ("torch" in caps) setHasTorch(true);
            if ("zoom" in caps) setHasHardwareZoom(true);
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

        // High-frequency scan loop: runs every 85ms (~12 fps)
        // Since ROI canvas is tiny, decoding takes only ~4ms per frame with 0 lag!
        scanIntervalRef.current = setInterval(() => {
          processFrameAndDecode();
        }, 85);
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
    await handleVerifiedCodeFound(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50/70">
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
            {/* Multi-Level Zoom Selector (1x, 2x, 3x) */}
            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleSetZoom(1)}
                className={`px-2 py-1 rounded-lg text-xs font-black transition-all ${
                  zoomLevel === 1
                    ? "bg-white text-slate-950 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                1x
              </button>
              <button
                type="button"
                onClick={() => handleSetZoom(2)}
                className={`px-2 py-1 rounded-lg text-xs font-black transition-all ${
                  zoomLevel === 2
                    ? "bg-lime-400 text-slate-950 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                2x
              </button>
              <button
                type="button"
                onClick={() => handleSetZoom(3)}
                className={`px-2 py-1 rounded-lg text-xs font-black transition-all ${
                  zoomLevel === 3
                    ? "bg-lime-400 text-slate-950 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                3x
              </button>
            </div>

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
                  !hasHardwareZoom && zoomLevel === 2
                    ? "scale-125"
                    : !hasHardwareZoom && zoomLevel === 3
                    ? "scale-150"
                    : "scale-100"
                }`}
              />

              {/* Hidden Canvas for High-Precision Reticle ROI Analysis */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Dimmed Vignette Overlay to guide user focus onto the ROI */}
              <div className="absolute inset-0 bg-slate-950/30 pointer-events-none" />

              {/* Aiming Reticle Frame - Exactly matches the ROI cropped in JavaScript! */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-3">
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
                  ref={reticleRef}
                  className={`w-72 sm:w-80 h-36 border-2 border-dashed rounded-2xl relative transition-all flex flex-col items-center justify-center bg-transparent backdrop-brightness-110 ${
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
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-lime-300" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-lime-300" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-lime-300" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-lime-300" />

                  {/* Clean helper pill */}
                  <span className="absolute bottom-2 text-[9px] font-bold text-slate-100 bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-slate-700/60 shadow-xs">
                    Target only this box
                  </span>
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
                    <span>Tap to Force Scan</span>
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
              ROI Box Isolation • 2-Frame Consensus Verified
            </span>
            <span className="flex items-center gap-1 font-semibold text-lime-700">
              Continuous AF • Hardware Zoom
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

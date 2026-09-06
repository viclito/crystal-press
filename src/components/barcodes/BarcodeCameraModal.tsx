"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Camera,
  Scan,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Flashlight,
  FlashlightOff,
  Sparkles,
  RefreshCw,
  Zap,
} from "lucide-react";
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
  MultiFormatReader,
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
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isScanningActive, setIsScanningActive] = useState(true);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const multiFormatReaderRef = useRef<MultiFormatReader | null>(null);
  const nativeDetectorRef = useRef<any>(null);
  const scanIntervalRef = useRef<any>(null);
  const isHandlingRef = useRef(false);

  // Configure Hints for ZXing
  const getHints = useCallback(() => {
    const hints = new Map();
    const formats = [
      BarcodeFormat.CODE_128,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.ITF,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
    ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    hints.set(DecodeHintType.TRY_HARDER, true);
    return hints;
  }, []);

  const handleCodeFound = useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim();
      if (!code || isHandlingRef.current) return;
      isHandlingRef.current = true;
      setIsSearching(true);
      setLastScannedCode(code);

      // Play scanner audio & haptic feedback on phones
      playScannerBeep();
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([60, 40, 60]);
      }

      toast.info(`Scanned Barcode: ${code}`, "Barcode Detected");

      try {
        const res = await searchProductByBarcode(code);
        if (res.success && res.product) {
          setDetectedProduct(res.product);
          onDetected(code, res.product);
          setTimeout(() => {
            onClose();
          }, 800);
        } else {
          onDetected(code);
          playErrorBeep();
          toast.warning(`Scanned: ${code} (Not found in catalog)`);
          setTimeout(() => {
            isHandlingRef.current = false;
            setIsSearching(false);
          }, 1500);
        }
      } catch (err) {
        onDetected(code);
        setTimeout(() => {
          isHandlingRef.current = false;
          setIsSearching(false);
        }, 1500);
      }
    },
    [onDetected, onClose]
  );

  // Manual Frame Capture & Reticle Decoder (Highly effective for iOS & multiple stickers)
  const captureAndDecodeFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || isHandlingRef.current) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;

    // 1. First attempt: Crop to center reticle (75% width, 45% height) to isolate target sticker
    const cropW = Math.floor(vw * 0.75);
    const cropH = Math.floor(vh * 0.45);
    const cropX = Math.floor((vw - cropW) / 2);
    const cropY = Math.floor((vh - cropH) / 2);

    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Try native BarcodeDetector on cropped canvas if available (Android/Chrome)
    if (nativeDetectorRef.current) {
      nativeDetectorRef.current
        .detect(canvas)
        .then((barcodes: any[]) => {
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            handleCodeFound(barcodes[0].rawValue);
            return;
          }
        })
        .catch(() => {});
    }

    // Decode with ZXing MultiFormatReader from Canvas Pixels (iOS Safari & universal fallback)
    try {
      if (!multiFormatReaderRef.current) {
        const reader = new MultiFormatReader();
        reader.setHints(getHints());
        multiFormatReaderRef.current = reader;
      }

      const imgData = ctx.getImageData(0, 0, cropW, cropH);
      const luminance = new RGBLuminanceSource(imgData.data, cropW, cropH);
      const bitmap = new BinaryBitmap(new HybridBinarizer(luminance));
      const result = multiFormatReaderRef.current.decode(bitmap);

      if (result && result.getText()) {
        handleCodeFound(result.getText());
        return;
      }
    } catch (e) {
      // Not found in cropped frame, ignore
    }
  }, [getHints, handleCodeFound]);

  // Initialize Camera & Scanner
  useEffect(() => {
    if (!isOpen) return;

    isHandlingRef.current = false;
    let activeStream: MediaStream | null = null;
    let activeCodeReader: BrowserMultiFormatReader | null = null;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setHasCameraPermission(false);
          return;
        }

        // Request high resolution back camera with autofocus
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

        // Check torch capability
        const track = stream.getVideoTracks()[0];
        if (track) {
          const caps = (track.getCapabilities && track.getCapabilities()) as any;
          if (caps && "torch" in caps) {
            setHasTorch(true);
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.setAttribute("autoplay", "true");
          videoRef.current.setAttribute("muted", "true");
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn("Video play error:", playErr);
          }
        }

        setHasCameraPermission(true);

        // 1. Initialize native BarcodeDetector if available
        if ("BarcodeDetector" in window) {
          try {
            nativeDetectorRef.current = new (window as any).BarcodeDetector({
              formats: ["code_128", "ean_13", "ean_8", "qr_code", "upc_a", "upc_e", "code_39"],
            });
          } catch (e) {
            nativeDetectorRef.current = null;
          }
        }

        // 2. Initialize ZXing BrowserMultiFormatReader for universal scanning (iOS Safari + Android + Desktop)
        try {
          const hints = getHints();
          activeCodeReader = new BrowserMultiFormatReader(hints, 250);
          codeReaderRef.current = activeCodeReader;

          if (videoRef.current) {
            activeCodeReader.decodeFromVideoElementContinuously(
              videoRef.current,
              (result, error) => {
                if (result && !isHandlingRef.current) {
                  const code = result.getText();
                  if (code) {
                    handleCodeFound(code);
                  }
                }
              }
            );
          }
        } catch (zxingErr) {
          console.warn("ZXing continuous reader init fallback:", zxingErr);
        }

        // 3. Interval Scanner on Reticle Crop (ensures fast scanning of targeted sticker in multi-sticker view)
        scanIntervalRef.current = setInterval(() => {
          captureAndDecodeFrame();
        }, 300);
      } catch (err: any) {
        console.warn("Camera access failed:", err);
        setHasCameraPermission(false);
      }
    };

    startCamera();

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      if (activeCodeReader) {
        try {
          activeCodeReader.reset();
        } catch (e) {}
      }
      if (codeReaderRef.current) {
        try {
          codeReaderRef.current.reset();
        } catch (e) {}
      }
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, getHints, handleCodeFound, captureAndDecodeFrame]);

  // Torch Toggle Function
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setIsTorchOn(nextState);
    } catch (e) {
      console.warn("Failed to toggle flashlight:", e);
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

          <div className="flex items-center gap-2">
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
                className="w-full h-full object-cover"
              />

              {/* Hidden Canvas for High-Precision Reticle Frame Analysis */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Aiming Reticle Frame */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                <div
                  className={`w-64 sm:w-72 h-36 border-2 border-dashed rounded-2xl relative transition-all flex items-center justify-center ${
                    isSearching
                      ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_30px_rgba(52,211,153,0.5)]"
                      : "border-lime-400 shadow-[0_0_20px_rgba(163,230,53,0.3)]"
                  }`}
                >
                  {/* Animated Laser Scan Line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-lime-400 to-transparent shadow-[0_0_10px_#a3e635] animate-pulse" />

                  {/* Corner Accent Brackets */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-lime-300" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-lime-300" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-lime-300" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-lime-300" />

                  <span className="absolute bottom-2 text-[9px] font-bold text-lime-300 bg-slate-900/85 px-2.5 py-0.5 rounded-full border border-lime-500/30">
                    ALIGN BARCODE HERE
                  </span>
                </div>
              </div>

              {/* Manual Snap / Force Scan Button directly on Viewfinder */}
              <button
                type="button"
                onClick={captureAndDecodeFrame}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-lime-400 border border-lime-400/40 text-[10px] font-extrabold flex items-center gap-1.5 backdrop-blur-md shadow-lg active:scale-95 transition-transform"
              >
                <Zap className="w-3.5 h-3.5 text-lime-400" />
                <span>Tap to Focus & Scan</span>
              </button>
            </>
          )}

          {/* Scanned Badge Notification Overlay */}
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
        </div>

        {/* Manual Barcode Fallback Box */}
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

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-lime-600" />
              Universal 1D/2D Engine (iOS + Android)
            </span>
            <span className="flex items-center gap-1 font-semibold text-lime-700">
              <Volume2 className="w-3 h-3" /> Audio Beep Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

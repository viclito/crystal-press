"use client";

import React, { useState } from "react";
import {
  ImpositionResult,
  calculateImposition,
} from "@/lib/print-calculator";
import {
  Maximize2,
  RotateCw,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  Scissors,
  Eye,
} from "lucide-react";

interface PaperCutVisualizerProps {
  sheetWidth: number;
  sheetHeight: number;
  itemWidth: number;
  itemHeight: number;
  bleed?: number;
  sheetName?: string;
  itemName?: string;
}

export function PaperCutVisualizer({
  sheetWidth,
  sheetHeight,
  itemWidth,
  itemHeight,
  bleed = 0.05,
  sheetName = "Master Sheet",
  itemName = "Print Item",
}: PaperCutVisualizerProps) {
  const [activeOrientation, setActiveOrientation] = useState<"AUTO" | "STANDARD" | "ROTATED">("AUTO");

  const imposition = calculateImposition(sheetWidth, sheetHeight, itemWidth, itemHeight, bleed);
  
  const currentResult: ImpositionResult =
    activeOrientation === "STANDARD"
      ? imposition.standard
      : activeOrientation === "ROTATED"
      ? imposition.rotated
      : imposition.optimal;

  const isRotated = currentResult.orientation === "ROTATED";
  const itemDisplayW = isRotated ? itemHeight : itemWidth;
  const itemDisplayH = isRotated ? itemWidth : itemHeight;

  // Viewbox Dimensions for SVG (preserving aspect ratio with padding)
  const svgPadding = 40;
  const svgWidth = 500;
  const aspectRatio = sheetHeight / Math.max(1, sheetWidth);
  const svgHeight = Math.min(420, Math.max(260, (svgWidth - svgPadding * 2) * aspectRatio + svgPadding * 2));

  const drawAreaW = svgWidth - svgPadding * 2;
  const drawAreaH = svgHeight - svgPadding * 2;

  const scale = Math.min(drawAreaW / Math.max(1, sheetWidth), drawAreaH / Math.max(1, sheetHeight));
  const sheetPixelW = sheetWidth * scale;
  const sheetPixelH = sheetHeight * scale;

  const originX = (svgWidth - sheetPixelW) / 2;
  const originY = (svgHeight - sheetPixelH) / 2;

  const itemPixelW = itemDisplayW * scale;
  const itemPixelH = itemDisplayH * scale;

  // Build grid of cut items
  const cutRects = [];
  for (let r = 0; r < currentResult.rows; r++) {
    for (let c = 0; c < currentResult.cols; c++) {
      const x = originX + c * itemPixelW;
      const y = originY + r * itemPixelH;
      const cutNum = r * currentResult.cols + c + 1;
      cutRects.push({ x, y, width: itemPixelW, height: itemPixelH, cutNum, r, c });
    }
  }

  const utilizationPercent = Math.max(0, 100 - currentResult.wastePercent);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
      {/* Header with Title & Orientation Mode Switches */}
      <div className="space-y-3 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-lime-100 text-lime-800 flex items-center justify-center font-bold shrink-0 shadow-sm">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold tracking-tight text-slate-900 truncate">
                2D Sheet Imposition & Paper Cut Diagram
              </h4>
              <p className="text-[11px] font-medium text-slate-500 truncate">
                {sheetName} ({sheetWidth}″ × {sheetHeight}″) → {itemName} ({itemWidth}″ × {itemHeight}″)
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-lime-100 text-lime-900 shrink-0 border border-lime-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-600 animate-pulse" />
            {currentResult.ups} Ups / Sheet
          </span>
        </div>

        {/* Orientation Selector: Segmented Control matching website UI */}
        <div className="grid grid-cols-3 p-1 bg-slate-100/90 rounded-2xl text-[11px] font-bold gap-1">
          <button
            type="button"
            onClick={() => setActiveOrientation("AUTO")}
            className={`py-1.5 px-2 rounded-xl text-center transition-all ${
              activeOrientation === "AUTO"
                ? "bg-white text-slate-900 shadow-sm font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Auto ({imposition.optimal.ups} ups)
          </button>

          <button
            type="button"
            onClick={() => setActiveOrientation("STANDARD")}
            className={`py-1.5 px-2 rounded-xl text-center transition-all ${
              activeOrientation === "STANDARD"
                ? "bg-white text-slate-900 shadow-sm font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Standard ({imposition.standard.ups})
          </button>

          <button
            type="button"
            onClick={() => setActiveOrientation("ROTATED")}
            className={`py-1.5 px-2 rounded-xl text-center transition-all ${
              activeOrientation === "ROTATED"
                ? "bg-white text-slate-900 shadow-sm font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Rotated ({imposition.rotated.ups})
          </button>
        </div>
      </div>

      {/* Interactive 2D Visual SVG Canvas */}
      <div className="relative bg-slate-50/70 rounded-2xl border border-slate-200/80 p-3 flex items-center justify-center overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-h-[300px] select-none"
        >
          <defs>
            {/* Soft pattern for Sheet Waste Zone */}
            <pattern
              id="waste-stripe-pattern"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="10"
                stroke="#E2E8F0"
                strokeWidth="1.5"
              />
            </pattern>

            {/* Fresh Lime-to-Sage gradient for Cuts */}
            <linearGradient id="cut-item-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ECFCCB" />
              <stop offset="100%" stopColor="#D9F99D" />
            </linearGradient>
          </defs>

          {/* Master Sheet Drop Shadow */}
          <rect
            x={originX + 2}
            y={originY + 2}
            width={sheetPixelW}
            height={sheetPixelH}
            fill="#0F172A"
            opacity="0.04"
            rx="4"
          />

          {/* Master Sheet Background (Full Sheet & Waste Zone) */}
          <rect
            x={originX}
            y={originY}
            width={sheetPixelW}
            height={sheetPixelH}
            fill="url(#waste-stripe-pattern)"
            stroke="#CBD5E1"
            strokeWidth="1.5"
            rx="4"
          />

          {/* Gripper Margin Indicator Line */}
          <rect
            x={originX + 4}
            y={originY + 4}
            width={sheetPixelW - 8}
            height={sheetPixelH - 8}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.6"
          />

          {/* Render Individual Cut Rectangles */}
          {cutRects.map((cut) => (
            <g key={cut.cutNum} className="transition-transform hover:opacity-90">
              <rect
                x={cut.x + 1}
                y={cut.y + 1}
                width={Math.max(2, cut.width - 2)}
                height={Math.max(2, cut.height - 2)}
                fill="url(#cut-item-gradient)"
                stroke="#84CC16"
                strokeWidth="1.2"
                rx="3"
              />
              {cut.width > 22 && cut.height > 16 && (
                <text
                  x={cut.x + cut.width / 2}
                  y={cut.y + cut.height / 2 + 3.5}
                  textAnchor="middle"
                  fill="#365314"
                  fontSize={Math.min(11, Math.max(7.5, cut.width / 4.2))}
                  fontWeight="800"
                  fontFamily="monospace"
                >
                  #{cut.cutNum}
                </text>
              )}
            </g>
          ))}

          {/* Width Dimension Indicator */}
          <text
            x={originX + sheetPixelW / 2}
            y={originY - 8}
            textAnchor="middle"
            fill="#64748B"
            fontSize="10"
            fontWeight="bold"
          >
            ← {sheetWidth}″ Sheet Width →
          </text>

          {/* Height Dimension Indicator */}
          <text
            x={originX - 10}
            y={originY + sheetPixelH / 2}
            textAnchor="middle"
            fill="#64748B"
            fontSize="10"
            fontWeight="bold"
            transform={`rotate(-90 ${originX - 10} ${originY + sheetPixelH / 2})`}
          >
            ← {sheetHeight}″ Sheet Height →
          </text>
        </svg>

        {/* Floating Quick Stats Overlay */}
        <div className="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-sm text-[10px] space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Layout:</span>
            <span className="font-mono font-bold text-slate-800">
              {currentResult.cols} cols × {currentResult.rows} rows
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Orientation:</span>
            <span className="font-bold text-lime-700">{currentResult.orientation}</span>
          </div>
        </div>
      </div>

      {/* Yield & Wastage Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
        <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Yield</span>
          <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
            {currentResult.ups} <span className="text-[10px] text-slate-500 font-normal">items / sheet</span>
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sheet Efficiency</span>
          <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">
            {utilizationPercent.toFixed(1)}%
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Paper Waste</span>
          <div className="text-lg font-black text-amber-700 font-mono mt-0.5">
            {currentResult.wastePercent}%
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cut Matrix</span>
          <div className="text-sm font-black text-slate-800 font-mono mt-1">
            {currentResult.cols} × {currentResult.rows} = {currentResult.ups}
          </div>
        </div>
      </div>
    </div>
  );
}

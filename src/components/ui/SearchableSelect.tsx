"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  badgeColor?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "-- Select --",
  searchPlaceholder = "Type to search...",
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Filter options
  const filteredOptions = options.filter((opt) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      opt.label.toLowerCase().includes(query) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(query)) ||
      (opt.badge && opt.badge.toLowerCase().includes(query))
    );
  });

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
  };

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 flex items-center justify-between gap-2 text-left transition-all hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent",
          disabled && "bg-slate-100 opacity-60 cursor-not-allowed",
          isOpen && "ring-2 ring-lime-400 border-transparent shadow-sm"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption ? (
            <div className="min-w-0 flex-1">
              <span className="font-bold text-slate-900 truncate block">{selectedOption.label}</span>
              {selectedOption.subLabel && (
                <span className="text-[10px] text-slate-400 truncate block font-normal">
                  {selectedOption.subLabel}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-medium truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <span
              role="button"
              onClick={handleClear}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-slate-400 transition-transform duration-200",
              isOpen && "rotate-180 text-lime-700"
            )}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsOpen(false);
                  } else if (e.key === "Enter" && filteredOptions.length > 0) {
                    e.preventDefault();
                    handleSelect(filteredOptions[0].value);
                  }
                }}
              />
            </div>
            {filteredOptions.length > 0 && (
              <div className="px-2 pt-1.5 flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                <span>Matching items: {filteredOptions.length}</span>
                {search && <span>Press Enter to select 1st</span>}
              </div>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
            {filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors",
                    isSelected
                      ? "bg-lime-50 text-lime-950 font-bold"
                      : "hover:bg-slate-50 text-slate-800"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">{opt.label}</div>
                    {opt.subLabel && (
                      <div className="text-[10px] text-slate-500 font-normal truncate mt-0.5">
                        {opt.subLabel}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {opt.badge && (
                      <span
                        className={cn(
                          "text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider",
                          opt.badgeColor || "bg-slate-100 text-slate-600"
                        )}
                      >
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-lime-700 shrink-0" />}
                  </div>
                </button>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="py-6 px-3 text-center text-xs text-slate-400 space-y-1">
                <Search className="w-5 h-5 mx-auto text-slate-300" />
                <p className="font-bold text-slate-600">No items match &quot;{search}&quot;</p>
                <p className="text-[10px] text-slate-400">Try typing a different name or code</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

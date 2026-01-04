"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Format {
  id: string;
  name: string;
  width: number;
  height: number;
}

const formats: Format[] = [
  // Row 1 - Social Media
  { id: "1", name: "Instagram Post", width: 1080, height: 1080 },
  { id: "2", name: "Instagram Story", width: 1080, height: 1920 },
  { id: "3", name: "Facebook Post", width: 1200, height: 630 },
  { id: "4", name: "Twitter/X Post", width: 1200, height: 675 },
  // Row 2 - Video/YouTube
  { id: "5", name: "YouTube Thumbnail", width: 1280, height: 720 },
  { id: "6", name: "YouTube Banner", width: 2560, height: 1440 },
  { id: "7", name: "16:9 Widescreen", width: 1920, height: 1080 },
  { id: "8", name: "4:3 Standard", width: 1600, height: 1200 },
  // Row 3 - Display Ads
  { id: "9", name: "Leaderboard", width: 728, height: 90 },
  { id: "10", name: "Rectangle", width: 300, height: 250 },
  { id: "11", name: "Wide Skyscraper", width: 160, height: 600 },
  { id: "12", name: "Large Banner", width: 1920, height: 600 },
  // Row 4 - Retail/Print
  { id: "13", name: "Shelf Talker", width: 1200, height: 400 },
  { id: "14", name: "End Cap", width: 1080, height: 1920 },
  { id: "15", name: "POS Card", width: 600, height: 800 },
  { id: "16", name: "A4 Portrait", width: 2480, height: 3508 },
];

interface FormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (name: string, width: number, height: number) => void;
}

export const FormatModal = ({ isOpen, onClose, onSelect }: FormatModalProps) => {
  if (!isOpen) return null;

  const getPreviewStyle = (width: number, height: number) => {
    const ratio = width / height;
    const baseSize = 32;
    
    if (ratio > 2) return { width: baseSize, height: baseSize / 2.5 };
    if (ratio > 1.3) return { width: baseSize, height: baseSize / 1.6 };
    if (ratio < 0.6) return { width: baseSize / 2, height: baseSize };
    if (ratio < 0.9) return { width: baseSize / 1.3, height: baseSize };
    return { width: baseSize / 1.2, height: baseSize / 1.2 };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#111] rounded-2xl w-full max-w-lg overflow-hidden border border-white/[0.08] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-lg font-semibold text-white">New Design</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Select a canvas size</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formats Grid */}
        <div className="p-4">
          <div className="grid grid-cols-3 gap-2">
            {formats.map((format) => {
              const preview = getPreviewStyle(format.width, format.height);
              
              return (
                <button
                  key={format.id}
                  onClick={() => onSelect(format.name, format.width, format.height)}
                  className="group p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all duration-150 text-left"
                >
                  <div className="flex justify-center mb-3">
                    <div 
                      className="rounded bg-neutral-700 group-hover:bg-neutral-600 transition-colors"
                      style={{ width: preview.width, height: preview.height }}
                    />
                  </div>
                  <p className="text-[13px] font-medium text-neutral-200 truncate">
                    {format.name}
                  </p>
                  <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                    {format.width}×{format.height}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Size */}
        <div className="p-4 pt-0">
          <button
            onClick={() => onSelect("Custom", 1080, 1080)}
            className="w-full h-11 rounded-xl border border-dashed border-white/10 text-sm text-neutral-500 hover:text-white hover:border-white/20 hover:bg-white/[0.02] transition-all duration-150"
          >
            Custom size
          </button>
        </div>
      </div>
    </div>
  );
};

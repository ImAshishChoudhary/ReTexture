"use client";

import { Type, Heading1, Heading2, AlignLeft } from "lucide-react";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TextSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

const textStyles = [
  { id: "heading", label: "Heading", size: 64, weight: 700, icon: Heading1 },
  { id: "subheading", label: "Subheading", size: 44, weight: 600, icon: Heading2 },
  { id: "body", label: "Body Text", size: 24, weight: 400, icon: Type },
  { id: "caption", label: "Caption", size: 16, weight: 400, icon: AlignLeft },
];

const retailPresets = [
  { id: "price", text: "£9.99", size: 72, weight: 700, color: "#E53935" },
  { id: "sale", text: "SALE", size: 48, weight: 800, color: "#E53935" },
  { id: "offer", text: "Special Offer", size: 36, weight: 600, color: "#00539F" },
  { id: "cta", text: "Shop Now", size: 32, weight: 700, color: "#000000" },
  { id: "discount", text: "50% OFF", size: 56, weight: 800, color: "#E53935" },
  { id: "clubcard", text: "Clubcard Price", size: 28, weight: 600, color: "#00539F" },
];

export const TextSidebar = ({ editor, activeTool, onChangeActiveTool }: TextSidebarProps) => {
  const onClose = () => {
    onChangeActiveTool("select");
  };

  const addText = (text: string, options?: { fontSize?: number; fontWeight?: number; fill?: string }) => {
    editor?.addText(text, options);
  };

  return (
    <aside
      className={cn(
        "editor-tool-panel relative z-[40] w-[360px] h-full flex flex-col",
        activeTool === "text" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader title="Text" description="Add typography to your design" />
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Add Text Button */}
          <button
            onClick={() => addText("Your text here")}
            className="w-full h-12 rounded-xl border border-dashed border-white/20 text-sm text-neutral-400 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all flex items-center justify-center gap-2"
          >
            <Type className="w-4 h-4" />
            Add Text
          </button>

          {/* Text Styles */}
          <div>
            <h4 className="text-xs font-medium text-neutral-400 mb-3">Text Styles</h4>
            <div className="space-y-2">
              {textStyles.map((style) => {
                const Icon = style.icon;
                return (
                  <button
                    key={style.id}
                    onClick={() => addText(`Add ${style.label.toLowerCase()}`, { fontSize: style.size, fontWeight: style.weight })}
                    className="w-full p-3 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all flex items-center gap-3 group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                      <Icon className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-neutral-300 group-hover:text-white transition-colors">{style.label}</p>
                      <p className="text-[10px] text-neutral-500">{style.size}px · {style.weight >= 600 ? "Bold" : "Regular"}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Retail Presets */}
          <div>
            <h4 className="text-xs font-medium text-neutral-400 mb-3">Retail Presets</h4>
            <div className="grid grid-cols-2 gap-2">
              {retailPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => addText(preset.text, { fontSize: preset.size, fontWeight: preset.weight, fill: preset.color })}
                  className="p-3 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-center group"
                >
                  <div 
                    className="text-base font-bold mb-1 truncate group-hover:scale-105 transition-transform"
                    style={{ color: preset.color }}
                  >
                    {preset.text}
                  </div>
                  <p className="text-[10px] text-neutral-500 capitalize">{preset.id.replace("-", " ")}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Tip */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-neutral-400">
              <span className="font-medium text-neutral-300">Tip:</span> Double-click text on canvas to edit directly.
            </p>
          </div>
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};

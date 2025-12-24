"use client";

import { Check } from "lucide-react";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FilterSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

const filters = [
  { name: "None", value: "none" },
  { name: "Grayscale", value: "grayscale" },
  { name: "Polaroid", value: "polaroid" },
  { name: "Sepia", value: "sepia" },
  { name: "Kodachrome", value: "kodachrome" },
  { name: "Contrast", value: "contrast" },
  { name: "Brightness", value: "brightness" },
  { name: "Brownie", value: "brownie" },
  { name: "Vintage", value: "vintage" },
  { name: "Technicolor", value: "technicolor" },
  { name: "Pixelate", value: "pixelate" },
  { name: "Invert", value: "invert" },
  { name: "Blur", value: "blur" },
  { name: "Sharpen", value: "sharpen" },
  { name: "Emboss", value: "emboss" },
  { name: "Removal White", value: "removecolor" },
  { name: "Black & White", value: "blacknwhite" },
  { name: "Vibrance", value: "vibrance" },
  { name: "Blend Color", value: "blendcolor" },
  { name: "Hue Rotate", value: "huerotate" },
  { name: "Saturation", value: "saturation" },
  { name: "Gamma", value: "gamma" },
];

export const FilterSidebar = ({ editor, activeTool, onChangeActiveTool }: FilterSidebarProps) => {
  const onClose = () => {
    onChangeActiveTool("select");
  };

  return (
    <aside
      className={cn(
        "editor-tool-panel relative z-[40] w-[360px] h-full flex flex-col",
        activeTool === "filter" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader title="Image Filters" description="Apply effects to images" />
      
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => editor?.changeImageFilter(filter.value)}
                className="p-3 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-left group"
              >
                <span className="text-sm font-medium text-neutral-300 group-hover:text-white transition-colors">
                  {filter.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};

"use client";

import { ActiveTool, Editor, STROKE_COLOR } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";
import { ColorPicker } from "@/features/editor/components/color-picker";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StrokeColorSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

const brandColors = [
  { name: "Tesco Blue", color: "#00539F" },
  { name: "Tesco Red", color: "#E53935" },
  { name: "Tesco Yellow", color: "#FFCC00" },
  { name: "White", color: "#FFFFFF" },
  { name: "Black", color: "#000000" },
];

export const StrokeColorSidebar = ({ editor, activeTool, onChangeActiveTool }: StrokeColorSidebarProps) => {
  const value = editor?.getActiveStrokeColor() || STROKE_COLOR;

  const onClose = () => {
    onChangeActiveTool("select");
  };

  const onChange = (value: string) => {
    editor?.changeStrokeColor(value);
  };

  return (
    <aside
      className={cn(
        "editor-tool-panel relative z-[40] w-[360px] h-full flex flex-col",
        activeTool === "stroke-color" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader title="Stroke Color" description="Border color" />
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Brand Colors */}
          <div>
            <h4 className="text-xs font-medium text-neutral-400 mb-3">Brand Colors</h4>
            <div className="flex gap-2 flex-wrap">
              {brandColors.map((brand) => (
                <button
                  key={brand.name}
                  onClick={() => onChange(brand.color)}
                  className={cn(
                    "w-11 h-11 rounded-xl border-[3px] bg-transparent transition-all hover:scale-105",
                    value === brand.color 
                      ? "ring-1 ring-white/20" 
                      : "hover:ring-1 hover:ring-white/10"
                  )}
                  style={{ borderColor: brand.color }}
                  title={brand.name}
                />
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <h4 className="text-xs font-medium text-neutral-400 mb-3">Custom Color</h4>
            <ColorPicker
              value={value}
              onChange={onChange}
            />
          </div>

          {/* Current */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg border-[3px] bg-transparent"
                style={{ borderColor: value }}
              />
              <div>
                <p className="text-xs font-medium text-neutral-300">Current Stroke</p>
                <p className="text-xs text-neutral-500 font-mono uppercase">{value}</p>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};

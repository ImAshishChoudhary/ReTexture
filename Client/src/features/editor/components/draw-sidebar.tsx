"use client";

import { Pencil } from "lucide-react";

import { ActiveTool, Editor, STROKE_COLOR, STROKE_WIDTH } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";
import { ColorPicker } from "@/features/editor/components/color-picker";

import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DrawSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const DrawSidebar = ({ editor, activeTool, onChangeActiveTool }: DrawSidebarProps) => {
  const colorValue = editor?.getActiveStrokeColor() || STROKE_COLOR;
  const widthValue = editor?.getActiveStrokeWidth() || STROKE_WIDTH;

  const onClose = () => {
    editor?.disableDrawingMode();
    onChangeActiveTool("select");
  };

  const onColorChange = (value: string) => {
    editor?.changeStrokeColor(value);
  };

  const onWidthChange = (value: number) => {
    editor?.changeStrokeWidth(value);
  };

  return (
    <aside
      className={cn(
        "editor-tool-panel relative z-[40] w-[360px] h-full flex flex-col",
        activeTool === "draw" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader title="Draw" description="Freehand drawing mode" />
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Status */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Pencil className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Drawing Active</p>
              <p className="text-xs text-neutral-500">Click and drag to draw</p>
            </div>
          </div>

          {/* Brush Size */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-medium text-neutral-400">Brush Size</h4>
              <span className="text-xs text-neutral-500 font-mono">{widthValue}px</span>
            </div>
            <Slider
              value={[widthValue]}
              onValueChange={(values) => onWidthChange(values[0])}
              min={1}
              max={50}
              step={1}
              className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-0"
            />
            {/* Preview */}
            <div className="flex items-center justify-center py-6">
              <div 
                className="rounded-full transition-all"
                style={{ 
                  width: Math.max(widthValue, 4), 
                  height: Math.max(widthValue, 4), 
                  backgroundColor: colorValue,
                }}
              />
            </div>
          </div>

          {/* Brush Color */}
          <div>
            <h4 className="text-xs font-medium text-neutral-400 mb-3">Brush Color</h4>
            <ColorPicker
              value={colorValue}
              onChange={onColorChange}
            />
          </div>

          {/* Tip */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-neutral-400">
              <span className="font-medium text-neutral-300">Tip:</span> Press Escape or click another tool to exit drawing mode.
            </p>
          </div>
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};

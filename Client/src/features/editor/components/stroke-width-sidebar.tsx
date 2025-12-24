"use client";

import { ActiveTool, Editor, STROKE_WIDTH } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StrokeWidthSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const StrokeWidthSidebar = ({ editor, activeTool, onChangeActiveTool }: StrokeWidthSidebarProps) => {
  const widthValue = editor?.getActiveStrokeWidth() || STROKE_WIDTH;

  const onClose = () => {
    onChangeActiveTool("select");
  };

  const onChangeStrokeWidth = (value: number) => {
    editor?.changeStrokeWidth(value);
  };

  return (
    <aside
      className={cn(
        "editor-tool-panel relative z-[40] w-[360px] h-full flex flex-col",
        activeTool === "stroke-width" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader title="Stroke Width" description="Border thickness" />
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Preview */}
          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-center">
              <div 
                className="w-24 h-24 rounded-xl border-neutral-400 bg-transparent transition-all"
                style={{ borderWidth: widthValue, borderStyle: "solid" }}
              />
            </div>
            <div className="text-center mt-4">
              <span className="text-2xl font-bold text-white font-mono">{widthValue}</span>
              <span className="text-sm text-neutral-400 ml-1">px</span>
            </div>
          </div>

          {/* Slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-medium text-neutral-400">Width</h4>
              <span className="text-xs text-neutral-500 font-mono">{widthValue}px</span>
            </div>
            <Slider
              value={[widthValue]}
              onValueChange={(values) => onChangeStrokeWidth(values[0])}
              min={0}
              max={50}
              step={1}
              className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-0"
            />
          </div>

          {/* Presets */}
          <div>
            <h4 className="text-xs font-medium text-neutral-400 mb-3">Presets</h4>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 4, 8].map((preset) => (
                <button
                  key={preset}
                  onClick={() => onChangeStrokeWidth(preset)}
                  className={cn(
                    "h-12 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all",
                    widthValue === preset
                      ? "border-white/30 bg-white/10"
                      : "border-white/10 hover:border-white/20 hover:bg-white/5"
                  )}
                >
                  <div 
                    className="w-5 bg-neutral-400 rounded-full"
                    style={{ height: Math.max(preset, 1) }}
                  />
                  <span className="text-[10px] text-neutral-500">{preset}px</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tip */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-neutral-400">
              <span className="font-medium text-neutral-300">Tip:</span> Set to 0 for no border.
            </p>
          </div>
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};

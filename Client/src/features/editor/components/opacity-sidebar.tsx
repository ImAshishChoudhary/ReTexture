"use client";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OpacitySidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const OpacitySidebar = ({ editor, activeTool, onChangeActiveTool }: OpacitySidebarProps) => {
  const initialValue = editor?.getActiveOpacity() || 1;

  const onClose = () => {
    onChangeActiveTool("select");
  };

  const onChange = (value: number) => {
    editor?.changeOpacity(value);
  };

  return (
    <aside
      className={cn(
        "editor-tool-panel relative z-[40] w-[360px] h-full flex flex-col",
        activeTool === "opacity" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader title="Opacity" description="Element transparency" />
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Display */}
          <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
            <span className="text-4xl font-bold text-white font-mono">
              {Math.round(initialValue * 100)}
            </span>
            <span className="text-lg text-neutral-400">%</span>
          </div>

          {/* Slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-medium text-neutral-400">Transparency</h4>
              <span className="text-xs text-neutral-500 font-mono">
                {Math.round(initialValue * 100)}%
              </span>
            </div>
            <Slider
              value={[initialValue]}
              onValueChange={(values) => onChange(values[0])}
              max={1}
              min={0}
              step={0.01}
              className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-0"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 mt-2">
              <span>Transparent</span>
              <span>Opaque</span>
            </div>
          </div>

          {/* Presets */}
          <div>
            <h4 className="text-xs font-medium text-neutral-400 mb-3">Quick Presets</h4>
            <div className="grid grid-cols-4 gap-2">
              {[0.25, 0.5, 0.75, 1].map((preset) => (
                <button
                  key={preset}
                  onClick={() => onChange(preset)}
                  className={cn(
                    "h-10 rounded-lg border text-xs font-medium transition-all",
                    initialValue === preset
                      ? "border-white/30 bg-white/10 text-white"
                      : "border-white/10 text-neutral-400 hover:border-white/20 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {Math.round(preset * 100)}%
                </button>
              ))}
            </div>
          </div>

          {/* Tip */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-neutral-400">
              <span className="font-medium text-neutral-300">Tip:</span> Lower opacity creates overlay effects.
            </p>
          </div>
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};

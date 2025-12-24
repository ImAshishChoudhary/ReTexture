"use client";

import { useState, useEffect } from "react";
import { Maximize, Palette, Square } from "lucide-react";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";
import { ColorPicker } from "@/features/editor/components/color-picker";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface SettingsSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

const presetSizes = [
  { name: "Instagram Post", width: 1080, height: 1080 },
  { name: "Instagram Story", width: 1080, height: 1920 },
  { name: "Facebook Post", width: 1200, height: 630 },
  { name: "Tesco Banner", width: 1920, height: 600 },
  { name: "Shelf Talker", width: 1200, height: 400 },
  { name: "End Cap", width: 1080, height: 1920 },
];

export const SettingsSidebar = ({ editor, activeTool, onChangeActiveTool }: SettingsSidebarProps) => {
  const workspace = editor?.getWorkspace();
  
  const initialWidth = workspace?.width ?? 900;
  const initialHeight = workspace?.height ?? 1200;
  const initialBackground = workspace?.fill ?? "#ffffff";

  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [background, setBackground] = useState(initialBackground);

  useEffect(() => {
    setWidth(workspace?.width ?? 900);
    setHeight(workspace?.height ?? 1200);
    setBackground(workspace?.fill ?? "#ffffff");
  }, [workspace]);

  const onClose = () => {
    onChangeActiveTool("select");
  };

  const changeWidth = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setWidth(numValue);
      editor?.changeSize({ width: numValue, height });
    }
  };

  const changeHeight = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setHeight(numValue);
      editor?.changeSize({ width, height: numValue });
    }
  };

  const changeBackground = (value: string) => {
    setBackground(value);
    editor?.changeBackground(value);
  };

  const applyPreset = (preset: typeof presetSizes[0]) => {
    setWidth(preset.width);
    setHeight(preset.height);
    editor?.changeSize({ width: preset.width, height: preset.height });
  };

  return (
    <aside
      className={cn(
        "editor-tool-panel relative z-[40] w-[360px] h-full flex flex-col",
        activeTool === "settings" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader title="Canvas Settings" description="Size and background" />
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Size Presets */}
          <div>
            <h4 className="text-xs font-medium text-neutral-400 mb-3 flex items-center gap-2">
              <Maximize className="w-3.5 h-3.5" />
              Quick Sizes
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {presetSizes.map((preset) => {
                const isActive = width === preset.width && height === preset.height;
                return (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      isActive 
                        ? "border-white/30 bg-white/10" 
                        : "border-white/10 hover:border-white/20 hover:bg-white/5"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-medium block",
                      isActive ? "text-white" : "text-neutral-300"
                    )}>
                      {preset.name}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {preset.width} × {preset.height}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Size */}
          <div>
            <h4 className="text-xs font-medium text-neutral-400 mb-3 flex items-center gap-2">
              <Square className="w-3.5 h-3.5" />
              Custom Size
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500">Width</Label>
                <Input
                  placeholder="Width"
                  value={width}
                  type="number"
                  onChange={(e) => changeWidth(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus:border-white/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500">Height</Label>
                <Input
                  placeholder="Height"
                  value={height}
                  type="number"
                  onChange={(e) => changeHeight(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus:border-white/20"
                />
              </div>
            </div>
          </div>

          {/* Background Color */}
          <div>
            <h4 className="text-xs font-medium text-neutral-400 mb-3 flex items-center gap-2">
              <Palette className="w-3.5 h-3.5" />
              Background
            </h4>
            <ColorPicker
              value={background as string}
              onChange={changeBackground}
            />
          </div>

          {/* Info */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-neutral-400">
              <span className="font-medium text-neutral-300">Current:</span>{" "}
              <span className="font-mono">{width} × {height}px</span>
            </p>
          </div>
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};

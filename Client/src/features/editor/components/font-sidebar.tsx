"use client";

import { Check } from "lucide-react";

import { ActiveTool, Editor, fonts } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FontSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const FontSidebar = ({ editor, activeTool, onChangeActiveTool }: FontSidebarProps) => {
  const value = editor?.getActiveFontFamily();

  const onClose = () => {
    onChangeActiveTool("select");
  };

  return (
    <aside
      className={cn(
        "editor-tool-panel relative z-[40] w-[360px] h-full flex flex-col",
        activeTool === "font" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader title="Fonts" description="Choose typography" />
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {fonts.map((font) => (
            <button
              key={font}
              onClick={() => editor?.changeFontFamily(font)}
              className={cn(
                "w-full p-3 rounded-xl border transition-all flex items-center justify-between group",
                value === font
                  ? "border-white/30 bg-white/10"
                  : "border-white/10 hover:border-white/20 hover:bg-white/5"
              )}
            >
              <span
                className={cn(
                  "text-base",
                  value === font ? "text-white" : "text-neutral-300 group-hover:text-white"
                )}
                style={{ fontFamily: font }}
              >
                {font}
              </span>
              {value === font && (
                <Check className="w-4 h-4 text-white" />
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};

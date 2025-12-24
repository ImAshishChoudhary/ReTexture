"use client";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ShapeSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

const shapes = [
  {
    id: "rectangle",
    name: "Rectangle",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    ),
    action: (editor: Editor) => editor.addRectangle(),
  },
  {
    id: "soft-rectangle",
    name: "Rounded",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="6" />
      </svg>
    ),
    action: (editor: Editor) => editor.addSoftRectangle(),
  },
  {
    id: "circle",
    name: "Circle",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
    action: (editor: Editor) => editor.addCircle(),
  },
  {
    id: "triangle",
    name: "Triangle",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
        <polygon points="12,3 22,21 2,21" />
      </svg>
    ),
    action: (editor: Editor) => editor.addTriangle(),
  },
  {
    id: "inverse-triangle",
    name: "Inverted",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
        <polygon points="12,21 22,3 2,3" />
      </svg>
    ),
    action: (editor: Editor) => editor.addInverseTriangle(),
  },
  {
    id: "diamond",
    name: "Diamond",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
        <polygon points="12,2 22,12 12,22 2,12" />
      </svg>
    ),
    action: (editor: Editor) => editor.addDiamond(),
  },
];

export const ShapeSidebar = ({ editor, activeTool, onChangeActiveTool }: ShapeSidebarProps) => {
  const onClose = () => {
    onChangeActiveTool("select");
  };

  return (
    <aside
      className={cn(
        "editor-tool-panel relative z-[40] w-[360px] h-full flex flex-col",
        activeTool === "shapes" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader title="Shapes" description="Add geometric elements" />
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Shapes Grid */}
          <div>
            <h4 className="text-xs font-medium text-neutral-400 mb-3">Basic Shapes</h4>
            <div className="grid grid-cols-3 gap-2">
              {shapes.map((shape) => (
                <button
                  key={shape.id}
                  onClick={() => editor && shape.action(editor)}
                  className="aspect-square p-3 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  <div className="text-neutral-500 group-hover:text-white group-hover:scale-110 transition-all">
                    {shape.icon}
                  </div>
                  <span className="text-[10px] text-neutral-500 group-hover:text-neutral-400 transition-colors">
                    {shape.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Line */}
          <div>
            <h4 className="text-xs font-medium text-neutral-400 mb-3">Lines</h4>
            <button
              onClick={() => editor?.addRectangle()}
              className="w-full p-3 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <div className="w-6 h-0.5 bg-neutral-500 group-hover:bg-white transition-colors" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-neutral-300 group-hover:text-white transition-colors">Line</p>
                <p className="text-[10px] text-neutral-500">Divider element</p>
              </div>
            </button>
          </div>

          {/* Tip */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-neutral-400">
              <span className="font-medium text-neutral-300">Tip:</span> Hold Shift while resizing to maintain aspect ratio.
            </p>
          </div>
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};

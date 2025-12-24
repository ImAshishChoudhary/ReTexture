"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Eraser, Loader2 } from "lucide-react";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";
import { useRemoveBg } from "@/features/ai/api/use-remove-bg";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RemoveBgSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const RemoveBgSidebar = ({ editor, activeTool, onChangeActiveTool }: RemoveBgSidebarProps) => {
  const mutation = useRemoveBg();
  const [selectedImage, setSelectedImage] = useState<fabric.Image | null>(null);

  useEffect(() => {
    if (editor?.selectedObjects?.[0]?.type === "image") {
      setSelectedImage(editor.selectedObjects[0] as fabric.Image);
    } else {
      setSelectedImage(null);
    }
  }, [editor?.selectedObjects]);

  const onClose = () => {
    onChangeActiveTool("select");
  };

  const onClick = () => {
    if (!selectedImage) return;

    const src = (selectedImage as any)._element?.src || (selectedImage as any).getSrc?.();
    
    if (!src) {
      console.error("No image source found");
      return;
    }

    mutation.mutate(
      { imageUrl: src },
      {
        onSuccess: ({ data }) => {
          editor?.addImage(data);
        },
      }
    );
  };

  return (
    <aside
      className={cn(
        "editor-tool-panel relative z-[40] w-[360px] h-full flex flex-col",
        activeTool === "remove-bg" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader title="Remove Background" description="AI-powered background removal" />
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Eraser className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Background Removal</p>
              <p className="text-xs text-neutral-500">Runs locally in browser</p>
            </div>
          </div>

          {selectedImage ? (
            <div>
              <h4 className="text-xs font-medium text-neutral-400 mb-3">Selected Image</h4>
              <div className="aspect-video rounded-xl overflow-hidden bg-[repeating-conic-gradient(#1a1a1f_0%_25%,#252530_0%_50%)] bg-[length:16px_16px] border border-white/10">
                <img
                  src={(selectedImage as any)._element?.src || ""}
                  alt="Selected"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-white/10 text-center">
              <AlertTriangle className="w-6 h-6 text-neutral-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-neutral-300">No Image Selected</p>
              <p className="text-xs text-neutral-500 mt-1">Select an image on the canvas first</p>
            </div>
          )}

          <button
            disabled={mutation.isPending || !selectedImage}
            onClick={onClick}
            className="w-full h-11 rounded-xl bg-white text-black text-sm font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Eraser className="w-4 h-4" />
                Remove Background
              </>
            )}
          </button>

          <div>
            <h4 className="text-xs font-medium text-neutral-400 mb-3">How it works</h4>
            <div className="space-y-2">
              {[
                "Select an image on canvas",
                "Click Remove Background",
                "New image without background is added",
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-xs text-neutral-500">
                  <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 text-[10px] font-medium">
                    {i + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};

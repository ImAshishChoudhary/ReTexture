import { Minus, Plus, Maximize2 } from "lucide-react";
import { useState, useEffect } from "react";

import { Editor } from "@/features/editor/types";
import { Hint } from "@/components/hint";

interface FooterProps {
  editor: Editor | undefined;
}

export const Footer = ({ editor }: FooterProps) => {
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (editor?.canvas) {
      const updateZoom = () => {
        const currentZoom = editor.canvas.getZoom() * 100;
        setZoom(Math.round(currentZoom));
      };
      
      editor.canvas.on('mouse:wheel', updateZoom);
      return () => {
        editor.canvas.off('mouse:wheel', updateZoom);
      };
    }
  }, [editor]);

  const handleZoomIn = () => {
    editor?.zoomIn();
    if (editor?.canvas) {
      setZoom(Math.round(editor.canvas.getZoom() * 100));
    }
  };

  const handleZoomOut = () => {
    editor?.zoomOut();
    if (editor?.canvas) {
      setZoom(Math.round(editor.canvas.getZoom() * 100));
    }
  };

  const handleAutoZoom = () => {
    editor?.autoZoom();
    if (editor?.canvas) {
      setTimeout(() => {
        setZoom(Math.round(editor.canvas.getZoom() * 100));
      }, 100);
    }
  };

  return (
    <footer className="h-10 border-t border-white/[0.04] bg-[#0a0a0c] flex items-center px-3 shrink-0 justify-end gap-2">
      <Hint label="Fit" side="top" sideOffset={8}>
        <button
          onClick={handleAutoZoom}
          className="h-7 w-7 rounded-md flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </Hint>
      
      <div className="flex items-center gap-0.5 bg-white/[0.03] rounded-md p-0.5">
        <button
          onClick={handleZoomOut}
          className="h-6 w-6 rounded flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-xs font-mono text-neutral-400 px-2 min-w-[40px] text-center">
          {zoom}%
        </span>
        <button
          onClick={handleZoomIn}
          className="h-6 w-6 rounded flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </footer>
  );
};

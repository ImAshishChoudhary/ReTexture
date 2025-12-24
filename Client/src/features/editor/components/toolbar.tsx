import { useState } from "react";

import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Underline,
  ArrowUp, 
  ArrowDown, 
  ChevronDown, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Trash2,
  Copy,
  Circle,
  SlidersHorizontal,
  Eraser,
} from "lucide-react";

import { isTextType } from "@/features/editor/utils";
import { FontSizeInput } from "@/features/editor/components/font-size-input";
import { 
  ActiveTool, 
  Editor, 
  FONT_SIZE, 
  FONT_WEIGHT
} from "@/features/editor/types";

import { cn } from "@/lib/utils";
import { Hint } from "@/components/hint";

interface ToolbarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const Toolbar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: ToolbarProps) => {
  const initialFillColor = editor?.getActiveFillColor();
  const initialStrokeColor = editor?.getActiveStrokeColor();
  const initialFontFamily = editor?.getActiveFontFamily();
  const initialFontWeight = editor?.getActiveFontWeight() || FONT_WEIGHT;
  const initialFontStyle = editor?.getActiveFontStyle();
  const initialFontLinethrough = editor?.getActiveFontLinethrough();
  const initialFontUnderline = editor?.getActiveFontUnderline();
  const initialTextAlign = editor?.getActiveTextAlign();
  const initialFontSize = editor?.getActiveFontSize() || FONT_SIZE

  const [properties, setProperties] = useState({
    fillColor: initialFillColor,
    strokeColor: initialStrokeColor,
    fontFamily: initialFontFamily,
    fontWeight: initialFontWeight,
    fontStyle: initialFontStyle,
    fontLinethrough: initialFontLinethrough,
    fontUnderline: initialFontUnderline,
    textAlign: initialTextAlign,
    fontSize: initialFontSize,
  });

  const selectedObject = editor?.selectedObjects[0];
  const selectedObjectType = editor?.selectedObjects[0]?.type;

  const isText = isTextType(selectedObjectType);
  const isImage = selectedObjectType === "image";

  const onChangeFontSize = (value: number) => {
    if (!selectedObject) return;
    editor?.changeFontSize(value);
    setProperties((current) => ({ ...current, fontSize: value }));
  };

  const onChangeTextAlign = (value: string) => {
    if (!selectedObject) return;
    editor?.changeTextAlign(value);
    setProperties((current) => ({ ...current, textAlign: value }));
  };

  const toggleBold = () => {
    if (!selectedObject) return;
    const newValue = properties.fontWeight > 500 ? 500 : 700;
    editor?.changeFontWeight(newValue);
    setProperties((current) => ({ ...current, fontWeight: newValue }));
  };

  const toggleItalic = () => {
    if (!selectedObject) return;
    const isItalic = properties.fontStyle === "italic";
    const newValue = isItalic ? "normal" : "italic";
    editor?.changeFontStyle(newValue);
    setProperties((current) => ({ ...current, fontStyle: newValue }));
  };

  const toggleLinethrough = () => {
    if (!selectedObject) return;
    const newValue = !properties.fontLinethrough;
    editor?.changeFontLinethrough(newValue);
    setProperties((current) => ({ ...current, fontLinethrough: newValue }));
  };

  const toggleUnderline = () => {
    if (!selectedObject) return;
    const newValue = !properties.fontUnderline;
    editor?.changeFontUnderline(newValue);
    setProperties((current) => ({ ...current, fontUnderline: newValue }));
  };

  if (editor?.selectedObjects.length === 0) {
    return (
      <div className="shrink-0 h-12 border-b border-white/[0.04] bg-[#0a0a0c] w-full flex items-center justify-center px-4">
        <p className="text-sm text-neutral-500">Select an element to edit</p>
      </div>
    );
  }

  return (
    <div className="shrink-0 h-12 border-b border-white/[0.04] bg-[#0a0a0c] w-full flex items-center px-3 gap-x-1">
      {!isImage && (
        <Hint label="Fill" side="bottom" sideOffset={8}>
          <button
            onClick={() => onChangeActiveTool("fill")}
            className={cn(
              "h-8 w-8 rounded-md flex items-center justify-center transition-colors",
              activeTool === "fill" ? "bg-white/10" : "hover:bg-white/5"
            )}
          >
            <div
              className="w-5 h-5 rounded border border-white/20"
              style={{ backgroundColor: properties.fillColor }}
            />
          </button>
        </Hint>
      )}
      {!isText && (
        <>
          <Hint label="Stroke" side="bottom" sideOffset={8}>
            <button
              onClick={() => onChangeActiveTool("stroke-color")}
              className={cn(
                "h-8 w-8 rounded-md flex items-center justify-center transition-colors",
                activeTool === "stroke-color" ? "bg-white/10" : "hover:bg-white/5"
              )}
            >
              <div
                className="w-5 h-5 rounded border-2 bg-transparent"
                style={{ borderColor: properties.strokeColor }}
              />
            </button>
          </Hint>
          <Hint label="Stroke width" side="bottom" sideOffset={8}>
            <button
              onClick={() => onChangeActiveTool("stroke-width")}
              className={cn(
                "h-8 w-8 rounded-md flex items-center justify-center text-neutral-400 hover:text-white transition-colors",
                activeTool === "stroke-width" ? "bg-white/10 text-white" : "hover:bg-white/5"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </Hint>
        </>
      )}
      {isText && (
        <>
          <Hint label="Font" side="bottom" sideOffset={8}>
            <button
              onClick={() => onChangeActiveTool("font")}
              className={cn(
                "h-8 px-2.5 rounded-md flex items-center gap-1 text-sm transition-colors",
                activeTool === "font" ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              <span className="max-w-[80px] truncate">{properties.fontFamily}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </Hint>
          
          <div className="w-px h-5 bg-white/5 mx-1" />
          
          <Hint label="Bold" side="bottom" sideOffset={8}>
            <button
              onClick={toggleBold}
              className={cn(
                "h-8 w-8 rounded-md flex items-center justify-center text-neutral-400 hover:text-white transition-colors",
                properties.fontWeight > 500 ? "bg-white/10 text-white" : "hover:bg-white/5"
              )}
            >
              <Bold className="w-4 h-4" />
            </button>
          </Hint>
          <Hint label="Italic" side="bottom" sideOffset={8}>
            <button
              onClick={toggleItalic}
              className={cn(
                "h-8 w-8 rounded-md flex items-center justify-center text-neutral-400 hover:text-white transition-colors",
                properties.fontStyle === "italic" ? "bg-white/10 text-white" : "hover:bg-white/5"
              )}
            >
              <Italic className="w-4 h-4" />
            </button>
          </Hint>
          <Hint label="Underline" side="bottom" sideOffset={8}>
            <button
              onClick={toggleUnderline}
              className={cn(
                "h-8 w-8 rounded-md flex items-center justify-center text-neutral-400 hover:text-white transition-colors",
                properties.fontUnderline ? "bg-white/10 text-white" : "hover:bg-white/5"
              )}
            >
              <Underline className="w-4 h-4" />
            </button>
          </Hint>
          <Hint label="Strikethrough" side="bottom" sideOffset={8}>
            <button
              onClick={toggleLinethrough}
              className={cn(
                "h-8 w-8 rounded-md flex items-center justify-center text-neutral-400 hover:text-white transition-colors",
                properties.fontLinethrough ? "bg-white/10 text-white" : "hover:bg-white/5"
              )}
            >
              <Strikethrough className="w-4 h-4" />
            </button>
          </Hint>
          
          <div className="w-px h-5 bg-white/5 mx-1" />
          
          <Hint label="Left" side="bottom" sideOffset={8}>
            <button
              onClick={() => onChangeTextAlign("left")}
              className={cn(
                "h-8 w-8 rounded-md flex items-center justify-center text-neutral-400 hover:text-white transition-colors",
                properties.textAlign === "left" ? "bg-white/10 text-white" : "hover:bg-white/5"
              )}
            >
              <AlignLeft className="w-4 h-4" />
            </button>
          </Hint>
          <Hint label="Center" side="bottom" sideOffset={8}>
            <button
              onClick={() => onChangeTextAlign("center")}
              className={cn(
                "h-8 w-8 rounded-md flex items-center justify-center text-neutral-400 hover:text-white transition-colors",
                properties.textAlign === "center" ? "bg-white/10 text-white" : "hover:bg-white/5"
              )}
            >
              <AlignCenter className="w-4 h-4" />
            </button>
          </Hint>
          <Hint label="Right" side="bottom" sideOffset={8}>
            <button
              onClick={() => onChangeTextAlign("right")}
              className={cn(
                "h-8 w-8 rounded-md flex items-center justify-center text-neutral-400 hover:text-white transition-colors",
                properties.textAlign === "right" ? "bg-white/10 text-white" : "hover:bg-white/5"
              )}
            >
              <AlignRight className="w-4 h-4" />
            </button>
          </Hint>
          
          <div className="w-px h-5 bg-white/5 mx-1" />
          
          <FontSizeInput value={properties.fontSize} onChange={onChangeFontSize} />
        </>
      )}
      {isImage && (
        <>
          <Hint label="Remove background" side="bottom" sideOffset={8}>
            <button
              onClick={() => onChangeActiveTool("remove-bg")}
              className={cn(
                "h-8 px-2.5 rounded-md flex items-center gap-1.5 text-sm transition-colors",
                activeTool === "remove-bg" 
                  ? "bg-white/10 text-white" 
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Eraser className="w-4 h-4" />
              <span>Remove BG</span>
            </button>
          </Hint>
        </>
      )}
      
      <div className="flex-1" />
      
      <Hint label="Forward" side="bottom" sideOffset={8}>
        <button 
          onClick={() => editor?.bringForward()} 
          className="h-8 w-8 rounded-md flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </Hint>
      <Hint label="Backward" side="bottom" sideOffset={8}>
        <button 
          onClick={() => editor?.sendBackwards()} 
          className="h-8 w-8 rounded-md flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      </Hint>
      
      <div className="w-px h-5 bg-white/5 mx-1" />
      
      <Hint label="Opacity" side="bottom" sideOffset={8}>
        <button
          onClick={() => onChangeActiveTool("opacity")}
          className={cn(
            "h-8 w-8 rounded-md flex items-center justify-center text-neutral-400 hover:text-white transition-colors",
            activeTool === "opacity" ? "bg-white/10 text-white" : "hover:bg-white/5"
          )}
        >
          <Circle className="w-4 h-4" />
        </button>
      </Hint>
      <Hint label="Duplicate" side="bottom" sideOffset={8}>
        <button
          onClick={() => { editor?.onCopy(); editor?.onPaste(); }}
          className="h-8 w-8 rounded-md flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Copy className="w-4 h-4" />
        </button>
      </Hint>
      <Hint label="Delete" side="bottom" sideOffset={8}>
        <button
          onClick={() => editor?.delete()}
          className="h-8 w-8 rounded-md flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </Hint>
    </div>
  );
};

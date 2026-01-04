"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { fabric } from "fabric";
import {
  Building2,
  Move,
  Maximize2,
  CornerRightDown,
  CornerRightUp,
  CornerLeftDown,
  CornerLeftUp,
  Check,
} from "lucide-react";

import { Editor } from "@/features/editor/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TescoLogoProps {
  editor: Editor | undefined;
  canvasWidth: number;
  canvasHeight: number;
}

const LOGO_TYPES = [
  { value: "tesco", label: "🏪 Tesco Logo", src: "/Tesco_Logo.svg.png" },
  { value: "drinkaware", label: "🍺 Drinkaware", src: "/stickers/drinkaware-logo.png" },
];

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const POSITIONS: { value: Position; label: string; icon: React.ReactNode }[] = [
  { value: "top-left", label: "Top Left", icon: <CornerLeftUp className="w-3 h-3" /> },
  { value: "top-right", label: "Top Right", icon: <CornerRightUp className="w-3 h-3" /> },
  { value: "bottom-left", label: "Bottom Left", icon: <CornerLeftDown className="w-3 h-3" /> },
  { value: "bottom-right", label: "Bottom Right", icon: <CornerRightDown className="w-3 h-3" /> },
];

const LOGO_ELEMENT_ID = "tesco-logo-element";

export const TescoLogo = ({
  editor,
  canvasWidth,
  canvasHeight,
}: TescoLogoProps) => {
  const [enabled, setEnabled] = useState(false);
  const [logoType, setLogoType] = useState<string>("tesco");
  const [position, setPosition] = useState<Position>("bottom-right");
  const [size, setSize] = useState([12]); // Percentage of canvas width
  const [opacity, setOpacity] = useState([100]);
  
  // Ref to track the current logo object
  const logoRef = useRef<fabric.Image | null>(null);
  // Ref to track if we're currently loading an image
  const isLoadingRef = useRef(false);
  // Ref to track if initial check has been done
  const hasInitializedRef = useRef(false);

  // Check if logo already exists on canvas (sync state on mount)
  useEffect(() => {
    if (!editor?.canvas || hasInitializedRef.current) return;
    
    hasInitializedRef.current = true;
    
    const objects = editor.canvas.getObjects();
    const existingLogo = objects.find(
      (obj) => (obj as any).customId === LOGO_ELEMENT_ID
    ) as fabric.Image | undefined;

    if (existingLogo) {
      // Logo exists on canvas, sync state
      logoRef.current = existingLogo;
      setEnabled(true);
    }
  }, [editor]);

  // Calculate logo position based on canvas dimensions - place inside image bounds
  const calculatePosition = useCallback(
    (pos: Position, logoWidth: number, logoHeight: number) => {
      // Get the workspace (image area) dimensions
      const workspace = editor?.canvas?.getObjects().find(obj => obj.name === "clip");
      const wsLeft = workspace?.left || 0;
      const wsTop = workspace?.top || 0;
      const wsWidth = workspace?.width || canvasWidth;
      const wsHeight = workspace?.height || canvasHeight;
      
      // Padding inside the image bounds (5% of smaller dimension)
      const padding = Math.max(15, Math.min(wsWidth, wsHeight) * 0.03);

      switch (pos) {
        case "top-left":
          return { 
            x: wsLeft + padding, 
            y: wsTop + padding 
          };
        case "top-right":
          return { 
            x: wsLeft + wsWidth - logoWidth - padding, 
            y: wsTop + padding 
          };
        case "bottom-left":
          return { 
            x: wsLeft + padding, 
            y: wsTop + wsHeight - logoHeight - padding 
          };
        case "bottom-right":
        default:
          return {
            x: wsLeft + wsWidth - logoWidth - padding,
            y: wsTop + wsHeight - logoHeight - padding,
          };
      }
    },
    [editor, canvasWidth, canvasHeight]
  );

  // Remove existing logo from canvas
  const removeLogo = useCallback(() => {
    if (!editor?.canvas) return;

    // Remove using ref first
    if (logoRef.current) {
      try {
        editor.canvas.remove(logoRef.current);
      } catch (e) {
        // Ignore disposal errors
      }
      logoRef.current = null;
    }

    // Also clean up by custom ID (backup)
    const objects = editor.canvas.getObjects();
    const logoObjects = objects.filter(
      (obj) => (obj as any).customId === LOGO_ELEMENT_ID
    );

    logoObjects.forEach((obj) => {
      try {
        editor.canvas.remove(obj);
      } catch (e) {
        // Ignore disposal errors
      }
    });

    editor.canvas.renderAll();
  }, [editor]);

  // Update logo position and properties without recreating it
  const updateLogoProperties = useCallback(() => {
    if (!editor?.canvas || !logoRef.current) return;

    // Verify canvas context is valid
    try {
      const ctx = editor.canvas.getContext();
      if (!ctx) return;
    } catch (e) {
      return;
    }

    const currentLogo = LOGO_TYPES.find((l) => l.value === logoType);
    if (!currentLogo) return;

    // Use workspace dimensions
    const workspace = editor.canvas.getObjects().find(obj => obj.name === "clip");
    const wsWidth = workspace?.width || canvasWidth;

    const logoWidth = Math.round((wsWidth * size[0]) / 100);
    const logoHeight = Math.round(logoWidth / 3.5);
    const pos = calculatePosition(position, logoWidth, logoHeight);

    logoRef.current.set({
      left: pos.x,
      top: pos.y,
      scaleX: logoWidth / (logoRef.current.width || 1),
      scaleY: logoHeight / (logoRef.current.height || 1),
      opacity: opacity[0] / 100,
    });

    logoRef.current.bringToFront();
    editor.canvas.renderAll();
  }, [editor, logoType, position, size, opacity, canvasWidth, calculatePosition]);

  // Create a new logo image
  const createLogo = useCallback(() => {
    if (!editor?.canvas || isLoadingRef.current) return;

    // Verify canvas context is valid
    try {
      const ctx = editor.canvas.getContext();
      if (!ctx) {
        console.warn("Canvas context not available for logo");
        return;
      }
    } catch (e) {
      console.warn("Canvas may be disposed");
      return;
    }

    const currentLogo = LOGO_TYPES.find((l) => l.value === logoType);
    if (!currentLogo) return;

    // Calculate dimensions based on workspace
    const workspace = editor.canvas.getObjects().find(obj => obj.name === "clip");
    const wsWidth = workspace?.width || canvasWidth;
    
    const logoWidth = Math.round((wsWidth * size[0]) / 100);
    const logoHeight = Math.round(logoWidth / 3.5);
    const pos = calculatePosition(position, logoWidth, logoHeight);

    const currentCanvas = editor.canvas;
    isLoadingRef.current = true;

    fabric.Image.fromURL(
      currentLogo.src,
      (img) => {
        isLoadingRef.current = false;
        
        // Check if canvas is still valid
        if (!currentCanvas || !currentCanvas.getContext()) return;
        
        // Check if logo is still enabled
        if (!enabled) {
          return;
        }
        
        img.set({
          left: pos.x,
          top: pos.y,
          scaleX: logoWidth / (img.width || 1),
          scaleY: logoHeight / (img.height || 1),
          opacity: opacity[0] / 100,
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
          lockRotation: true,
          cornerStyle: "circle",
          cornerColor: "#3b82f6",
          borderColor: "#3b82f6",
        });

        (img as any).customId = LOGO_ELEMENT_ID;

        try {
          currentCanvas.add(img);
          img.bringToFront();
          currentCanvas.renderAll();
          logoRef.current = img;
        } catch (e) {
          console.warn("Failed to add logo - canvas may be disposed");
        }
      },
      { crossOrigin: "anonymous" }
    );
  }, [editor, enabled, logoType, position, size, opacity, canvasWidth, calculatePosition]);

  // Effect for enabling/disabling logo
  useEffect(() => {
    if (!editor?.canvas) return;

    if (enabled) {
      // Only create if not already exists
      if (!logoRef.current && !isLoadingRef.current) {
        createLogo();
      }
    } else {
      removeLogo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, editor]); // Only react to enabled changes and editor availability

  // Effect for logo type changes (need to reload image)
  useEffect(() => {
    if (!enabled || !editor?.canvas) return;
    
    // Remove old and create new when logo type changes
    removeLogo();
    createLogo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoType]); // Only react to logo type changes

  // Effect for position/size/opacity changes (just update properties)
  useEffect(() => {
    if (!enabled || !editor?.canvas) return;
    
    if (logoRef.current) {
      updateLogoProperties();
    } else if (!isLoadingRef.current) {
      // If no logo exists but should, create it
      createLogo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, size, opacity, canvasWidth, canvasHeight]); // React to property changes

  // Handle toggle
  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Tesco Logo</span>
        </div>
        <Switch checked={enabled} onCheckedChange={handleToggle} />
      </div>

      {enabled && (
        <>
          {/* Logo Type */}
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-2 block">
              Logo Type
            </label>
            <Select value={logoType} onValueChange={setLogoType}>
              <SelectTrigger className="h-9 bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOGO_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Position */}
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-2 block">
              Position
            </label>
            <div className="grid grid-cols-2 gap-2">
              {POSITIONS.map((pos) => (
                <button
                  key={pos.value}
                  onClick={() => setPosition(pos.value)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-xs rounded-lg border transition-all",
                    position === pos.value
                      ? "bg-white/10 border-white/30 text-white"
                      : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10"
                  )}
                >
                  {pos.icon}
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-neutral-400">
                Size
              </label>
              <span className="text-xs text-neutral-500">{size[0]}%</span>
            </div>
            <Slider
              value={size}
              onValueChange={setSize}
              min={5}
              max={25}
              step={1}
              className="w-full"
            />
          </div>

          {/* Opacity */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-neutral-400">
                Opacity
              </label>
              <span className="text-xs text-neutral-500">{opacity[0]}%</span>
            </div>
            <Slider
              value={opacity}
              onValueChange={setOpacity}
              min={10}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Preview */}
          <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-neutral-400 mb-2">
              <Check className="w-3 h-3 text-green-400" />
              Logo will appear at {position.replace("-", " ")}
            </div>
            <div className="aspect-video bg-neutral-800 rounded relative overflow-hidden">
              <div
                className={cn(
                  "absolute w-6 h-2 bg-blue-400/50 rounded",
                  position === "top-left" && "top-1 left-1",
                  position === "top-right" && "top-1 right-1",
                  position === "bottom-left" && "bottom-1 left-1",
                  position === "bottom-right" && "bottom-1 right-1"
                )}
              />
            </div>
          </div>
        </>
      )}

      {/* Info */}
      <p className="text-[10px] text-neutral-500">
        Tesco logos are required on all retail media assets. The logo will be
        locked in position to maintain brand compliance.
      </p>
    </div>
  );
};

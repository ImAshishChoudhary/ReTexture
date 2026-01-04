"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { fabric } from "fabric";
import {
  BadgeCheck,
  Move,
  Maximize2,
  Sparkles,
  CornerRightDown,
  CornerRightUp,
  CornerLeftDown,
  CornerLeftUp,
  ArrowRight,
  ArrowLeft,
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

interface TescoTagProps {
  editor: Editor | undefined;
  canvasWidth: number;
  canvasHeight: number;
}

const BADGE_TYPES = [
  {
    value: "available",
    label: "🛒 Available at Tesco",
    src: "/stickers/available-at-tesco.png",
  },
  {
    value: "exclusive",
    label: "⭐ Only at Tesco",
    src: "/stickers/only-at-tesco.png",
  },
  {
    value: "selected",
    label: "📍 Selected Stores",
    src: "/stickers/clubcard-badge.png",
  },
];

type Position =
  | "top-left"
  | "top-right"
  | "middle-left"
  | "middle-right"
  | "bottom-left"
  | "bottom-right";

const POSITIONS: { value: Position; label: string; icon: React.ReactNode }[] = [
  { value: "top-left", label: "Top Left", icon: <CornerLeftUp className="w-3 h-3" /> },
  { value: "top-right", label: "Top Right", icon: <CornerRightUp className="w-3 h-3" /> },
  { value: "middle-left", label: "Middle Left", icon: <ArrowLeft className="w-3 h-3" /> },
  { value: "middle-right", label: "Middle Right", icon: <ArrowRight className="w-3 h-3" /> },
  { value: "bottom-left", label: "Bottom Left", icon: <CornerLeftDown className="w-3 h-3" /> },
  { value: "bottom-right", label: "Bottom Right", icon: <CornerRightDown className="w-3 h-3" /> },
];

const BADGE_ELEMENT_ID = "tesco-badge-element";

export const TescoTag = ({
  editor,
  canvasWidth,
  canvasHeight,
}: TescoTagProps) => {
  const [enabled, setEnabled] = useState(false);
  const [badgeType, setBadgeType] = useState<string>("available");
  const [position, setPosition] = useState<Position>("bottom-left");
  const [size, setSize] = useState([15]); // Percentage of canvas width
  const [opacity, setOpacity] = useState([100]);
  const [autoPosition, setAutoPosition] = useState(true);

  // Refs to track badge state
  const badgeRef = useRef<fabric.Image | null>(null);
  const isLoadingRef = useRef(false);
  // Ref to track if initial check has been done
  const hasInitializedRef = useRef(false);

  // Check if badge already exists on canvas (sync state on mount)
  useEffect(() => {
    if (!editor?.canvas || hasInitializedRef.current) return;
    
    hasInitializedRef.current = true;
    
    const objects = editor.canvas.getObjects();
    const existingBadge = objects.find(
      (obj) => (obj as any).customId === BADGE_ELEMENT_ID
    ) as fabric.Image | undefined;

    if (existingBadge) {
      // Badge exists on canvas, sync state
      badgeRef.current = existingBadge;
      setEnabled(true);
    }
  }, [editor]);

  // Calculate badge position based on workspace dimensions - stay inside image
  const calculatePosition = useCallback(
    (pos: Position, badgeWidth: number, badgeHeight: number) => {
      // Get the workspace (image area) dimensions
      const workspace = editor?.canvas?.getObjects().find(obj => obj.name === "clip");
      const wsLeft = workspace?.left || 0;
      const wsTop = workspace?.top || 0;
      const wsWidth = workspace?.width || canvasWidth;
      const wsHeight = workspace?.height || canvasHeight;
      
      // Padding inside the image bounds (3% of smaller dimension)
      const padding = Math.max(15, Math.min(wsWidth, wsHeight) * 0.03);

      switch (pos) {
        case "top-left":
          return { 
            x: wsLeft + padding, 
            y: wsTop + padding 
          };
        case "top-right":
          return {
            x: wsLeft + wsWidth - badgeWidth - padding,
            y: wsTop + padding,
          };
        case "middle-left":
          return {
            x: wsLeft + padding,
            y: wsTop + (wsHeight - badgeHeight) / 2,
          };
        case "middle-right":
          return {
            x: wsLeft + wsWidth - badgeWidth - padding,
            y: wsTop + (wsHeight - badgeHeight) / 2,
          };
        case "bottom-left":
          return {
            x: wsLeft + padding,
            y: wsTop + wsHeight - badgeHeight - padding,
          };
        case "bottom-right":
        default:
          return {
            x: wsLeft + wsWidth - badgeWidth - padding,
            y: wsTop + wsHeight - badgeHeight - padding,
          };
      }
    },
    [editor, canvasWidth, canvasHeight]
  );

  // Find optimal position avoiding overlaps
  const findBestPosition = useCallback((): Position => {
    if (!editor?.canvas || !autoPosition) return position;

    const objects = editor.canvas.getObjects();
    const workspace = objects.find(obj => obj.name === "clip");
    const wsWidth = workspace?.width || canvasWidth;
    
    const positions: Position[] = [
      "bottom-left",
      "bottom-right",
      "middle-left",
      "middle-right",
      "top-left",
      "top-right",
    ];

    const badgeWidth = Math.round((wsWidth * size[0]) / 100);
    const badgeHeight = Math.round(badgeWidth / 1.4);

    // Find position with least overlap
    let bestPosition = positions[0];
    let bestScore = -Infinity;

    for (const pos of positions) {
      const coords = calculatePosition(pos, badgeWidth, badgeHeight);
      let score = 0;

      // Check for overlaps with existing elements
      for (const obj of objects) {
        if ((obj as any).customId === BADGE_ELEMENT_ID) continue;

        const objBounds = obj.getBoundingRect();
        const badgeBounds = {
          left: coords.x,
          top: coords.y,
          right: coords.x + badgeWidth,
          bottom: coords.y + badgeHeight,
        };

        // Check if overlapping
        const overlapping = !(
          objBounds.left > badgeBounds.right ||
          objBounds.left + objBounds.width < badgeBounds.left ||
          objBounds.top > badgeBounds.bottom ||
          objBounds.top + objBounds.height < badgeBounds.top
        );

        if (overlapping) {
          score -= 100;
        }
      }

      // Prefer bottom positions for badges
      if (pos.includes("bottom")) score += 10;
      // Prefer left positions slightly
      if (pos.includes("left")) score += 5;

      if (score > bestScore) {
        bestScore = score;
        bestPosition = pos;
      }
    }

    return bestPosition;
  }, [editor, autoPosition, position, canvasWidth, size, calculatePosition]);

  // Remove existing badge from canvas
  const removeBadge = useCallback(() => {
    if (!editor?.canvas) return;

    // Remove using ref first
    if (badgeRef.current) {
      try {
        editor.canvas.remove(badgeRef.current);
      } catch (e) {
        // Ignore disposal errors
      }
      badgeRef.current = null;
    }

    // Also clean up by custom ID (backup)
    const objects = editor.canvas.getObjects();
    const badgeObjects = objects.filter(
      (obj) => (obj as any).customId === BADGE_ELEMENT_ID
    );

    badgeObjects.forEach((obj) => {
      try {
        editor.canvas.remove(obj);
      } catch (e) {
        // Ignore disposal errors
      }
    });

    editor.canvas.renderAll();
  }, [editor]);

  // Update badge properties without recreating it
  const updateBadgeProperties = useCallback(() => {
    if (!editor?.canvas || !badgeRef.current) return;

    // Verify canvas context is valid
    try {
      const ctx = editor.canvas.getContext();
      if (!ctx) return;
    } catch (e) {
      return;
    }

    // Use workspace dimensions
    const workspace = editor.canvas.getObjects().find(obj => obj.name === "clip");
    const wsWidth = workspace?.width || canvasWidth;

    const badgeWidth = Math.round((wsWidth * size[0]) / 100);
    const badgeHeight = Math.round(badgeWidth / 1.4);
    
    const finalPosition = autoPosition ? findBestPosition() : position;
    const pos = calculatePosition(finalPosition, badgeWidth, badgeHeight);

    badgeRef.current.set({
      left: pos.x,
      top: pos.y,
      scaleX: badgeWidth / (badgeRef.current.width || 1),
      scaleY: badgeHeight / (badgeRef.current.height || 1),
      opacity: opacity[0] / 100,
    });

    badgeRef.current.bringToFront();
    editor.canvas.renderAll();
  }, [editor, position, autoPosition, size, opacity, canvasWidth, calculatePosition, findBestPosition]);

  // Create a new badge image
  const createBadge = useCallback(() => {
    if (!editor?.canvas || isLoadingRef.current) return;

    // Verify canvas context is valid
    try {
      const ctx = editor.canvas.getContext();
      if (!ctx) {
        console.warn("Canvas context not available for badge");
        return;
      }
    } catch (e) {
      console.warn("Canvas may be disposed");
      return;
    }

    const currentBadge = BADGE_TYPES.find((b) => b.value === badgeType);
    if (!currentBadge) return;

    // Use workspace dimensions
    const workspace = editor.canvas.getObjects().find(obj => obj.name === "clip");
    const wsWidth = workspace?.width || canvasWidth;

    const badgeWidth = Math.round((wsWidth * size[0]) / 100);
    const badgeHeight = Math.round(badgeWidth / 1.4);
    
    const finalPosition = autoPosition ? findBestPosition() : position;
    const pos = calculatePosition(finalPosition, badgeWidth, badgeHeight);

    const currentCanvas = editor.canvas;
    isLoadingRef.current = true;

    fabric.Image.fromURL(
      currentBadge.src,
      (img) => {
        isLoadingRef.current = false;
        
        // Check if canvas is still valid
        if (!currentCanvas || !currentCanvas.getContext()) return;
        
        // Check if badge is still enabled
        if (!enabled) {
          return;
        }

        img.set({
          left: pos.x,
          top: pos.y,
          scaleX: badgeWidth / (img.width || 1),
          scaleY: badgeHeight / (img.height || 1),
          opacity: opacity[0] / 100,
          selectable: true,
          hasControls: false,
          hasBorders: true,
          lockRotation: true,
          lockScalingFlip: true,
        });

        (img as any).customId = BADGE_ELEMENT_ID;

        try {
          currentCanvas.add(img);
          currentCanvas.renderAll();
          badgeRef.current = img;
        } catch (e) {
          console.warn("Failed to add badge - canvas may be disposed");
        }
      },
      { crossOrigin: "anonymous" }
    );
  }, [editor, enabled, badgeType, position, autoPosition, size, opacity, canvasWidth, calculatePosition, findBestPosition]);

  // Effect for enabling/disabling badge
  useEffect(() => {
    if (!editor?.canvas) return;

    if (enabled) {
      // Only create if not already exists
      if (!badgeRef.current && !isLoadingRef.current) {
        createBadge();
      }
    } else {
      removeBadge();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, editor]); // Only react to enabled changes

  // Effect for badge type changes (need to reload image)
  useEffect(() => {
    if (!enabled || !editor?.canvas) return;
    
    removeBadge();
    createBadge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badgeType]); // Only react to badge type changes

  // Effect for position/size/opacity changes (just update properties)
  useEffect(() => {
    if (!enabled || !editor?.canvas) return;
    
    if (badgeRef.current) {
      updateBadgeProperties();
    } else if (!isLoadingRef.current) {
      createBadge();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, autoPosition, size, opacity, canvasWidth, canvasHeight]); // React to property changes

  // Handle toggle
  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-white">Tesco Badge</span>
        </div>
        <Switch checked={enabled} onCheckedChange={handleToggle} />
      </div>

      {enabled && (
        <>
          {/* Badge Type */}
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-2 block">
              Badge Type
            </label>
            <Select value={badgeType} onValueChange={setBadgeType}>
              <SelectTrigger className="h-9 bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BADGE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto Position Toggle */}
          <div className="flex items-center justify-between py-2 px-3 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-white">Smart Positioning</span>
            </div>
            <Switch checked={autoPosition} onCheckedChange={setAutoPosition} />
          </div>

          {/* Manual Position (when auto is off) */}
          {!autoPosition && (
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
          )}

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
              min={8}
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
              min={50}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Status */}
          <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <Check className="w-3 h-3 text-green-400" />
              {autoPosition
                ? "Badge will be positioned automatically to avoid overlaps"
                : `Badge at ${position.replace("-", " ")}`}
            </div>
          </div>
        </>
      )}

      {/* Info */}
      <p className="text-[10px] text-neutral-500">
        Tesco badges help highlight product availability. Smart positioning
        avoids overlapping with other elements and respects safe zones.
      </p>
    </div>
  );
};

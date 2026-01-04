"use client";

import { useState, useCallback, useMemo } from "react";
import { fabric } from "fabric";
import {
  Sticker as StickerIcon,
  Check,
  AlertCircle,
  Info,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Editor } from "@/features/editor/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  STICKERS,
  STICKER_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  getStickersByCategory,
  calculateStickerSize,
  type StickerConfig,
  type StickerCategory,
} from "@/lib/stickers/config";
import {
  findOptimalStickerPosition,
  getCanvasElements,
} from "@/lib/stickers/position-service";

interface StickerLibraryProps {
  editor: Editor | undefined;
  canvasWidth: number;
  canvasHeight: number;
}

const STICKER_PREFIX = "sticker-";

export const StickerLibrary = ({
  editor,
  canvasWidth,
  canvasHeight,
}: StickerLibraryProps) => {
  const [activeCategory, setActiveCategory] = useState<StickerCategory>(
    STICKER_CATEGORIES.TAGS
  );
  const [loadingSticker, setLoadingSticker] = useState<string | null>(null);

  // Get stickers currently on canvas
  const stickersOnCanvas = useMemo(() => {
    if (!editor?.canvas) return new Set<string>();

    const objects = editor.canvas.getObjects();
    const stickerIds = objects
      .filter((obj) => {
        const customId = (obj as any).customId as string | undefined;
        return customId?.startsWith(STICKER_PREFIX);
      })
      .map((obj) => {
        const customId = (obj as any).customId as string;
        return customId.replace(STICKER_PREFIX, "");
      });

    return new Set(stickerIds);
  }, [editor]);

  // Add sticker to canvas
  const handleAddSticker = useCallback(
    async (sticker: StickerConfig) => {
      if (!editor?.canvas) {
        toast.error("Canvas not available");
        return;
      }

      // Check if sticker already exists
      if (stickersOnCanvas.has(sticker.id)) {
        toast.info(`${sticker.name} is already on canvas`);
        return;
      }

      setLoadingSticker(sticker.id);

      // Store reference to check if still valid in callback
      const currentCanvas = editor.canvas;

      try {
        // Calculate size based on canvas
        const size = calculateStickerSize(sticker, canvasWidth, canvasHeight);

        // Get existing elements for collision detection
        const existingElements = getCanvasElements(currentCanvas);

        // Find optimal position
        const position = findOptimalStickerPosition(
          sticker,
          size,
          { x: 0, y: 0, width: canvasWidth, height: canvasHeight },
          existingElements,
          { width: canvasWidth, height: canvasHeight }
        );

        // Load and add the sticker image
        fabric.Image.fromURL(
          sticker.src,
          (img) => {
            // Check if canvas is still valid (not disposed)
            if (!currentCanvas || !currentCanvas.getContext()) {
              setLoadingSticker(null);
              return;
            }

            img.set({
              left: position.x,
              top: position.y,
              scaleX: size.width / (img.width || 1),
              scaleY: size.height / (img.height || 1),
              selectable: true,
              hasControls: true,
              hasBorders: true,
              lockRotation: false,
            });

            // Add custom ID for tracking
            (img as any).customId = `${STICKER_PREFIX}${sticker.id}`;
            (img as any).stickerConfig = sticker;

            try {
              currentCanvas.add(img);
              currentCanvas.setActiveObject(img);
              currentCanvas.renderAll();
              toast.success(`${sticker.name} added to canvas`);
            } catch (e) {
              console.warn("Failed to add sticker - canvas may be disposed");
            }
            setLoadingSticker(null);
          },
          { crossOrigin: "anonymous" }
        );
      } catch (error) {
        console.error("Failed to add sticker:", error);
        toast.error("Failed to add sticker");
        setLoadingSticker(null);
      }
    },
    [editor, canvasWidth, canvasHeight, stickersOnCanvas]
  );

  // Remove sticker from canvas
  const handleRemoveSticker = useCallback(
    (stickerId: string) => {
      if (!editor?.canvas) return;

      const objects = editor.canvas.getObjects();
      const stickerObj = objects.find(
        (obj) => (obj as any).customId === `${STICKER_PREFIX}${stickerId}`
      );

      if (stickerObj) {
        editor.canvas.remove(stickerObj);
        editor.canvas.renderAll();
        toast.success("Sticker removed");
      }
    },
    [editor]
  );

  // Render sticker card
  const renderStickerCard = (sticker: StickerConfig) => {
    const isOnCanvas = stickersOnCanvas.has(sticker.id);
    const isLoading = loadingSticker === sticker.id;
    const isRequired =
      sticker.compliance.required === true ||
      sticker.compliance.required === "alcohol";

    return (
      <div
        key={sticker.id}
        className={cn(
          "p-3 bg-white/5 border rounded-lg transition-all",
          isOnCanvas ? "border-green-500/50" : "border-white/10 hover:border-white/20"
        )}
      >
        {/* Preview */}
        <div
          className="aspect-video bg-neutral-800 rounded-md mb-3 flex items-center justify-center overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(45deg, #333 25%, transparent 25%), 
                              linear-gradient(-45deg, #333 25%, transparent 25%), 
                              linear-gradient(45deg, transparent 75%, #333 75%), 
                              linear-gradient(-45deg, transparent 75%, #333 75%)`,
            backgroundSize: "8px 8px",
            backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sticker.src}
            alt={sticker.name}
            className="max-w-full max-h-full object-contain p-2"
            onError={(e) => {
              // Hide broken image instead of showing placeholder
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        {/* Info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-medium text-white">{sticker.name}</h4>
              <p className="text-[10px] text-neutral-500">{sticker.description}</p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3 text-neutral-500" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[200px]">
                  <p className="text-xs">
                    {sticker.compliance.satisfiesRule
                      ? `Satisfies: ${sticker.compliance.satisfiesRule}`
                      : "Decorative sticker"}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Preferred: {sticker.positioning.preferredZones.join(", ")}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1 flex-wrap">
            {isRequired && (
              <span className="px-2 py-0.5 text-[9px] bg-red-500/20 text-red-400 rounded-full">
                Required
              </span>
            )}
            {isOnCanvas && (
              <span className="px-2 py-0.5 text-[9px] bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
                <Check className="w-2 h-2" />
                On Canvas
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {isOnCanvas ? (
              <Button
                onClick={() => handleRemoveSticker(sticker.id)}
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                Remove
              </Button>
            ) : (
              <Button
                onClick={() => handleAddSticker(sticker)}
                disabled={isLoading}
                size="sm"
                className="flex-1 h-8 text-xs bg-white text-black hover:bg-neutral-200"
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <StickerIcon className="w-3 h-3 mr-1" />
                )}
                Add
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
        <StickerIcon className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-white">Sticker Library</span>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeCategory}
        onValueChange={(v: string) => setActiveCategory(v as StickerCategory)}
      >
        <TabsList className="grid grid-cols-4 h-9 bg-white/5">
          {Object.values(STICKER_CATEGORIES).map((cat) => (
            <TabsTrigger
              key={cat}
              value={cat}
              className="text-xs data-[state=active]:bg-white/10"
            >
              <span className="mr-1">{CATEGORY_ICONS[cat]}</span>
              {CATEGORY_LABELS[cat]}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.values(STICKER_CATEGORIES).map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-1 gap-3 pr-2">
                {getStickersByCategory(cat).map((sticker) =>
                  renderStickerCard(sticker)
                )}
                {getStickersByCategory(cat).length === 0 && (
                  <p className="text-xs text-neutral-500 text-center py-8">
                    No stickers in this category yet
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>

      {/* Summary */}
      <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-400">Stickers on canvas:</span>
          <span className="text-white font-medium">{stickersOnCanvas.size}</span>
        </div>
      </div>

      {/* Info */}
      <p className="text-[10px] text-neutral-500">
        Stickers are positioned automatically to avoid overlaps and stay within
        safe zones. Drag to reposition after adding.
      </p>
    </div>
  );
};

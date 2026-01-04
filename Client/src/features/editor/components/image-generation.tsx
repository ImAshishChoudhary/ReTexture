"use client";

import { useState, useCallback } from "react";
import { fabric } from "fabric";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  ImagePlus,
  Wand2,
  Eraser,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Editor } from "@/features/editor/types";
import { useRemoveBackground } from "@/features/ai/api/use-remove-background";
import { useGenerateVariations, type Variation } from "@/features/ai/api/use-variations";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface ImageGenerationProps {
  editor: Editor | undefined;
}

export const ImageGeneration = ({ editor }: ImageGenerationProps) => {
  const [concept, setConcept] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [removeBgEnabled, setRemoveBgEnabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Remove background hook
  const removeBgMutation = useRemoveBackground({
    onSuccess: (url) => {
      const base64 = url.split(",")[1];
      setImageData(base64);
      setPreviewUrl(url);
      toast.success("Background removed! Ready to generate variations.");
    },
  });

  // Variations hook
  const {
    generateVariations,
    isGenerating,
    variations,
    loadingStyles,
    reset,
  } = useGenerateVariations({
    onComplete: () => {
      toast.success("All variations generated!");
    },
  });

  // Get image from canvas (with or without BG removal)
  const handlePrepareImage = useCallback(async () => {
    if (!editor?.canvas) {
      toast.error("No canvas available");
      return;
    }

    const activeObject = editor.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== "image") {
      toast.error("Please select an image on the canvas first");
      return;
    }

    setIsProcessing(true);
    reset();
    setImageData(null);
    setPreviewUrl(null);

    try {
      const imageElement = (activeObject as fabric.Image).getElement() as HTMLImageElement;
      const canvas = document.createElement("canvas");
      canvas.width = imageElement.naturalWidth || imageElement.width;
      canvas.height = imageElement.naturalHeight || imageElement.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get canvas context");

      ctx.drawImage(imageElement, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");

      if (removeBgEnabled) {
        // Remove background first
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        removeBgMutation.mutate(blob);
      } else {
        // Use image directly
        const base64 = dataUrl.split(",")[1];
        setImageData(base64);
        setPreviewUrl(dataUrl);
        toast.success("Image ready! Now generate variations.");
      }
    } catch (error) {
      console.error("Processing error:", error);
      toast.error("Failed to process image");
    } finally {
      setIsProcessing(false);
    }
  }, [editor, removeBgEnabled, removeBgMutation, reset]);

  // Generate variations
  const handleGenerateVariations = useCallback(() => {
    if (!imageData) {
      toast.error("Please prepare an image first");
      return;
    }

    generateVariations(imageData, concept || "product photography");
  }, [imageData, concept, generateVariations]);

  // Apply variation to canvas - properly covering the workspace
  const handleApplyVariation = useCallback((variation: Variation) => {
    if (!editor?.canvas) return;

    const currentCanvas = editor.canvas;
    
    // Check if canvas context is valid
    try {
      const ctx = currentCanvas.getContext();
      if (!ctx) {
        console.warn("Canvas context not available");
        toast.error("Canvas not ready. Please try again.");
        return;
      }
    } catch (e) {
      console.warn("Canvas may be disposed");
      return;
    }

    // Get workspace (the clip area)
    const workspace = currentCanvas.getObjects().find(obj => obj.name === "clip");
    if (!workspace) {
      toast.error("Canvas workspace not found");
      return;
    }

    const workspaceWidth = workspace.width || 800;
    const workspaceHeight = workspace.height || 600;
    const workspaceLeft = workspace.left || 0;
    const workspaceTop = workspace.top || 0;

    // Remove any previously applied AI background images
    const objects = currentCanvas.getObjects();
    const aiBackgrounds = objects.filter(
      (obj) => (obj as any).customId === "ai-variation-background"
    );
    aiBackgrounds.forEach(obj => {
      try {
        currentCanvas.remove(obj);
      } catch (e) {
        // Ignore removal errors
      }
    });

    // Load and add the variation image to cover the workspace
    fabric.Image.fromURL(
      variation.url,
      (img) => {
        if (!currentCanvas || !currentCanvas.getContext()) return;

        // Calculate scale to COVER the workspace (like CSS object-fit: cover)
        const imgWidth = img.width || 1;
        const imgHeight = img.height || 1;
        
        const scaleX = workspaceWidth / imgWidth;
        const scaleY = workspaceHeight / imgHeight;
        
        // Use the larger scale to ensure full coverage
        const scale = Math.max(scaleX, scaleY);
        
        // Calculate position to center the image within workspace
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        
        // Center the image over the workspace
        const offsetX = (workspaceWidth - scaledWidth) / 2;
        const offsetY = (workspaceHeight - scaledHeight) / 2;

        img.set({
          left: workspaceLeft + offsetX,
          top: workspaceTop + offsetY,
          scaleX: scale,
          scaleY: scale,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          originX: "left",
          originY: "top",
        });

        // Mark as AI-generated background
        (img as any).customId = "ai-variation-background";

        try {
          // Add image and send to back (but above workspace)
          currentCanvas.add(img);
          
          // Move image just above the workspace
          const workspaceIndex = objects.indexOf(workspace);
          if (workspaceIndex >= 0) {
            currentCanvas.moveTo(img, workspaceIndex + 1);
          }
          
          currentCanvas.setActiveObject(img);
          currentCanvas.renderAll();
          toast.success(`Applied ${variation.name} background!`);
        } catch (e) {
          console.warn("Failed to apply variation:", e);
          toast.error("Failed to apply variation");
        }
      },
      { crossOrigin: "anonymous" }
    );
  }, [editor]);

  const isLoading = removeBgMutation.isPending || isProcessing;

  // Reset all state
  const handleReset = useCallback(() => {
    reset();
    setImageData(null);
    setPreviewUrl(null);
    setConcept("");
  }, [reset]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
        <Wand2 className="w-4 h-4 text-orange-400" />
        <span className="text-sm font-medium text-white">AI Background Generator</span>
      </div>

      {/* Step 1: Select Image & Options */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-neutral-400 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-bold">1</span>
          Prepare Image
        </h4>
        
        {/* Remove BG Toggle */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-2">
            <Eraser className="w-4 h-4 text-neutral-400" />
            <span className="text-xs text-white">Remove Background</span>
          </div>
          <Switch
            checked={removeBgEnabled}
            onCheckedChange={setRemoveBgEnabled}
            disabled={isLoading || isGenerating}
          />
        </div>

        <Button
          onClick={handlePrepareImage}
          disabled={isLoading || isGenerating}
          className="w-full h-10"
          variant="outline"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {removeBgEnabled ? "Removing BG..." : "Processing..."}
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4 mr-2" />
              {removeBgEnabled ? "Select & Remove BG" : "Select Image"}
            </>
          )}
        </Button>

        {/* Preview */}
        {previewUrl && (
          <div className="relative rounded-lg overflow-hidden border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-24 object-contain"
              style={{
                backgroundImage: removeBgEnabled
                  ? `linear-gradient(45deg, #333 25%, transparent 25%), 
                     linear-gradient(-45deg, #333 25%, transparent 25%), 
                     linear-gradient(45deg, transparent 75%, #333 75%), 
                     linear-gradient(-45deg, transparent 75%, #333 75%)`
                  : "none",
                backgroundSize: "8px 8px",
                backgroundColor: removeBgEnabled ? "transparent" : "#1a1a1a",
              }}
            />
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-green-500/20 rounded text-[10px] text-green-400 font-medium">
              ✓ Ready
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Theme */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-neutral-400 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-bold">2</span>
          Theme (optional)
        </h4>
        <Input
          placeholder="e.g., summer beach, luxury, minimal..."
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          disabled={!imageData || isGenerating}
          className="h-9 bg-white/5 border-white/10 text-sm placeholder:text-neutral-500"
        />
      </div>

      {/* Step 3: Generate */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-neutral-400 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-bold">3</span>
          Generate Variations
        </h4>
        <Button
          onClick={handleGenerateVariations}
          disabled={!imageData || isGenerating}
          className="w-full h-10 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating ({loadingStyles.length} remaining)...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate 3 Variations
            </>
          )}
        </Button>
      </div>

      {/* Variations Gallery */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-neutral-400">Generated Variations</h4>
          {(variations.length > 0 || imageData) && (
            <button
              onClick={handleReset}
              className="text-xs text-neutral-500 hover:text-white flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        <div
          className="min-h-[120px] bg-white/5 border border-white/10 rounded-lg p-2 overflow-auto"
          style={{ maxHeight: "180px" }}
        >
          {variations.length === 0 && loadingStyles.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center py-6">
              <div className="text-neutral-500">
                <Sparkles className="w-5 h-5 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No variations yet</p>
                <p className="text-[10px] mt-1 text-neutral-600">
                  {imageData ? "Click Generate to create variations" : "Prepare an image first"}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {/* Generated variations */}
              {variations.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleApplyVariation(v)}
                  className="relative group rounded-lg overflow-hidden border-2 border-transparent hover:border-orange-500 transition-all"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.url}
                    alt={v.name}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[10px] text-white font-medium px-2 py-1 bg-orange-500 rounded">Apply</span>
                  </div>
                  <p className="text-[10px] text-center text-neutral-400 mt-1 truncate">{v.name}</p>
                </button>
              ))}

              {/* Loading skeletons */}
              {loadingStyles.map((style) => (
                <div
                  key={`loading-${style}`}
                  className="relative rounded-lg overflow-hidden border border-white/10"
                >
                  <div
                    className="w-full aspect-square flex items-center justify-center bg-white/5"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)",
                      backgroundSize: "200% 100%",
                      animation: "shimmer 1.5s infinite",
                    }}
                  >
                    <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                  </div>
                  <p className="text-[10px] text-center text-orange-400 mt-1 font-medium capitalize">
                    {style}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CSS for shimmer animation */}
        <style jsx>{`
          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
        `}</style>
      </div>

      {/* Info */}
      <div className="p-2 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-lg">
        <p className="text-[10px] text-neutral-400">
          💡 <span className="text-orange-400">AI generates 3 styles:</span> Studio, Lifestyle, Creative.
          Toggle &ldquo;Remove Background&rdquo; for product isolation.
        </p>
      </div>
    </div>
  );
};

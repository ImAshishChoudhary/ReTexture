"use client";

import { useRef, useState, useCallback } from "react";
import { Eraser, Upload, Loader2, Download, Check, RefreshCw, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { fabric } from "fabric";

import { Editor } from "@/features/editor/types";
import { useRemoveBackground, useRemoveBackgroundFile } from "@/features/ai/api/use-remove-background";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BackgroundRemovalProps {
  editor: Editor | undefined;
  onImageProcessed?: (imageUrl: string) => void;
}

export const BackgroundRemoval = ({
  editor,
  onImageProcessed,
}: BackgroundRemovalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const removeBgMutation = useRemoveBackground({
    onSuccess: (url) => {
      setResultUrl(url);
      onImageProcessed?.(url);
    },
  });

  const removeBgFileMutation = useRemoveBackgroundFile({
    onSuccess: (url) => {
      setResultUrl(url);
      onImageProcessed?.(url);
    },
  });

  const isLoading = removeBgMutation.isPending || removeBgFileMutation.isPending;

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be smaller than 10MB");
      return;
    }

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setResultUrl(null);

    // Process the file
    removeBgFileMutation.mutate(file);
  }, [removeBgFileMutation]);

  // Process selected canvas object
  const handleProcessSelected = useCallback(async () => {
    if (!editor?.canvas) {
      toast.error("No canvas available");
      return;
    }

    const activeObject = editor.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== "image") {
      toast.error("Please select an image on the canvas");
      return;
    }

    // Get image data URL
    const imageElement = (activeObject as fabric.Image).getElement() as HTMLImageElement;
    const canvas = document.createElement("canvas");
    canvas.width = imageElement.naturalWidth || imageElement.width;
    canvas.height = imageElement.naturalHeight || imageElement.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(imageElement, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");

    setPreviewUrl(dataUrl);
    setResultUrl(null);

    // Convert data URL to blob for API
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    removeBgMutation.mutate(blob);
  }, [editor, removeBgMutation]);

  // Add result to canvas
  const handleAddToCanvas = useCallback(() => {
    if (!editor || !resultUrl) return;

    fabric.Image.fromURL(resultUrl, (img) => {
      // Scale to fit canvas if needed
      const maxWidth = editor.canvas.getWidth() * 0.8;
      const maxHeight = editor.canvas.getHeight() * 0.8;
      const scale = Math.min(
        maxWidth / (img.width || 1),
        maxHeight / (img.height || 1),
        1
      );

      img.scale(scale);
      img.set({
        left: (editor.canvas.getWidth() - (img.width || 0) * scale) / 2,
        top: (editor.canvas.getHeight() - (img.height || 0) * scale) / 2,
      });

      editor.canvas.add(img);
      editor.canvas.setActiveObject(img);
      editor.canvas.renderAll();
      toast.success("Image added to canvas");
    }, { crossOrigin: "anonymous" });
  }, [editor, resultUrl]);

  // Replace selected image on canvas
  const handleReplaceOnCanvas = useCallback(() => {
    if (!editor?.canvas || !resultUrl) {
      return;
    }

    const activeObject = editor.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== "image") {
      toast.error("Please select an image to replace");
      return;
    }

    const currentLeft = activeObject.left;
    const currentTop = activeObject.top;
    const currentScaleX = activeObject.scaleX;
    const currentScaleY = activeObject.scaleY;

    fabric.Image.fromURL(resultUrl, (img) => {
      img.set({
        left: currentLeft,
        top: currentTop,
        scaleX: currentScaleX,
        scaleY: currentScaleY,
      });

      editor.canvas.remove(activeObject);
      editor.canvas.add(img);
      editor.canvas.setActiveObject(img);
      editor.canvas.renderAll();
      toast.success("Image replaced");
    }, { crossOrigin: "anonymous" });
  }, [editor, resultUrl]);

  // Download result
  const handleDownload = useCallback(() => {
    if (!resultUrl) return;

    const link = document.createElement("a");
    link.href = resultUrl;
    link.download = "removed-background.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [resultUrl]);

  // Reset state
  const handleReset = useCallback(() => {
    setPreviewUrl(null);
    setResultUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
        <Eraser className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-white">Background Removal</span>
      </div>

      {/* Upload Section */}
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          variant="outline"
          className="w-full h-10 border-dashed border-white/20 text-white hover:bg-white/10"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Image
        </Button>

        <Button
          onClick={handleProcessSelected}
          disabled={isLoading}
          className="w-full h-10 bg-white text-black hover:bg-neutral-200"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <ImageIcon className="w-4 h-4 mr-2" />
          )}
          Process Selected
        </Button>
      </div>

      {/* Preview Section */}
      {(previewUrl || resultUrl) && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {/* Original */}
            {previewUrl && (
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase">Original</span>
                <div className="aspect-square bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Result */}
            {resultUrl ? (
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-400" />
                  Result
                </span>
                <div 
                  className="aspect-square border border-white/10 rounded-lg overflow-hidden"
                  style={{
                    backgroundImage: `linear-gradient(45deg, #333 25%, transparent 25%), 
                                      linear-gradient(-45deg, #333 25%, transparent 25%), 
                                      linear-gradient(45deg, transparent 75%, #333 75%), 
                                      linear-gradient(-45deg, transparent 75%, #333 75%)`,
                    backgroundSize: "10px 10px",
                    backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resultUrl}
                    alt="Result"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            ) : isLoading ? (
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase">Processing...</span>
                <div className="aspect-square bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
                </div>
              </div>
            ) : null}
          </div>

          {/* Action Buttons */}
          {resultUrl && (
            <div className="flex gap-2">
              <Button
                onClick={handleAddToCanvas}
                size="sm"
                className="flex-1 bg-white text-black hover:bg-neutral-200"
              >
                Add to Canvas
              </Button>
              <Button
                onClick={handleReplaceOnCanvas}
                size="sm"
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Replace Selected
              </Button>
            </div>
          )}

          {resultUrl && (
            <div className="flex gap-2">
              <Button
                onClick={handleDownload}
                size="sm"
                variant="ghost"
                className="flex-1 text-neutral-400 hover:text-white hover:bg-white/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={handleReset}
                size="sm"
                variant="ghost"
                className="flex-1 text-neutral-400 hover:text-white hover:bg-white/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <p className="text-[10px] text-neutral-500">
        AI-powered background removal. Works best with product images and clear subjects.
      </p>
    </div>
  );
};

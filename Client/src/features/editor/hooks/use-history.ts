import { fabric } from "fabric";
import { useCallback, useRef, useState } from "react";

import { JSON_KEYS } from "@/features/editor/types";

interface UseHistoryProps {
  canvas: fabric.Canvas | null;
  saveCallback?: (values: {
    json: string;
    height: number;
    width: number;
    thumbnailUrl?: string;
  }) => void;
};

export const useHistory = ({ canvas, saveCallback }: UseHistoryProps) => {
  const [historyIndex, setHistoryIndex] = useState(0);
  const canvasHistory = useRef<string[]>([]);
  const skipSave = useRef(false);

  const canUndo = useCallback(() => {
    return historyIndex > 0;
  }, [historyIndex]);

  const canRedo = useCallback(() => {
    return historyIndex < canvasHistory.current.length - 1;
  }, [historyIndex]);

  const save = useCallback((skip = false) => {
    if (!canvas) return;

    const currentState = canvas.toJSON(JSON_KEYS);
    const json = JSON.stringify(currentState);

    if (!skip && !skipSave.current) {
      canvasHistory.current.push(json);
      setHistoryIndex(canvasHistory.current.length - 1);
    }

    const workspace = canvas
      .getObjects()
      .find((object) => object.name === "clip") as fabric.Rect | undefined;
    const height = workspace?.height || 0;
    const width = workspace?.width || 0;

    // Generate thumbnail
    let thumbnailUrl: string | undefined = undefined;
    try {
      if (workspace && width > 0 && height > 0) {
        // Save current viewport transform
        const originalTransform = canvas.viewportTransform;

        // Reset viewport for clean export
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        canvas.renderAll();

        // Generate thumbnail as data URL
        const options = {
          format: 'png' as const,
          quality: 0.9,
          multiplier: 0.4, // Better quality thumbnail
          left: workspace.left || 0,
          top: workspace.top || 0,
          width: width,
          height: height,
          enableRetinaScaling: false,
        };

        thumbnailUrl = canvas.toDataURL(options);

        // Restore viewport transform
        if (originalTransform) {
          canvas.setViewportTransform(originalTransform);
          canvas.renderAll();
        }
      }
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
    }

    saveCallback?.({ json, height, width, thumbnailUrl });
  },
  [
    canvas,
    saveCallback,
  ]);

  const undo = useCallback(() => {
    if (canUndo() && canvas) {
      // Check if canvas context is still valid
      try {
        const ctx = canvas.getContext();
        if (!ctx) {
          console.warn("Canvas context is not available for undo");
          return;
        }
      } catch (e) {
        console.warn("Canvas may be disposed");
        return;
      }

      skipSave.current = true;
      
      // Safely clear canvas
      try {
        canvas.clear();
        canvas.renderAll();
      } catch (e) {
        console.warn("Failed to clear canvas during undo:", e);
        skipSave.current = false;
        return;
      }

      const previousIndex = historyIndex - 1;
      const previousState = JSON.parse(
        canvasHistory.current[previousIndex]
      );

      canvas.loadFromJSON(previousState, () => {
        canvas.renderAll();
        setHistoryIndex(previousIndex);
        skipSave.current = false;
      });
    }
  }, [canUndo, canvas, historyIndex]);

  const redo = useCallback(() => {
    if (canRedo() && canvas) {
      // Check if canvas context is still valid
      try {
        const ctx = canvas.getContext();
        if (!ctx) {
          console.warn("Canvas context is not available for redo");
          return;
        }
      } catch (e) {
        console.warn("Canvas may be disposed");
        return;
      }

      skipSave.current = true;
      
      // Safely clear canvas
      try {
        canvas.clear();
        canvas.renderAll();
      } catch (e) {
        console.warn("Failed to clear canvas during redo:", e);
        skipSave.current = false;
        return;
      }

      const nextIndex = historyIndex + 1;
      const nextState = JSON.parse(
        canvasHistory.current[nextIndex]
      );

      canvas.loadFromJSON(nextState, () => {
        canvas.renderAll();
        setHistoryIndex(nextIndex);
        skipSave.current = false;
      });
    }
  }, [canvas, historyIndex, canRedo]);

  return { 
    save,
    canUndo,
    canRedo,
    undo,
    redo,
    setHistoryIndex,
    canvasHistory,
  };
};

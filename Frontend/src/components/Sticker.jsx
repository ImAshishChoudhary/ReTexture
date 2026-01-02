/**
 * Sticker Component - Smart Sticker Insertion
 *
 * Features:
 * - Auto-positioning in safe zones
 * - Auto-sizing based on canvas
 * - Compliance integration
 * - Based on TescoLogo architecture
 */
import { useEffect, useRef } from "react";
import { useEditorStore } from "../store/useEditorStore";
import { getStickerById, calculateStickerSize } from "../config/stickerConfig";
import { findOptimalStickerPosition } from "../services/stickerPositionService";

export default function Sticker({ stickerId, setPagesWithHistory }) {
  // Store
  const activeIndex = useEditorStore((state) => state.activeIndex);
  const canvasSize = useEditorStore((state) => state.canvasSize);
  const editorPages = useEditorStore((state) => state.editorPages);

  // Get sticker config
  const stickerConfig = getStickerById(stickerId);
  if (!stickerConfig) {
    console.error(`[STICKER] ❌ Sticker ${stickerId} not found in config`);
    return null;
  }

  console.log("=".repeat(80));
  console.log(`[STICKER] 🎨 Component mounted for: ${stickerId}`);

  // Insert sticker ONCE on mount - use empty deps to run only once
  useEffect(() => {
    console.log(`[STICKER] 🚀 useEffect triggered for: ${stickerId}`);
    console.log(`[STICKER] activeIndex: ${activeIndex}`);
    console.log(`[STICKER] canvasSize:`, canvasSize);

    const page = editorPages[activeIndex];
    if (!page) {
      console.warn(`[STICKER] ⚠️ No page found at activeIndex ${activeIndex}`);
      return;
    }

    console.log(`[STICKER] Page children count:`, page.children?.length || 0);

    // Check if sticker already exists
    const stickerExists = page.children?.some(
      (child) => child.type === "sticker" && child.stickerId === stickerId
    );

    if (stickerExists) {
      console.log(
        `[STICKER] ⚠️ Sticker ${stickerId} already exists on canvas, skipping`
      );
      return;
    }

    // Get image bounds for positioning
    const mainImage = page.children?.find(
      (child) => child.type === "image" && !child.id?.startsWith("sticker-")
    );

    console.log(`[STICKER] Main image found:`, !!mainImage);

    const imageBounds = mainImage
      ? {
          x: mainImage.x || 0,
          y: mainImage.y || 0,
          width: mainImage.width || canvasSize.w,
          height: mainImage.height || canvasSize.h,
        }
      : { x: 0, y: 0, width: canvasSize.w, height: canvasSize.h };

    console.log(`[STICKER] Image bounds:`, imageBounds);

    // Get existing elements for collision detection
    const existingElements =
      page.children?.filter(
        (child) => !child.id?.startsWith(`sticker-${stickerId}`)
      ) || [];

    console.log(
      `[STICKER] Existing elements for collision:`,
      existingElements.length
    );

    // Calculate size
    const size = calculateStickerSize(stickerConfig, canvasSize);
    console.log(`[STICKER] Calculated size:`, size);

    // Find optimal position
    const placement = findOptimalStickerPosition(
      stickerConfig,
      size,
      imageBounds,
      existingElements,
      canvasSize
    );

    console.log(`[STICKER] Optimal placement:`, placement);

    // Create sticker element
    const stickerElement = {
      id: `sticker-${stickerId}-${Date.now()}`,
      type: "sticker",
      stickerId: stickerId,
      src: stickerConfig.src,
      x: placement.x,
      y: placement.y,
      width: size.width,
      height: size.height,
      opacity: 1.0,
      draggable: true,
      metadata: {
        category: stickerConfig.category,
        satisfiesRule: stickerConfig.compliance.satisfiesRule,
        name: stickerConfig.name,
      },
    };

    console.log(`[STICKER] Created sticker element:`, stickerElement);

    // Insert sticker
    setPagesWithHistory((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));

      if (!copy[activeIndex]) {
        copy[activeIndex] = {
          id: activeIndex + 1,
          children: [],
          background: "#ffffff",
        };
      }
      if (!copy[activeIndex].children) {
        copy[activeIndex].children = [];
      }

      copy[activeIndex].children.push(stickerElement);
      console.log(
        `[STICKER] ✅ Sticker ${stickerId} inserted successfully at (${stickerElement.x}, ${stickerElement.y})`
      );
      console.log(
        `[STICKER] Total children on page now: ${copy[activeIndex].children.length}`
      );
      return copy;
    });

    console.log("=".repeat(80));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - run ONCE on mount, ignore state changes

  // This is a logic-only component - no visual rendering
  return null;
}

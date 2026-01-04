/**
 * Sticker Position Service
 * Smart positioning algorithm for stickers with collision detection
 */

import type { StickerConfig, StickerSize } from "./config";

interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SafeZones {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface CandidatePosition {
  x: number;
  y: number;
  zone: string;
  preferred: boolean;
  score?: number;
}

interface PositionResult {
  x: number;
  y: number;
  zone: string;
}

/**
 * Find optimal position for sticker
 */
export function findOptimalStickerPosition(
  stickerConfig: StickerConfig,
  size: StickerSize,
  imageBounds: ElementBounds,
  existingElements: ElementBounds[],
  canvasSize: { width: number; height: number }
): PositionResult {
  const { positioning } = stickerConfig;
  const { preferredZones, avoidCenter, safeZoneCompliant } = positioning;

  // Define safe zone constraints (9:16 format)
  const aspectRatio = canvasSize.width / canvasSize.height;
  const is916 = Math.abs(aspectRatio - 9 / 16) < 0.05;

  const safeZones: SafeZones =
    is916 && safeZoneCompliant
      ? { top: 200, bottom: 250, left: 40, right: 40 }
      : { top: 20, bottom: 20, left: 20, right: 20 };

  // Generate candidate positions
  const candidates = generateCandidatePositions(
    size,
    imageBounds,
    preferredZones,
    safeZones,
    avoidCenter
  );

  // Score each candidate
  const scored = candidates.map((candidate) => {
    const score = scorePosition(
      candidate,
      size,
      existingElements,
      imageBounds,
      safeZones
    );
    return { ...candidate, score };
  });

  // Sort by score (higher is better)
  scored.sort((a, b) => (b.score || 0) - (a.score || 0));

  // Return best position
  return scored[0] || { x: safeZones.left, y: safeZones.top, zone: "top-left" };
}

/**
 * Generate candidate positions based on preferred zones
 */
function generateCandidatePositions(
  size: StickerSize,
  imageBounds: ElementBounds,
  preferredZones: string[],
  safeZones: SafeZones,
  avoidCenter: boolean
): CandidatePosition[] {
  const { width, height } = size;
  const { x: imgX, y: imgY, width: imgW, height: imgH } = imageBounds;

  const padding = 20;
  const candidates: CandidatePosition[] = [];

  const zonePositions: Record<string, { x: number; y: number }> = {
    "top-left": {
      x: Math.max(imgX + safeZones.left, padding),
      y: Math.max(imgY + safeZones.top, padding),
    },
    "top-right": {
      x: imgX + imgW - width - Math.max(safeZones.right, padding),
      y: Math.max(imgY + safeZones.top, padding),
    },
    "bottom-left": {
      x: Math.max(imgX + safeZones.left, padding),
      y: imgY + imgH - height - Math.max(safeZones.bottom, padding),
    },
    "bottom-right": {
      x: imgX + imgW - width - Math.max(safeZones.right, padding),
      y: imgY + imgH - height - Math.max(safeZones.bottom, padding),
    },
    "middle-left": {
      x: Math.max(imgX + safeZones.left, padding),
      y: imgY + (imgH - height) / 2,
    },
    "middle-right": {
      x: imgX + imgW - width - Math.max(safeZones.right, padding),
      y: imgY + (imgH - height) / 2,
    },
  };

  if (!avoidCenter) {
    zonePositions.center = {
      x: imgX + (imgW - width) / 2,
      y: imgY + (imgH - height) / 2,
    };
  }

  // Add preferred zones first
  preferredZones.forEach((zone) => {
    if (zonePositions[zone]) {
      candidates.push({
        ...zonePositions[zone],
        zone,
        preferred: true,
      });
    }
  });

  // Add non-preferred zones
  Object.keys(zonePositions).forEach((zone) => {
    if (!preferredZones.includes(zone)) {
      candidates.push({
        ...zonePositions[zone],
        zone,
        preferred: false,
      });
    }
  });

  return candidates;
}

/**
 * Score a position based on multiple factors
 */
function scorePosition(
  candidate: CandidatePosition,
  size: StickerSize,
  existingElements: ElementBounds[],
  imageBounds: ElementBounds,
  safeZones: SafeZones
): number {
  let score = 0;

  // Preferred zone bonus
  if (candidate.preferred) score += 50;

  // Check for overlaps with existing elements
  const stickerBounds: ElementBounds = {
    x: candidate.x,
    y: candidate.y,
    width: size.width,
    height: size.height,
  };

  for (const element of existingElements) {
    if (checkOverlap(stickerBounds, element)) {
      const overlapArea = calculateOverlapArea(stickerBounds, element);
      score -= overlapArea * 0.01; // Penalize based on overlap area
    }
  }

  // Check if within safe zones
  if (candidate.y >= safeZones.top && candidate.x >= safeZones.left) {
    score += 20;
  }

  // Bottom positions get bonus for tags
  if (candidate.zone.includes("bottom")) {
    score += 15;
  }

  // Left positions get slight bonus
  if (candidate.zone.includes("left")) {
    score += 5;
  }

  return score;
}

/**
 * Check if two rectangles overlap
 */
function checkOverlap(rect1: ElementBounds, rect2: ElementBounds): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

/**
 * Calculate overlap area between two rectangles
 */
function calculateOverlapArea(
  rect1: ElementBounds,
  rect2: ElementBounds
): number {
  const xOverlap = Math.max(
    0,
    Math.min(rect1.x + rect1.width, rect2.x + rect2.width) -
      Math.max(rect1.x, rect2.x)
  );
  const yOverlap = Math.max(
    0,
    Math.min(rect1.y + rect1.height, rect2.y + rect2.height) -
      Math.max(rect1.y, rect2.y)
  );
  return xOverlap * yOverlap;
}

/**
 * Get existing elements from Fabric.js canvas
 */
export function getCanvasElements(
  canvas: fabric.Canvas
): ElementBounds[] {
  const objects = canvas.getObjects();
  return objects.map((obj) => {
    const bounds = obj.getBoundingRect();
    return {
      x: bounds.left,
      y: bounds.top,
      width: bounds.width,
      height: bounds.height,
    };
  });
}

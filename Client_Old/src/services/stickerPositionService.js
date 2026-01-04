/**
 * Sticker Position Service
 * Smart positioning algorithm for stickers with collision detection
 * Based on text placement service architecture
 */

/**
 * Find optimal position for sticker
 * @param {Object} stickerConfig - Sticker configuration
 * @param {Object} size - { width, height }
 * @param {Object} imageBounds - Main image boundaries
 * @param {Array} existingElements - Current canvas elements
 * @param {Object} canvasSize - Canvas dimensions
 * @returns {Object} - { x, y, zone }
 */
export function findOptimalStickerPosition(
  stickerConfig,
  size,
  imageBounds,
  existingElements,
  canvasSize
) {
  console.log("[POSITION_SERVICE] 📍 Finding optimal position");
  console.log(
    `[POSITION_SERVICE] Sticker: ${stickerConfig.name} (${stickerConfig.id})`
  );
  console.log(`[POSITION_SERVICE] Size:`, size);
  console.log(`[POSITION_SERVICE] Image bounds:`, imageBounds);
  console.log(`[POSITION_SERVICE] Existing elements:`, existingElements.length);
  console.log(`[POSITION_SERVICE] Canvas size:`, canvasSize);

  const { positioning } = stickerConfig;
  const { preferredZones, avoidCenter, safeZoneCompliant } = positioning;

  console.log(`[POSITION_SERVICE] Preferred zones:`, preferredZones);
  console.log(`[POSITION_SERVICE] Avoid center: ${avoidCenter}`);
  console.log(`[POSITION_SERVICE] Safe zone compliant: ${safeZoneCompliant}`);

  // Define safe zone constraints (9:16 format)
  const { w, h } = canvasSize;
  const aspectRatio = w / h;
  const is916 = Math.abs(aspectRatio - 9 / 16) < 0.05;

  console.log(
    `[POSITION_SERVICE] Aspect ratio: ${aspectRatio.toFixed(
      3
    )} (is 9:16: ${is916})`
  );

  const safeZones =
    is916 && safeZoneCompliant
      ? {
          top: 200,
          bottom: 250,
          left: 40,
          right: 40,
        }
      : {
          top: 20,
          bottom: 20,
          left: 20,
          right: 20,
        };

  // Generate candidate positions based on preferred zones
  console.log(`[POSITION_SERVICE] Safe zones:`, safeZones);
  const candidates = generateCandidatePositions(
    size,
    imageBounds,
    preferredZones,
    safeZones,
    avoidCenter
  );
  console.log(
    `[POSITION_SERVICE] Generated ${candidates.length} candidate positions:`
  );
  candidates.forEach((c, i) => {
    console.log(
      `  ${i + 1}. ${c.zone}: (${c.x}, ${c.y}) preferred=${
        c.preferred
      } rightCorner=${c.rightCorner || false}`
    );
  });

  // Score each candidate
  const scored = candidates.map((candidate) => {
    const score = scorePosition(
      candidate,
      size,
      existingElements,
      imageBounds,
      safeZones
    );
    console.log(`[POSITION_SERVICE] ${candidate.zone} scored: ${score}`);
    return { ...candidate, score };
  });

  // Sort by score (higher is better)
  scored.sort((a, b) => b.score - a.score);

  console.log(
    `[POSITION_SERVICE] 🏆 Best position: ${scored[0]?.zone} at (${scored[0]?.x}, ${scored[0]?.y}) with score ${scored[0]?.score}`
  );

  // Return best position
  return scored[0] || { x: safeZones.left, y: safeZones.top, zone: "top-left" };
}

/**
 * Generate candidate positions based on preferred zones
 */
function generateCandidatePositions(
  size,
  imageBounds,
  preferredZones,
  safeZones,
  avoidCenter
) {
  const { width, height } = size;
  const { x: imgX, y: imgY, width: imgW, height: imgH } = imageBounds;

  const padding = 20;
  const candidates = [];

  const zonePositions = {
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
    center: {
      x: imgX + (imgW - width) / 2,
      y: imgY + (imgH - height) / 2,
    },
  };

  const rightCornerZones = ["bottom-right", "top-right"];
  rightCornerZones.forEach((zone) => {
    if (zonePositions[zone]) {
      candidates.push({
        ...zonePositions[zone],
        zone,
        preferred: true,
        rightCorner: true,
      });
    }
  });

  preferredZones.forEach((zone) => {
    if (zonePositions[zone] && !rightCornerZones.includes(zone)) {
      candidates.push({ ...zonePositions[zone], zone, preferred: true });
    }
  });

  // Add center if allowed
  if (!avoidCenter) {
    candidates.push({
      ...zonePositions.center,
      zone: "center",
      preferred: false,
    });
  }

  // Add remaining zones as fallback (excluding right corners already added)
  Object.keys(zonePositions).forEach((zone) => {
    if (
      !preferredZones.includes(zone) &&
      zone !== "center" &&
      !rightCornerZones.includes(zone)
    ) {
      candidates.push({ ...zonePositions[zone], zone, preferred: false });
    }
  });

  return candidates;
}

/**
 * Score a position based on multiple factors
 */
function scorePosition(
  candidate,
  size,
  existingElements,
  imageBounds,
  safeZones
) {
  let score = 100;

  const { x, y } = candidate;
  const { width, height } = size;

  // EXTRA BONUS for right corner placement
  if (candidate.rightCorner) {
    score += 100;
  }

  // Bonus for preferred zones
  if (candidate.preferred) {
    score += 50;
  }

  // Check overlap with existing elements
  const stickerBounds = {
    x,
    y,
    width,
    height,
  };

  existingElements.forEach((el) => {
    if (el.type === "image" || el.type === "shape") {
      // ALLOW overlap with images - stickers have transparent backgrounds
      // No penalty for image overlap since transparency shows through
      return;
    } else if (
      el.type === "text" ||
      el.type === "sticker" ||
      el.type === "logo"
    ) {
      // Strict for text/stickers/logos - must avoid these
      const overlapPenalty = calculateOverlap(stickerBounds, el) * 30;
      score -= overlapPenalty;
    }
  });

  // Penalize positions too close to edges
  const edgeMargin = 10;
  if (x < imageBounds.x + edgeMargin) score -= 20;
  if (y < imageBounds.y + edgeMargin) score -= 20;
  if (x + width > imageBounds.x + imageBounds.width - edgeMargin) score -= 20;
  if (y + height > imageBounds.y + imageBounds.height - edgeMargin) score -= 20;

  // Penalize safe zone violations
  if (y < safeZones.top) score -= 100;
  if (y + height > imageBounds.height - safeZones.bottom) score -= 100;

  return Math.max(0, score);
}

/**
 * Calculate overlap percentage between two rectangles
 */
function calculateOverlap(rect1, rect2) {
  const x1 = Math.max(rect1.x, rect2.x || 0);
  const y1 = Math.max(rect1.y, rect2.y || 0);
  const x2 = Math.min(
    rect1.x + rect1.width,
    (rect2.x || 0) + (rect2.width || 0)
  );
  const y2 = Math.min(
    rect1.y + rect1.height,
    (rect2.y || 0) + (rect2.height || 0)
  );

  if (x2 <= x1 || y2 <= y1) return 0;

  const overlapArea = (x2 - x1) * (y2 - y1);
  const rect1Area = rect1.width * rect1.height;

  return (overlapArea / rect1Area) * 100;
}

/**
 * Check if position respects safe zones
 */
export function isInSafeZone(x, y, width, height, canvasSize) {
  const { w, h } = canvasSize;
  const aspectRatio = w / h;
  const is916 = Math.abs(aspectRatio - 9 / 16) < 0.05;

  if (!is916) return true; // No safe zone constraints for other formats

  const topSafeZone = 200;
  const bottomSafeZone = 250;

  // Check if sticker is entirely within safe zones
  return y >= topSafeZone && y + height <= h - bottomSafeZone;
}

/**
 * Compliance Rules - First Principles Implementation
 *
 * All validation rules in one place
 * Each rule returns violations with auto-fix metadata
 *
 * @module compliance/rules
 */

import {
  findValueTiles,
  findPackshots,
  findCTA,
  findTags,
} from "./detection.js";

import { getContrastRatio, getBoundingBox, doBoxesOverlap } from "./utils.js";

// ==================== FONT SIZE RULES ====================

/**
 * Check minimum font size compliance
 * @param {Array} elements - Canvas elements
 * @param {Object} rules - Rules config
 * @returns {Array} Violations
 */
export function checkFontSize(elements, rules) {
  const violations = [];
  const minSize = rules.minFontSize || 20;

  for (const element of elements) {
    if (element.type !== "text") continue;

    const fontSize = element.fontSize || 16;

    if (fontSize < minSize) {
      violations.push({
        type: "MIN_FONT_SIZE",
        severity: "error",
        elementId: element.id,
        message: `Font size ${fontSize}px is below minimum ${minSize}px`,
        autoFixable: true,
        autoFix: {
          action: "resize",
          value: minSize,
        },
      });
    }
  }

  return violations;
}

// ==================== SAFE ZONE RULES ====================

/**
 * Check safe zone compliance
 * @param {Array} elements - Canvas elements
 * @param {Object} canvasSize - Canvas dimensions { w, h }
 * @param {Object} rules - Rules config
 * @returns {Array} Violations
 */
export function checkSafeZone(elements, canvasSize, rules) {
  const violations = [];
  const safeZone = rules.safeZone || { top: 200, bottom: 250 };

  for (const element of elements) {
    // Skip stickers/logos - they can be anywhere
    if (element.type === "sticker" || element.isLogo) continue;

    const box = getBoundingBox(element);

    // Check top safe zone
    if (box.y1 < safeZone.top) {
      violations.push({
        type: "SAFE_ZONE",
        severity: "error",
        elementId: element.id,
        message: `Element extends above safe zone (${box.y1}px < ${safeZone.top}px)`,
        autoFixable: true,
        autoFix: {
          action: "move",
          direction: "down",
          value: safeZone.top,
        },
      });
    }

    // Check bottom safe zone
    const bottomLimit = canvasSize.h - safeZone.bottom;
    if (box.y2 > bottomLimit) {
      violations.push({
        type: "SAFE_ZONE",
        severity: "error",
        elementId: element.id,
        message: `Element extends below safe zone (${box.y2}px > ${bottomLimit}px)`,
        autoFixable: true,
        autoFix: {
          action: "move",
          direction: "up",
          value: bottomLimit - (box.y2 - box.y1),
        },
      });
    }
  }

  return violations;
}

// ==================== CONTRAST RULES ====================

/**
 * Check WCAG contrast compliance
 * @param {Array} elements - Canvas elements
 * @param {string} backgroundColor - Canvas background color
 * @param {Object} rules - Rules config
 * @returns {Array} Violations
 */
export function checkContrast(elements, backgroundColor, rules) {
  const violations = [];
  const minRatio = rules.minContrast || 4.5;
  const bgColor = backgroundColor || "#ffffff";

  for (const element of elements) {
    if (element.type !== "text") continue;

    const textColor = element.fill || "#000000";
    const ratio = getContrastRatio(textColor, bgColor);

    if (ratio < minRatio) {
      // FIRST PRINCIPLE: Calculate which color (white or black) gives BETTER contrast
      // Don't use threshold-based approach - actually calculate the ratios!
      const whiteRatio = getContrastRatio("#ffffff", bgColor);
      const blackRatio = getContrastRatio("#000000", bgColor);

      // Choose the color that provides BETTER contrast
      const suggestedColor = whiteRatio > blackRatio ? "#ffffff" : "#000000";
      const suggestedRatio = Math.max(whiteRatio, blackRatio);

      console.log(
        `  🎨 [CONTRAST] Calculating optimal color for ${element.id}:`
      );
      console.log(
        `    ↳ Current: ${textColor} on ${bgColor} = ${ratio.toFixed(2)}:1 ❌`
      );
      console.log(
        `    ↳ White option: ${whiteRatio.toFixed(2)}:1 ${
          whiteRatio >= minRatio ? "✅" : "❌"
        }`
      );
      console.log(
        `    ↳ Black option: ${blackRatio.toFixed(2)}:1 ${
          blackRatio >= minRatio ? "✅" : "❌"
        }`
      );
      console.log(
        `    ↳ Suggested: ${suggestedColor} (${suggestedRatio.toFixed(2)}:1)`
      );

      violations.push({
        type: "CONTRAST",
        severity: "warning",
        elementId: element.id,
        message: `Contrast ratio ${ratio.toFixed(
          2
        )} is below WCAG minimum ${minRatio}`,
        autoFixable: true,
        autoFix: {
          action: "changeColor",
          value: suggestedColor,
        },
      });
    }
  }

  return violations;
}

// ==================== OVERLAP RULES ====================

/**
 * Check element overlaps
 * @param {Array} elements - Canvas elements
 * @returns {Array} Violations
 */
export function checkOverlaps(elements) {
  const violations = [];

  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const el1 = elements[i];
      const el2 = elements[j];

      // Skip if both are decorative
      if (isDecorative(el1) && isDecorative(el2)) continue;

      const box1 = getBoundingBox(el1);
      const box2 = getBoundingBox(el2);

      if (doBoxesOverlap(box1, box2)) {
        const overlapArea = calculateOverlapArea(box1, box2);
        const el1Area = (box1.x2 - box1.x1) * (box1.y2 - box1.y1);
        const el2Area = (box2.x2 - box2.x1) * (box2.y2 - box2.y1);

        // Only flag if overlap is > 20% of smaller element
        const overlapPercent = (overlapArea / Math.min(el1Area, el2Area)) * 100;

        if (overlapPercent > 20) {
          violations.push({
            type: "OVERLAPS",
            severity: "warning",
            elements: [el1.id, el2.id],
            message: `Elements overlap by ${overlapPercent.toFixed(1)}%`,
            autoFixable: true,
            autoFix: {
              action: "separate",
              positions: {
                [el1.id]: box1.y1,
                [el2.id]: box1.y2 + 10, // Move el2 below el1 with 10px gap
              },
            },
          });
        }
      }
    }
  }

  return violations;
}

function isDecorative(element) {
  return (
    element.type === "sticker" ||
    element.type === "shape" ||
    element.opacity < 0.3
  );
}

function calculateOverlapArea(box1, box2) {
  const overlapX = Math.max(
    0,
    Math.min(box1.x2, box2.x2) - Math.max(box1.x1, box2.x1)
  );
  const overlapY = Math.max(
    0,
    Math.min(box1.y2, box2.y2) - Math.max(box1.y1, box2.y1)
  );
  return overlapX * overlapY;
}

// ==================== VALUE TILE RULES ====================

/**
 * Check value tile compliance
 * @param {Array} elements - Canvas elements
 * @param {Object} rules - Rules config
 * @returns {Array} Violations
 */
export function checkValueTiles(elements, rules) {
  const violations = [];
  const valueTiles = findValueTiles(elements);

  // Must have at least 1 value tile
  if (valueTiles.length === 0) {
    violations.push({
      type: "VALUE_TILES",
      severity: "error",
      message: "No value tile found. Every ad must have a value tile.",
      autoFixable: false, // Can't auto-create value tile
    });
    return violations;
  }

  // Check each value tile
  for (const tile of valueTiles) {
    // Check size (should be prominent)
    const fontSize = tile.fontSize || 16;
    if (fontSize < 24) {
      violations.push({
        type: "VALUE_TILES",
        severity: "warning",
        elementId: tile.id,
        message: `Value tile font size ${fontSize}px is too small (recommended 24px+)`,
        autoFixable: true,
        autoFix: {
          action: "resize",
          fontSize: 32,
          fontWeight: "bold",
        },
      });
    }

    // Check weight (should be bold)
    if (tile.fontWeight !== "bold" && !tile.bold) {
      violations.push({
        type: "VALUE_TILES",
        severity: "info",
        elementId: tile.id,
        message: "Value tile should be bold for emphasis",
        autoFixable: true,
        autoFix: {
          action: "style",
          fontWeight: "bold",
        },
      });
    }
  }

  return violations;
}

// ==================== PACKSHOT RULES ====================

/**
 * Check packshot compliance
 * @param {Array} elements - Canvas elements
 * @param {Object} rules - Rules config
 * @returns {Array} Violations
 */
export function checkPackshots(elements, rules) {
  const violations = [];
  const packshots = findPackshots(elements);
  const maxPackshots = rules.maxPackshots || 3;

  // Must have at least 1 packshot
  if (packshots.length === 0) {
    violations.push({
      type: "PACKSHOTS",
      severity: "warning",
      message: "No product packshot found",
      autoFixable: false,
    });
    return violations;
  }

  // Check max packshots
  if (packshots.length > maxPackshots) {
    violations.push({
      type: "PACKSHOTS",
      severity: "warning",
      message: `Too many packshots (${packshots.length} > ${maxPackshots})`,
      autoFixable: false,
    });
  }

  // Check lead packshot size
  const leadPackshot = findLargestPackshot(packshots);
  const area = leadPackshot.width * leadPackshot.height;
  const minArea = 15000; // Minimum area for visibility

  if (area < minArea) {
    violations.push({
      type: "PACKSHOTS",
      severity: "warning",
      elementId: leadPackshot.id,
      message: "Lead packshot may be too small for visibility",
      autoFixable: true,
      autoFix: {
        action: "resize",
        size: {
          width: Math.ceil(leadPackshot.width * 1.3),
          height: Math.ceil(leadPackshot.height * 1.3),
        },
      },
    });
  }

  return violations;
}

function findLargestPackshot(packshots) {
  return packshots.reduce((largest, ps) => {
    const psArea = ps.width * ps.height;
    const largestArea = largest.width * largest.height;
    return psArea > largestArea ? ps : largest;
  });
}

// ==================== CTA RULES ====================

/**
 * Check call-to-action compliance
 * @param {Array} elements - Canvas elements
 * @param {Object} rules - Rules config
 * @returns {Array} Violations
 */
export function checkCTA(elements, rules) {
  const violations = [];
  const ctas = findCTA(elements);

  if (ctas.length === 0) {
    violations.push({
      type: "CTA",
      severity: "info",
      message: 'No clear call-to-action found (e.g., "Shop Now", "Learn More")',
      autoFixable: false,
    });
  }

  // Check CTA clarity
  for (const cta of ctas) {
    const text = (cta.text || "").toLowerCase();

    // Check if text is clear enough
    if (text.length < 3) {
      violations.push({
        type: "CTA",
        severity: "info",
        elementId: cta.id,
        message: "CTA text is too short to be clear",
        autoFixable: false,
      });
    }
  }

  return violations;
}

// ==================== TAG RULES ====================

/**
 * Check Tesco tag compliance
 * @param {Array} elements - Canvas elements
 * @param {Object} rules - Rules config
 * @returns {Array} Violations
 */
export function checkTags(elements, rules) {
  const violations = [];
  const tags = findTags(elements);
  const requiredTags = rules.requiredTags || ["tesco"];

  // Must have at least one Tesco tag
  if (tags.length === 0) {
    violations.push({
      type: "MISSING_TAG",
      severity: "error",
      message: 'Missing Tesco brand tag (e.g., "Only at Tesco")',
      autoFixable: true,
      autoFix: {
        action: "addSticker",
        sticker: {
          type: "tesco-tag",
          src: "/assets/stickers/tesco-tag.png",
          position: "bottom-center",
        },
      },
    });
  }

  // Check tag visibility (size, contrast)
  for (const tag of tags) {
    if (tag.type === "text") {
      const fontSize = tag.fontSize || 16;
      if (fontSize < 14) {
        violations.push({
          type: "TAG",
          severity: "warning",
          elementId: tag.id,
          message: "Tesco tag text is too small",
          autoFixable: true,
          autoFix: {
            action: "resize",
            fontSize: 16,
          },
        });
      }
    }
  }

  return violations;
}

// ==================== KEYWORD RULES ====================

/**
 * Check for blocked keywords
 * @param {Array} elements - Canvas elements
 * @param {Object} rules - Rules config
 * @returns {Array} Violations
 */
export function checkKeywords(elements, rules) {
  const violations = [];
  const blockedKeywords = rules.blockedKeywords || [
    "win",
    "prize",
    "competition",
    "free delivery",
    "50% off",
    "% off",
  ];

  for (const element of elements) {
    if (element.type !== "text") continue;

    const text = (element.text || "").toLowerCase();

    for (const keyword of blockedKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        violations.push({
          type: "KEYWORDS",
          severity: "error",
          elementId: element.id,
          message: `Text contains blocked keyword: "${keyword}"`,
          autoFixable: false, // Can't auto-modify user content
        });
      }
    }
  }

  return violations;
}

// ==================== HEADLINE RULES ====================

/**
 * Check headline compliance
 * @param {Array} elements - Canvas elements
 * @param {Object} rules - Rules config
 * @returns {Array} Violations
 */
export function checkHeadline(elements, rules) {
  const violations = [];
  const minHeadlineSize = rules.headline?.minSize || 24;

  // Find potential headlines (large text)
  const headlines = elements.filter(
    (el) =>
      el.type === "text" &&
      (el.fontSize || 16) >= minHeadlineSize &&
      !isValueTile(el)
  );

  if (headlines.length === 0) {
    violations.push({
      type: "HEADLINE",
      severity: "warning",
      message: "No clear headline found",
      autoFixable: false,
    });
  }

  return violations;
}

function isValueTile(element) {
  const text = (element.text || "").toLowerCase();
  return /£\d+|clubcard|new/i.test(text);
}

// ==================== EXPORTS ====================

export default {
  checkFontSize,
  checkSafeZone,
  checkContrast,
  checkOverlaps,
  checkValueTiles,
  checkPackshots,
  checkCTA,
  checkTags,
  checkKeywords,
  checkHeadline,
};

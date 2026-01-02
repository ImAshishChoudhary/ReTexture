/**
 * Utility Functions - First Principles Implementation
 *
 * Pure utility functions for geometry, color, and canvas operations
 * No side effects, easy to test
 *
 * @module compliance/utils
 */

// ==================== GEOMETRY UTILITIES ====================

/**
 * Get bounding box of element
 * @param {Object} element - Canvas element
 * @returns {Object} Bounding box { x1, y1, x2, y2, width, height }
 */
export function getBoundingBox(element) {
  const x = element.x || 0;
  const y = element.y || 0;
  const width = element.width || 0;
  const height = element.height || 0;

  return {
    x1: x,
    y1: y,
    x2: x + width,
    y2: y + height,
    width,
    height,
  };
}

/**
 * Check if two bounding boxes overlap
 * @param {Object} box1 - First bounding box
 * @param {Object} box2 - Second bounding box
 * @returns {boolean} True if boxes overlap
 */
export function doBoxesOverlap(box1, box2) {
  return !(
    box1.x2 < box2.x1 ||
    box1.x1 > box2.x2 ||
    box1.y2 < box2.y1 ||
    box1.y1 > box2.y2
  );
}

/**
 * Calculate overlap area between two boxes
 * @param {Object} box1 - First bounding box
 * @param {Object} box2 - Second bounding box
 * @returns {number} Overlap area in pixels
 */
export function calculateOverlapArea(box1, box2) {
  if (!doBoxesOverlap(box1, box2)) return 0;

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

/**
 * Calculate distance between two points
 * @param {Object} p1 - First point { x, y }
 * @param {Object} p2 - Second point { x, y }
 * @returns {number} Distance in pixels
 */
export function calculateDistance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate center point of element
 * @param {Object} element - Canvas element
 * @returns {Object} Center point { x, y }
 */
export function calculateCenter(element) {
  return {
    x: (element.x || 0) + (element.width || 0) / 2,
    y: (element.y || 0) + (element.height || 0) / 2,
  };
}

/**
 * Check if point is inside bounding box
 * @param {Object} point - Point { x, y }
 * @param {Object} box - Bounding box
 * @returns {boolean} True if point is inside box
 */
export function isPointInBox(point, box) {
  return (
    point.x >= box.x1 &&
    point.x <= box.x2 &&
    point.y >= box.y1 &&
    point.y <= box.y2
  );
}

/**
 * Calculate area of bounding box
 * @param {Object} box - Bounding box
 * @returns {number} Area in pixels
 */
export function calculateArea(box) {
  return (box.x2 - box.x1) * (box.y2 - box.y1);
}

// ==================== COLOR UTILITIES ====================

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color (e.g., "#FF5733")
 * @returns {Object|null} RGB object { r, g, b } or null if invalid
 */
export function hexToRgb(hex) {
  // Remove # if present
  hex = hex.replace("#", "");

  // Handle 3-digit hex
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to hex color
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} Hex color
 */
export function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculate relative luminance (WCAG formula)
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {number} Relative luminance (0-1)
 */
export function calculateLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate WCAG contrast ratio between two colors
 * @param {string} color1 - First color (hex)
 * @param {string} color2 - Second color (hex)
 * @returns {number} Contrast ratio (1-21)
 */
export function getContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 1;

  const lum1 = calculateLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = calculateLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color is light or dark using PROPER WCAG luminance
 * @param {string} hex - Hex color
 * @returns {boolean} True if light, false if dark
 */
export function isLightColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;

  // Use PROPER WCAG 2.1 luminance calculation, not simple weighted average
  const luminance = calculateLuminance(rgb.r, rgb.g, rgb.b);

  // Threshold of 0.5 is appropriate for WCAG luminance (range 0-1)
  return luminance > 0.5;
}

/**
 * Get optimal contrasting color (black or white) based on ACTUAL contrast ratios
 * FIRST PRINCIPLE: Don't use threshold - calculate actual ratios!
 * @param {string} hex - Background hex color
 * @returns {string} Contrasting color (#000000 or #ffffff)
 */
export function getContrastingColor(hex) {
  // Calculate ACTUAL contrast ratios for both options
  const whiteRatio = getContrastRatio("#ffffff", hex);
  const blackRatio = getContrastRatio("#000000", hex);

  // Return the color with BETTER contrast
  return whiteRatio > blackRatio ? "#ffffff" : "#000000";
}

/**
 * Lighten color by percentage
 * @param {string} hex - Hex color
 * @param {number} percent - Percentage to lighten (0-100)
 * @returns {string} Lightened hex color
 */
export function lightenColor(hex, percent) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const amount = Math.floor((percent / 100) * 255);

  return rgbToHex(
    Math.min(255, rgb.r + amount),
    Math.min(255, rgb.g + amount),
    Math.min(255, rgb.b + amount)
  );
}

/**
 * Darken color by percentage
 * @param {string} hex - Hex color
 * @param {number} percent - Percentage to darken (0-100)
 * @returns {string} Darkened hex color
 */
export function darkenColor(hex, percent) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const amount = Math.floor((percent / 100) * 255);

  return rgbToHex(
    Math.max(0, rgb.r - amount),
    Math.max(0, rgb.g - amount),
    Math.max(0, rgb.b - amount)
  );
}

// ==================== CANVAS UTILITIES ====================

/**
 * Find conflicts between elements (overlaps, proximity issues)
 * @param {Array} elements - Canvas elements
 * @param {number} threshold - Distance threshold for conflicts (default: 10px)
 * @returns {Array} List of conflicts
 */
export function findConflicts(elements, threshold = 10) {
  const conflicts = [];

  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const el1 = elements[i];
      const el2 = elements[j];

      const box1 = getBoundingBox(el1);
      const box2 = getBoundingBox(el2);

      // Check overlap
      if (doBoxesOverlap(box1, box2)) {
        const overlapArea = calculateOverlapArea(box1, box2);
        conflicts.push({
          type: "overlap",
          elements: [el1.id, el2.id],
          severity: overlapArea > 1000 ? "high" : "medium",
          data: { overlapArea },
        });
      }

      // Check proximity (too close but not overlapping)
      const center1 = calculateCenter(el1);
      const center2 = calculateCenter(el2);
      const distance = calculateDistance(center1, center2);

      if (distance < threshold && !doBoxesOverlap(box1, box2)) {
        conflicts.push({
          type: "proximity",
          elements: [el1.id, el2.id],
          severity: "low",
          data: { distance },
        });
      }
    }
  }

  return conflicts;
}

/**
 * Find available space on canvas
 * @param {Object} canvas - Canvas state
 * @param {Object} requiredSize - Required size { width, height }
 * @returns {Array} Available positions { x, y, score }
 */
export function findAvailableSpace(canvas, requiredSize) {
  const canvasSize = {
    w: canvas.width || 1080,
    h: canvas.height || 1920,
  };

  const page = canvas.pages?.[0];
  const elements = page?.children || [];

  const availableSpaces = [];
  const gridSize = 20; // Check every 20px

  // Scan canvas in grid
  for (let y = 0; y < canvasSize.h - requiredSize.height; y += gridSize) {
    for (let x = 0; x < canvasSize.w - requiredSize.width; x += gridSize) {
      const testBox = {
        x1: x,
        y1: y,
        x2: x + requiredSize.width,
        y2: y + requiredSize.height,
      };

      // Check if space is free
      const hasOverlap = elements.some((el) => {
        const elBox = getBoundingBox(el);
        return doBoxesOverlap(testBox, elBox);
      });

      if (!hasOverlap) {
        // Calculate score (prefer center, avoid edges)
        const centerX = canvasSize.w / 2;
        const centerY = canvasSize.h / 2;
        const distToCenter = calculateDistance(
          { x: x + requiredSize.width / 2, y: y + requiredSize.height / 2 },
          { x: centerX, y: centerY }
        );

        const score = 1000 - distToCenter; // Higher score = closer to center

        availableSpaces.push({ x, y, score });
      }
    }
  }

  // Sort by score (best positions first)
  return availableSpaces.sort((a, b) => b.score - a.score);
}

/**
 * Sort elements by z-index (layer order)
 * @param {Array} elements - Canvas elements
 * @returns {Array} Sorted elements
 */
export function sortByZIndex(elements) {
  return [...elements].sort((a, b) => {
    const zIndexA = a.zIndex || 0;
    const zIndexB = b.zIndex || 0;
    return zIndexA - zIndexB;
  });
}

/**
 * Group elements by layer
 * @param {Array} elements - Canvas elements
 * @returns {Object} Elements grouped by layer { background, content, foreground }
 */
export function groupByLayer(elements) {
  return {
    background: elements.filter((el) => (el.zIndex || 0) < 0),
    content: elements.filter((el) => (el.zIndex || 0) === 0),
    foreground: elements.filter((el) => (el.zIndex || 0) > 0),
  };
}

// ==================== VALIDATION UTILITIES ====================

/**
 * Validate element structure
 * @param {Object} element - Canvas element
 * @returns {Object} Validation result { valid, errors }
 */
export function validateElement(element) {
  const errors = [];

  if (!element.id) {
    errors.push("Element missing id");
  }

  if (!element.type) {
    errors.push("Element missing type");
  }

  if (element.x === undefined || element.y === undefined) {
    errors.push("Element missing position (x, y)");
  }

  if (element.type === "text" && !element.text) {
    errors.push("Text element missing text content");
  }

  if (element.type === "image" && !element.src) {
    errors.push("Image element missing src");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Deep clone object (immutability helper)
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Deep merge objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
export function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

// ==================== TEXT UTILITIES ====================

/**
 * Truncate text to max length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix for truncated text (default: '...')
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength, suffix = "...") {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength - suffix.length) + suffix;
}

/**
 * Count words in text
 * @param {string} text - Text to count
 * @returns {number} Word count
 */
export function countWords(text) {
  return text.trim().split(/\s+/).length;
}

/**
 * Estimate text width (approximate)
 * @param {string} text - Text content
 * @param {number} fontSize - Font size in pixels
 * @returns {number} Estimated width in pixels
 */
export function estimateTextWidth(text, fontSize) {
  // Rough approximation: average character width is ~0.6 of font size
  return text.length * fontSize * 0.6;
}

// ==================== MATH UTILITIES ====================

/**
 * Clamp value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Map value from one range to another
 * @param {number} value - Input value
 * @param {number} inMin - Input range min
 * @param {number} inMax - Input range max
 * @param {number} outMin - Output range min
 * @param {number} outMax - Output range max
 * @returns {number} Mapped value
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

// ==================== EXPORTS ====================

export default {
  // Geometry
  getBoundingBox,
  doBoxesOverlap,
  calculateOverlapArea,
  calculateDistance,
  calculateCenter,
  isPointInBox,
  calculateArea,

  // Color
  hexToRgb,
  rgbToHex,
  calculateLuminance,
  getContrastRatio,
  isLightColor,
  getContrastingColor,
  lightenColor,
  darkenColor,

  // Canvas
  findConflicts,
  findAvailableSpace,
  sortByZIndex,
  groupByLayer,

  // Validation
  validateElement,
  deepClone,
  deepMerge,

  // Text
  truncateText,
  countWords,
  estimateTextWidth,

  // Math
  clamp,
  lerp,
  mapRange,
};

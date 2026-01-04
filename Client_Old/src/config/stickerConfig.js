/**
 * Sticker Library Configuration
 * Defines all available stickers with metadata for compliance and positioning
 */

export const STICKER_CATEGORIES = {
  LEGAL: "legal",
  TAGS: "tags",
  PROMOS: "promos",
  CLUBCARD: "clubcard",
};

export const STICKERS = [
  // Legal - Required for alcohol campaigns
  {
    id: "drinkaware",
    name: "Drinkaware Logo",
    category: STICKER_CATEGORIES.LEGAL,
    src: "/src/assets/drinkaware-logo.png",
    description: "Required for all alcohol-related campaigns",
    defaultSize: { width: 80, height: 60 },
    minSize: { width: 40, height: 30 },
    maxSize: { width: 150, height: 112 },
    compliance: {
      satisfiesRule: "MISSING_DRINKAWARE",
      required: "alcohol",
      minHeight: 20,
    },
    positioning: {
      preferredZones: ["bottom-right", "bottom-left"],
      avoidCenter: true,
      safeZoneCompliant: true,
    },
  },

  // Tags - Brand attribution
  {
    id: "available-at-tesco",
    name: "Available at Tesco",
    category: STICKER_CATEGORIES.TAGS,
    src: "/src/assets/stickers/available-at-tesco.png",
    description: "Standard Tesco brand tag",
    defaultSize: { width: 1000, height: 250 },
    minSize: { width: 200, height: 40 },
    maxSize: { width: 375, height: 150 },
    compliance: {
      satisfiesRule: "MISSING_TAG",
      required: true,
      minHeight: 20,
    },
    positioning: {
      preferredZones: ["bottom-left", "bottom-right", "top-left"],
      avoidCenter: true,
      safeZoneCompliant: true,
    },
  },

  {
    id: "only-at-tesco",
    name: "Only at Tesco",
    category: STICKER_CATEGORIES.TAGS,
    src: "/src/assets/stickers/only-at-tesco.png",
    description: "Exclusive product tag",
    defaultSize: { width: 624, height: 250 },
    minSize: { width: 200, height: 40 },
    maxSize: { width: 750, height: 300 },
    compliance: {
      satisfiesRule: "MISSING_TAG",
      required: true,
      minHeight: 20,
    },
    positioning: {
      preferredZones: ["bottom-left", "bottom-right", "top-left"],
      avoidCenter: true,
      safeZoneCompliant: true,
    },
  },

  // Clubcard - Promotional
  {
    id: "clubcard-badge",
    name: "Clubcard Badge",
    category: STICKER_CATEGORIES.CLUBCARD,
    src: "/src/assets/stickers/clubcard-badge.png",
    description: "Clubcard promotional badge",
    defaultSize: { width: 100, height: 100 },
    minSize: { width: 70, height: 70 },
    maxSize: { width: 150, height: 150 },
    compliance: {
      satisfiesRule: null,
      required: false,
    },
    positioning: {
      preferredZones: ["top-right", "top-left"],
      avoidCenter: false,
      safeZoneCompliant: true,
    },
    editable: true, // Future: can add date/price
    editableFields: ["date", "price"],
  },
];

/**
 * Get sticker by ID
 */
export const getStickerById = (id) => {
  return STICKERS.find((s) => s.id === id);
};

/**
 * Get stickers by category
 */
export const getStickersByCategory = (category) => {
  return STICKERS.filter((s) => s.category === category);
};

/**
 * Get required stickers for compliance
 */
export const getRequiredStickers = (options = {}) => {
  const { isAlcohol = false } = options;

  return STICKERS.filter((s) => {
    if (s.compliance.required === true) return true;
    if (s.compliance.required === "alcohol" && isAlcohol) return true;
    return false;
  });
};

/**
 * Calculate optimal sticker size based on canvas dimensions
 * Maintains aspect ratio - no compression
 * Target: 1000px width with max 10% of canvas width constraint
 */
export const calculateStickerSize = (sticker, canvasSize) => {
  console.log("[SIZE_CALC] 📏 Calculating sticker size");
  console.log(`[SIZE_CALC] Sticker: ${sticker.name}`);
  console.log(`[SIZE_CALC] Default size:`, sticker.defaultSize);
  console.log(`[SIZE_CALC] Canvas size:`, canvasSize);

  const { w, h } = canvasSize;

  // Calculate aspect ratio of the sticker
  const aspectRatio = sticker.defaultSize.width / sticker.defaultSize.height;
  console.log(`[SIZE_CALC] Aspect ratio: ${aspectRatio.toFixed(2)}`);

  // Target size: 10000px width, but respect canvas constraints
  // Maximum allowed: 100% of canvas width (10x larger than before)
  const maxAllowedWidth = w * 1.0; // 100% of canvas width
  const targetWidth = 10000; // Desired 10000px width

  console.log(`[SIZE_CALC] Target width: ${targetWidth}px`);
  console.log(
    `[SIZE_CALC] Max allowed (100% of canvas): ${maxAllowedWidth.toFixed(0)}px`
  );

  // Use smaller of targetWidth or maxAllowedWidth
  let width = Math.min(targetWidth, maxAllowedWidth);
  console.log(`[SIZE_CALC] Initial width: ${width.toFixed(0)}px`);

  // Clamp width to min/max
  width = Math.max(
    sticker.minSize.width,
    Math.min(width, sticker.maxSize.width)
  );

  // Calculate height based on aspect ratio (no independent scaling)
  let height = width / aspectRatio;

  // If height exceeds max, scale down proportionally
  if (height > sticker.maxSize.height) {
    height = sticker.maxSize.height;
    width = height * aspectRatio;
  }

  // If height is below min, scale up proportionally
  if (height < sticker.minSize.height) {
    height = sticker.minSize.height;
    width = height * aspectRatio;
  }

  const finalSize = {
    width: Math.round(width),
    height: Math.round(height),
  };

  console.log(`[SIZE_CALC] ✅ Final size:`, finalSize);
  console.log(
    `[SIZE_CALC] Final size as % of canvas width: ${(
      (finalSize.width / w) *
      100
    ).toFixed(1)}%`
  );

  return finalSize;
};

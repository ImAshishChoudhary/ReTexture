/**
 * Sticker Library Configuration
 * Defines all available stickers with metadata for compliance and positioning
 */

export const STICKER_CATEGORIES = {
  LEGAL: "legal",
  TAGS: "tags",
  PROMOS: "promos",
  CLUBCARD: "clubcard",
} as const;

export type StickerCategory = (typeof STICKER_CATEGORIES)[keyof typeof STICKER_CATEGORIES];

export interface StickerSize {
  width: number;
  height: number;
}

export interface StickerPositioning {
  preferredZones: string[];
  avoidCenter: boolean;
  safeZoneCompliant: boolean;
}

export interface StickerCompliance {
  satisfiesRule: string | null;
  required: boolean | string;
  minHeight?: number;
}

export interface StickerConfig {
  id: string;
  name: string;
  category: StickerCategory;
  src: string;
  description: string;
  defaultSize: StickerSize;
  minSize: StickerSize;
  maxSize: StickerSize;
  compliance: StickerCompliance;
  positioning: StickerPositioning;
  editable?: boolean;
  editableFields?: string[];
}

export const STICKERS: StickerConfig[] = [
  // Legal - Required for alcohol campaigns
  {
    id: "drinkaware",
    name: "Drinkaware Logo",
    category: STICKER_CATEGORIES.LEGAL,
    src: "/stickers/drinkaware-logo.png",
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
    src: "/stickers/available-at-tesco.png",
    description: "Standard Tesco brand tag",
    defaultSize: { width: 350, height: 70 },
    minSize: { width: 200, height: 40 },
    maxSize: { width: 500, height: 100 },
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
    src: "/stickers/only-at-tesco.png",
    description: "Exclusive product tag",
    defaultSize: { width: 320, height: 70 },
    minSize: { width: 180, height: 40 },
    maxSize: { width: 480, height: 100 },
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
    src: "/stickers/clubcard-badge.png",
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
    editable: true,
    editableFields: ["date", "price"],
  },

  // Promos
  {
    id: "sale-badge",
    name: "Sale Badge",
    category: STICKER_CATEGORIES.PROMOS,
    src: "/stickers/sale-badge.png",
    description: "Sale promotional badge",
    defaultSize: { width: 120, height: 120 },
    minSize: { width: 80, height: 80 },
    maxSize: { width: 180, height: 180 },
    compliance: {
      satisfiesRule: null,
      required: false,
    },
    positioning: {
      preferredZones: ["top-right", "top-left"],
      avoidCenter: false,
      safeZoneCompliant: true,
    },
  },

  {
    id: "new-badge",
    name: "New Badge",
    category: STICKER_CATEGORIES.PROMOS,
    src: "/stickers/new-badge.png",
    description: "New product badge",
    defaultSize: { width: 100, height: 100 },
    minSize: { width: 60, height: 60 },
    maxSize: { width: 150, height: 150 },
    compliance: {
      satisfiesRule: null,
      required: false,
    },
    positioning: {
      preferredZones: ["top-left", "top-right"],
      avoidCenter: false,
      safeZoneCompliant: true,
    },
  },
];

// Helper functions
export function getStickerById(id: string): StickerConfig | undefined {
  return STICKERS.find((s) => s.id === id);
}

export function getStickersByCategory(category: StickerCategory): StickerConfig[] {
  return STICKERS.filter((s) => s.category === category);
}

export function getRequiredStickers(campaignType?: string): StickerConfig[] {
  return STICKERS.filter((s) => {
    if (s.compliance.required === true) return true;
    if (s.compliance.required === campaignType) return true;
    return false;
  });
}

export function getStickerForRule(ruleId: string): StickerConfig | undefined {
  return STICKERS.find((s) => s.compliance.satisfiesRule === ruleId);
}

// Calculate sticker size based on canvas dimensions
export function calculateStickerSize(
  sticker: StickerConfig,
  canvasWidth: number,
  canvasHeight: number
): StickerSize {
  const scaleFactor = canvasWidth / 1080; // Base on 1080px width
  
  return {
    width: Math.round(sticker.defaultSize.width * scaleFactor),
    height: Math.round(sticker.defaultSize.height * scaleFactor),
  };
}

// Category labels for UI
export const CATEGORY_LABELS: Record<StickerCategory, string> = {
  [STICKER_CATEGORIES.LEGAL]: "Legal",
  [STICKER_CATEGORIES.TAGS]: "Tags",
  [STICKER_CATEGORIES.PROMOS]: "Promos",
  [STICKER_CATEGORIES.CLUBCARD]: "Clubcard",
};

// Category icons for UI
export const CATEGORY_ICONS: Record<StickerCategory, string> = {
  [STICKER_CATEGORIES.LEGAL]: "⚖️",
  [STICKER_CATEGORIES.TAGS]: "🏷️",
  [STICKER_CATEGORIES.PROMOS]: "🎉",
  [STICKER_CATEGORIES.CLUBCARD]: "💳",
};

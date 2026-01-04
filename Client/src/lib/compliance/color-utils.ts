/**
 * Color Utilities for WCAG and APCA Contrast Checking
 */

/**
 * Parse color string to RGB
 */
export function parseColor(color: string): { r: number; g: number; b: number } | null {
  if (!color) return null;

  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
    };
  }

  // Handle named colors (basic)
  const namedColors: Record<string, { r: number; g: number; b: number }> = {
    white: { r: 255, g: 255, b: 255 },
    black: { r: 0, g: 0, b: 0 },
    red: { r: 255, g: 0, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    green: { r: 0, g: 128, b: 0 },
  };

  return namedColors[color.toLowerCase()] || null;
}

/**
 * Calculate relative luminance (WCAG 2.1)
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate WCAG 2.1 contrast ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);

  if (!rgb1 || !rgb2) return 1;

  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculate APCA contrast (Lc value)
 * Based on APCA-W3 algorithm
 */
export function getAPCAContrast(textColor: string, bgColor: string): number {
  const text = parseColor(textColor);
  const bg = parseColor(bgColor);

  if (!text || !bg) return 0;

  // Linearize sRGB
  const linearize = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  // Calculate Y (luminance)
  const Ytext = 0.2126 * linearize(text.r) + 0.7152 * linearize(text.g) + 0.0722 * linearize(text.b);
  const Ybg = 0.2126 * linearize(bg.r) + 0.7152 * linearize(bg.g) + 0.0722 * linearize(bg.b);

  // APCA constants
  const Ntx = 0.57;
  const Nbg = 0.56;
  const Rtx = 0.62;
  const Rbg = 0.65;

  // Calculate contrast
  let Sapc: number;
  if (Ybg > Ytext) {
    // Light background
    Sapc = (Math.pow(Ybg, Nbg) - Math.pow(Ytext, Ntx)) * 1.14;
  } else {
    // Dark background
    Sapc = (Math.pow(Ybg, Rbg) - Math.pow(Ytext, Rtx)) * 1.14;
  }

  // Scale to Lc (perceptual lightness contrast)
  const Lc = Sapc * 100;
  return Math.round(Lc * 10) / 10;
}

/**
 * Check WCAG contrast compliance
 */
export function checkWCAGContrast(
  textColor: string,
  bgColor: string,
  context: { fontSize: number; fontWeight: number }
): { passes: boolean; contrast: number; required: number } {
  const contrast = getContrastRatio(textColor, bgColor);
  const isLargeText = context.fontSize >= 18 || (context.fontSize >= 14 && context.fontWeight >= 700);
  const required = isLargeText ? 3.0 : 4.5;

  return {
    passes: contrast >= required,
    contrast: Math.round(contrast * 100) / 100,
    required,
  };
}

/**
 * Check APCA contrast compliance
 */
export function checkAPCAContrast(
  textColor: string,
  bgColor: string,
  context: { fontSize: number; fontWeight: number; usage?: 'body' | 'heading' | 'decorative' }
): { passes: boolean; contrast: number; required: number } {
  const contrast = Math.abs(getAPCAContrast(textColor, bgColor));
  
  let required: number;
  if (context.usage === 'heading' || context.fontSize >= 24) {
    required = 45;
  } else if (context.usage === 'decorative' || context.fontSize >= 36) {
    required = 30;
  } else {
    required = 60;
  }

  return {
    passes: contrast >= required,
    contrast,
    required,
  };
}

/**
 * Suggest accessible color based on background
 */
export function suggestAccessibleColor(
  bgColor: string,
  context: { fontSize: number; fontWeight: number }
): { color: string; contrast: number } {
  const bg = parseColor(bgColor);
  if (!bg) return { color: '#000000', contrast: 0 };

  const bgLuminance = getLuminance(bg.r, bg.g, bg.b);
  
  // Try white and black, pick the one with better contrast
  const whiteContrast = getContrastRatio('#ffffff', bgColor);
  const blackContrast = getContrastRatio('#000000', bgColor);

  if (whiteContrast > blackContrast) {
    return { color: '#ffffff', contrast: whiteContrast };
  }
  return { color: '#000000', contrast: blackContrast };
}

/**
 * Check if color is dark
 */
export function isDarkColor(color: string): boolean {
  const rgb = parseColor(color);
  if (!rgb) return false;
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance < 0.5;
}

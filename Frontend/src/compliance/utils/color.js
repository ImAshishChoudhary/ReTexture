/**
 * Color Utility Module
 * Provides both WCAG 2.1 and APCA (WCAG 3.0) contrast calculations
 * 
 * WCAG 2.1: Legacy standard for legal compliance
 * APCA: Modern perceptual contrast algorithm (more accurate)
 */

import { APCAcontrast } from 'apca-w3';

// ============================================================================
// WCAG 2.1 FUNCTIONS (Legacy - for legal compliance)
// ============================================================================

/**
 * Convert hex color to RGB array
 * @param {string} hex - Hex color code (e.g., "#FF5733")
 * @returns {number[]} RGB array [r, g, b]
 */
export function hexToRgb(hex) {
  if (!hex) return [0, 0, 0];
  
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  
  return [r, g, b];
}

/**
 * Calculate relative luminance (WCAG 2.1 formula)
 * @param {string} hex - Hex color code
 * @returns {number} Luminance value (0-1)
 */
export function getLuminance(hex) {
  const rgb = hexToRgb(hex).map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/**
 * Calculate WCAG 2.1 contrast ratio
 * @param {string} color1 - Foreground color (hex)
 * @param {string} color2 - Background color (hex)
 * @returns {number} Contrast ratio (1-21)
 */
export function getContrastRatio(color1, color2) {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// ============================================================================
// APCA FUNCTIONS (WCAG 3.0 - Recommended)
// ============================================================================

/**
 * Calculate APCA contrast (perceptually uniform)
 * @param {string} textColor - Text color (hex)
 * @param {string} bgColor - Background color (hex)
 * @returns {number} Lightness Contrast (Lc) value (0-100+)
 */
export function getAPCAContrast(textColor, bgColor) {
  try {
    const Lc = APCAcontrast(textColor, bgColor);
    return Math.abs(Lc);
  } catch (error) {
    console.error('[APCA] Calculation error:', error);
    // Fallback to WCAG 2.1 if APCA fails
    const wcagRatio = getContrastRatio(textColor, bgColor);
    // Approximate conversion: WCAG 4.5:1 ≈ APCA 60Lc
    return wcagRatio * 13.3;
  }
}

/**
 * Get minimum APCA Lc threshold based on context
 * Context-aware: considers font size, weight, and usage
 * 
 * @param {Object} context - Text context
 * @param {number} context.fontSize - Font size in pixels
 * @param {number|string} context.fontWeight - Font weight (400, 700, "bold", etc.)
 * @param {string} context.usage - Usage type: 'body', 'heading', 'ui', 'large'
 * @returns {number} Minimum Lc value required
 */
export function getAPCAThreshold(context = {}) {
  const { 
    fontSize = 16, 
    fontWeight = 400,
    usage = 'body'
  } = context;
  
  // Normalize font weight
  const weight = typeof fontWeight === 'string' && fontWeight === 'bold' 
    ? 700 
    : parseInt(fontWeight) || 400;
  
  // APCA threshold table (based on WCAG 3.0 research)
  // Higher Lc = better contrast required
  
  // Body text (most common use case)
  if (usage === 'body' || fontSize < 24) {
    if (weight >= 700) return 60;  // Bold text
    return 75;  // Regular body text
  }
  
  // Large text
  if (usage === 'heading' || fontSize >= 24) {
    if (weight >= 700) return 45;  // Large bold headings
    return 60;  // Large regular headings
  }
  
  // UI components (buttons, labels, etc.)
  if (usage === 'ui') {
    return 45;
  }
  
  // Default fallback
  return 60;
}

/**
 * Check if colors meet APCA contrast requirements
 * @param {string} textColor - Text color (hex)
 * @param {string} bgColor - Background color (hex)
 * @param {Object} context - Text context (fontSize, fontWeight, usage)
 * @returns {Object} Result with passes, contrast, and required threshold
 */
export function checkAPCAContrast(textColor, bgColor, context = {}) {
  const contrast = getAPCAContrast(textColor, bgColor);
  const required = getAPCAThreshold(context);
  
  return {
    passes: contrast >= required,
    contrast: Math.round(contrast * 10) / 10,  // Round to 1 decimal
    required,
    algorithm: 'APCA'
  };
}

/**
 * Check if colors meet WCAG 2.1 contrast requirements (legacy)
 * @param {string} textColor - Text color (hex)
 * @param {string} bgColor - Background color (hex)
 * @param {Object} context - Text context (fontSize only for WCAG)
 * @returns {Object} Result with passes, contrast, and required threshold
 */
export function checkWCAGContrast(textColor, bgColor, context = {}) {
  const { fontSize = 16 } = context;
  const ratio = getContrastRatio(textColor, bgColor);
  const required = fontSize >= 18 ? 3 : 4.5;  // WCAG AA standard
  
  return {
    passes: ratio >= required,
    contrast: Math.round(ratio * 10) / 10,
    required,
    algorithm: 'WCAG 2.1'
  };
}

/**
 * Comprehensive contrast check (both APCA and WCAG 2.1)
 * @param {string} textColor - Text color (hex)
 * @param {string} bgColor - Background color (hex)
 * @param {Object} context - Text context
 * @returns {Object} Combined results from both algorithms
 */
export function checkContrast(textColor, bgColor, context = {}) {
  const apca = checkAPCAContrast(textColor, bgColor, context);
  const wcag = checkWCAGContrast(textColor, bgColor, context);
  
  return {
    apca,
    wcag,
    // Prefer APCA, but fall back to WCAG for legal compliance
    recommended: apca.passes ? 'APCA' : (wcag.passes ? 'WCAG (cautious)' : 'FAIL'),
    overallPass: apca.passes || wcag.passes  // Pass if either passes (defensive)
  };
}

/**
 * Suggest accessible color (APCA-optimized)
 * Finds the best text color (white or black) for given background
 * 
 * @param {string} bgColor - Background color (hex)
 * @param {Object} context - Text context
 * @returns {Object} Suggested color with contrast info
 */
export function suggestAccessibleColor(bgColor, context = {}) {
  const whiteCheck = checkAPCAContrast('#ffffff', bgColor, context);
  const blackCheck = checkAPCAContrast('#000000', bgColor, context);
  
  // Prefer the one with higher contrast
  const useWhite = whiteCheck.contrast > blackCheck.contrast;
  
  return {
    color: useWhite ? '#ffffff' : '#000000',
    contrast: useWhite ? whiteCheck.contrast : blackCheck.contrast,
    passes: useWhite ? whiteCheck.passes : blackCheck.passes,
    algorithm: 'APCA'
  };
}

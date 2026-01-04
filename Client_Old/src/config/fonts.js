/**
 * Tesco Brand-Compliant Font Configuration
 * 
 * These fonts are web-safe alternatives that match Tesco's brand aesthetic.
 * Official Tesco Bold by Dalton Maag is not publicly available.
 */

// Google Fonts CDN imports (add to index.html or load dynamically)
export const FONT_IMPORTS = [
  'Inter:wght@400;500;600;700;800',
  'Montserrat:wght@500;600;700;800',
  'Open+Sans:wght@400;500;600;700',
  'Nunito:wght@500;600;700;800',
  'Poppins:wght@400;500;600;700',
];

/**
 * Font families with their use cases and weights
 */
export const FONT_FAMILIES = {
  inter: {
    name: 'Inter',
    fallback: 'Arial, sans-serif',
    mood: ['modern', 'clean', 'professional'],
    weights: { regular: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800 },
  },
  montserrat: {
    name: 'Montserrat',
    fallback: 'Arial, sans-serif',
    mood: ['bold', 'premium', 'strong'],
    weights: { medium: 500, semibold: 600, bold: 700, extrabold: 800 },
  },
  openSans: {
    name: 'Open Sans',
    fallback: 'Arial, sans-serif',
    mood: ['friendly', 'approachable', 'everyday'],
    weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  },
  nunito: {
    name: 'Nunito',
    fallback: 'Arial, sans-serif',
    mood: ['playful', 'family', 'soft'],
    weights: { medium: 500, semibold: 600, bold: 700, extrabold: 800 },
  },
  poppins: {
    name: 'Poppins',
    fallback: 'Arial, sans-serif',
    mood: ['contemporary', 'geometric', 'fresh'],
    weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  },
};

/**
 * Mood-to-Font mapping for AI recommendations
 */
export const MOOD_FONT_MAP = {
  premium: { font: 'montserrat', weight: 'bold', letterSpacing: 'wide' },
  modern: { font: 'inter', weight: 'semibold', letterSpacing: 'normal' },
  playful: { font: 'nunito', weight: 'bold', letterSpacing: 'normal' },
  family: { font: 'openSans', weight: 'semibold', letterSpacing: 'normal' },
  fresh: { font: 'poppins', weight: 'medium', letterSpacing: 'tight' },
  bold: { font: 'montserrat', weight: 'extrabold', letterSpacing: 'wide' },
  clean: { font: 'inter', weight: 'medium', letterSpacing: 'normal' },
  everyday: { font: 'openSans', weight: 'regular', letterSpacing: 'normal' },
};

/**
 * Letter spacing presets
 */
export const LETTER_SPACING = {
  tight: '-0.02em',
  normal: '0',
  wide: '0.05em',
  extraWide: '0.1em',
};

/**
 * Text transform options
 */
export const TEXT_TRANSFORM = {
  normal: 'none',
  uppercase: 'uppercase',
  capitalize: 'capitalize',
  lowercase: 'lowercase',
};

/**
 * Default font styling for headlines and subheadings
 */
export const DEFAULT_STYLES = {
  headline: {
    fontFamily: 'Inter',
    fontWeight: 700,
    letterSpacing: '0',
    textTransform: 'none',
  },
  subheading: {
    fontFamily: 'Open Sans',
    fontWeight: 500,
    letterSpacing: '0',
    textTransform: 'none',
  },
};

/**
 * Get font stack (font-family CSS value)
 * @param {string} fontKey - Key from FONT_FAMILIES
 * @returns {string} CSS font-family value
 */
export function getFontStack(fontKey) {
  const font = FONT_FAMILIES[fontKey];
  if (!font) return 'Arial, sans-serif';
  return `"${font.name}", ${font.fallback}`;
}

/**
 * Get font weight value
 * @param {string} fontKey - Key from FONT_FAMILIES
 * @param {string} weightName - Weight name (regular, medium, semibold, bold, extrabold)
 * @returns {number} Font weight value
 */
export function getFontWeight(fontKey, weightName) {
  const font = FONT_FAMILIES[fontKey];
  if (!font) return 600;
  return font.weights[weightName] || 600;
}

/**
 * Build complete font style object from AI recommendation
 * @param {Object} recommendation - { font, weight, letterSpacing, textTransform }
 * @returns {Object} CSS-ready style object
 */
export function buildFontStyle(recommendation) {
  const { font = 'inter', weight = 'semibold', letterSpacing = 'normal', textTransform = 'normal' } = recommendation;
  
  return {
    fontFamily: getFontStack(font),
    fontWeight: getFontWeight(font, weight),
    letterSpacing: LETTER_SPACING[letterSpacing] || '0',
    textTransform: TEXT_TRANSFORM[textTransform] || 'none',
  };
}

/**
 * Get styling from mood (fallback if API fails)
 * @param {string} mood - Mood identifier
 * @param {boolean} isSubheading - Whether this is for subheading
 * @returns {Object} Font style object
 */
export function getStyleFromMood(mood, isSubheading = false) {
  const mapping = MOOD_FONT_MAP[mood] || MOOD_FONT_MAP.modern;
  const style = buildFontStyle(mapping);
  
  // Adjust for subheadings
  if (isSubheading) {
    style.fontWeight = Math.max(400, style.fontWeight - 100);
    style.letterSpacing = '0';
  }
  
  return style;
}

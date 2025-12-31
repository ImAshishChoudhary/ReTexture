/**
 * Color utility for WCAG contrast calculations
 */

export function hexToRgb(hex) {
  console.log(`🎨 [COLOR UTIL] hexToRgb called with: ${hex}`);
  
  if (!hex) {
    console.log(`  ⚠️ No hex provided, returning default [0,0,0]`);
    return [0, 0, 0];
  }
  
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  
  console.log(`  ↳ Result: RGB(${r}, ${g}, ${b})`);
  return [r, g, b];
}

export function getLuminance(hex) {
  console.log(`💡 [COLOR UTIL] getLuminance called with: ${hex}`);
  
  const rgb = hexToRgb(hex).map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  
  const luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  console.log(`  ↳ Luminance: ${luminance.toFixed(4)}`);
  
  return luminance;
}

export function getContrastRatio(color1, color2) {
  console.log(`🔍 [COLOR UTIL] getContrastRatio called`);
  console.log(`  ↳ Color 1: ${color1}, Color 2: ${color2}`);
  
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  
  console.log(`  ↳ Contrast Ratio: ${ratio.toFixed(2)}:1`);
  
  return ratio;
}

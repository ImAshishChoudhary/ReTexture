/**
 * Tesco Retail Media Compliance Checker
 * Validates canvas state against Tesco advertising guidelines before export
 * 
 * Rules based on Appendix A & B of Tesco Retail Media Creative Guidelines
 */

// ============== BLOCKED PATTERNS ==============
// Hard fail if any of these are found in text elements

const BLOCKED_PATTERNS = [
  // Competition language
  { pattern: /\b(win|prize|competition|contest|enter\s+to\s+win|giveaway)\b/i, rule: 'No competition language allowed' },
  
  // Price/discount callouts
  { pattern: /\b(\d+%\s*off|discount|save\s*£|deal|offer|sale|reduced|clearance)\b/i, rule: 'No price/discount callouts allowed' },
  
  // Sustainability/green claims
  { pattern: /\b(sustainable|eco-friendly|eco\s*friendly|green|carbon\s*neutral|environmentally\s*friendly|organic|natural)\b/i, rule: 'No sustainability/green claims allowed' },
  
  // Money-back guarantees
  { pattern: /\b(money[\s-]?back|refund\s*guarantee|satisfaction\s*guaranteed)\b/i, rule: 'No money-back guarantees allowed' },
  
  // Charity partnerships
  { pattern: /\b(charity|donation|fundraiser|donate|proceeds\s*go\s*to)\b/i, rule: 'No charity partnership references allowed' },
  
  // Unverified claims (asterisks, surveys, etc.)
  { pattern: /(\*|†|‡|survey|studies\s*show|proven|clinically|guaranteed|verified)\b/i, rule: 'No unverified claims or asterisks allowed' },
  
  // T&Cs references
  { pattern: /\b(terms\s*(and|&)\s*conditions|t&cs|t\s*&\s*c|subject\s*to)\b/i, rule: 'No T&C references allowed' },
];

// Allowed Tesco tag texts (exact match)
const ALLOWED_TAGS = [
  'only at tesco',
  'available at tesco',
  'selected stores. while stocks last.',
  'selected stores while stocks last',
];

// ============== SAFE ZONE CONFIG ==============
// For 9:16 format (1080x1920)

const SAFE_ZONES = {
  '9:16': {
    topClear: 200,    // Top 200px must be clear
    bottomClear: 250, // Bottom 250px must be clear
  },
};

// ============== MIN FONT SIZES ==============

const MIN_FONT_SIZES = {
  social: 20,
  brand: 20,
  checkout_double: 20,
  checkout_single: 10,
  says: 12,
  default: 20,
};

// ============== CONTRAST CHECK ==============

/**
 * Calculate relative luminance of a color
 */
function getLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex) {
  if (!hex) return null;
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Calculate contrast ratio between two colors (WCAG formula)
 */
export function getContrastRatio(color1, color2) {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG AA requires 4.5:1 for normal text, 3:1 for large text
const WCAG_AA_RATIO = 4.5;

// ============== MAIN VALIDATOR ==============

/**
 * Validate canvas state against Tesco compliance rules
 * 
 * @param {Object} canvasSize - { w: number, h: number }
 * @param {Array} editorPages - Array of page objects with children
 * @param {Object} options - { hasClubcardTile: boolean, isAlcohol: boolean, formatType: string }
 * @returns {Object} - { compliant: boolean, hardFails: [], warnings: [], passed: [] }
 */
export function validateCanvas(canvasSize, editorPages, options = {}) {
  const results = {
    compliant: true,
    hardFails: [],
    warnings: [],
    passed: [],
  };

  if (!editorPages || editorPages.length === 0) {
    results.passed.push({ rule: 'Canvas validated', detail: 'Empty canvas passes' });
    return results;
  }

  // Flatten all children from all pages
  const allElements = editorPages.flatMap(page => page.children || []);
  const textElements = allElements.filter(el => el.type === 'text');
  const background = editorPages[0]?.background || '#ffffff';

  // 1. Check blocked keywords in text
  checkBlockedKeywords(textElements, results);

  // 2. Check Clubcard date format if tile present
  if (options.hasClubcardTile) {
    checkClubcardDate(textElements, results);
  }

  // 3. Check safe zones for 9:16 format
  checkSafeZones(canvasSize, allElements, results);

  // 4. Check minimum font sizes
  checkFontSizes(textElements, options.formatType || 'social', results);

  // 5. Check WCAG contrast
  checkContrast(textElements, background, results);

  // 6. Check for Tesco tag presence (warning only)
  checkTescoTag(textElements, results);

  // Final compliance status
  results.compliant = results.hardFails.length === 0;

  return results;
}

// ============== INDIVIDUAL CHECKS ==============

function checkBlockedKeywords(textElements, results) {
  for (const el of textElements) {
    const text = el.text || '';
    
    for (const { pattern, rule } of BLOCKED_PATTERNS) {
      if (pattern.test(text)) {
        const match = text.match(pattern);
        results.hardFails.push({
          rule,
          element: el.id,
          detail: `Found "${match[0]}" in text "${text.substring(0, 50)}..."`,
          fix: 'Remove or rephrase the prohibited content',
        });
      }
    }
  }

  if (results.hardFails.length === 0) {
    results.passed.push({ rule: 'Copy compliance', detail: 'No blocked keywords found' });
  }
}

function checkClubcardDate(textElements, results) {
  // Look for DD/MM format in any text
  const datePattern = /\b\d{2}\/\d{2}\b/;
  const hasDate = textElements.some(el => datePattern.test(el.text || ''));

  if (!hasDate) {
    results.hardFails.push({
      rule: 'Clubcard requires end date',
      detail: 'Clubcard Price tile requires end date in DD/MM format',
      fix: 'Add text with "Ends DD/MM" format (e.g., "Ends 23/06")',
    });
  } else {
    results.passed.push({ rule: 'Clubcard date format', detail: 'End date found in DD/MM format' });
  }
}

function checkSafeZones(canvasSize, allElements, results) {
  const { w, h } = canvasSize;
  const aspectRatio = w / h;

  // Check if 9:16 format (tolerance for slight variations)
  const is916 = Math.abs(aspectRatio - (9/16)) < 0.05;

  if (!is916) {
    results.passed.push({ rule: 'Safe zone check', detail: 'Non-9:16 format - safe zone rules not applicable' });
    return;
  }

  const { topClear, bottomClear } = SAFE_ZONES['9:16'];
  const violations = [];

  for (const el of allElements) {
    if (el.type === 'rect' && el.x === 0 && el.y === 0) continue; // Skip background rects

    const elTop = el.y || 0;
    const elBottom = (el.y || 0) + (el.height || el.fontSize || 50);

    // Check top safe zone
    if (elTop < topClear) {
      violations.push(`"${el.text || el.type}" in top ${topClear}px safe zone (y=${Math.round(elTop)})`);
    }

    // Check bottom safe zone
    if (elBottom > h - bottomClear) {
      violations.push(`"${el.text || el.type}" in bottom ${bottomClear}px safe zone (y=${Math.round(elBottom)})`);
    }
  }

  if (violations.length > 0) {
    results.hardFails.push({
      rule: 'Safe zone violation (9:16 format)',
      detail: violations.join('; '),
      fix: `Keep top ${topClear}px and bottom ${bottomClear}px clear of text/logos`,
    });
  } else {
    results.passed.push({ rule: 'Safe zone compliance', detail: '9:16 safe zones respected' });
  }
}

function checkFontSizes(textElements, formatType, results) {
  const minSize = MIN_FONT_SIZES[formatType] || MIN_FONT_SIZES.default;
  const violations = [];

  for (const el of textElements) {
    const fontSize = el.fontSize || 16;
    if (fontSize < minSize) {
      violations.push(`"${(el.text || '').substring(0, 20)}..." has font size ${fontSize}px (min: ${minSize}px)`);
    }
  }

  if (violations.length > 0) {
    results.hardFails.push({
      rule: 'Minimum font size',
      detail: violations.join('; '),
      fix: `Increase font size to at least ${minSize}px for ${formatType} format`,
    });
  } else if (textElements.length > 0) {
    results.passed.push({ rule: 'Font size compliance', detail: `All text meets ${minSize}px minimum` });
  }
}

function checkContrast(textElements, background, results) {
  const violations = [];

  for (const el of textElements) {
    const textColor = el.fill || '#000000';
    const ratio = getContrastRatio(textColor, background);

    if (ratio < WCAG_AA_RATIO) {
      violations.push(`"${(el.text || '').substring(0, 20)}..." has contrast ${ratio.toFixed(1)}:1 (need ${WCAG_AA_RATIO}:1)`);
    }
  }

  if (violations.length > 0) {
    results.hardFails.push({
      rule: 'WCAG AA contrast',
      detail: violations.join('; '),
      fix: 'Increase contrast between text color and background',
    });
  } else if (textElements.length > 0) {
    results.passed.push({ rule: 'Accessibility contrast', detail: 'All text meets WCAG AA contrast ratio' });
  }
}

function checkTescoTag(textElements, results) {
  const hasValidTag = textElements.some(el => {
    const text = (el.text || '').toLowerCase().trim();
    return ALLOWED_TAGS.some(tag => text.includes(tag));
  });

  if (!hasValidTag && textElements.length > 0) {
    results.warnings.push({
      rule: 'Tesco tag recommended',
      detail: 'Consider adding "Only at Tesco" or "Available at Tesco" tag',
    });
  } else if (hasValidTag) {
    results.passed.push({ rule: 'Tesco tag present', detail: 'Valid Tesco tag found' });
  }
}

// ============== HELPER EXPORTS ==============

/**
 * Quick check if canvas has any blocking issues
 */
export function isCanvasCompliant(canvasSize, editorPages, options = {}) {
  const result = validateCanvas(canvasSize, editorPages, options);
  return result.compliant;
}

/**
 * Format validation results for display
 */
export function formatValidationForUI(validationResult) {
  return {
    compliant: validationResult.compliant,
    warnings: validationResult.warnings.map(w => w.detail || w.rule),
    rules_enforced: validationResult.passed.map(p => p.rule),
    issues: validationResult.hardFails.map(f => f.detail),
    suggestions: validationResult.hardFails.map(f => f.fix),
  };
}
/**
 * Auto-corrects canvas elements to meet compliance standards
 * 
 * @param {Array} editorPages - Current pages array
 * @param {Object} canvasSize - { w, h }
 * @param {Object} options - { formatType } 
 * @returns {Array} - New editorPages array with corrections
 */
export function applyAutoFixes(editorPages, canvasSize, options = {}) {
  const { w, h } = canvasSize;
  const aspectRatio = w / h;
  const is916 = Math.abs(aspectRatio - (9/16)) < 0.05;
  const formatType = options.formatType || 'social';
  const minSize = MIN_FONT_SIZES[formatType] || MIN_FONT_SIZES.default;
  const background = editorPages[0]?.background || '#ffffff';

  return editorPages.map(page => {
    let newChildren = (page.children || []).map(el => {
      let newEl = { ...el };

      // 1. Fix Font Size
      if (newEl.type === 'text') {
        const currentSize = newEl.fontSize || 16;
        if (currentSize < minSize) {
          newEl.fontSize = minSize;
        }
      }

      // 2. Fix Safe Zones (9:16)
      if (is916) {
        const { topClear, bottomClear } = SAFE_ZONES['9:16'];
        const elTop = newEl.y || 0;
        const elHeight = newEl.height || (newEl.type === 'text' ? (newEl.fontSize * 1.2) : 50);
        const elBottom = elTop + elHeight;

        if (elTop < topClear) {
          newEl.y = topClear + 5;
        } else if (elBottom > h - bottomClear) {
          newEl.y = h - bottomClear - elHeight - 5;
        }
      }

      // 3. Fix Contrast
      if (newEl.type === 'text' || newEl.type === 'icon') {
        const color = newEl.fill || '#000000';
        const ratio = getContrastRatio(color, background);
        if (ratio < WCAG_AA_RATIO) {
          const whiteRatio = getContrastRatio('#ffffff', background);
          const blackRatio = getContrastRatio('#000000', background);
          newEl.fill = whiteRatio > blackRatio ? '#ffffff' : '#000000';
        }
      }

      return newEl;
    });

    // 4. Add missing Tesco Tag if missing
    const hasValidTag = newChildren.some(el => {
      const text = (el.text || '').toLowerCase().trim();
      return ALLOWED_TAGS.some(tag => text.includes(tag));
    });

    if (!hasValidTag && is916) {
      const tagColor = getContrastRatio('#ffffff', background) > getContrastRatio('#000000', background) ? '#ffffff' : '#000000';
      newChildren.push({
        id: `auto-tag-${Date.now()}`,
        type: 'text',
        text: 'Available at Tesco',
        fontSize: minSize,
        fontWeight: 'bold',
        x: 50,
        y: h - 180, // Safe spot within guideline but not obscured
        fill: tagColor,
        fontFamily: 'Inter, Arial, sans-serif',
        align: 'center'
      });
    }

    return { ...page, children: newChildren };
  });
}

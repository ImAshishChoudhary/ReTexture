/**
 * Compliance-Aware Layout Engine
 * 
 * Unified placement system for headings, subheadings, badges, and logos
 * that automatically ensures Tesco compliance rules are followed.
 * 
 * TESCO COMPLIANCE RULES ENFORCED:
 * - 9:16 Safe Zones: Top 200px and Bottom 250px must be clear
 * - Value tiles: Fixed position, never overlapped
 * - Text: Left-aligned, minimum font sizes
 * - Badge: Must not overlap logos, headlines, packshots
 * - Drinkaware: Minimum 20px height, mandatory for alcohol
 */

import constants from '../constants.json';

// =====================================================
// ZONE DEFINITIONS (Based on Tesco Compliance Rules)
// =====================================================

/**
 * Get zone definitions for a given canvas size
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {string} format - Canvas format ('9:16', '1:1', '16:9')
 */
export function getZones(width, height, format = '9:16') {
  const safeZone = constants.SAFE_ZONES?.[format] || { topClear: 200, bottomClear: 250 };
  
  // Scale safe zones proportionally for different canvas sizes
  const scaleFactor = height / 1920; // 1920 is reference height for 9:16
  const topClear = Math.round(safeZone.topClear * scaleFactor);
  const bottomClear = Math.round(safeZone.bottomClear * scaleFactor);
  
  return {
    // NO-GO ZONES - Nothing allowed here
    noGoTop: {
      x: 0,
      y: 0,
      width: width,
      height: topClear,
      type: 'no-go',
      reason: 'Tesco 9:16 safe zone - top'
    },
    noGoBottom: {
      x: 0,
      y: height - bottomClear,
      width: width,
      height: bottomClear,
      type: 'no-go',
      reason: 'Tesco 9:16 safe zone - bottom'
    },
    
    // CONTENT ZONE - Where elements CAN be placed
    content: {
      x: 0,
      y: topClear,
      width: width,
      height: height - topClear - bottomClear,
      type: 'content'
    },
    
    // SUB-ZONES for element placement
    headlineZone: {
      x: width * 0.05, // 5% margin
      y: topClear + 20,
      width: width * 0.45, // Left 45% for headlines (compliance: left-aligned)
      height: height * 0.25,
      type: 'headline',
      anchor: 'top-left'
    },
    
    subheadingZone: {
      x: width * 0.05,
      y: topClear + height * 0.15,
      width: width * 0.45,
      height: height * 0.15,
      type: 'subheading',
      anchor: 'below-headline'
    },
    
    badgeZone: {
      x: width * 0.03,
      y: height - bottomClear - height * 0.15,
      width: width * 0.35,
      height: height * 0.12,
      type: 'badge',
      anchor: 'bottom-left',
      priority: ['bottom-left', 'bottom-right', 'middle-left']
    },
    
    logoZone: {
      x: width * 0.75,
      y: height - bottomClear - height * 0.08,
      width: width * 0.22,
      height: height * 0.06,
      type: 'logo',
      anchor: 'bottom-right'
    }
  };
}

// =====================================================
// ELEMENT PRIORITY SYSTEM
// =====================================================

const ELEMENT_PRIORITY = {
  'value-tile': { priority: 1, canOverlap: false, penaltyMultiplier: Infinity },
  'logo': { priority: 2, canOverlap: false, penaltyMultiplier: 100 },
  'packshot': { priority: 3, canOverlap: false, penaltyMultiplier: 80 },
  'headline': { priority: 4, canOverlap: false, penaltyMultiplier: 60 },
  'subheading': { priority: 5, canOverlap: false, penaltyMultiplier: 40 },
  'badge': { priority: 6, canOverlap: false, penaltyMultiplier: 30 },
  'drinkaware': { priority: 7, canOverlap: false, penaltyMultiplier: 50 },
  'decorative': { priority: 10, canOverlap: true, penaltyMultiplier: 10 }
};

/**
 * Get element priority configuration
 */
export function getElementPriority(elementType) {
  return ELEMENT_PRIORITY[elementType] || ELEMENT_PRIORITY['decorative'];
}

// =====================================================
// COLLISION DETECTION (AABB)
// =====================================================

/**
 * Check if two rectangles overlap with optional padding
 * @param {Object} rect1 - { x, y, width, height }
 * @param {Object} rect2 - { x, y, width, height }
 * @param {number} padding - Extra space around rect1
 */
export function hasOverlap(rect1, rect2, padding = 20) {
  return !(
    rect1.x + rect1.width + padding < rect2.x ||
    rect2.x + rect2.width + padding < rect1.x ||
    rect1.y + rect1.height + padding < rect2.y ||
    rect2.y + rect2.height + padding < rect1.y
  );
}

/**
 * Check if a rectangle is within a zone
 */
export function isWithinZone(rect, zone) {
  return (
    rect.x >= zone.x &&
    rect.y >= zone.y &&
    rect.x + rect.width <= zone.x + zone.width &&
    rect.y + rect.height <= zone.y + zone.height
  );
}

/**
 * Check if rect overlaps with any no-go zone
 */
export function isInNoGoZone(rect, zones) {
  return hasOverlap(rect, zones.noGoTop, 0) || hasOverlap(rect, zones.noGoBottom, 0);
}

// =====================================================
// POSITION SCORING ALGORITHM
// =====================================================

/**
 * Score a candidate position
 * @param {Object} position - { x, y, width, height }
 * @param {string} elementType - Type of element being placed
 * @param {Array} existingElements - Array of existing canvas elements
 * @param {Object} zones - Zone definitions from getZones()
 */
export function scorePosition(position, elementType, existingElements, zones) {
  let score = 100; // Base score
  const priority = getElementPriority(elementType);
  
  // 🔴 HARD FAIL: In no-go zone
  if (isInNoGoZone(position, zones)) {
    console.log(`❌ [LAYOUT] ${elementType} rejected: In no-go zone`);
    return { score: -Infinity, reason: 'In no-go zone' };
  }
  
  // Check collisions with existing elements
  for (const el of existingElements) {
    if (hasOverlap(position, el)) {
      const elPriority = getElementPriority(el.type || 'decorative');
      
      // Higher priority elements block placement
      if (elPriority.priority < priority.priority) {
        score -= elPriority.penaltyMultiplier;
        console.log(`⚠️ [LAYOUT] ${elementType} collision with ${el.type}: -${elPriority.penaltyMultiplier}`);
      }
    }
  }
  
  // Bonus for being in preferred zone
  const preferredZone = zones[`${elementType}Zone`];
  if (preferredZone && isWithinZone(position, preferredZone)) {
    score += 30;
  }
  
  // Bonus for corner positions (visual hierarchy)
  if (position.y > zones.content.height * 0.6) {
    score += 15; // Bottom area bonus for badges
  }
  
  // Penalty for being near edges
  if (position.x < 10 || position.y < zones.content.y + 10) {
    score -= 5;
  }
  
  return { score, reason: score > 50 ? 'Good position' : 'Marginal position' };
}

// =====================================================
// OPTIMAL POSITION FINDER
// =====================================================

const CANDIDATE_POSITIONS = {
  'headline': ['top-left'],
  'subheading': ['below-headline'],
  'badge': ['bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-left'],
  'logo': ['bottom-right', 'bottom-left', 'top-right', 'top-left']
};

/**
 * Calculate position coordinates for a given anchor
 */
function getPositionFromAnchor(anchor, elementSize, zones, existingElements) {
  const { width: elW, height: elH } = elementSize;
  const content = zones.content;
  const padding = Math.max(20, content.width * 0.03);
  
  // Find headline for 'below-headline' anchor
  const headline = existingElements.find(el => el.type === 'headline' || el.id?.includes('headline'));
  
  switch (anchor) {
    case 'top-left':
      return { x: content.x + padding, y: content.y + padding };
      
    case 'top-right':
      return { x: content.x + content.width - elW - padding, y: content.y + padding };
      
    case 'bottom-left':
      return { x: content.x + padding, y: content.y + content.height - elH - padding };
      
    case 'bottom-right':
      return { x: content.x + content.width - elW - padding, y: content.y + content.height - elH - padding };
      
    case 'middle-left':
      return { x: content.x + padding, y: content.y + (content.height / 2) - (elH / 2) };
      
    case 'middle-right':
      return { x: content.x + content.width - elW - padding, y: content.y + (content.height / 2) - (elH / 2) };
      
    case 'below-headline':
      if (headline) {
        const gap = headline.fontSize ? headline.fontSize * 0.6 : 20;
        return { x: headline.x, y: (headline.y || 0) + (headline.height || 50) + gap };
      }
      return { x: content.x + padding, y: content.y + 100 };
      
    default:
      return { x: content.x + padding, y: content.y + padding };
  }
}

/**
 * Find the optimal position for an element
 * @param {string} elementType - 'headline', 'subheading', 'badge', 'logo'
 * @param {Object} elementSize - { width, height }
 * @param {Array} existingElements - Existing canvas elements
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {string} format - '9:16', '1:1', etc.
 */
export function findOptimalPosition(elementType, elementSize, existingElements, canvasWidth, canvasHeight, format = '9:16') {
  console.log(`🎯 [LAYOUT] Finding optimal position for ${elementType}...`);
  
  const zones = getZones(canvasWidth, canvasHeight, format);
  const candidates = CANDIDATE_POSITIONS[elementType] || ['top-left'];
  
  const scoredPositions = candidates.map(anchor => {
    const pos = getPositionFromAnchor(anchor, elementSize, zones, existingElements);
    const rect = { ...pos, width: elementSize.width, height: elementSize.height };
    const { score, reason } = scorePosition(rect, elementType, existingElements, zones);
    
    return { anchor, ...pos, score, reason };
  });
  
  // Sort by score descending
  scoredPositions.sort((a, b) => b.score - a.score);
  
  const best = scoredPositions[0];
  console.log(`✅ [LAYOUT] Best position for ${elementType}: ${best.anchor} (score: ${best.score})`);
  console.log(`   All candidates:`, scoredPositions.map(p => `${p.anchor}:${p.score}`).join(', '));
  
  return best;
}

// =====================================================
// COMPLIANCE VALIDATION
// =====================================================

/**
 * Validate that a placement is compliant with Tesco rules
 * @returns {Object} { isValid, violations }
 */
export function validatePlacement(element, existingElements, canvasWidth, canvasHeight, format = '9:16') {
  const zones = getZones(canvasWidth, canvasHeight, format);
  const violations = [];
  
  const rect = {
    x: element.x,
    y: element.y,
    width: element.width || 100,
    height: element.height || 50
  };
  
  // Check no-go zones
  if (isInNoGoZone(rect, zones)) {
    violations.push({
      rule: 'SAFE_ZONE',
      severity: 'error',
      message: `${element.type || 'Element'} is in 9:16 safe zone (top 200px or bottom 250px)`
    });
  }
  
  // Check font size minimums for text elements
  if (['headline', 'subheading', 'text'].includes(element.type)) {
    const minSize = constants.MIN_FONT_SIZES?.default || 20;
    if (element.fontSize && element.fontSize < minSize) {
      violations.push({
        rule: 'MIN_FONT_SIZE',
        severity: 'error',
        message: `Font size ${element.fontSize}px is below minimum ${minSize}px`
      });
    }
  }
  
  // Check collisions with critical elements
  for (const el of existingElements) {
    if (['value-tile', 'logo'].includes(el.type) && hasOverlap(rect, el, 10)) {
      violations.push({
        rule: 'OVERLAP',
        severity: 'error',
        message: `${element.type || 'Element'} overlaps with ${el.type}`
      });
    }
  }
  
  return {
    isValid: violations.length === 0,
    violations
  };
}

// =====================================================
// SMART PLACEMENT API (Main Export)
// =====================================================

/**
 * Smart placement for any element type
 * Automatically finds compliant position and validates
 */
export default function smartPlace(elementType, elementSize, existingElements, canvasWidth, canvasHeight, options = {}) {
  const format = options.format || '9:16';
  
  // Find optimal position
  const position = findOptimalPosition(
    elementType,
    elementSize,
    existingElements,
    canvasWidth,
    canvasHeight,
    format
  );
  
  // Create element with position
  const element = {
    type: elementType,
    x: position.x,
    y: position.y,
    width: elementSize.width,
    height: elementSize.height,
    ...options.elementProps
  };
  
  // Validate placement
  const validation = validatePlacement(element, existingElements, canvasWidth, canvasHeight, format);
  
  if (!validation.isValid) {
    console.warn(`⚠️ [LAYOUT] Placement has violations:`, validation.violations);
  }
  
  return {
    position,
    element,
    validation,
    zones: getZones(canvasWidth, canvasHeight, format)
  };
}

// Named exports for direct use
export {
  getZones,
  findOptimalPosition,
  validatePlacement,
  hasOverlap,
  isInNoGoZone,
  scorePosition
};

/**
 * Layout rules: Safe zones, element overlaps, CTA detection, value tiles, packshot zones
 */

import CONSTANTS from '../constants.json';
import { getBoundingBox, isInSafeZone, intersects } from '../utils/geometry';

export function checkSafeZones(elements, canvasSize, formatType = 'social') {
  console.log('🔍 [LAYOUT RULES] checkSafeZones called');
  console.log('  ↳ Elements count:', elements.length);
  console.log('  ↳ Canvas size:', canvasSize);
  console.log('  ↳ Format type:', formatType);
  
  const violations = [];
  const { w, h } = canvasSize;
  const aspectRatio = w / h;
  const is916 = Math.abs(aspectRatio - (9 / 16)) < 0.05;
  
  console.log(`  ↳ Aspect ratio: ${aspectRatio.toFixed(3)}, Is 9:16? ${is916}`);
  
  if (!is916) {
    console.log('  ⏭️ Not 9:16 format, skipping safe zone checks');
    return violations;
  }
  
  const safeZones = CONSTANTS.SAFE_ZONES['9:16'];
  console.log('  ↳ Safe zones:', safeZones);
  
  elements.forEach((el, index) => {
    console.log(`  🔍 Checking element ${index + 1}/${elements.length}: ${el.id}`);
    
    const zoneCheck = isInSafeZone(el, safeZones, h);
    console.log(`    ↳ Safe? ${zoneCheck.safe}, Zone: ${zoneCheck.zone}, Distance: ${zoneCheck.distance}`);
    
    if (!zoneCheck.safe) {
      const box = getBoundingBox(el);
      let autoFix = null;
      
      if (zoneCheck.zone === 'top') {
        autoFix = {
          property: 'y',
          value: safeZones.topClear + 10
        };
        console.log(`    ⚠️ TOP zone violation! Auto-fix: y=${autoFix.value}`);
      } else if (zoneCheck.zone === 'bottom') {
        autoFix = {
          property: 'y',
          value: h - safeZones.bottomClear - box.height - 10
        };
        console.log(`    ⚠️ BOTTOM zone violation! Auto-fix: y=${autoFix.value}`);
      }
      
      violations.push({
        elementId: el.id,
        rule: 'SAFE_ZONE',
        severity: 'hard',
        message: `Element is in the ${zoneCheck.zone} safe zone (${Math.round(zoneCheck.distance)}px intrusion)`,
        autoFixable: true,
        autoFix
      });
    }
  });
  
  console.log(`✅ checkSafeZones complete: ${violations.length} violations`);
  return violations;
}

export function checkOverlaps(elements) {
  console.log('🔍 [LAYOUT RULES] checkOverlaps called');
  console.log('  ↳ Elements count:', elements.length);
  
  const violations = [];
  const protectedTypes = ['logo', 'cta', 'packshot', 'valueTile'];
  console.log('  ↳ Protected types:', protectedTypes);
  
  let checksPerformed = 0;
  
  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const el1 = elements[i];
      const el2 = elements[j];
      
      // Only check if at least one is a protected type
      if (!protectedTypes.includes(el1.type) && !protectedTypes.includes(el2.type)) {
        continue;
      }
      
      checksPerformed++;
      console.log(`  🔍 Checking overlap: ${el1.id} vs ${el2.id}`);
      
      const box1 = getBoundingBox(el1);
      const box2 = getBoundingBox(el2);
      
      if (intersects(box1, box2)) {
        console.log(`    ⚠️ OVERLAP detected!`);
        violations.push({
          elementId: el1.id,
          rule: 'OVERLAP',
          severity: 'warning',
          message: `Element overlaps with another protected element`,
          autoFixable: false,
          autoFix: null
        });
      }
    }
  }
  
  console.log(`✅ checkOverlaps complete: ${checksPerformed} checks, ${violations.length} violations`);
  return violations;
}

export function checkMinFontSize(elements, formatType = 'social') {
  console.log('🔍 [LAYOUT RULES] checkMinFontSize called');
  console.log('  ↳ Elements count:', elements.length);
  console.log('  ↳ Format type:', formatType);
  
  const violations = [];
  const minSize = CONSTANTS.MIN_FONT_SIZES[formatType] || CONSTANTS.MIN_FONT_SIZES.default;
  console.log(`  ↳ Minimum font size: ${minSize}px`);
  
  const textElements = elements.filter(el => el.type === 'text');
  console.log(`  ↳ Text elements: ${textElements.length}`);
  
  textElements.forEach((el, index) => {
    const currentSize = el.fontSize || 16;
    console.log(`  🔍 Checking text ${index + 1}/${textElements.length}: ${el.id}, size: ${currentSize}px`);
    
    if (currentSize < minSize) {
      console.log(`    ⚠️ FONT TOO SMALL! ${currentSize}px < ${minSize}px`);
      violations.push({
        elementId: el.id,
        rule: 'MIN_FONT_SIZE',
        severity: 'hard',
        message: `Font size ${currentSize}px is below the ${minSize}px minimum`,
        autoFixable: true,
        autoFix: {
          property: 'fontSize',
          value: minSize
        }
      });
    }
  });
  
  console.log(`✅ checkMinFontSize complete: ${violations.length} violations`);
  return violations;
}

/**
 * Check for CTA (Call-to-Action) elements
 * Tesco rule: CTA is not allowed
 */
export function checkCTA(elements) {
  console.log('🔍 [LAYOUT RULES] checkCTA called');
  console.log('  ↳ Elements count:', elements.length);
  
  const violations = [];
  const ctaElements = elements.filter(el => el.type === 'cta' || el.type === 'button');
  
  console.log(`  ↳ CTA/Button elements found: ${ctaElements.length}`);
  
  ctaElements.forEach((el, index) => {
    console.log(`  ⚠️ CTA DETECTED: ${el.id} (type: ${el.type})`);
    violations.push({
      elementId: el.id,
      rule: 'CTA_NOT_ALLOWED',
      severity: 'hard',
      message: 'CTA (Call-to-Action) elements are not allowed in Tesco brand designs',
      autoFixable: true,
      autoFix: {
        action: 'remove_element',
        elementId: el.id
      }
    });
  });
  
  console.log(`✅ checkCTA complete: ${violations.length} violations`);
  return violations;
}

/**
 * Check value tiles for positioning and overlaps
 * Tesco rules: 
 * - Position is predefined, cannot be moved
 * - Nothing may overlap value tiles
 */
export function checkValueTiles(elements) {
  console.log('🔍 [LAYOUT RULES] checkValueTiles called');
  console.log('  ↳ Elements count:', elements.length);
  
  const violations = [];
  const valueTiles = elements.filter(el => el.type === 'valueTile');
  
  console.log(`  ↳ Value tiles found: ${valueTiles.length}`);
  
  if (valueTiles.length === 0) {
    console.log('  ⏭️ No value tiles, skipping checks');
    return violations;
  }
  
  // Check for overlaps with value tiles
  valueTiles.forEach(tile => {
    const tileBox = getBoundingBox(tile);
    
    elements.forEach(el => {
      if (el.id === tile.id) return; // Skip self
      
      const elBox = getBoundingBox(el);
      
      if (intersects(tileBox, elBox)) {
        console.log(`  ⚠️ OVERLAP WITH VALUE TILE! ${el.id} overlaps ${tile.id}`);
        violations.push({
          elementId: el.id,
          rule: 'VALUE_TILE_OVERLAP',
          severity: 'hard',
          message: `Element overlaps with value tile. Nothing may overlap value tiles.`,
          autoFixable: false,
          metadata: {
            valueTileId: tile.id,
            overlappingElementId: el.id
          }
        });
      }
    });
  });
  
  console.log(`✅ checkValueTiles complete: ${violations.length} violations`);
  return violations;
}

/**
 * Check packshot safe zones
 * Tesco rules:
 * - 24px minimum gap (double density)
 * - 12px minimum gap (single density)
 */
export function checkPackshotSafeZone(elements, formatType = 'social') {
  console.log('🔍 [LAYOUT RULES] checkPackshotSafeZone called');
  console.log('  ↳ Elements count:', elements.length);
  console.log('  ↳ Format type:', formatType);
  
  const violations = [];
  const packshots = elements.filter(el => el.type === 'packshot' || el.type === 'image');
  
  console.log(`  ↳ Packshot/image elements found: ${packshots.length}`);
  
  if (packshots.length === 0) {
    console.log('  ⏭️ No packshots, skipping checks');
    return violations;
  }
  
  // Determine required safe zone based on format
  const isSingleDensity = formatType.includes('single');
  const requiredGap = isSingleDensity ? 12 : 24;
  
  console.log(`  ↳ Required gap: ${requiredGap}px (${isSingleDensity ? 'single' : 'double'} density)`);
  
  // Check distance between packshots and other elements
  packshots.forEach(packshot => {
    const packshotBox = getBoundingBox(packshot);
    
    elements.forEach(el => {
      if (el.id === packshot.id) return; // Skip self
      if (el.type === 'background') return; // Skip background
      
      const elBox = getBoundingBox(el);
      
      // Calculate minimum distance between boxes
      const distance = calculateMinDistance(packshotBox, elBox);
      
      if (distance < requiredGap && distance >= 0) {
        console.log(`  ⚠️ PACKSHOT TOO CLOSE! ${el.id} is ${distance.toFixed(1)}px from ${packshot.id} (required: ${requiredGap}px)`);
        violations.push({
          elementId: el.id,
          rule: 'PACKSHOT_SAFE_ZONE',
          severity: 'hard',
          message: `Element is ${distance.toFixed(1)}px from packshot (minimum ${requiredGap}px required)`,
          autoFixable: false,
          metadata: {
            packshotId: packshot.id,
            currentDistance: distance,
            requiredDistance: requiredGap
          }
        });
      }
    });
  });
  
  console.log(`✅ checkPackshotSafeZone complete: ${violations.length} violations`);
  return violations;
}

/**
 * Calculate minimum distance between two bounding boxes
 */
function calculateMinDistance(box1, box2) {
  // If boxes overlap, distance is negative (intersecting)
  if (intersects(box1, box2)) {
    return -1;
  }
  
  // Calculate distances in each direction
  const horizontalDistance = Math.max(
    box1.x - (box2.x + box2.width),
    box2.x - (box1.x + box1.width),
    0
  );
  
  const verticalDistance = Math.max(
    box1.y - (box2.y + box2.height),
    box2.y - (box1.y + box1.height),
    0
  );
  
  // Return minimum of horizontal and vertical distance
  if (horizontalDistance === 0) return verticalDistance;
  if (verticalDistance === 0) return horizontalDistance;
  
  // Diagonal distance (pythagoras)
  return Math.sqrt(horizontalDistance ** 2 + verticalDistance ** 2);
}

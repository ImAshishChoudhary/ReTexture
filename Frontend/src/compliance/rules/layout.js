/**
 * Layout rules: Safe zones, element overlaps
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
  const protectedTypes = ['logo', 'cta', 'packshot'];
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

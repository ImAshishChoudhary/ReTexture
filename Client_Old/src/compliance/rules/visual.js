/**
 * Visual rules: Contrast (APCA + WCAG 2.1), Drinkaware logo, Face Detection
 */

import CONSTANTS from '../constants.json';
import { 
  checkAPCAContrast, 
  checkWCAGContrast,
  suggestAccessibleColor 
} from '../utils/color';

/**
 * Check text contrast using APCA algorithm (with WCAG 2.1 fallback)
 * Context-aware: considers font size, weight, and type
 * 
 * @param {Array} elements - Canvas elements
 * @param {string} background - Background color (hex)
 * @returns {Array} Array of contrast violations
 */
export function checkContrast(elements, background) {
  console.log('🔍 [VISUAL RULES - APCA] checkContrast called');
  console.log('  ↳ Elements count:', elements.length);
  console.log('  ↳ Background:', background);
  
  const violations = [];
  const checkableElements = elements.filter(el => el.type === 'text' || el.type === 'icon');
  console.log(`  ↳ Checkable text/icon elements: ${checkableElements.length}`);
  
  checkableElements.forEach((el, index) => {
    const color = el.fill || '#000000';
    const fontSize = el.fontSize || 16;
    const fontWeight = el.bold ? 700 : (el.fontWeight || 400);
    
    console.log(`  🔍 [${index + 1}/${checkableElements.length}] Checking: ${el.id}`);
    console.log(`    ↳ Color: ${color}, Size: ${fontSize}px, Weight: ${fontWeight}`);
    
    // Build context for APCA
    const context = {
      fontSize,
      fontWeight,
      usage: fontSize >= 24 ? 'heading' : 'body'
    };
    
    // Check using APCA (primary) and WCAG 2.1 (fallback)
    const apcaResult = checkAPCAContrast(color, background, context);
    const wcagResult = checkWCAGContrast(color, background, context);
    
    console.log(`    ↳ APCA: ${apcaResult.contrast}Lc (required: ${apcaResult.required}Lc) - ${apcaResult.passes ? 'PASS' : 'FAIL'}`);
    console.log(`    ↳ WCAG 2.1: ${wcagResult.contrast}:1 (required: ${wcagResult.required}:1) - ${wcagResult.passes ? 'PASS' : 'FAIL'}`);
    
    // Fail if BOTH algorithms fail (defensive approach)
    if (!apcaResult.passes && !wcagResult.passes) {
      // Suggest best color using APCA-optimized algorithm
      const suggestion = suggestAccessibleColor(background, context);
      
      console.log(`    ⚠️ CONTRAST FAIL (both APCA & WCAG)`);
      console.log(`      ↳ Suggested fix: ${suggestion.color} (${suggestion.contrast}Lc)`);
      
      violations.push({
        elementId: el.id,
        rule: 'CONTRAST_FAIL',
        severity: 'hard',
        message: `Contrast ${apcaResult.contrast}Lc is below ${apcaResult.required}Lc requirement (APCA). WCAG 2.1: ${wcagResult.contrast}:1 vs ${wcagResult.required}:1`,
        autoFixable: true,
        autoFix: {
          property: 'fill',
          value: suggestion.color
        },
        metadata: {
          currentAPCA: apcaResult.contrast,
          requiredAPCA: apcaResult.required,
          currentWCAG: wcagResult.contrast,
          requiredWCAG: wcagResult.required,
          suggestedAPCA: suggestion.contrast
        }
      });
    } else if (!apcaResult.passes) {
      // Warning: Passes WCAG but fails APCA (possible false positive)
      console.log(`    ⚠️ APCA FAIL (but WCAG passes - possible WCAG 2.1 false positive)`);
      
      violations.push({
        elementId: el.id,
        rule: 'CONTRAST_APCA_WARNING',
        severity: 'warning',
        message: `Passes WCAG 2.1 (${wcagResult.contrast}:1) but fails APCA (${apcaResult.contrast}Lc < ${apcaResult.required}Lc). May be a WCAG 2.1 false positive.`,
        autoFixable: true,
        autoFix: {
          property: 'fill',
          value: suggestAccessibleColor(background, context).color
        },
        metadata: {
          apcaContrast: apcaResult.contrast,
          wcagContrast: wcagResult.contrast
        }
      });
    } else {
      console.log(`    ✅ PASS (both algorithms)`);
    }
  });
  
  console.log(`✅ checkContrast complete: ${violations.length} violations`);
  return violations;
}


export function checkDrinkawareLogo(elements, isAlcohol = false) {
  console.log('🔍 [VISUAL RULES] checkDrinkawareLogo called');
  console.log('  ↳ Elements count:', elements.length);
  console.log('  ↳ Is alcohol campaign?', isAlcohol);
  
  const violations = [];
  
  if (!isAlcohol) {
    console.log('  ⏭️ Not alcohol campaign, skipping Drinkaware checks');
    return violations;
  }
  
  const hasDrinkaware = elements.some(el => 
    el.type === 'logo' && 
    (el.src || '').toLowerCase().includes('drinkaware')
  );
  
  console.log('  ↳ Has Drinkaware logo?', hasDrinkaware);
  
  if (!hasDrinkaware) {
    console.log('  ⚠️ MISSING DRINKAWARE LOGO!');
    violations.push({
      elementId: null,
      rule: 'MISSING_DRINKAWARE',
      severity: 'hard',
      message: 'Drinkaware logo is required for alcohol campaigns',
      autoFixable: false,
      autoFix: null
    });
  } else {
    // Check minimum size
    const drinkawareLogo = elements.find(el => 
      el.type === 'logo' && 
      (el.src || '').toLowerCase().includes('drinkaware')
    );
    
    const logoHeight = drinkawareLogo?.height || 0;
    console.log(`  ↳ Drinkaware logo height: ${logoHeight}px`);
    
    if (logoHeight < 20) {
      console.log(`  ⚠️ DRINKAWARE TOO SMALL! ${logoHeight}px < 20px`);
      violations.push({
        elementId: drinkawareLogo.id,
        rule: 'DRINKAWARE_SIZE',
        severity: 'hard',
        message: 'Drinkaware logo must be at least 20px tall',
        autoFixable: true,
        autoFix: {
          property: 'height',
          value: 20
        }
      });
    }
  }
  
  console.log(`✅ checkDrinkawareLogo complete: ${violations.length} violations`);
  return violations;
}

/**
 * Checks for human faces in images using TensorFlow BlazeFace
 * This is a WARNING-level check for usage rights verification
 * @param {Array} elements - Canvas elements to check
 * @param {Object} options - Detection options
 * @returns {Promise<Array>} - Array of warning violations
 */
export async function checkPeopleDetection(elements, options = {}) {
  console.log('🔍 [VISUAL RULES] checkPeopleDetection called');
  
  const { enableFaceDetection = true } = options;
  
  if (!enableFaceDetection) {
    console.log('  ↳ Face detection disabled, skipping');
    return [];
  }
  
  const violations = [];
  
  // Only check image elements
  const imageElements = elements.filter(el => el.type === 'image');
  console.log(`  ↳ Image elements to check: ${imageElements.length}`);
  
  if (imageElements.length === 0) {
    console.log('  ↳ No images to check');
    return [];
  }
  
  // Try to load face detection module dynamically
  let detectFaces;
  try {
    console.log('📦 [VISUAL RULES] Loading face detection module...');
    const faceModule = await import('../utils/faceDetection.js');
    detectFaces = faceModule.detectFaces;
    console.log('✅ [VISUAL RULES] Face detection module loaded');
  } catch (loadError) {
    console.error('❌ [VISUAL RULES] Failed to load face detection:', loadError.message);
    console.warn('⚠️ [VISUAL RULES] Continuing without face detection');
    return violations; // Return empty, don't crash
  }
  
  // Process each image element
  for (const el of imageElements) {
    console.log(`  🖼️ Checking image: ${el.id}`);
    
    // Skip if no actual image data
    if (!el.src && !el.imageElement) {
      console.log(`    ↳ No image data, skipping`);
      continue;
    }
    
    try {
      // Create image element from src if needed
      let imageToAnalyze = el.imageElement;
      
      if (!imageToAnalyze && el.src) {
        console.log(`    ↳ Loading image from src: ${el.src.substring(0, 50)}...`);
        // Create temporary image element
        imageToAnalyze = new Image();
        imageToAnalyze.crossOrigin = 'anonymous';
        const imgPromise = new Promise((resolve, reject) => {
          imageToAnalyze.onload = () => resolve();
          imageToAnalyze.onerror = reject;
          imageToAnalyze.src = el.src;
        });
        
        // Wait for image to load (with timeout)
        await Promise.race([
          imgPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        console.log(`    ✅ Image loaded successfully`);
      }
      
      if (!imageToAnalyze) {
        console.log(`    ↳ Could not load image`);
        continue;
      }
      
      // Detect faces
      console.log(`    🔍 Running face detection...`);
      const result = await detectFaces(imageToAnalyze);
      const { faceCount, hasFaces, error } = result;
      
      if (error) {
        console.warn(`    ⚠️ Detection error:`, error.message);
        continue;
      }
      
      if (hasFaces) {
        console.log(`    ⚠️ PEOPLE DETECTED! Count: ${faceCount}`);
        violations.push({
          elementId: el.id,
          rule: 'PEOPLE_DETECTED',
          severity: 'warning',
          message: `Detected ${faceCount} face${faceCount > 1 ? 's' : ''}. Ensure usage rights are secured.`,
          autoFixable: false,
          metadata: {
            faceCount,
            imageId: el.id
          }
        });
      } else {
        console.log(`    ✅ No faces detected`);
      }
    } catch (error) {
      console.error(`    ❌ Error processing image ${el.id}:`, error.message);
      // Don't block validation if face detection fails
      continue;
    }
  }
  
  console.log(`✅ checkPeopleDetection complete: ${violations.length} warnings`);
  return violations;
}

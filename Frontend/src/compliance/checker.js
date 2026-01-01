/**
 * Checker: Validation orchestrator
 * Runs all compliance rules and returns a unified report
 */

import * as layoutRules from './rules/layout';
import * as visualRules from './rules/visual';
import * as contentRules from './rules/content';

export async function validateCanvas(editorPages, canvasSize, options = {}) {
  console.log('🔍 [COMPLIANCE CHECKER] Starting validation...');
  console.log('📊 Canvas:', { pages: editorPages.length, size: canvasSize, options });
  
  const { formatType = 'social', isAlcohol = false, enableFaceDetection = true } = options;
  
  // Flatten all elements from all pages
  const allElements = [];
  editorPages.forEach((page, pageIndex) => {
    (page.children || []).forEach(el => {
      allElements.push({ ...el, pageIndex });
    });
  });
  
  console.log(`📦 Elements to validate: ${allElements.length}`);
  
  const background = editorPages[0]?.background || '#ffffff';
  console.log(`🎨 Background color: ${background}`);
  
  // Run all rule checks
  const violations = [];
  
  console.log('🔧 Running layout rules...');
  // Layout rules
  const safeZoneViolations = layoutRules.checkSafeZones(allElements, canvasSize, formatType);
  console.log(`  ↳ Safe zones: ${safeZoneViolations.length} violations`);
  violations.push(...safeZoneViolations);
  
  const overlapViolations = layoutRules.checkOverlaps(allElements);
  console.log(`  ↳ Overlaps: ${overlapViolations.length} violations`);
  violations.push(...overlapViolations);
  
  const fontSizeViolations = layoutRules.checkMinFontSize(allElements, formatType);
  console.log(`  ↳ Font sizes: ${fontSizeViolations.length} violations`);
  violations.push(...fontSizeViolations);
  
  const ctaViolations = layoutRules.checkCTA(allElements);
  console.log(`  ↳ CTA elements: ${ctaViolations.length} violations`);
  violations.push(...ctaViolations);
  
  const valueTileViolations = layoutRules.checkValueTiles(allElements);
  console.log(`  ↳ Value tiles: ${valueTileViolations.length} violations`);
  violations.push(...valueTileViolations);
  
  const packshotSafeZoneViolations = layoutRules.checkPackshotSafeZone(allElements, formatType);
  console.log(`  ↳ Packshot safe zones: ${packshotSafeZoneViolations.length} violations`);
  violations.push(...packshotSafeZoneViolations);
  
  console.log('🎨 Running visual rules...');
  // Visual rules
  const contrastViolations = visualRules.checkContrast(allElements, background);
  console.log(`  ↳ Contrast: ${contrastViolations.length} violations`);
  violations.push(...contrastViolations);
  
  const logoViolations = visualRules.checkDrinkawareLogo(allElements, isAlcohol);
  console.log(`  ↳ Drinkaware logo: ${logoViolations.length} violations`);
  violations.push(...logoViolations);
  
  // Face detection (async, warning-level only)
  if (enableFaceDetection) {
    console.log('👤 Running face detection...');
    try {
      const faceWarnings = await visualRules.checkPeopleDetection(allElements, { enableFaceDetection });
      console.log(`  ↳ People detection: ${faceWarnings.length} warnings`);
      violations.push(...faceWarnings);
    } catch (error) {
      console.error('❌ Face detection failed:', error);
      console.warn('⚠️ Continuing without face detection');
    }
  } else {
    console.log('👤 Face detection disabled, skipping');
  }
  
  console.log('📝 Running content rules...');
  // Content rules
  const keywordViolations = contentRules.checkBlockedKeywords(allElements);
  console.log(`  ↳ Blocked keywords: ${keywordViolations.length} violations`);
  violations.push(...keywordViolations);
  
  const requiredViolations = contentRules.checkRequiredElements(allElements);
  console.log(`  ↳ Required elements: ${requiredViolations.length} violations`);
  violations.push(...requiredViolations);
  
  const dateViolations = contentRules.checkClubcardDate(allElements);
  console.log(`  ↳ Clubcard dates: ${dateViolations.length} violations`);
  violations.push(...dateViolations);
  
  // Separate by severity
  const hardFails = violations.filter(v => v.severity === 'hard');
  const warnings = violations.filter(v => v.severity === 'warning');
  
  // Calculate score
  const score = Math.max(0, 100 - (hardFails.length * 15) - (warnings.length * 5));
  
  const compliant = hardFails.length === 0;
  
  console.log(`✅ Validation complete: ${compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`);
  console.log(`📈 Score: ${score}/100 | Total violations: ${violations.length}`);
  
  if (violations.length > 0) {
    console.log('📋 Violation summary:');
    console.table(violations.map(v => ({ 
      rule: v.rule, 
      severity: v.severity, 
      element: v.elementId,
      fixable: v.autoFixable ? '✅' : '❌'
    })));
  }
  
  return {
    compliant,
    score,
    violations: hardFails,
    warnings,
    summary: {
      totalIssues: violations.length,
      hardFails: hardFails.length,
      warnings: warnings.length,
      autoFixable: violations.filter(v => v.autoFixable).length
    }
  };
}

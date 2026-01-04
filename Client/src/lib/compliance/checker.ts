/**
 * Compliance Checker for Tesco Retail Media
 * Validates canvas elements against brand guidelines
 */

import { fabric } from 'fabric';
import {
  COMPLIANCE_CONSTANTS,
  type ComplianceResult,
  type ComplianceViolation,
  type Severity,
} from './constants';
import {
  checkWCAGContrast,
  checkAPCAContrast,
  suggestAccessibleColor,
} from './color-utils';

interface CanvasElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  fill?: string;
  isLogo?: boolean;
  isSticker?: boolean;
  stickerId?: string;
}

interface CheckerOptions {
  campaignType?: 'alcohol' | 'food' | 'promotion' | 'default';
  formatType?: '9:16' | '1:1' | '16:9';
  background?: string;
}

/**
 * Main compliance checker
 */
export function checkCompliance(
  elements: CanvasElement[],
  canvasSize: { width: number; height: number },
  options: CheckerOptions = {}
): ComplianceResult {
  const {
    campaignType = 'default',
    formatType = '9:16',
    background = '#ffffff',
  } = options;

  const violations: ComplianceViolation[] = [];
  const warnings: ComplianceViolation[] = [];

  console.log('🔍 [COMPLIANCE] Starting validation...');
  console.log(`  Canvas: ${canvasSize.width}x${canvasSize.height}`);
  console.log(`  Elements: ${elements.length}`);
  console.log(`  Campaign: ${campaignType}, Format: ${formatType}`);

  // Run all checks
  violations.push(...checkSafeZones(elements, canvasSize, formatType));
  violations.push(...checkFontSizes(elements));
  violations.push(...checkContrast(elements, background));
  violations.push(...checkBlockedKeywords(elements));
  violations.push(...checkRequiredElements(elements, campaignType));
  
  // Separate warnings
  const hardViolations = violations.filter(v => v.severity === 'hard');
  const softViolations = violations.filter(v => v.severity === 'soft');
  const warningViolations = violations.filter(v => v.severity === 'warning');

  // Calculate score
  const { SEVERITY_WEIGHTS } = COMPLIANCE_CONSTANTS;
  const deductions = 
    hardViolations.length * SEVERITY_WEIGHTS.hard +
    softViolations.length * SEVERITY_WEIGHTS.soft +
    warningViolations.length * SEVERITY_WEIGHTS.warning;
  
  const score = Math.max(0, 100 - deductions);
  const compliant = hardViolations.length === 0 && score >= 70;

  console.log(`✅ [COMPLIANCE] Score: ${score}/100, Compliant: ${compliant}`);
  console.log(`  Hard: ${hardViolations.length}, Soft: ${softViolations.length}, Warnings: ${warningViolations.length}`);

  return {
    compliant,
    score,
    violations: [...hardViolations, ...softViolations],
    warnings: warningViolations,
    summary: {
      totalIssues: violations.length,
      hardIssues: hardViolations.length,
      softIssues: softViolations.length,
      warningIssues: warningViolations.length,
    },
  };
}

/**
 * Check safe zone violations
 */
function checkSafeZones(
  elements: CanvasElement[],
  canvasSize: { width: number; height: number },
  formatType: '9:16' | '1:1' | '16:9'
): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];
  const safeZone = COMPLIANCE_CONSTANTS.SAFE_ZONES[formatType];

  // Scale safe zones proportionally
  const scaleFactor = canvasSize.height / 1920;
  const topClear = Math.round(safeZone.topClear * scaleFactor);
  const bottomClear = Math.round(safeZone.bottomClear * scaleFactor);

  const checkableElements = elements.filter(
    el => el.type === 'text' || el.type === 'textbox' || el.type === 'headline' || el.type === 'subheading'
  );

  for (const el of checkableElements) {
    // Check top safe zone
    if (el.y < topClear) {
      violations.push({
        elementId: el.id,
        rule: 'SAFE_ZONE',
        severity: 'hard',
        message: `Element "${el.text?.slice(0, 20) || el.id}" is in top safe zone (y=${el.y}, must be >${topClear})`,
        autoFixable: true,
        autoFix: {
          property: 'y',
          value: topClear + 20,
        },
      });
    }

    // Check bottom safe zone
    const elementBottom = el.y + (el.height || 50);
    const bottomZoneStart = canvasSize.height - bottomClear;
    if (elementBottom > bottomZoneStart) {
      violations.push({
        elementId: el.id,
        rule: 'SAFE_ZONE',
        severity: 'hard',
        message: `Element "${el.text?.slice(0, 20) || el.id}" extends into bottom safe zone`,
        autoFixable: true,
        autoFix: {
          property: 'y',
          value: bottomZoneStart - (el.height || 50) - 20,
        },
      });
    }
  }

  return violations;
}

/**
 * Check minimum font sizes
 */
function checkFontSizes(elements: CanvasElement[]): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];
  const { MIN_FONT_SIZES } = COMPLIANCE_CONSTANTS;

  const textElements = elements.filter(
    el => el.type === 'text' || el.type === 'textbox' || el.type === 'headline' || el.type === 'subheading'
  );

  for (const el of textElements) {
    const fontSize = el.fontSize || 16;
    let minSize: number = MIN_FONT_SIZES.BODY;
    
    if (el.type === 'headline' || el.id?.includes('headline')) {
      minSize = MIN_FONT_SIZES.HEADLINE;
    } else if (el.type === 'subheading' || el.id?.includes('subheading')) {
      minSize = MIN_FONT_SIZES.SUBHEADING;
    }

    if (fontSize < minSize) {
      violations.push({
        elementId: el.id,
        rule: 'MIN_FONT_SIZE',
        severity: 'hard',
        message: `Font size ${fontSize}px is below minimum ${minSize}px for ${el.type}`,
        autoFixable: true,
        autoFix: {
          property: 'fontSize',
          value: minSize,
        },
      });
    }
  }

  return violations;
}

/**
 * Check contrast compliance
 */
function checkContrast(
  elements: CanvasElement[],
  background: string
): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];

  const textElements = elements.filter(
    el => (el.type === 'text' || el.type === 'textbox') && el.fill
  );

  for (const el of textElements) {
    const fontSize = el.fontSize || 16;
    const fontWeight = el.fontWeight || 400;
    const textColor = el.fill || '#000000';

    const wcagResult = checkWCAGContrast(textColor, background, { fontSize, fontWeight });
    const apcaResult = checkAPCAContrast(textColor, background, { fontSize, fontWeight });

    // Fail if BOTH algorithms fail
    if (!wcagResult.passes && !apcaResult.passes) {
      const suggestion = suggestAccessibleColor(background, { fontSize, fontWeight });

      violations.push({
        elementId: el.id,
        rule: 'CONTRAST_FAIL',
        severity: 'hard',
        message: `Contrast ${wcagResult.contrast}:1 is below ${wcagResult.required}:1 (WCAG). APCA: ${apcaResult.contrast}Lc vs ${apcaResult.required}Lc`,
        autoFixable: true,
        autoFix: {
          property: 'fill',
          value: suggestion.color,
        },
        metadata: {
          wcagContrast: wcagResult.contrast,
          apcaContrast: apcaResult.contrast,
          suggestedColor: suggestion.color,
        },
      });
    } else if (!apcaResult.passes) {
      // Warning if WCAG passes but APCA fails
      violations.push({
        elementId: el.id,
        rule: 'CONTRAST_APCA_WARNING',
        severity: 'warning',
        message: `Passes WCAG but fails APCA (${apcaResult.contrast}Lc < ${apcaResult.required}Lc)`,
        autoFixable: true,
        autoFix: {
          property: 'fill',
          value: suggestAccessibleColor(background, { fontSize, fontWeight }).color,
        },
      });
    }
  }

  return violations;
}

/**
 * Check for blocked keywords
 */
function checkBlockedKeywords(elements: CanvasElement[]): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];
  const { BLOCKED_KEYWORDS } = COMPLIANCE_CONSTANTS;

  const textElements = elements.filter(el => el.text);

  for (const el of textElements) {
    const text = el.text?.toLowerCase() || '';
    
    for (const keyword of BLOCKED_KEYWORDS) {
      if (text.includes(keyword.toLowerCase())) {
        violations.push({
          elementId: el.id,
          rule: 'BLOCKED_KEYWORD',
          severity: 'hard',
          message: `Blocked keyword "${keyword}" found in text`,
          autoFixable: false,
        });
      }
    }
  }

  return violations;
}

/**
 * Check required elements
 */
function checkRequiredElements(
  elements: CanvasElement[],
  campaignType: string
): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];
  
  // Get required elements for campaign type, cast to string array to allow includes check
  const requiredMap = COMPLIANCE_CONSTANTS.REQUIRED_ELEMENTS;
  const requiredElements: string[] = [
    ...(requiredMap[campaignType as keyof typeof requiredMap] || requiredMap.default)
  ];

  // Check for Tesco tag
  if (requiredElements.includes('tesco-tag')) {
    const hasTag = elements.some(
      el => el.isSticker && (
        el.stickerId?.includes('tesco') || 
        el.stickerId?.includes('available')
      )
    );
    
    if (!hasTag) {
      violations.push({
        elementId: 'canvas',
        rule: 'MISSING_TAG',
        severity: 'soft',
        message: 'Missing Tesco tag/badge',
        autoFixable: true,
        autoFix: {
          property: 'addSticker',
          value: 'available-at-tesco',
        },
      });
    }
  }

  // Check for headline
  if (requiredElements.includes('headline')) {
    const hasHeadline = elements.some(
      el => el.type === 'headline' || el.id?.includes('headline')
    );
    
    if (!hasHeadline) {
      violations.push({
        elementId: 'canvas',
        rule: 'MISSING_HEADLINE',
        severity: 'soft',
        message: 'Missing headline text',
        autoFixable: true,
        autoFix: {
          property: 'addHeadline',
          value: 'auto',
        },
      });
    }
  }

  // Check for Drinkaware (alcohol campaigns)
  if (requiredElements.includes('drinkaware')) {
    const hasDrinkaware = elements.some(
      el => el.isSticker && el.stickerId?.includes('drinkaware')
    );
    
    if (!hasDrinkaware) {
      violations.push({
        elementId: 'canvas',
        rule: 'MISSING_DRINKAWARE',
        severity: 'hard',
        message: 'Alcohol campaign requires Drinkaware logo',
        autoFixable: true,
        autoFix: {
          property: 'addSticker',
          value: 'drinkaware',
        },
      });
    }
  }

  return violations;
}

/**
 * Convert Fabric.js canvas to element array for checking
 */
export function fabricToElements(canvas: fabric.Canvas): CanvasElement[] {
  const elements: CanvasElement[] = [];
  
  canvas.getObjects().forEach((obj, index) => {
    if (obj.name === 'clip' || obj.name === 'workspace') return;

    const element: CanvasElement = {
      id: (obj as any).id || `element-${index}`,
      type: obj.type || 'unknown',
      x: obj.left || 0,
      y: obj.top || 0,
      width: obj.width || 0,
      height: obj.height || 0,
    };

    if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
      const textObj = obj as fabric.Textbox;
      element.text = textObj.text || '';
      element.fontSize = textObj.fontSize || 16;
      element.fontWeight = textObj.fontWeight as number || 400;
      element.fill = textObj.fill as string;
    }

    if ((obj as any).isLogo) element.isLogo = true;
    if ((obj as any).isSticker) element.isSticker = true;
    if ((obj as any).stickerId) element.stickerId = (obj as any).stickerId;

    elements.push(element);
  });

  return elements;
}

export { type CanvasElement, type CheckerOptions };

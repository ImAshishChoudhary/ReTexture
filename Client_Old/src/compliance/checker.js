/**
 * Checker: Validation orchestrator
 * Runs all compliance rules and returns a unified report
 */

import * as layoutRules from "./rules/layout";
import * as visualRules from "./rules/visual";
import * as contentRules from "./rules/content";

/**
 * Generate HTML preview of canvas with violation highlights
 */
function generateCanvasPreview(editorPages, canvasSize, violations) {
  const { w, h } = canvasSize;
  const background = editorPages[0]?.background || "#ffffff";

  // Collect all elements
  const allElements = [];
  editorPages.forEach((page) => {
    (page.children || []).forEach((el) => {
      const hasViolation = violations.some((v) => v.elementId === el.id);
      allElements.push({ ...el, hasViolation });
    });
  });

  // Generate HTML with proper element rendering
  let elementsHTML = allElements
    .map((el) => {
      const rotation = el.rotation || 0;
      const scaleX = el.scaleX || 1;
      const scaleY = el.scaleY || 1;
      const opacity = el.opacity !== undefined ? el.opacity : 1;

      // Calculate actual dimensions
      const actualWidth = (el.width || 100) * scaleX;
      const actualHeight = (el.height || 100) * scaleY;

      const baseStyle = `
        position: absolute;
        left: ${el.x || 0}px;
        top: ${el.y || 0}px;
        transform: rotate(${rotation}deg);
        opacity: ${opacity};
        ${
          el.hasViolation
            ? "outline: 3px solid #ff4d4f; outline-offset: 2px; box-shadow: 0 0 10px rgba(255,77,79,0.5);"
            : ""
        }
      `;

      if (el.type === "text") {
        return `<div style="${baseStyle}
          font-size: ${el.fontSize || 16}px;
          font-family: ${el.fontFamily || "Arial, sans-serif"};
          color: ${el.fill || "#000000"};
          font-weight: ${el.fontWeight || "normal"};
          text-align: ${el.align || "left"};
          white-space: pre-wrap;
          max-width: ${actualWidth}px;
          line-height: ${el.lineHeight || 1.2};
          letter-spacing: ${el.letterSpacing || 0}px;
        ">${el.text || ""}</div>`;
      } else if (el.type === "image") {
        return `<img src="${el.src}" alt="" style="${baseStyle}
          width: ${actualWidth}px;
          height: ${actualHeight}px;
          object-fit: ${el.objectFit || "cover"};
        " />`;
      } else if (el.type === "shape" || el.type === "rect") {
        return `<div style="${baseStyle}
          width: ${actualWidth}px;
          height: ${actualHeight}px;
          background: ${el.fill || "transparent"};
          border: ${
            el.stroke ? `${el.strokeWidth || 1}px solid ${el.stroke}` : "none"
          };
          border-radius: ${el.cornerRadius || 0}px;
        "></div>`;
      } else if (el.type === "logo") {
        return `<img src="${el.src}" alt="logo" style="${baseStyle}
          width: ${actualWidth}px;
          height: ${actualHeight}px;
          object-fit: contain;
        " />`;
      } else {
        // Generic element
        return `<div style="${baseStyle}
          width: ${actualWidth}px;
          height: ${actualHeight}px;
          background: ${el.fill || "#cccccc"};
        "></div>`;
      }
    })
    .join("\n");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { box-sizing: border-box; }
        body { 
          margin: 0; 
          padding: 10px; 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
          background: #f5f5f5;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 100vh;
        }
        .preview-wrapper {
          width: 100%;
          max-width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .canvas-container { 
          position: relative; 
          width: ${w}px; 
          height: ${h}px; 
          background: ${background};
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border-radius: 8px;
          overflow: hidden;
          transform-origin: top center;
        }
        /* Responsive scaling */
        @media (max-width: ${w + 40}px) {
          .canvas-container {
            transform: scale(calc((100vw - 40px) / ${w}));
          }
        }
        .violation-legend {
          width: 100%;
          max-width: ${w}px;
          padding: 12px 16px;
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 6px;
          font-size: 14px;
          color: #856404;
          text-align: center;
        }
        .stats {
          width: 100%;
          max-width: ${w}px;
          padding: 12px 16px;
          background: white;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          font-size: 13px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="preview-wrapper">
        <div class="stats">
          <strong>Canvas:</strong> ${w}×${h}px | 
          <strong>Elements:</strong> ${allElements.length} | 
          <strong>Violations:</strong> ${violations.length}
        </div>
        
        <div class="canvas-container">
          ${elementsHTML}
        </div>
        
        ${
          violations.length > 0
            ? `
          <div class="violation-legend">
            <strong>🔴 Red outlines</strong> indicate elements with compliance violations
          </div>
        `
            : `
          <div class="violation-legend" style="background: #d4edda; border-color: #c3e6cb; color: #155724;">
            <strong>✅ No violations detected</strong> - Canvas is compliant
          </div>
        `
        }
      </div>
    </body>
    </html>
  `;
}

export async function validateCanvas(editorPages, canvasSize, options = {}) {
  console.log("🔍 [COMPLIANCE CHECKER] Starting validation...");
  console.log("📊 Canvas:", {
    pages: editorPages.length,
    size: canvasSize,
    options,
  });

  const {
    formatType = "social",
    isAlcohol = false,
    enableFaceDetection = true,
  } = options;

  // Flatten all elements from all pages
  const allElements = [];
  editorPages.forEach((page, pageIndex) => {
    (page.children || []).forEach((el) => {
      allElements.push({ ...el, pageIndex });
    });
  });

  console.log(`📦 Elements to validate: ${allElements.length}`);

  const background = editorPages[0]?.background || "#ffffff";
  console.log(`🎨 Background color: ${background}`);

  // Run all rule checks
  const violations = [];

  console.log("🔧 Running layout rules...");
  // Layout rules
  const safeZoneViolations = layoutRules.checkSafeZones(
    allElements,
    canvasSize,
    formatType
  );
  console.log(`  ↳ Safe zones: ${safeZoneViolations.length} violations`);
  violations.push(...safeZoneViolations);

  const overlapViolations = layoutRules.checkOverlaps(allElements);
  console.log(`  ↳ Overlaps: ${overlapViolations.length} violations`);
  violations.push(...overlapViolations);

  const fontSizeViolations = layoutRules.checkMinFontSize(
    allElements,
    formatType
  );
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

  const logoViolations = visualRules.checkDrinkawareLogo(
    allElements,
    isAlcohol
  );
  console.log(`  ↳ Drinkaware logo: ${logoViolations.length} violations`);
  violations.push(...logoViolations);

  // Face detection (async, warning-level only)
  if (enableFaceDetection) {
    console.log("👤 Running face detection...");
    try {
      const faceWarnings = await visualRules.checkPeopleDetection(allElements, {
        enableFaceDetection,
      });
      console.log(`  ↳ People detection: ${faceWarnings.length} warnings`);
      violations.push(...faceWarnings);
    } catch (error) {
      console.error("❌ Face detection failed:", error);
      console.warn("⚠️ Continuing without face detection");
    }
  } else {
    console.log("👤 Face detection disabled, skipping");
  }

  console.log("📝 Running content rules...");
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
  const hardFails = violations.filter((v) => v.severity === "hard");
  const warnings = violations.filter((v) => v.severity === "warning");

  // Calculate score
  const score = Math.max(0, 100 - hardFails.length * 15 - warnings.length * 5);

  const compliant = hardFails.length === 0;

  console.log(
    `✅ Validation complete: ${compliant ? "COMPLIANT" : "NON-COMPLIANT"}`
  );
  console.log(
    `📈 Score: ${score}/100 | Total violations: ${violations.length}`
  );

  if (violations.length > 0) {
    console.log("📋 Violation summary:");
    console.table(
      violations.map((v) => ({
        rule: v.rule,
        severity: v.severity,
        element: v.elementId,
        fixable: v.autoFixable ? "✅" : "❌",
      }))
    );
  }

  // Generate HTML preview of canvas
  const canvasHTML = generateCanvasPreview(editorPages, canvasSize, violations);

  return {
    compliant,
    score,
    violations: hardFails,
    warnings,
    canvas: canvasHTML,
    summary: {
      totalIssues: violations.length,
      hardFails: hardFails.length,
      warnings: warnings.length,
      autoFixable: violations.filter((v) => v.autoFixable).length,
    },
  };
}

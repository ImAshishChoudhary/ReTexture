/**
 * Corrector: Auto-fix engine
 * Applies transformations to resolve violations
 */

import { validateCanvas } from "./checker";
import { getBoundingBox } from "./utils/geometry";
import { getContrastRatio } from "./utils/color";
import { getStickerById, calculateStickerSize } from "../config/stickerConfig";
import { findOptimalStickerPosition } from "../services/stickerPositionService";

export function applyAutoFixes(editorPages, canvasSize, violations) {
  console.log("🔧 [AUTO-FIX] Starting auto-correction...");
  console.log(`📋 Total violations: ${violations.length}`);

  const fixableViolations = violations.filter((v) => v.autoFixable);
  console.log(`✅ Fixable violations: ${fixableViolations.length}`);

  if (fixableViolations.length === 0) {
    console.log("⚠️ No auto-fixable violations found");
  }

  let correctedPages = JSON.parse(JSON.stringify(editorPages));
  let fixesApplied = 0;
  const unfixedViolations = [];

  violations.forEach((violation, index) => {
    if (!violation.autoFixable || !violation.autoFix) {
      console.log(
        `⏭️ [${index + 1}/${violations.length}] Skipping non-fixable: ${
          violation.rule
        } (${violation.elementId})`
      );
      unfixedViolations.push(violation);
      return;
    }

    console.log(
      `🔨 [${index + 1}/${violations.length}] Fixing ${violation.rule}...`
    );

    switch (violation.rule) {
      case "MIN_FONT_SIZE":
        console.log(
          `  ↳ Adjusting font size for ${violation.elementId} to ${violation.autoFix.value}`
        );
        correctedPages = fixFontSize(correctedPages, violation);
        fixesApplied++;
        break;

      case "SAFE_ZONE":
        console.log(
          `  ↳ Moving ${violation.elementId} to y=${violation.autoFix.value}`
        );
        correctedPages = moveElement(correctedPages, violation, canvasSize);
        fixesApplied++;
        break;

      case "CONTRAST_FAIL":
        console.log(
          `  ↳ Fixing contrast for ${violation.elementId} to ${violation.autoFix.value}`
        );
        correctedPages = fixContrast(correctedPages, violation);
        fixesApplied++;
        break;

      case "MISSING_TAG":
        console.log(`  ↳ Adding Tesco tag sticker`);
        correctedPages = addTescoTagSticker(correctedPages, canvasSize);
        fixesApplied++;
        break;

      case "MISSING_DRINKAWARE":
        console.log(`  ↳ Adding Drinkaware sticker`);
        correctedPages = addDrinkawareSticker(correctedPages, canvasSize);
        fixesApplied++;
        break;

      case "DRINKAWARE_SIZE":
        console.log(`  ↳ Resizing Drinkaware logo`);
        correctedPages = fixProperty(correctedPages, violation);
        fixesApplied++;
        break;

      case "OVERLAP":
        console.log(`  ↳ Fixing overlap for ${violation.elementId}`);
        correctedPages = fixOverlap(correctedPages, violation, canvasSize);
        fixesApplied++;
        break;

      case "MISSING_HEADLINE":
        console.log(`  ↳ Adding headline text`);
        correctedPages = addHeadline(correctedPages, canvasSize);
        fixesApplied++;
        break;

      case "BLOCKED_KEYWORD":
        console.log(
          `  ⚠️ Blocked keyword in ${violation.elementId} - requires manual fix`
        );
        console.log(`      Suggestion: Remove or rephrase the flagged text`);
        unfixedViolations.push(violation);
        break;

      default:
        console.log(`  ⚠️ Unknown rule type: ${violation.rule}`);
        unfixedViolations.push(violation);
    }
  });

  console.log(`✅ Applied ${fixesApplied} fixes`);

  // Re-run checker to validate fixes
  console.log("🔄 Re-validating after fixes...");
  const recheckResult = validateCanvas(correctedPages, canvasSize);
  console.log(
    `📊 Re-validation result: ${
      recheckResult.compliant ? "COMPLIANT ✅" : "STILL NON-COMPLIANT ⚠️"
    }`
  );
  console.log(`📈 New score: ${recheckResult.score}/100`);

  return {
    correctedPages,
    fixesApplied,
    remainingIssues: recheckResult.violations,
    remainingWarnings: recheckResult.warnings,
  };
}

// Fix helpers

function fixFontSize(pages, violation) {
  return updateElement(pages, violation.elementId, (el) => ({
    ...el,
    fontSize: violation.autoFix.value,
  }));
}

function moveElement(pages, violation, canvasSize) {
  return updateElement(pages, violation.elementId, (el) => ({
    ...el,
    y: violation.autoFix.value,
  }));
}

function fixContrast(pages, violation) {
  return updateElement(pages, violation.elementId, (el) => ({
    ...el,
    fill: violation.autoFix.value,
  }));
}

function fixProperty(pages, violation) {
  return updateElement(pages, violation.elementId, (el) => ({
    ...el,
    [violation.autoFix.property]: violation.autoFix.value,
  }));
}

function addTescoTag(pages, canvasSize) {
  const { w, h } = canvasSize;
  const background = pages[0]?.background || "#ffffff";

  // Determine best text color
  const whiteRatio = getContrastRatio("#ffffff", background);
  const blackRatio = getContrastRatio("#000000", background);
  const tagColor = whiteRatio > blackRatio ? "#ffffff" : "#000000";

  // Add to first page
  const newTag = {
    id: `compliance-tag-${Date.now()}`,
    type: "text",
    text: "Available at Tesco",
    fontSize: 20,
    fontWeight: "bold",
    x: 50,
    y: h - 180, // Safe zone compliant
    fill: tagColor,
    fontFamily: "Inter, Arial, sans-serif",
    align: "left",
  };

  const updatedPages = [...pages];
  if (updatedPages[0]) {
    updatedPages[0] = {
      ...updatedPages[0],
      children: [...(updatedPages[0].children || []), newTag],
    };
  }

  return updatedPages;
}

function updateElement(pages, elementId, updater) {
  return pages.map((page) => ({
    ...page,
    children: (page.children || []).map((el) =>
      el.id === elementId ? updater(el) : el
    ),
  }));
}

function fixOverlap(pages, violation, canvasSize) {
  // Move element down by 50px to avoid overlap
  return updateElement(pages, violation.elementId, (el) => ({
    ...el,
    y: (el.y || 0) + 50,
  }));
}

function addHeadline(pages, canvasSize) {
  const { w, h } = canvasSize;
  const background = pages[0]?.background || "#ffffff";

  // Determine best text color
  const whiteRatio = getContrastRatio("#ffffff", background);
  const blackRatio = getContrastRatio("#000000", background);
  const headlineColor = whiteRatio > blackRatio ? "#ffffff" : "#000000";

  const newHeadline = {
    id: `compliance-headline-${Date.now()}`,
    type: "text",
    text: "Your Headline Here",
    fontSize: 32,
    fontWeight: "bold",
    x: 50,
    y: 250, // Safe zone compliant
    fill: headlineColor,
    fontFamily: "Inter, Arial, sans-serif",
    align: "left",
  };

  const updatedPages = [...pages];
  if (updatedPages[0]) {
    updatedPages[0] = {
      ...updatedPages[0],
      children: [...(updatedPages[0].children || []), newHeadline],
    };
  }

  return updatedPages;
}

/**
 * Add Tesco tag sticker (smarter than plain text)
 */
function addTescoTagSticker(pages, canvasSize) {
  const stickerId = "available-at-tesco";
  const stickerConfig = getStickerById(stickerId);

  if (!stickerConfig) {
    console.error("Tesco tag sticker not found, falling back to text");
    return addTescoTag(pages, canvasSize);
  }

  const size = calculateStickerSize(stickerConfig, canvasSize);
  const imageBounds = { x: 0, y: 0, width: canvasSize.w, height: canvasSize.h };
  const existingElements = pages[0]?.children || [];

  const position = findOptimalStickerPosition(
    stickerConfig,
    size,
    imageBounds,
    existingElements,
    canvasSize
  );

  const newSticker = {
    id: `sticker-${stickerId}-${Date.now()}`,
    type: "sticker",
    stickerId: stickerId,
    src: stickerConfig.src,
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
    opacity: 1,
    draggable: true,
    metadata: {
      category: stickerConfig.category,
      satisfiesRule: "MISSING_TAG",
      name: stickerConfig.name,
    },
  };

  const updatedPages = [...pages];
  if (updatedPages[0]) {
    updatedPages[0] = {
      ...updatedPages[0],
      children: [...(updatedPages[0].children || []), newSticker],
    };
  }

  return updatedPages;
}

/**
 * Add Drinkaware sticker for alcohol campaigns
 */
function addDrinkawareSticker(pages, canvasSize) {
  const stickerId = "drinkaware";
  const stickerConfig = getStickerById(stickerId);

  if (!stickerConfig) {
    console.error("Drinkaware sticker not found");
    return pages;
  }

  const size = calculateStickerSize(stickerConfig, canvasSize);
  const imageBounds = { x: 0, y: 0, width: canvasSize.w, height: canvasSize.h };
  const existingElements = pages[0]?.children || [];

  const position = findOptimalStickerPosition(
    stickerConfig,
    size,
    imageBounds,
    existingElements,
    canvasSize
  );

  const newSticker = {
    id: `sticker-${stickerId}-${Date.now()}`,
    type: "sticker",
    stickerId: stickerId,
    src: stickerConfig.src,
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
    opacity: 1,
    draggable: true,
    metadata: {
      category: stickerConfig.category,
      satisfiesRule: "MISSING_DRINKAWARE",
      name: stickerConfig.name,
    },
  };

  const updatedPages = [...pages];
  if (updatedPages[0]) {
    updatedPages[0] = {
      ...updatedPages[0],
      children: [...(updatedPages[0].children || []), newSticker],
    };
  }

  return updatedPages;
}

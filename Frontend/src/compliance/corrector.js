/**
 * Corrector: Auto-fix engine
 * Applies transformations to resolve violations
 * Supports both local rule-based fixes and AI-powered backend fixes
 */

import { validateCanvas } from "./checker";
import { getContrastRatio } from "./utils/color";
// Local sticker-based fixes (from main branch)
import { getStickerById, calculateStickerSize } from "../config/stickerConfig";
import { findOptimalStickerPosition } from "../services/stickerPositionService";
import {
  generateHeadlines,
  generateSubheadings,
  getSmartPlacement,
} from "../api/headlineApi";
// AI-powered backend fixes (from feat/autofix branch)
import { requestAutoFix } from "../api/validationApi";
import { serializeToHTML } from "../utils/serializeToHTML";

export async function applyAutoFixes(editorPages, canvasSize, violations) {
  console.log("🔧 [AUTO-FIX] Starting auto-correction...");
  console.log(`📋 Total violations: ${violations.length}`);
  console.log("📋 Violations object:", JSON.stringify(violations, null, 2));

  const fixableViolations = violations.filter((v) => v.autoFixable);
  console.log(`✅ Fixable violations: ${fixableViolations.length}`);

  if (fixableViolations.length === 0) {
    console.log("⚠️ No auto-fixable violations found");
    return {
      correctedPages: editorPages,
      fixesApplied: 0,
      remainingIssues: violations,
      remainingWarnings: [],
    };
  }

  let correctedPages = JSON.parse(JSON.stringify(editorPages));
  let fixesApplied = 0;
  const unfixedViolations = [];

  for (let index = 0; index < violations.length; index++) {
    const violation = violations[index];
    console.log(
      `\n🔍 [${index + 1}/${violations.length}] Processing violation:`,
      {
        rule: violation.rule,
        autoFixable: violation.autoFixable,
        hasAutoFix: !!violation.autoFix,
        elementId: violation.elementId,
      }
    );

    if (!violation.autoFixable || !violation.autoFix) {
      console.log(
        `⏭️ [${index + 1}/${violations.length}] Skipping non-fixable: ${
          violation.rule
        } (${violation.elementId})`
      );
      unfixedViolations.push(violation);
      continue;
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
        console.log(`  ↳ Adding AI-generated headline`);
        correctedPages = await addHeadline(correctedPages, canvasSize);
        fixesApplied++;
        break;

      case "MISSING_SUBHEADING":
        console.log(`  ↳ Adding AI-generated subheading`);
        correctedPages = await addSubheading(correctedPages, canvasSize);
        fixesApplied++;
        break;

      case "MISSING_LOGO":
        console.log(`  ↳ Adding Tesco logo`);
        correctedPages = addTescoLogo(correctedPages, canvasSize);
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
  }

  console.log(`✅ Applied ${fixesApplied} fixes`);

  // Re-run checker to validate fixes
  console.log("🔄 Re-validating after fixes...");
  const recheckResult = await validateCanvas(correctedPages, canvasSize);
  console.log(
    `📊 Re-validation result: ${
      recheckResult.compliant ? "COMPLIANT ✅" : "STILL NON-COMPLIANT ⚠️"
    }`
  );
  console.log(`📈 New score: ${recheckResult.score}/100`);

  return {
    correctedPages,
    fixesApplied,
    remainingIssues: recheckResult.violations || [],
    remainingWarnings: recheckResult.warnings || [],
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
  return updateElement(pages, violation.elementId, (el) => {
    const updates = {
      ...el,
      fill: violation.autoFix.value,
    };

    // FIRST PRINCIPLE: If text is over an image (indicated by calculatedAgainst being dark),
    // add shadow for better readability
    const backgroundIsDark =
      violation.autoFix.calculatedAgainst?.startsWith("#1a") ||
      violation.autoFix.calculatedAgainst?.startsWith("#0");

    if (backgroundIsDark && el.type === "text") {
      console.log(`  ↳ Adding text shadow for better readability over image`);
      updates.shadowEnabled = true;
      updates.shadowColor =
        violation.autoFix.value === "#ffffff"
          ? "rgba(0,0,0,0.7)" // Black shadow for white text
          : "rgba(255,255,255,0.7)"; // White shadow for black text
      updates.shadowBlur = 4;
      updates.shadowOffsetX = 2;
      updates.shadowOffsetY = 2;
    }

    return updates;
  });
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

  // Use optimal contrast calculation
  const tagColor = getOptimalTextColor(background, false); // Normal text size

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

/**
 * FIRST PRINCIPLE: Calculate optimal text color for maximum contrast
 * WCAG AA requires 4.5:1 for normal text, 3:1 for large text
 * @param {string} backgroundColor - Hex color of background
 * @param {boolean} isLargeText - Whether text is large (>= 24px or bold >= 19px)
 * @returns {string} '#ffffff' or '#000000'
 */
function getOptimalTextColor(backgroundColor, isLargeText = true) {
  const whiteRatio = getContrastRatio("#ffffff", backgroundColor);
  const blackRatio = getContrastRatio("#000000", backgroundColor);
  const minRatio = isLargeText ? 3.0 : 4.5;

  console.log(`🎨 [CONTRAST] Background: ${backgroundColor}`);
  console.log(
    `  ↳ White contrast: ${whiteRatio.toFixed(2)}:1 (${
      whiteRatio >= minRatio ? "✅" : "❌"
    } ${minRatio}:1)`
  );
  console.log(
    `  ↳ Black contrast: ${blackRatio.toFixed(2)}:1 (${
      blackRatio >= minRatio ? "✅" : "❌"
    } ${minRatio}:1)`
  );

  // Choose the color with better contrast
  const optimalColor = whiteRatio > blackRatio ? "#ffffff" : "#000000";
  const optimalRatio = Math.max(whiteRatio, blackRatio);

  console.log(`  ↳ Optimal: ${optimalColor} (${optimalRatio.toFixed(2)}:1)`);

  return optimalColor;
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

/**
 * Add AI-generated headline to canvas
 */
async function addHeadline(pages, canvasSize) {
  console.log("🤖 [AUTO-FIX] Generating AI headline...");

  try {
    // Get canvas image for AI analysis
    // Note: Canvas capture not available in corrector context, AI will work without visual analysis
    const canvasImageBase64 = null;

    // Generate headlines with AI

    // Call AI headline generation
    const result = await generateHeadlines({
      imageBase64: canvasImageBase64,
      designId: "autofix-" + Date.now(),
      campaignType: "promotion",
      userKeywords: null,
    });

    if (!result.success || !result.headlines || result.headlines.length === 0) {
      console.warn("⚠️ AI generation failed, adding placeholder");
      return addPlaceholderHeadline(pages, canvasSize);
    }

    // Get top-rated headline
    const topHeadline = result.headlines[0];
    console.log(`✅ [AUTO-FIX] Using AI headline: "${topHeadline.text}"`);

    // Request smart placement from AI
    const placementResult = await getSmartPlacement({
      imageBase64: canvasImageBase64,
      canvasWidth: canvasSize.w,
      canvasHeight: canvasSize.h,
    });

    const { w } = canvasSize;

    // FIRST PRINCIPLE: Trust AI's visual analysis for color
    // AI has seen the actual image and can determine contrast better than we can from background color alone
    const headlinePlacement = placementResult?.placement?.headline;

    // Fallback: Calculate contrast only if AI didn't provide color
    let headlineColor = headlinePlacement?.color;
    if (!headlineColor) {
      console.warn(
        "⚠️ [AUTO-FIX] AI didn't provide headline color, calculating from background"
      );
      const background = pages[0]?.background || "#ffffff";
      headlineColor = getOptimalTextColor(background, true); // Large/bold text
    } else {
      console.log(
        `✅ [AUTO-FIX] Using AI-recommended headline color: ${headlineColor}`
      );
    }

    const finalHeadlinePlacement = {
      x: headlinePlacement?.x || 50,
      y: headlinePlacement?.y || 250,
      fontSize: headlinePlacement?.fontSize || 42,
      fontWeight: headlinePlacement?.fontWeight || "bold",
      color: headlineColor,
      fontFamily: headlinePlacement?.fontFamily || "Inter, Arial, sans-serif",
      align: headlinePlacement?.align || "center",
      shadow: headlinePlacement?.shadow,
      shadowColor: headlinePlacement?.shadowColor,
      shadowBlur: headlinePlacement?.shadowBlur,
      shadowOffsetX: headlinePlacement?.shadowOffsetX,
      shadowOffsetY: headlinePlacement?.shadowOffsetY,
    };

    const newHeadline = {
      id: `headline-${Date.now()}`,
      type: "text",
      text: topHeadline.text,
      x: finalHeadlinePlacement.x,
      y: finalHeadlinePlacement.y,
      fontSize: finalHeadlinePlacement.fontSize,
      fill: finalHeadlinePlacement.color,
      fontFamily: finalHeadlinePlacement.fontFamily,
      bold: true,
      align: finalHeadlinePlacement.align,
      width: w * 0.8,
      wrap: "word",
      draggable: true,
      shadowEnabled: finalHeadlinePlacement.shadow !== false,
      shadowColor: finalHeadlinePlacement.shadowColor || "rgba(0,0,0,0.5)",
      shadowBlur: finalHeadlinePlacement.shadowBlur || 4,
      shadowOffsetX: finalHeadlinePlacement.shadowOffsetX || 2,
      shadowOffsetY: finalHeadlinePlacement.shadowOffsetY || 2,
    };

    const updatedPages = [...pages];
    if (updatedPages[0]) {
      // Remove existing headlines first
      updatedPages[0] = {
        ...updatedPages[0],
        children: [
          ...(updatedPages[0].children || []).filter(
            (el) => !el.id?.startsWith("headline-")
          ),
          newHeadline,
        ],
      };
    }

    return updatedPages;
  } catch (error) {
    console.error("❌ [AUTO-FIX] AI headline generation failed:", error);
    return addPlaceholderHeadline(pages, canvasSize);
  }
}

/**
 * Fallback: Add placeholder headline
 */
function addPlaceholderHeadline(pages, canvasSize) {
  const { w, h } = canvasSize;
  const background = pages[0]?.background || "#ffffff";

  // Use optimal contrast calculation for large/bold text
  const headlineColor = getOptimalTextColor(background, true);

  const newHeadline = {
    id: `headline-${Date.now()}`,
    type: "text",
    text: "Your Headline Here",
    fontSize: 42,
    bold: true,
    x: 50,
    y: 250,
    fill: headlineColor,
    fontFamily: "Inter, Arial, sans-serif",
    align: "center",
    width: w * 0.8,
    wrap: "word",
    draggable: true,
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
 * Add AI-generated subheading to canvas
 */
async function addSubheading(pages, canvasSize) {
  console.log("🤖 [AUTO-FIX] Generating AI subheading...");

  try {
    // Note: Canvas capture not available in corrector context, AI will work without visual analysis
    const canvasImageBase64 = null;

    // Call AI subheading generation
    const result = await generateSubheadings({
      imageBase64: canvasImageBase64,
      designId: "autofix-" + Date.now(),
      campaignType: "promotion",
      userKeywords: null,
    });

    if (
      !result.success ||
      !result.subheadings ||
      result.subheadings.length === 0
    ) {
      console.warn("⚠️ AI generation failed, adding placeholder");
      return addPlaceholderSubheading(pages, canvasSize);
    }

    // Get top-rated subheading
    const topSubheading = result.subheadings[0];
    console.log(`✅ [AUTO-FIX] Using AI subheading: "${topSubheading.text}"`);

    // Request smart placement from AI
    const placementResult = await getSmartPlacement({
      imageBase64: canvasImageBase64,
      canvasWidth: canvasSize.w,
      canvasHeight: canvasSize.h,
    });

    const { w } = canvasSize;

    // FIRST PRINCIPLE: Trust AI's visual analysis for color
    const subheadingPlacement = placementResult?.placement?.subheading;

    // Fallback: Calculate contrast only if AI didn't provide color
    let subheadingColor = subheadingPlacement?.color;
    if (!subheadingColor) {
      console.warn(
        "⚠️ [AUTO-FIX] AI didn't provide subheading color, calculating from background"
      );
      const background = pages[0]?.background || "#ffffff";
      subheadingColor = getOptimalTextColor(background, true); // Large text
    } else {
      console.log(
        `✅ [AUTO-FIX] Using AI-recommended subheading color: ${subheadingColor}`
      );
    }

    const finalSubheadingPlacement = {
      x: subheadingPlacement?.x || 50,
      y: subheadingPlacement?.y || 350,
      fontSize: subheadingPlacement?.fontSize || 22,
      fontWeight: subheadingPlacement?.fontWeight || "normal",
      color: subheadingColor,
      fontFamily:
        subheadingPlacement?.fontFamily || "Open Sans, Arial, sans-serif",
      align: subheadingPlacement?.align || "center",
      shadow: subheadingPlacement?.shadow,
      shadowColor: subheadingPlacement?.shadowColor,
    };

    const newSubheading = {
      id: `subheading-${Date.now()}`,
      type: "text",
      text: topSubheading.text,
      x: finalSubheadingPlacement.x,
      y: finalSubheadingPlacement.y,
      fontSize: finalSubheadingPlacement.fontSize,
      fill: finalSubheadingPlacement.color,
      fontFamily: finalSubheadingPlacement.fontFamily,
      bold: false,
      align: finalSubheadingPlacement.align,
      width: w * 0.8,
      wrap: "word",
      draggable: true,
    };

    const updatedPages = [...pages];
    if (updatedPages[0]) {
      // Remove existing subheadings first
      updatedPages[0] = {
        ...updatedPages[0],
        children: [
          ...(updatedPages[0].children || []).filter(
            (el) => !el.id?.startsWith("subheading-")
          ),
          newSubheading,
        ],
      };
    }

    return updatedPages;
  } catch (error) {
    console.error("❌ [AUTO-FIX] AI subheading generation failed:", error);
    return addPlaceholderSubheading(pages, canvasSize);
  }
}

/**
 * Fallback: Add placeholder subheading
 */
function addPlaceholderSubheading(pages, canvasSize) {
  const { w } = canvasSize;
  const background = pages[0]?.background || "#ffffff";

  // Use optimal contrast calculation for large text
  const subheadingColor = getOptimalTextColor(background, true);

  const newSubheading = {
    id: `subheading-${Date.now()}`,
    type: "text",
    text: "Your subheading here",
    fontSize: 24,
    bold: false,
    x: 50,
    y: 350,
    fill: subheadingColor,
    fontFamily: "Open Sans, Arial, sans-serif",
    align: "center",
    width: w * 0.8,
    wrap: "word",
    draggable: true,
  };

  const updatedPages = [...pages];
  if (updatedPages[0]) {
    updatedPages[0] = {
      ...updatedPages[0],
      children: [...(updatedPages[0].children || []), newSubheading],
    };
  }

  return updatedPages;
}

/**
 * Add Tesco logo using smart positioning
 */
function addTescoLogo(pages, canvasSize) {
  console.log("🏪 [AUTO-FIX] Adding Tesco logo...");

  try {
    // Get image bounds (find main product image)
    const mainImage = (pages[0]?.children || []).find(
      (el) => el.type === "image" && !el.isLogo && el.type !== "sticker"
    );

    if (!mainImage) {
      console.warn(
        "⚠️ No main image found, positioning logo at default location"
      );
      return addLogoAtDefault(pages, canvasSize);
    }

    const imageBounds = {
      x: mainImage.x || 0,
      y: mainImage.y || 0,
      width: mainImage.width || canvasSize.w,
      height: mainImage.height || canvasSize.h,
    };

    // Calculate logo size (12% of image width)
    const logoWidth = Math.round((imageBounds.width * 12) / 100);
    const logoAspectRatio = 1.5; // Tesco logo aspect ratio
    const logoHeight = Math.round(logoWidth / logoAspectRatio);

    // Position at bottom-right with padding
    const padding = Math.max(10, imageBounds.width * 0.02);
    const logoX = imageBounds.x + imageBounds.width - logoWidth - padding;
    const logoY = imageBounds.y + imageBounds.height - logoHeight - padding;

    const tescoLogo = {
      id: `logo-${Date.now()}`,
      type: "image",
      src: "/src/assets/tesco-logo.png",
      x: logoX,
      y: logoY,
      width: logoWidth,
      height: logoHeight,
      rotation: 0,
      opacity: 1.0,
      draggable: true,
      isLogo: true,
    };

    const updatedPages = [...pages];
    if (updatedPages[0]) {
      // Remove existing logos first
      updatedPages[0] = {
        ...updatedPages[0],
        children: [
          ...(updatedPages[0].children || []).filter(
            (el) => !el.id?.startsWith("logo-") || el.isLogo !== true
          ),
          tescoLogo,
        ],
      };
    }

    console.log("✅ [AUTO-FIX] Tesco logo added at bottom-right");
    return updatedPages;
  } catch (error) {
    console.error("❌ [AUTO-FIX] Logo addition failed:", error);
    return addLogoAtDefault(pages, canvasSize);
  }
}

/**
 * Fallback: Add logo at default position
 */
function addLogoAtDefault(pages, canvasSize) {
  const { w, h } = canvasSize;
  const logoWidth = 100;
  const logoHeight = 67;

  const tescoLogo = {
    id: `logo-${Date.now()}`,
    type: "image",
    src: "/src/assets/tesco-logo.png",
    x: w - logoWidth - 20,
    y: h - logoHeight - 20,
    width: logoWidth,
    height: logoHeight,
    rotation: 0,
    opacity: 1.0,
    draggable: true,
    isLogo: true,
  };

  const updatedPages = [...pages];
  if (updatedPages[0]) {
    updatedPages[0] = {
      ...updatedPages[0],
      children: [...(updatedPages[0].children || []), tescoLogo],
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

/**
 * AI-Powered Auto-Fix using Backend LLM
 * 
 * @param {Array} editorPages - Current canvas pages
 * @param {Object} canvasSize - Canvas dimensions {w, h}
 * @param {Array} violations - Detected violations
 * @returns {Promise<Object>} {success, correctedPages, fixesApplied, error}
 */
export async function applyAutoFixesWithBackend(editorPages, canvasSize, violations) {
  console.log("🤖 [AI AUTO-FIX] Starting AI-powered auto-correction...");
  console.log(`📋 Total violations: ${violations.length}`);
  console.log("📊 [AI AUTO-FIX] Input data:", {
    editorPages: editorPages.length,
    canvasSize,
    violations: violations.map(v => ({ rule: v.rule, elementId: v.elementId }))
  });

  try {
    // Step 1: Validate inputs and serialize canvas to HTML/CSS
    if (!canvasSize || typeof canvasSize.w !== 'number' || typeof canvasSize.h !== 'number') {
      throw new Error('Invalid canvasSize: expected { w: number, h: number }');
    }

    const activePage = editorPages[0]; // Currently only fixing first page
    if (!activePage) {
      throw new Error("No active page to fix");
    }

    console.log("📝 [AI AUTO-FIX] Active page:", {
      childrenCount: activePage.children?.length || 0,
      background: activePage.background
    });

    // Pass canvasSize through to serialization (fixes undefined .w/.h errors)
    const serialized = serializeToHTML(editorPages, 0, canvasSize);
    console.log("📄 [AI AUTO-FIX] Canvas serialized to HTML");
    console.log("📏 [AI AUTO-FIX] Serialized sizes:", {
      htmlLength: serialized.html.length,
      cssLength: serialized.css.length
    });

    // Step 2: Extract images (create placeholder map)
    const imageMap = {};
    let imageCounter = 0;
    
    // Find all image elements and map to placeholders
    activePage.children?.forEach((el) => {
      if (el.type === 'image' && el.src) {
        const placeholder = `IMG_${++imageCounter}`;
        imageMap[placeholder] = el.src;
      }
    });

    console.log(`🖼️ [AI AUTO-FIX] Extracted ${imageCounter} images`);

    // Step 3: Call backend auto-fix API
    console.log("📡 [AI AUTO-FIX] Preparing API request...");
    const apiRequest = {
      html: serialized.html,
      css: serialized.css,
      images: imageMap,
      violations: violations.map(v => ({
        elementId: v.elementId || null,
        rule: v.rule,
        severity: v.severity || 'hard',
        message: v.message,
        autoFixable: v.autoFixable !== false
      })),
      canvasWidth: canvasSize.w,
      canvasHeight: canvasSize.h
    };
    
    console.log("🚀 [AI AUTO-FIX] Sending request to backend API...");
    console.log("📦 [AI AUTO-FIX] Request payload:", {
      htmlLength: apiRequest.html.length,
      cssLength: apiRequest.css.length,
      imageCount: Object.keys(apiRequest.images).length,
      violationCount: apiRequest.violations.length,
      canvasSize: { w: apiRequest.canvasWidth, h: apiRequest.canvasHeight }
    });
    
    const response = await requestAutoFix(apiRequest);
    
    console.log("📥 [AI AUTO-FIX] Response received from backend:", response);

    if (!response.success) {
      console.error("❌ [AI AUTO-FIX] Backend auto-fix failed:", response.error);
      return {
        success: false,
        correctedPages: editorPages,
        fixesApplied: 0,
        error: response.error || "Auto-fix failed"
      };
    }

    console.log(`✅ [AI AUTO-FIX] Received ${response.fixes_applied.length} fixes from AI`);

    // Step 4: Parse corrected HTML back to canvas elements
    const correctedPages = parseHTMLToCanvas(
      response.corrected_html,
      response.corrected_css,
      editorPages,
      canvasSize
    );

    // Step 5: Re-validate
    console.log("🔄 [AI AUTO-FIX] Re-validating after AI fixes...");
    const recheckResult = validateCanvas(correctedPages, canvasSize);
    console.log(
      `📊 Re-validation result: ${
        recheckResult.compliant ? "COMPLIANT ✅" : "STILL NON-COMPLIANT ⚠️"
      }`
    );
    console.log(`📈 New score: ${recheckResult.score}/100`);

    return {
      success: true,
      correctedPages,
      fixesApplied: response.fixes_applied.length,
      fixDetails: response.fixes_applied,
      remainingIssues: recheckResult.violations,
      remainingWarnings: recheckResult.warnings,
      llmIterations: response.llm_iterations
    };

  } catch (error) {
    console.error("❌ [AI AUTO-FIX] Fatal error:", error);
    return {
      success: false,
      correctedPages: editorPages,
      fixesApplied: 0,
      error: error.message || "Unexpected error during AI auto-fix"
    };
  }
}


/**
 * Parse corrected HTML/CSS back to canvas element structure
 * Maps HTML changes back to Zustand state format
 * 
 * @param {string} html - Corrected HTML from backend
 * @param {string} css - Corrected CSS from backend
 * @param {Array} originalPages - Original canvas pages for fallback
 * @param {Object} canvasSize - Canvas dimensions
 * @returns {Array} Updated canvas pages
 */
function parseHTMLToCanvas(html, css, originalPages, canvasSize) {
  console.log("🔄 [AI AUTO-FIX] Parsing corrected HTML back to canvas...");

  try {
    // Create a temporary DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const styleSheet = parseCSSToObject(css);

    const updatedChildren = [];

    // Find canvas container
    const container = doc.querySelector('.canvas-container');
    if (!container) {
      console.warn("⚠️ [AI AUTO-FIX] No canvas-container found, using original");
      return originalPages;
    }

    // Parse each element
    Array.from(container.children).forEach((domElement, index) => {
      const className = domElement.className;
      const styles = styleSheet[`.${className}`] || {};

      // Extract element type and ID from class name (e.g., "element-text-abc123")
      const classMatch = className.match(/element-(\w+)-(.+)/);
      if (!classMatch) return;

      const [, type, id] = classMatch;

      // Build canvas element object
      const canvasElement = {
        id: id,
        type: type,
        x: parseFloat(styles.left) || 0,
        y: parseFloat(styles.top) || 0,
        width: parseFloat(styles.width) || 100,
        height: parseFloat(styles.height) || 50
      };

      // Type-specific properties
      if (type === 'text' || type === 'headline' || type === 'subheading') {
        canvasElement.text = domElement.textContent || '';
        canvasElement.fontSize = parseFloat(styles['font-size']) || 16;
        canvasElement.fontFamily = styles['font-family'] || 'Inter';
        canvasElement.fill = styles.color || '#000000';
        canvasElement.fontWeight = styles['font-weight'] || 'normal';
        canvasElement.align = styles['text-align'] || 'left';
      } else if (type === 'image') {
        canvasElement.src = domElement.src || '';
      } else if (type === 'shape') {
        canvasElement.fill = styles['background-color'] || '#cccccc';
      }

      updatedChildren.push(canvasElement);
    });

    console.log(`✅ [AI AUTO-FIX] Parsed ${updatedChildren.length} elements from HTML`);

    // Update first page with corrected children
    const updatedPages = [...originalPages];
    if (updatedPages[0]) {
      updatedPages[0] = {
        ...updatedPages[0],
        children: updatedChildren
      };
    }

    return updatedPages;

  } catch (error) {
    console.error("❌ [AI AUTO-FIX] HTML parsing failed:", error);
    return originalPages; // Fallback to original on error
  }
}


/**
 * Parse CSS string to object map
 * 
 * @param {string} css - CSS string
 * @returns {Object} {selector: {property: value}}
 */
function parseCSSToObject(css) {
  const styleMap = {};
  
  // Simple regex-based CSS parser
  const ruleRegex = /([^{]+)\{([^}]+)\}/g;
  let match;

  while ((match = ruleRegex.exec(css)) !== null) {
    const selector = match[1].trim();
    const declarations = match[2].trim();
    
    const properties = {};
    declarations.split(';').forEach(decl => {
      const [prop, value] = decl.split(':').map(s => s?.trim());
      if (prop && value) {
        properties[prop] = value;
      }
    });

    styleMap[selector] = properties;
  }

  return styleMap;
}


/**
 * Corrector: Auto-fix engine
 * Applies transformations to resolve violations
 * Supports both local rule-based fixes and AI-powered backend fixes
 */

import { validateCanvas } from "./checker";
import { getBoundingBox } from "./utils/geometry";
import { getContrastRatio } from "./utils/color";
import { requestAutoFix } from "../api/validationApi";
import { serializeToHTML } from "../utils/serializeToHTML";

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
        console.log(`  ↳ Adding Tesco tag`);
        correctedPages = addTescoTag(correctedPages, canvasSize);
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


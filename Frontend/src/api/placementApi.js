/**
 * LLM-Powered Placement API
 *
 * Sends canvas element structure to Agent endpoint
 * LLM analyzes layout and returns optimal {x, y} coordinates
 */

const AGENT_URL = "http://localhost:8001";

/**
 * Get smart placement for an element using LLM
 * @param {Array} canvasElements - Array of elements on canvas
 * @param {Object} canvasSize - { w, h }
 * @param {Object} elementToPlace - { type, width, height }
 * @returns {Promise<{x, y, confidence, reasoning}>}
 */
export async function getSmartPlacement(
  canvasElements,
  canvasSize,
  elementToPlace,
  subjectBounds = null,
  imageBase64 = null
) {
  console.log(
    "🤖 [PLACEMENT API] Requesting smart placement (Vision Enabled)..."
  );
  console.log("📐 [PLACEMENT API] Canvas size:", canvasSize);
  console.log("🎯 [PLACEMENT API] Element to place:", elementToPlace);
  console.log("📦 [PLACEMENT API] Subject bounds:", subjectBounds);

  try {
    const response = await fetch(`${AGENT_URL}/placement/smart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        canvas_size: canvasSize,
        elements: canvasElements.map((el) => ({
          id: el.id,
          type: el.type,
          x: Math.round(el.x || 0),
          y: Math.round(el.y || 0),
          width: Math.round(el.width || 100),
          height: Math.round(el.height || 100),
          text: el.text || null,
        })),
        element_to_place: elementToPlace,
        subject_bounds: subjectBounds,
        image_base64: imageBase64, // Send visual context to backend
      }),
    });

    if (response.status === 429) {
      console.warn("⚠️ [PLACEMENT API] Rate limit hit (429)");
      throw new Error("Rate limit exceeded");
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ [PLACEMENT API] Response:", result);

    // Trust backend placement - it has full spatial analysis
    let finalX = result.x;
    let finalY = result.y;

    // Optional: Apply complementary positioning for subheadings
    if (elementToPlace.type === "subheading") {
      const headline = canvasElements.find(
        (el) => el.type === "headline" || el.id?.startsWith("headline-")
      );
      if (headline) {
        console.log(
          "🔗 [PLACEMENT API] Found headline for potential complementary positioning..."
        );
        // Backend handles this, but we can optionally adjust for aesthetic pairing
        const idealY = headline.y + headline.height + 15;

        // Only override if backend placed it very far from headline (>200px gap)
        if (Math.abs(finalY - idealY) > 200 && result.confidence < 0.7) {
          console.log(
            "🔗 [PLACEMENT API] Adjusting subheading closer to headline..."
          );
          finalX =
            headline.x + (headline.width - (elementToPlace.width || 400)) / 2;
          finalY = idealY;
          console.log(
            `🔗 [PLACEMENT API] Adjusted to: x=${finalX}, y=${finalY}`
          );
        }
      }
    }

    return {
      x: finalX,
      y: finalY,
      confidence: result.confidence || 0.8,
      reasoning: result.reasoning || "Spatial analysis placement",
      success: true,
    };
  } catch (error) {
    console.error("❌ [PLACEMENT API] Error:", error.message);

    // Return fallback position
    return getFallbackPosition(elementToPlace, canvasSize, subjectBounds);
  }
}

/**
 * Fallback positioning when LLM is unavailable
 */
function getFallbackPosition(element, canvasSize, subjectBounds) {
  console.log("⚠️ [PLACEMENT API] Using fallback position");

  const { w, h } = canvasSize;
  const padding = Math.round(w * 0.05);

  let x, y;

  // Safe zones helper
  const isOverlappingSubject = (testRect) => {
    if (!subjectBounds) return false;
    return (
      testRect.x < subjectBounds.x + subjectBounds.width &&
      testRect.x + testRect.width > subjectBounds.x &&
      testRect.y < subjectBounds.y + subjectBounds.height &&
      testRect.y + testRect.height > subjectBounds.y
    );
  };

  switch (element.type) {
    case "badge":
      // Bottom-left corner usually safe
      x = padding;
      y = h - element.height - padding - 80;
      break;

    case "headline":
      // Top area
      x = w * 0.5 - (element.width || w * 0.8) / 2; // Center horizontally
      y = Math.round(h * 0.1); // 10% from top (safer)

      // If overlapping subject, try moving up
      if (
        isOverlappingSubject({
          x,
          y,
          width: element.width || 600,
          height: element.height || 100,
        })
      ) {
        y = Math.max(20, subjectBounds.y - (element.height || 100) - 20);
      }
      break;

    case "subheading":
      // Below headline area
      x = w * 0.5 - (element.width || w * 0.6) / 2;
      y = Math.round(h * 0.2); // 20% from top

      if (
        isOverlappingSubject({
          x,
          y,
          width: element.width || 400,
          height: element.height || 60,
        })
      ) {
        y = Math.max(60, subjectBounds.y - (element.height || 60) - 10);
      }
      break;

    case "logo":
      // Bottom-right corner
      x = w - element.width - padding;
      y = h - element.height - padding;
      break;

    default:
      x = padding;
      y = Math.round(h * 0.1);
  }

  return {
    x,
    y,
    confidence: 0.5,
    reasoning: "Fallback position (API unavailable)",
    success: false,
  };
}

/**
 * Extract canvas elements structure for API
 */
export function extractCanvasElements(page) {
  if (!page?.children) return [];

  return page.children.map((el) => {
    // Determine semantic type for LLM context
    let semanticType = el.type;
    if (el.id?.startsWith("headline-")) semanticType = "headline";
    if (el.id?.startsWith("subheading-")) semanticType = "subheading";
    if (el.id?.startsWith("badge-")) semanticType = "badge";
    if (el.id?.startsWith("logo-")) semanticType = "logo";

    return {
      id: el.id,
      type: semanticType, // Send specific type (headline vs text)
      x: el.x || 0,
      y: el.y || 0,
      width: el.width || 100,
      height: el.height || 50,
      text: el.text || null,
    };
  });
}

export default { getSmartPlacement, extractCanvasElements };

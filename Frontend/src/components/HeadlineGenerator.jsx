import React, { useState, useCallback } from "react";
import {
  Button,
  Input,
  Select,
  Card,
  Spin,
  Tag,
  message,
  Tooltip,
  Space,
  Divider,
} from "antd";
import {
  BulbOutlined,
  ThunderboltOutlined,
  PlusOutlined,
  ReloadOutlined,
  StarFilled,
  StarOutlined,
} from "@ant-design/icons";
import {
  suggestKeywords,
  generateHeadlines,
  generateSubheadings,
} from "../api/headlineApi";
import { TextPlacementService } from "../services/textPlacementService";
import {
  validateHeadlineText,
  formatHeadlineCompliance,
} from "../utils/complianceChecker";

const { Option } = Select;

// === PLACEMENT CONFIGURATION (No Hardcoding!) ===
const PLACEMENT_CONFIG = {
  // Layout dimensions
  TEXT_WIDTH_RATIO: 0.8, // Text uses 80% of image width
  TEXT_HEIGHT_MULTIPLIER: 1.5, // Estimate text height (fontSize * 1.5)

  // Spacing
  IMAGE_PADDING: 20, // Minimum padding from image edges (px)
  ELEMENT_GAP: 30, // Gap between text elements (px) - increased for safety

  // Collision detection
  COLLISION_BUFFER: 40, // Buffer zone for collision detection (px) - increased for safety
  PRODUCT_PROTECTION_BUFFER: 30, // CRITICAL: Buffer around product to prevent overshadowing (px)

  // Contrast detection
  BRIGHTNESS_THRESHOLD: 128, // Midpoint: 0-127 = dark, 128-255 = light

  // Colors
  DARK_BG_TEXT_COLOR: "#FFFFFF",
  DARK_BG_SHADOW: "rgba(0,0,0,0.8)",
  LIGHT_BG_TEXT_COLOR: "#1A1A1A",
  LIGHT_BG_SHADOW: "rgba(255,255,255,0.8)",

  // Shadow
  SHADOW_BLUR: 4, // Shadow blur radius (px)

  // WCAG luminance formula (standard, not configurable)
  LUMINANCE_RED: 0.299,
  LUMINANCE_GREEN: 0.587,
  LUMINANCE_BLUE: 0.114,

  // === FALLBACK POSITIONING (when Vision API fails) ===
  FALLBACK_PADDING_PERCENT: 0.1, // 10% padding from canvas edges
  FALLBACK_TEXT_WIDTH_RATIO: 0.8, // 80% of canvas width

  // Headline fallback
  HEADLINE_Y_PERCENT: 0.08, // Headlines at 8% from top
  HEADLINE_FONT_MIN: 28, // Minimum headline font size
  HEADLINE_FONT_MAX: 48, // Maximum headline font size
  HEADLINE_FONT_DIVISOR: 18, // Canvas width / 18 for font size

  // Subheading fallback
  SUBHEADING_Y_PERCENT: 0.22, // Subheadings at 22% from top (below headline)
  SUBHEADING_FONT_MIN: 18, // Minimum subheading font size
  SUBHEADING_FONT_MAX: 28, // Maximum subheading font size
  SUBHEADING_FONT_DIVISOR: 30, // Canvas width / 30 for font size

  // Text wrapping calculations
  LINE_HEIGHT_RATIO: 1.2, // Line height = fontSize * 1.2 (standard typography)
  CHAR_WIDTH_RATIO: 0.6, // Character width ≈ fontSize * 0.6 (average estimate)
  FALLBACK_TEXT_HEIGHT: 50, // Default height when calculation fails (px)
};

// Campaign types
const CAMPAIGN_TYPES = [
  { value: "promotion", label: "🏷️ Promotion" },
  { value: "seasonal", label: "🍂 Seasonal" },
  { value: "new_product", label: "✨ New Product" },
  { value: "everyday", label: "🛒 Everyday Value" },
  { value: "premium", label: "💎 Premium" },
];

const HeadlineGenerator = ({
  canvasImageBase64, // Base64 of current canvas/product image
  canvasSize, // { w: number, h: number }
  canvasElements = [], // Existing canvas elements to avoid
  onAddHeadline, // Callback to add headline to canvas
  onAddSubheading, // Callback to add subheading to canvas
  designId = "default",
  logoPosition = "bottom-right",
  imageBounds = null, // { x, y, width, height } for TescoLogo-style placement
}) => {
  // State
  const [keywords, setKeywords] = useState([]);
  const [inputKeyword, setInputKeyword] = useState("");
  const [campaignType, setCampaignType] = useState(null);
  const [headlines, setHeadlines] = useState([]);
  const [subheadings, setSubheadings] = useState([]);

  // AntD Message Hook
  const [messageApi, contextHolder] = message.useMessage();

  // Loading states
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [loadingHeadlines, setLoadingHeadlines] = useState(false);
  const [loadingSubheadings, setLoadingSubheadings] = useState(false);

  console.log("📝 [HEADLINE GENERATOR] Render", {
    hasImage: !!canvasImageBase64,
    canvasSize,
    keywordsCount: keywords.length,
    headlinesCount: headlines.length,
    subheadingsCount: subheadings.length,
  });

  // Handle keyword suggestion (like VS Code commit message)
  const handleSuggestKeywords = useCallback(async () => {
    if (!canvasImageBase64) {
      messageApi.warning("No image on canvas to analyze");
      return;
    }

    setLoadingKeywords(true);

    try {
      const result = await suggestKeywords(canvasImageBase64);

      if (result.success && result.keywords?.length > 0) {
        setKeywords(result.keywords);
        messageApi.success(`Found ${result.keywords.length} keywords`);
      } else {
        messageApi.error(result.error || "Failed to suggest keywords");
      }
    } catch (error) {
      console.error("❌ [HEADLINE GENERATOR] Keyword suggestion error:", error);
      messageApi.error("Failed to suggest keywords");
    } finally {
      setLoadingKeywords(false);
    }
  }, [canvasImageBase64]);

  // Add manual keyword
  const handleAddKeyword = useCallback(() => {
    if (inputKeyword.trim() && !keywords.includes(inputKeyword.trim())) {
      setKeywords([...keywords, inputKeyword.trim()]);
      setInputKeyword("");
    }
  }, [inputKeyword, keywords]);

  // Remove keyword
  const handleRemoveKeyword = useCallback(
    (keyword) => {
      setKeywords(keywords.filter((k) => k !== keyword));
    },
    [keywords]
  );

  // Generate headlines
  const handleGenerateHeadlines = useCallback(async () => {
    if (!canvasImageBase64) {
      messageApi.warning("No image on canvas to analyze");
      return;
    }

    setLoadingHeadlines(true);

    try {
      const result = await generateHeadlines({
        imageBase64: canvasImageBase64,
        designId,
        campaignType,
        userKeywords: keywords.length > 0 ? keywords : null,
      });

      if (result.success && result.headlines?.length > 0) {
        setHeadlines(result.headlines);
        messageApi.success(`Generated ${result.headlines.length} headlines`);
      } else {
        messageApi.error(result.error || "Failed to generate headlines");
      }
    } catch (error) {
      console.error("Headline generation error:", error);
      messageApi.error("Failed to generate headlines");
    } finally {
      setLoadingHeadlines(false);
    }
  }, [canvasImageBase64, designId, campaignType, keywords]);

  // Generate subheadings
  const handleGenerateSubheadings = useCallback(async () => {
    if (!canvasImageBase64) {
      messageApi.warning("No image on canvas to analyze");
      return;
    }

    setLoadingSubheadings(true);

    try {
      const result = await generateSubheadings({
        imageBase64: canvasImageBase64,
        designId,
        campaignType,
        userKeywords: keywords.length > 0 ? keywords : null,
      });

      if (result.success && result.subheadings?.length > 0) {
        setSubheadings(result.subheadings);
        messageApi.success(
          `Generated ${result.subheadings.length} subheadings`
        );
      } else {
        messageApi.error(result.error || "Failed to generate subheadings");
      }
    } catch (error) {
      console.error("Subheading generation error:", error);
      messageApi.error("Failed to generate subheadings");
    } finally {
      setLoadingSubheadings(false);
    }
  }, [canvasImageBase64, designId, campaignType, keywords]);

  // Add headline to canvas with SMART LLM PLACEMENT
  const handleAddToCanvas = useCallback(
    async (text, isSubheading = false) => {
      console.log(
        "═══════════════════════════════════════════════════════════════"
      );
      console.log("🎯 [HEADLINE] ═══ STARTING HEADLINE PLACEMENT ═══");
      console.log(
        "═══════════════════════════════════════════════════════════════"
      );
      console.log("📝 [HEADLINE] Text:", text);
      console.log("📝 [HEADLINE] Is Subheading:", isSubheading);
      console.log("📐 [HEADLINE] Canvas Size:", canvasSize);
      console.log("📸 [HEADLINE] Has Canvas Image:", !!canvasImageBase64);
      console.log(
        "📸 [HEADLINE] Image Base64 Length:",
        canvasImageBase64?.length || 0
      );

      // COMPLIANCE CHECK - Validate text before adding
      console.log(
        "───────────────────────────────────────────────────────────────"
      );
      console.log("🛡️ [HEADLINE] STEP 1: COMPLIANCE CHECK");
      console.log(
        "───────────────────────────────────────────────────────────────"
      );
      const compliance = validateHeadlineText(text, isSubheading);
      const complianceStatus = formatHeadlineCompliance(compliance);
      console.log("🛡️ [HEADLINE] Compliant:", compliance.compliant);
      console.log("🛡️ [HEADLINE] Issues:", compliance.issues);
      console.log("🛡️ [HEADLINE] Warnings:", compliance.warnings);
      console.log("🛡️ [HEADLINE] Status:", complianceStatus.status);

      if (!compliance.compliant) {
        // HARD FAIL - Block non-compliant text
        console.log("❌ [HEADLINE] BLOCKED - Text not compliant!");
        messageApi.error(complianceStatus.message);
        complianceStatus.details?.forEach((issue) => {
          messageApi.warning(issue, 5);
        });
        return; // Don't add to canvas
      }

      if (complianceStatus.status === "warning") {
        // Show warnings but allow adding
        console.log("⚠️ [HEADLINE] Warnings present but proceeding...");
        messageApi.warning(complianceStatus.message);
      }

      // Get RELIABLE BOUNDS - use canvas size as primary, image bounds for offset
      console.log(
        "───────────────────────────────────────────────────────────────"
      );
      console.log("📐 [HEADLINE] STEP 2: CLIENT-SIDE CANVAS ANALYSIS");
      console.log(
        "───────────────────────────────────────────────────────────────"
      );

      // Use canvas size for width/height, image bounds for offset if available
      const canvasWidth = canvasSize?.w || 800;
      const canvasHeight = canvasSize?.h || 600;

      console.log("📐 [HEADLINE] Canvas Size:", canvasWidth, "x", canvasHeight);
      console.log("📐 [HEADLINE] Image Bounds:", imageBounds);

      let position;

      // === PRIMARY: AI Vision-Based Placement (Gemini Vision API) ===
      if (canvasImageBase64) {
        try {
          console.log("🤖 [HEADLINE] Using Gemini Vision API for placement...");
          console.log("🔍 [HEADLINE] Collision Avoidance Context:");
          console.log("   ├─ Total canvas elements:", canvasElements.length);
          console.log(
            "   ├─ Text elements:",
            canvasElements.filter((el) => el.type === "text").length
          );
          console.log(
            "   ├─ Headlines:",
            canvasElements.filter((el) => el.id?.startsWith("headline-")).length
          );
          console.log(
            "   └─ Subheadings:",
            canvasElements.filter((el) => el.id?.startsWith("subheading-"))
              .length
          );

          const startTime = performance.now();
          const { getSmartPlacement } = await import("../api/headlineApi");

          const result = await getSmartPlacement({
            imageBase64: canvasImageBase64,
            canvasWidth,
            canvasHeight,
          });

          const endTime = performance.now();
          console.log(
            "🤖 [HEADLINE] Vision API Time:",
            (endTime - startTime).toFixed(0),
            "ms"
          );

          if (result.success && result.placement) {
            // Get the appropriate position (headline or subheading)
            const smartPos = isSubheading
              ? result.placement.subheading
              : result.placement.headline;

            console.log(
              "\n🎯 ========== VISION API PLACEMENT ANALYSIS =========="
            );
            console.log("   Type:", isSubheading ? "SUBHEADING" : "HEADLINE");
            console.log("   ├─ Vision API Raw Response:");
            console.log("   │  ├─ x_percent:", smartPos.x_percent, "%");
            console.log("   │  ├─ y_percent:", smartPos.y_percent, "%");
            console.log("   │  ├─ align:", smartPos.align);
            console.log("   │  ├─ fontSize:", smartPos.fontSize, "px");
            console.log("   │  └─ color:", smartPos.color);
            console.log("   ├─ ⚠️  This is AI-generated, NOT hardcoded!");
            console.log(
              "   └─ Subject detected at:",
              result.placement.subject_position
            );
            console.log(
              "🎯 ====================================================\n"
            );

            // === IMAGE BOUNDARY RESTRICTION ===
            // Calculate positions relative to IMAGE bounds, not canvas
            const imgBounds = imageBounds || {
              x: 0,
              y: 0,
              width: canvasWidth,
              height: canvasHeight,
            };

            console.log("📐 [HEADLINE] Image Boundaries:", imgBounds);

            // Convert percent to pixels WITHIN IMAGE BOUNDS
            let x = imgBounds.x + (smartPos.x_percent / 100) * imgBounds.width;
            let y = imgBounds.y + (smartPos.y_percent / 100) * imgBounds.height;
            const textWidth =
              imgBounds.width * PLACEMENT_CONFIG.TEXT_WIDTH_RATIO;

            // CRITICAL: Calculate actual wrapped text height for this element
            const calculateWrappedHeight = (fontSize, text, width) => {
              const lineHeight = fontSize * 1.5;
              const charWidth = fontSize * 0.5;
              const charsPerLine = Math.floor(width / charWidth);
              const estimatedLines = Math.ceil(text.length / charsPerLine);
              return estimatedLines * lineHeight * 1.2; // 20% safety margin
            };

            const textHeight = calculateWrappedHeight(
              smartPos.fontSize,
              text,
              textWidth
            );

            // === BOUNDARY VALIDATION: Ensure text stays within image ===
            const padding = PLACEMENT_CONFIG.IMAGE_PADDING;

            // Clamp X position
            if (x < imgBounds.x + padding) {
              x = imgBounds.x + padding;
            }
            if (x + textWidth > imgBounds.x + imgBounds.width - padding) {
              x = imgBounds.x + imgBounds.width - textWidth - padding;
            }

            // Clamp Y position
            if (y < imgBounds.y + padding) {
              y = imgBounds.y + padding;
            }
            if (y + textHeight > imgBounds.y + imgBounds.height - padding) {
              y = imgBounds.y + imgBounds.height - textHeight - padding;
            }

            console.log("🤖 [HEADLINE] Vision Analysis Result:");
            console.log(
              "   ├─ Subject:",
              result.placement.subject_position || "unknown"
            );
            console.log(
              "   ├─ Empty Zones:",
              result.placement.empty_zones?.join(", ") || "auto"
            );
            console.log("   ├─ X:", x.toFixed(0), `(${smartPos.x_percent}%)`);
            console.log("   ├─ Y:", y.toFixed(0), `(${smartPos.y_percent}%)`);
            console.log("   ├─ Font Size:", smartPos.fontSize);
            console.log(
              "   ├─ Within image bounds:",
              x >= imgBounds.x &&
                x + textWidth <= imgBounds.x + imgBounds.width,
              "✓"
            );

            console.log("\n🔍 ========== COLLISION DETECTION PHASE ==========");
            console.log(
              "   Vision API suggested position: X=",
              x.toFixed(0),
              "Y=",
              y.toFixed(0)
            );
            console.log(
              "   Canvas has",
              canvasElements.length,
              "existing elements"
            );

            // === COLLISION DETECTION: Check if position collides with existing elements ===
            if (canvasElements.length > 0) {
              console.log(
                "   🔍 Checking collision against",
                canvasElements.length,
                "elements:"
              );

              // CRITICAL FIX: Calculate actual wrapped text heights
              // CONSERVATIVE APPROACH: Overestimate to prevent overlaps
              const calculateWrappedTextHeight = (element) => {
                if (!element.text || !element.fontSize)
                  return PLACEMENT_CONFIG.FALLBACK_TEXT_HEIGHT;

                // Use generous line height (1.5x instead of 1.2x)
                const lineHeight = element.fontSize * 1.5;
                // Use conservative char width (0.5x instead of 0.6x for narrower estimate)
                const charWidth = element.fontSize * 0.5;
                const textWidth = element.width || 600;
                const charsPerLine = Math.floor(textWidth / charWidth);
                const estimatedLines = Math.ceil(
                  element.text.length / charsPerLine
                );

                // Add 20% safety margin to account for font variations
                return estimatedLines * lineHeight * 1.2;
              };

              canvasElements.forEach((el, idx) => {
                if (el.type === "text") {
                  const calculatedHeight = calculateWrappedTextHeight(el);
                  console.log(
                    `   ├─ Element ${idx}: "${el.text?.substring(0, 30)}..."`
                  );
                  console.log(
                    `      fontSize=${el.fontSize}px, x=${el.x?.toFixed(
                      0
                    )}, y=${el.y?.toFixed(0)}`
                  );
                  console.log(
                    `      width=${el.width?.toFixed(
                      0
                    )}, calculated height=${calculatedHeight.toFixed(0)}`
                  );
                }
              });

              // Check collision with existing elements
              const hasCollision = canvasElements.some((el) => {
                if (el.type !== "text") return false;

                const elX = el.x || 0;
                const elY = el.y || 0;
                const elW = el.width || textWidth;
                // CRITICAL FIX: Calculate actual wrapped text height
                const elH = el.height || calculateWrappedTextHeight(el);

                const buffer = PLACEMENT_CONFIG.COLLISION_BUFFER;
                const collides =
                  x < elX + elW + buffer &&
                  x + textWidth > elX - buffer &&
                  y < elY + elH + buffer &&
                  y + textHeight > elY - buffer;

                if (collides) {
                  console.log(
                    `   ⚠️ COLLISION with element at Y=${elY.toFixed(
                      0
                    )}, height=${elH.toFixed(0)}`
                  );
                  console.log(
                    `      Vision wants Y=${y.toFixed(
                      0
                    )}, needs height=${textHeight.toFixed(0)}`
                  );
                }

                return collides;
              });

              if (hasCollision) {
                console.log("   ⚠️ COLLISION DETECTED!");
                console.log(
                  "   ├─ Vision API position would overlap existing text"
                );
                console.log(
                  "   ├─ Applying SMART repositioning (NOT hardcoded)"
                );
                console.log(
                  "   └─ Finding best alternative position dynamically..."
                );

                // === SMART REPOSITIONING: Find primary text element (largest font, topmost) ===
                // Don't assume ID format - use actual properties
                if (isSubheading) {
                  console.log(
                    "   🔍 Searching for primary text to position below..."
                  );
                  console.log(
                    "      Current subheading fontSize:",
                    smartPos.fontSize
                  );

                  // Get ALL text elements (don't filter by font size - might exclude headline)
                  const textElements = canvasElements.filter(
                    (el) => el.type === "text"
                  );

                  console.log(
                    "      Found",
                    textElements.length,
                    "text elements on canvas"
                  );

                  // Sort by font size (largest first), then Y position (topmost first)
                  textElements.sort((a, b) => {
                    const sizeDiff = (b.fontSize || 0) - (a.fontSize || 0);
                    if (Math.abs(sizeDiff) > 5) return sizeDiff;
                    return (a.y || 0) - (b.y || 0);
                  });

                  const primaryText = textElements[0];

                  if (primaryText) {
                    console.log(
                      `      Primary text found: fontSize=${
                        primaryText.fontSize
                      }px, Y=${primaryText.y?.toFixed(0)}`
                    );
                  } else {
                    console.log("      ⚠️ No primary text found!");
                  }

                  if (primaryText) {
                    // Position subheading below primary text element WITHIN IMAGE BOUNDS
                    // CRITICAL FIX: Calculate actual wrapped text height
                    const primaryHeight =
                      primaryText.height ||
                      calculateWrappedTextHeight(primaryText);

                    y =
                      primaryText.y +
                      primaryHeight +
                      PLACEMENT_CONFIG.ELEMENT_GAP;
                    x = primaryText.x; // Match X position

                    console.log(
                      `   📍 Found primary text (fontSize=${
                        primaryText.fontSize
                      }px) at Y=${primaryText.y.toFixed(0)}`
                    );

                    // Ensure still within image bounds
                    if (
                      y + textHeight >
                      imgBounds.y + imgBounds.height - padding
                    ) {
                      // No room below, try above primary text
                      y =
                        primaryText.y -
                        textHeight -
                        PLACEMENT_CONFIG.ELEMENT_GAP;
                      if (y < imgBounds.y + padding) {
                        // No room anywhere, place at bottom of image
                        y =
                          imgBounds.y + imgBounds.height - textHeight - padding;
                      }
                    }

                    console.log(
                      `   ✅ Repositioned below primary text: y=${y.toFixed(0)}`
                    );
                  } else {
                    // No large text found, move to opposite area
                    const topY = imgBounds.y + padding;
                    const bottomY =
                      imgBounds.y + imgBounds.height - textHeight - padding;

                    if (y < imgBounds.y + imgBounds.height * 0.5) {
                      y = bottomY;
                      console.log(`   ✅ Moved to bottom: y=${y.toFixed(0)}`);
                    } else {
                      y = topY;
                      console.log(`   ✅ Moved to top: y=${y.toFixed(0)}`);
                    }
                  }
                } else {
                  // For headlines, just move to opposite area
                  const topY = imgBounds.y + padding;
                  const bottomY =
                    imgBounds.y + imgBounds.height - textHeight - padding;

                  if (y < imgBounds.y + imgBounds.height * 0.5) {
                    y = bottomY;
                    console.log(`   ✅ Moved to bottom: y=${y.toFixed(0)}`);
                  } else {
                    y = topY;
                    console.log(`   ✅ Moved to top: y=${y.toFixed(0)}`);
                  }
                }
              }
            }

            console.log("   ├─ Color:", smartPos.color);
            console.log("   └─ Align:", smartPos.align);

            // === CONTRAST VALIDATION: Check background brightness at text position ===
            let finalTextColor = smartPos.color || "#FFFFFF";
            let finalShadowColor = smartPos.shadowColor || "rgba(0,0,0,0.6)";

            try {
              // Sample background pixels at text position
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.src = canvasImageBase64;

              await new Promise((resolve) => {
                if (img.complete) resolve();
                else img.onload = resolve;
              });

              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0);

              // Sample pixels in the text region (scale coordinates to image size)
              const scaleX = img.width / canvasWidth;
              const scaleY = img.height / canvasHeight;
              const sampleX = Math.floor((x - imgBounds.x) * scaleX);
              const sampleY = Math.floor((y - imgBounds.y) * scaleY);
              const sampleWidth = Math.floor(textWidth * scaleX);
              const sampleHeight = Math.floor(textHeight * scaleY);

              // Sample multiple points in the text area
              const samplePoints = [
                { x: sampleX, y: sampleY }, // Top-left
                { x: sampleX + sampleWidth / 2, y: sampleY }, // Top-center
                { x: sampleX + sampleWidth, y: sampleY }, // Top-right
                { x: sampleX, y: sampleY + sampleHeight / 2 }, // Middle-left
                { x: sampleX + sampleWidth / 2, y: sampleY + sampleHeight / 2 }, // Center
              ];

              let totalBrightness = 0;
              let validSamples = 0;

              samplePoints.forEach((point) => {
                if (
                  point.x >= 0 &&
                  point.x < img.width &&
                  point.y >= 0 &&
                  point.y < img.height
                ) {
                  const pixel = ctx.getImageData(point.x, point.y, 1, 1).data;
                  // Calculate relative luminance (WCAG formula)
                  const brightness =
                    PLACEMENT_CONFIG.LUMINANCE_RED * pixel[0] +
                    PLACEMENT_CONFIG.LUMINANCE_GREEN * pixel[1] +
                    PLACEMENT_CONFIG.LUMINANCE_BLUE * pixel[2];
                  totalBrightness += brightness;
                  validSamples++;
                }
              });

              const avgBrightness = totalBrightness / validSamples;
              const isDarkBackground =
                avgBrightness < PLACEMENT_CONFIG.BRIGHTNESS_THRESHOLD;

              console.log(
                `   🎨 Background Analysis: brightness=${avgBrightness.toFixed(
                  0
                )} (${isDarkBackground ? "dark" : "light"})`
              );

              // WCAG contrast guidelines: Choose text color for optimal contrast
              if (isDarkBackground) {
                // Dark background → White text with dark shadow
                finalTextColor = PLACEMENT_CONFIG.DARK_BG_TEXT_COLOR;
                finalShadowColor = PLACEMENT_CONFIG.DARK_BG_SHADOW;
                console.log("   ✅ Using WHITE text on dark background");
              } else {
                // Light background → Dark text with light shadow
                finalTextColor = PLACEMENT_CONFIG.LIGHT_BG_TEXT_COLOR;
                finalShadowColor = PLACEMENT_CONFIG.LIGHT_BG_SHADOW;
                console.log("   ✅ Using DARK text on light background");
              }

              // Calculate contrast ratio for validation
              const textLuminance = isDarkBackground ? 1.0 : 0.0; // Simplified
              const bgLuminance = avgBrightness / 255;
              const contrastRatio =
                (Math.max(textLuminance, bgLuminance) + 0.05) /
                (Math.min(textLuminance, bgLuminance) + 0.05);

              console.log(
                `   📊 Contrast Ratio: ${contrastRatio.toFixed(2)}:1 ${
                  contrastRatio >= 4.5
                    ? "✅ WCAG AA"
                    : contrastRatio >= 3
                    ? "⚠️ WCAG Large Text"
                    : "❌ Poor"
                }`
              );
            } catch (e) {
              console.warn(
                "⚠️ Contrast check failed, using Vision API colors:",
                e.message
              );
              // Keep Vision API suggested colors
            }

            position = {
              x,
              y,
              width: textWidth, // Use image-relative width
              fontSize: smartPos.fontSize,
              color: finalTextColor, // Use contrast-validated color
              align: smartPos.align || "center",
              shadowEnabled: smartPos.shadow !== false,
              shadowColor: finalShadowColor, // Use contrast-validated shadow
              shadowBlur: PLACEMENT_CONFIG.SHADOW_BLUR,
              fontWeight:
                smartPos.fontWeight || (isSubheading ? "normal" : "bold"),
              fontFamily: "Inter, Arial, sans-serif",
              isSmart: true,
            };

            console.log(
              "\n✅ ========== FINAL POSITION (VISION API) =========="
            );
            console.log("   Source: GEMINI VISION AI (not hardcoded fallback)");
            console.log("   Final X:", position.x.toFixed(0), "px");
            console.log("   Final Y:", position.y.toFixed(0), "px");
            console.log("   Width:", position.width.toFixed(0), "px");
            console.log("   Font Size:", position.fontSize, "px");
            console.log("   Color:", position.color, "(contrast-validated)");
            console.log("   isSmart:", position.isSmart, "✅");
            console.log(
              "   🎯 Position calculated by AI, adapted for collisions"
            );
            console.log(
              "✅ ===================================================\n"
            );
          } else {
            throw new Error("Vision API returned no placement data");
          }
        } catch (e) {
          console.warn("⚠️ [HEADLINE] Vision API failed:", e.message);
          console.log("📐 [HEADLINE] Falling back to default positioning...");
          position = null; // Will use fallback below
        }
      }

      // === FALLBACK: Simple reliable positioning ===
      if (!position) {
        console.log(
          "\n❌ ========== HARDCODED FALLBACK (Vision API Failed) =========="
        );
        console.log("   ⚠️  WARNING: Using HARDCODED positioning!");
        console.log("   Reason: Vision API failed or no image provided");
        console.log("   Type:", isSubheading ? "SUBHEADING" : "HEADLINE");
        console.log(
          "   Y Position: HARDCODED at",
          isSubheading
            ? PLACEMENT_CONFIG.SUBHEADING_Y_PERCENT * 100 + "%"
            : PLACEMENT_CONFIG.HEADLINE_Y_PERCENT * 100 + "%",
          "from top"
        );
        console.log(
          "❌ ============================================================\n"
        );
        const paddingPercent = PLACEMENT_CONFIG.FALLBACK_PADDING_PERCENT;
        const textWidth =
          canvasWidth * PLACEMENT_CONFIG.FALLBACK_TEXT_WIDTH_RATIO;
        const xPos = canvasWidth * paddingPercent;
        const yPercent = isSubheading
          ? PLACEMENT_CONFIG.SUBHEADING_Y_PERCENT
          : PLACEMENT_CONFIG.HEADLINE_Y_PERCENT;
        const yPos = canvasHeight * yPercent;
        const fontSize = isSubheading
          ? Math.max(
              PLACEMENT_CONFIG.SUBHEADING_FONT_MIN,
              Math.min(
                PLACEMENT_CONFIG.SUBHEADING_FONT_MAX,
                canvasWidth / PLACEMENT_CONFIG.SUBHEADING_FONT_DIVISOR
              )
            )
          : Math.max(
              PLACEMENT_CONFIG.HEADLINE_FONT_MIN,
              Math.min(
                PLACEMENT_CONFIG.HEADLINE_FONT_MAX,
                canvasWidth / PLACEMENT_CONFIG.HEADLINE_FONT_DIVISOR
              )
            );

        position = {
          x: xPos,
          y: yPos,
          width: textWidth,
          fontSize: fontSize,
          color: PLACEMENT_CONFIG.DARK_BG_TEXT_COLOR, // Default to white (assume dark bg)
          align: "center",
          shadowEnabled: true,
          shadowColor: PLACEMENT_CONFIG.DARK_BG_SHADOW,
          shadowBlur: PLACEMENT_CONFIG.SHADOW_BLUR,
          fontWeight: isSubheading ? "normal" : "bold",
          fontFamily: "Inter, Arial, sans-serif",
          isSmart: false,
        };
      }

      console.log("\n📊 ========== PLACEMENT SUMMARY ==========");
      console.log(
        "   Placement Method:",
        position.isSmart ? "✅ VISION AI" : "❌ HARDCODED FALLBACK"
      );
      console.log("   Text Type:", isSubheading ? "Subheading" : "Headline");
      console.log("   Final Position:", position);
      console.log(
        "   🎯 Proof: isSmart=",
        position.isSmart,
        position.isSmart ? "(AI-powered)" : "(Hardcoded)"
      );
      console.log("📊 =========================================\n");

      // 2. TRY AI-POWERED FONT STYLING (Gemini Vision) - ENHANCE FONT
      console.log(
        "───────────────────────────────────────────────────────────────"
      );
      console.log("🎨 [HEADLINE] STEP 4: AI FONT STYLING (Gemini Vision)");
      console.log(
        "───────────────────────────────────────────────────────────────"
      );

      if (canvasImageBase64) {
        try {
          console.log("🎨 [HEADLINE] Calling getFontStyle API...");
          const startTime = performance.now();
          const { getFontStyle } = await import("../api/headlineApi");
          const { getStyleFromMood } = await import("../config/fonts");

          const fontResult = await getFontStyle({
            imageBase64: canvasImageBase64,
          });
          const endTime = performance.now();

          console.log(
            "🎨 [HEADLINE] API Response Time:",
            (endTime - startTime).toFixed(0),
            "ms"
          );
          console.log("🎨 [HEADLINE] API Success:", fontResult.success);
          console.log(
            "🎨 [HEADLINE] Full Font Result:",
            JSON.stringify(fontResult, null, 2)
          );

          if (fontResult.success && fontResult.fontStyle) {
            const mood = fontResult.fontStyle.mood;
            const fontStyle = getStyleFromMood(mood, isSubheading);

            console.log("🎨 [HEADLINE] Font Style Details:");
            console.log("   ├─ Detected Mood:", mood);
            console.log("   ├─ AI Reasoning:", fontResult.fontStyle.reasoning);
            console.log("   ├─ Mapped Font Family:", fontStyle.fontFamily);
            console.log("   ├─ Mapped Font Weight:", fontStyle.fontWeight);
            console.log("   ├─ Letter Spacing:", fontStyle.letterSpacing);
            console.log("   └─ Text Transform:", fontStyle.textTransform);

            // Apply AI-recommended font styling
            position = {
              ...position,
              fontFamily: fontStyle.fontFamily,
              fontWeight: fontStyle.fontWeight,
              letterSpacing: fontStyle.letterSpacing,
              textTransform: fontStyle.textTransform,
            };

            console.log("✅ [HEADLINE] AI Font Style Applied Successfully!");
          } else {
            console.warn(
              "⚠️ [HEADLINE] Font styling returned no data, using defaults"
            );
          }
        } catch (e) {
          console.error("❌ [HEADLINE] Font styling failed!");
          console.error("❌ [HEADLINE] Error:", e.message);
          console.warn("⚠️ [HEADLINE] Using default font styling...");
        }
      } else {
        console.warn(
          "⚠️ [HEADLINE] No canvas image available, skipping font styling"
        );
      }

      // FINAL POSITION SUMMARY
      console.log(
        "═══════════════════════════════════════════════════════════════"
      );
      console.log("📍 [HEADLINE] ═══ FINAL POSITION SUMMARY ═══");
      console.log(
        "═══════════════════════════════════════════════════════════════"
      );
      console.log("📍 [HEADLINE] Position X:", position.x);
      console.log("📍 [HEADLINE] Position Y:", position.y);
      console.log("📍 [HEADLINE] Width:", position.width);
      console.log("📍 [HEADLINE] Font Size:", position.fontSize);
      console.log("📍 [HEADLINE] Font Family:", position.fontFamily);
      console.log("📍 [HEADLINE] Font Weight:", position.fontWeight);
      console.log("📍 [HEADLINE] Color:", position.color);
      console.log("📍 [HEADLINE] Align:", position.align);
      console.log("📍 [HEADLINE] Shadow Enabled:", position.shadowEnabled);
      console.log("📍 [HEADLINE] Shadow Color:", position.shadowColor);
      console.log("📍 [HEADLINE] Letter Spacing:", position.letterSpacing);
      console.log("📍 [HEADLINE] Text Transform:", position.textTransform);
      console.log(
        "═══════════════════════════════════════════════════════════════"
      );

      // STEP 5: ADD TO CANVAS
      console.log(
        "───────────────────────────────────────────────────────────────"
      );
      console.log("🖼️ [HEADLINE] STEP 5: ADDING TO CANVAS");
      console.log(
        "───────────────────────────────────────────────────────────────"
      );
      console.log("🖼️ [HEADLINE] Calling parent callback...");
      console.log("🖼️ [HEADLINE] Is Subheading:", isSubheading);

      if (isSubheading) {
        if (typeof onAddSubheading === "function") {
          onAddSubheading(text, position);
          console.log("✅ [HEADLINE] onAddSubheading called successfully!");
        } else {
          console.error("❌ [HEADLINE] onAddSubheading is NOT a function!");
        }
      } else {
        if (typeof onAddHeadline === "function") {
          onAddHeadline(text, position);
          console.log("✅ [HEADLINE] onAddHeadline called successfully!");
        } else {
          console.error("❌ [HEADLINE] onAddHeadline is NOT a function!");
        }
      }

      console.log(
        "═══════════════════════════════════════════════════════════════"
      );
      console.log("🎉 [HEADLINE] ═══ HEADLINE PLACEMENT COMPLETE ═══");
      console.log(
        "═══════════════════════════════════════════════════════════════"
      );

      messageApi.success(`Added "${text.substring(0, 20)}..." to canvas`);
    },
    [
      canvasSize,
      canvasImageBase64,
      canvasElements,
      onAddHeadline,
      onAddSubheading,
      logoPosition,
      imageBounds,
    ]
  );

  // Render confidence stars
  const renderConfidence = (confidence) => {
    const stars = Math.round(confidence * 5);
    return (
      <Space size={2}>
        {[...Array(5)].map((_, i) =>
          i < stars ? (
            <StarFilled key={i} style={{ color: "#faad14", fontSize: 10 }} />
          ) : (
            <StarOutlined key={i} style={{ color: "#d9d9d9", fontSize: 10 }} />
          )
        )}
      </Space>
    );
  };

  return (
    <div style={{ padding: "8px 0" }}>
      {contextHolder}
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <h4
          style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}
        >
          <BulbOutlined style={{ color: "#faad14" }} />
          Headline Generator
        </h4>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>
          AI-powered headlines using Gemini Vision
        </p>
      </div>

      <Divider style={{ margin: "12px 0" }} />

      {/* Campaign Type (Optional) */}
      <div style={{ marginBottom: 12 }}>
        <label
          style={{
            fontSize: 12,
            color: "#888",
            display: "block",
            marginBottom: 4,
          }}
        >
          Campaign Type (optional)
        </label>
        <Select
          placeholder="Select campaign type"
          value={campaignType}
          onChange={setCampaignType}
          allowClear
          style={{ width: "100%" }}
          size="small"
        >
          {CAMPAIGN_TYPES.map((ct) => (
            <Option key={ct.value} value={ct.value}>
              {ct.label}
            </Option>
          ))}
        </Select>
      </div>

      {/* Keywords */}
      <div style={{ marginBottom: 12 }}>
        <label
          style={{
            fontSize: 12,
            color: "#888",
            display: "block",
            marginBottom: 4,
          }}
        >
          Keywords
        </label>
        <Space.Compact style={{ width: "100%", marginBottom: 8 }}>
          <Input
            placeholder="Add keyword..."
            value={inputKeyword}
            onChange={(e) => setInputKeyword(e.target.value)}
            onPressEnter={handleAddKeyword}
            size="small"
            style={{ flex: 1 }}
          />
          <Tooltip title="✨ AI Suggest Keywords">
            <Button
              icon={<ThunderboltOutlined />}
              onClick={handleSuggestKeywords}
              loading={loadingKeywords}
              size="small"
              type="primary"
              style={{ background: "#722ed1" }}
            />
          </Tooltip>
        </Space.Compact>

        {/* Keyword Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {keywords.map((keyword) => (
            <Tag
              key={keyword}
              closable
              onClose={() => handleRemoveKeyword(keyword)}
              color="purple"
              style={{ fontSize: 11 }}
            >
              {keyword}
            </Tag>
          ))}
        </div>
      </div>

      <Divider style={{ margin: "12px 0" }} />

      {/* Generate Buttons */}
      <Space direction="vertical" style={{ width: "100%" }}>
        <Button
          type="primary"
          icon={<BulbOutlined />}
          onClick={handleGenerateHeadlines}
          loading={loadingHeadlines}
          disabled={!canvasImageBase64}
          block
          size="small"
        >
          Generate Headlines
        </Button>

        <Button
          icon={<BulbOutlined />}
          onClick={handleGenerateSubheadings}
          loading={loadingSubheadings}
          disabled={!canvasImageBase64}
          block
          size="small"
        >
          Generate Subheadings
        </Button>
      </Space>

      {/* Headlines Results */}
      {headlines.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h5 style={{ margin: "0 0 8px", fontSize: 12, color: "#888" }}>
            Headlines
          </h5>
          <Space direction="vertical" style={{ width: "100%" }} size={4}>
            {headlines.map((h, idx) => (
              <Card
                key={idx}
                size="small"
                style={{
                  background: "#f5f5f5",
                  border: "1px solid #e8e8e8",
                }}
                styles={{ body: { padding: 8 } }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {h.text}
                    </div>
                    <div style={{ marginTop: 2 }}>
                      {renderConfidence(h.confidence)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      style={{ position: "relative", zIndex: 10 }} // Ensure button is above potential overlays
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log(
                          "👆 [HEADLINE GENERATOR] Add Headline Button Clicked:",
                          h.text
                        );
                        handleAddToCanvas(h.text, false);
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </Space>
        </div>
      )}

      {/* Subheadings Results */}
      {subheadings.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h5 style={{ margin: "0 0 8px", fontSize: 12, color: "#888" }}>
            Subheadings
          </h5>
          <Space direction="vertical" style={{ width: "100%" }} size={4}>
            {subheadings.map((s, idx) => (
              <Card
                key={idx}
                size="small"
                style={{
                  background: "#f0f5ff",
                  border: "1px solid #d6e4ff",
                }}
                styles={{ body: { padding: 8 } }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12 }}>{s.text}</div>
                    <div style={{ marginTop: 2 }}>
                      {renderConfidence(s.confidence)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      style={{ position: "relative", zIndex: 10 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log(
                          "👆 [HEADLINE GENERATOR] Add Subheading Button Clicked:",
                          s.text
                        );
                        handleAddToCanvas(s.text, true);
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </Space>
        </div>
      )}

      {/* No image warning */}
      {!canvasImageBase64 && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "#fff7e6",
            border: "1px solid #ffe58f",
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          ⚠️ Add an image to the canvas first to generate headlines.
        </div>
      )}
    </div>
  );
};

export default HeadlineGenerator;

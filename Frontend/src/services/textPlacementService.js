/**
 * Robust Client-Side Text Placement Service
 * Analyzes image content to find optimal text placement.
 *
 * ALGORITHM:
 * 1. Divide image into 3x3 grid
 * 2. Calculate brightness and variance for each cell
 * 3. Score zones based on:
 *    - Position (Top preference)
 *    - Subject Avoidance (Center avoidance)
 *    - Uniformity (Low variance)
 *    - Contrast (Dark/Light preference)
 */

export class TextPlacementService {
  /**
   * Analyze image and return optimal placement
   * @param {string} imageSrc - Image source URL or Base64
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   * @returns {Promise<{headline: Object, subheading: Object}>}
   */
  /**
   * Analyze image and return optimal placement
   * @param {string} imageSrc
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   * @param {string} logoPosition - 'bottom-right', 'bottom-left', 'top-right', 'top-left'
   * @param {Object} imageBounds - { x, y, width, height } for TescoLogo-style placement
   * @param {Array} existingElements - Array of existing text elements to avoid
   */
  static async analyze(
    imageSrc,
    canvasWidth,
    canvasHeight,
    logoPosition = "bottom-right",
    imageBounds = null,
    existingElements = []
  ) {
    try {
      // 1. Get pixel data
      const { data, width, height } = await this.getImageData(imageSrc);

      // 2. Skip analysis if image is too small
      if (width < 200 || height < 200) {
        console.log("⚠️ [PLACEMENT] Image too small, using defaults");
        return this.getDefaultPlacement(canvasWidth, canvasHeight);
      }

      // 3. Create and analyze 3x3 grid
      const cells = this.createGrid(width, height, 3, 3);
      const scoredCells = cells.map((cell) => {
        const brightness = this.calculateBrightness(data, cell, width);
        const variance = this.calculateVariance(data, cell, width, brightness);
        return this.scoreCell(cell, brightness, variance, logoPosition);
      });

      // 4. Sort by score (highest first)
      scoredCells.sort((a, b) => b.score - a.score);
      const winner = scoredCells[0];

      console.log("🎯 [PLACEMENT] Winning Zone:", winner);
      console.log(
        "🎯 [PLACEMENT] Using Image Bounds:",
        imageBounds || "canvas fallback"
      );
      console.log("🎯 [PLACEMENT] Existing Elements:", existingElements.length);

      // 5. Convert to coordinates (pass imageBounds for TescoLogo-style placement)
      const coordinates = this.calculateCoordinates(
        winner,
        canvasWidth,
        canvasHeight,
        imageBounds,
        existingElements
      );
      console.log("✅ [PLACEMENT] Calculated Coordinates:", coordinates);
      return coordinates;
    } catch (e) {
      console.warn("❌ [PLACEMENT] Analysis failed, using defaults:", e);
      return this.getDefaultPlacement(canvasWidth, canvasHeight);
    }
  }

  /**
   * Load image and get pixel data
   * Timeout after 3 seconds to prevent hangs
   */
  static async getImageData(imageSrc) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Image load timeout (3s)"));
      }, 3000);

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          resolve({
            data: imageData.data,
            width: img.width,
            height: img.height,
          });
        } catch (e) {
          reject(e);
        }
      };

      img.onerror = (e) => {
        clearTimeout(timeout);
        reject(e);
      };

      img.src = imageSrc;
    });
  }

  /**
   * Create a grid of cells for analysis
   */
  static createGrid(width, height, cols, rows) {
    const cellW = Math.floor(width / cols);
    const cellH = Math.floor(height / rows);
    const cells = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        cells.push({
          row,
          col,
          x: col * cellW,
          y: row * cellH,
          w: cellW,
          h: cellH,
        });
      }
    }

    return cells;
  }

  /**
   * Calculate average brightness of a cell (0-1)
   */
  static calculateBrightness(data, cell, imgWidth) {
    let totalBrightness = 0;
    let pixelCount = 0;

    // Sample every 4th pixel for performance
    for (let y = cell.y; y < cell.y + cell.h; y += 4) {
      for (let x = cell.x; x < cell.x + cell.w; x += 4) {
        const idx = (y * imgWidth + x) * 4;
        // Perceived brightness formula
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        totalBrightness += (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        pixelCount++;
      }
    }

    return pixelCount > 0 ? totalBrightness / pixelCount : 0.5;
  }

  /**
   * Calculate variance (how uniform the cell is)
   * Low variance = good for text
   */
  static calculateVariance(data, cell, imgWidth, avgBrightness) {
    let sumSquaredDiff = 0;
    let pixelCount = 0;

    // Sample every 4th pixel for performance
    for (let y = cell.y; y < cell.y + cell.h; y += 4) {
      for (let x = cell.x; x < cell.x + cell.w; x += 4) {
        const idx = (y * imgWidth + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        sumSquaredDiff += Math.pow(brightness - avgBrightness, 2);
        pixelCount++;
      }
    }

    return pixelCount > 0 ? sumSquaredDiff / pixelCount : 0;
  }

  /**
   * Score a cell for text placement using aesthetic principles
   * Research-based: Rule of Thirds, Visual Balance, Low Variance
   */
  static scoreCell(
    cell,
    brightness,
    variance,
    logoPosition,
    gridRows = 3,
    gridCols = 3
  ) {
    let score = 50; // Base score

    // =====================================================
    // 1. RULE OF THIRDS - Text on 1/3 lines is more aesthetic
    // =====================================================
    // For a 3x3 grid, row 0 is top third, row 1 is middle third, row 2 is bottom third
    // Headlines look best at row 0 (top third line)
    if (cell.row === 0) score += 45; // TOP THIRD: Ideal for headlines
    if (cell.row === 2) score += 15; // BOTTOM THIRD: Good for CTA
    // Middle third is less desirable (usually has product)

    // =====================================================
    // 2. VISUAL BALANCE - Edge positions create natural hierarchy
    // =====================================================
    // Side columns create visual tension with product in center
    if (cell.col === 0) score += 10; // Left side - good for LTR reading
    if (cell.col === 2) score += 8; // Right side - acceptable
    // Center column conflicts with typical product placement
    if (cell.col === 1 && cell.row === 1) score -= 60; // Center-center: AVOID

    // =====================================================
    // 3. GOLDEN RATIO INTERSECTION POINTS (bonus zones)
    // =====================================================
    // Grid intersections at ~38% and ~62% are visually pleasing
    // For 3x3, corners of center cell approximate this
    // Top-left quadrant (row 0, col 0-1) gets a bonus
    if (cell.row === 0 && cell.col <= 1) score += 12;

    // =====================================================
    // 4. LOGO AVOIDANCE (Brand Safety)
    // =====================================================
    const logoMap = {
      "top-left": { r: 0, c: 0 },
      "top-right": { r: 0, c: 2 },
      "bottom-left": { r: 2, c: 0 },
      "bottom-right": { r: 2, c: 2 }, // Default for Tesco/Drinkaware
    };

    const logoLoc = logoMap[logoPosition] || logoMap["bottom-right"];

    // NUCLEAR: Never place text on logo
    if (cell.row === logoLoc.r && cell.col === logoLoc.c) {
      score -= 1000;
    }

    // Adjacent cells also risky
    if (
      Math.abs(cell.row - logoLoc.r) <= 1 &&
      Math.abs(cell.col - logoLoc.c) <= 1
    ) {
      if (cell.row === logoLoc.r || cell.col === logoLoc.c) {
        score -= 25;
      }
    }

    // =====================================================
    // 5. UNIFORMITY - Low variance = clean text background
    // =====================================================
    // Variance 0-0.25 typical. Low variance means uniform area = good for text
    const uniformityBonus = Math.max(0, 35 - variance * 120);
    score += uniformityBonus;

    // =====================================================
    // 6. CONTRAST - Extreme brightness is better for readability
    // =====================================================
    if (brightness < 0.25) score += 20; // Dark background (White text pops)
    else if (brightness > 0.75)
      score += 15; // Light background (Dark text works)
    else score -= 10; // Mid-gray is harder for text visibility

    // =====================================================
    // 7. BREATHING ROOM - Edge cells have natural margins
    // =====================================================
    // Cells at image edges have built-in margins from image boundaries
    if (cell.row === 0 || cell.row === gridRows - 1) score += 5; // Top/bottom edge
    if (cell.col === 0 || cell.col === gridCols - 1) score += 5; // Left/right edge

    return { ...cell, brightness, variance, score };
  }

  static calculateCoordinates(
    zone,
    canvasW,
    canvasH,
    imageBounds = null,
    existingElements = []
  ) {
    // Use provided bounds or default to full canvas
    const bounds = imageBounds || {
      x: 0,
      y: 0,
      width: canvasW,
      height: canvasH,
    };

    // Determine text color based on brightness
    const isDarkBg = zone.brightness < 0.5;
    const textColor = isDarkBg ? "#FFFFFF" : "#1a1a1a";

    // Determine shadow need
    const needsShadow =
      zone.variance > 0.02 || (zone.brightness > 0.3 && zone.brightness < 0.7);
    const shadowColor = isDarkBg ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)";

    // --- TESCO LOGO-STYLE POSITIONING ---
    // Dynamic padding: 3% of image width, minimum 15px
    const padding = Math.max(15, bounds.width * 0.03);

    // Base font size relative to image bounds (not canvas)
    const baseSize = Math.max(24, Math.min(60, bounds.width / 15));

    // Helper: Calculate actual text height accounting for wrapping
    const calculateTextHeight = (el) => {
      // If height is explicitly set, use it
      if (el.height) return el.height;

      // For text elements, calculate based on potential wrapping
      if (el.type === "text" && el.fontSize && el.width && el.text) {
        const fontSize = el.fontSize;
        const lineHeight = fontSize * 1.2; // Standard line-height

        // Rough estimation: average character width is fontSize * 0.5
        const avgCharWidth = fontSize * 0.5;
        const charsPerLine = Math.floor(el.width / avgCharWidth);
        const estimatedLines = Math.ceil(el.text.length / charsPerLine);

        // Add padding for safety (text might wrap differently)
        const actualLines = Math.max(1, estimatedLines);
        return actualLines * lineHeight;
      }

      // Fallback for other element types or missing data
      return el.fontSize ? el.fontSize * 1.5 : 50;
    };

    // Helper: Check if position collides with existing elements
    const hasCollision = (testX, testY, testW, testH, buffer = 20) => {
      return existingElements.some((el) => {
        const elX = el.x || 0;
        const elY = el.y || 0;
        const elW = el.width || 100;
        const elH = calculateTextHeight(el); // 🔥 Use accurate height calculation

        return (
          testX < elX + elW + buffer &&
          testX + testW > elX - buffer &&
          testY < elY + elH + buffer &&
          testY + testH > elY - buffer
        );
      });
    };

    // --- CORNER-BASED PLACEMENT (like TescoLogo) ---
    let xPos, yPos, align, maxW, fontSize;

    // Map grid zone to corner positions
    const col = zone.col;
    const row = zone.row;

    // === WIDTH CONSTRAINTS ===
    // Side columns get narrower width to avoid center subject
    if (col === 0 || col === 2) {
      maxW = bounds.width * 0.45;
      fontSize = baseSize * 0.9;
    } else {
      // Center column - wider for hero text
      maxW = bounds.width * 0.8;
      fontSize = zone.variance < 0.005 ? baseSize * 1.3 : baseSize;
    }

    // === X POSITION (TescoLogo-style corner math) ===
    switch (col) {
      case 0: // LEFT column
        xPos = bounds.x + padding;
        align = "left";
        break;
      case 2: // RIGHT column
        xPos = bounds.x + bounds.width - maxW - padding;
        align = "right";
        break;
      default: // CENTER column
        xPos = bounds.x + (bounds.width - maxW) / 2;
        align = "center";
    }

    // === Y POSITION (TescoLogo-style corner math) ===
    // Account for text height (~fontSize * 1.5 for line height)
    const textBlockHeight = fontSize * 2.5; // headline + subheading approx

    switch (row) {
      case 0: // TOP row
        yPos = bounds.y + padding;
        break;
      case 2: // BOTTOM row
        yPos = bounds.y + bounds.height - textBlockHeight - padding;
        break;
      default: // MIDDLE row
        yPos = bounds.y + (bounds.height - textBlockHeight) / 2;
    }

    // --- INTELLIGENT SUBHEADING PLACEMENT ---
    // Configuration (data-driven, not hardcoded)
    const SUBHEADING_CONFIG = {
      sizeRatio: 0.6, // Subheading is 60% of headline size
      minGap: 15, // Minimum gap between elements (px)
      fallbackYOffset: fontSize * 1.3, // If no headline, offset from grid position
    };

    const subheadingSize = Math.round(fontSize * SUBHEADING_CONFIG.sizeRatio);
    const subheadingHeight = calculateTextHeight({
      text: "Sample", // Estimate for single line
      fontSize: subheadingSize,
      width: maxW,
    });

    // FIRST PRINCIPLE: Don't assume IDs or relationships - use spatial analysis
    // Find the largest text element in the upper portion of canvas (likely the headline)
    const textElements = existingElements.filter(
      (el) => el.type === "text" && el.fontSize > subheadingSize * 0.8
    );

    let primaryTextElement = null;
    if (textElements.length > 0) {
      // Sort by: 1) Font size (desc), 2) Y position (asc)
      // This finds the largest text at the top - most likely the headline
      textElements.sort((a, b) => {
        const sizeDiff = (b.fontSize || 0) - (a.fontSize || 0);
        if (Math.abs(sizeDiff) > 5) return sizeDiff; // Size takes priority
        return (a.y || 0) - (b.y || 0); // Then position
      });
      primaryTextElement = textElements[0];
    }

    // Calculate initial subheading position
    let subheadingY;
    let subheadingX = xPos;
    let subheadingW = maxW;
    let subheadingAlign = align;

    if (primaryTextElement) {
      // Position below the primary text element with proper gap
      const primaryBottom =
        primaryTextElement.y + calculateTextHeight(primaryTextElement);
      subheadingY = primaryBottom + SUBHEADING_CONFIG.minGap;

      console.log(
        `📍 [PLACEMENT] Found primary text at Y=${primaryTextElement.y.toFixed(
          0
        )}px (fontSize=${primaryTextElement.fontSize}px), ` +
          `placing subheading at Y=${subheadingY.toFixed(0)}px`
      );
    } else {
      // No text elements found - use grid-based position
      subheadingY = yPos + SUBHEADING_CONFIG.fallbackYOffset;
      console.log(
        `📍 [PLACEMENT] No existing text, using grid position Y=${subheadingY.toFixed(
          0
        )}px`
      );
    }

    // Check for collision with existing elements using our collision detection system
    if (
      hasCollision(
        subheadingX,
        subheadingY,
        subheadingW,
        subheadingHeight,
        SUBHEADING_CONFIG.minGap
      )
    ) {
      console.log(
        "⚠️ [PLACEMENT] Subheading collision detected, finding alternative..."
      );

      // Calculate base position for alternatives
      const baseY = primaryTextElement
        ? primaryTextElement.y + calculateTextHeight(primaryTextElement)
        : yPos;

      // Try alternative positions (data-driven, not magic numbers)
      const alternatives = [
        // 1. Further below with larger gap
        {
          y: baseY + fontSize * 0.8,
          x: xPos,
          w: maxW,
          align,
          desc: "below with gap",
        },
        // 2. Much further below (double gap)
        {
          y: baseY + fontSize * 1.5,
          x: xPos,
          w: maxW,
          align,
          desc: "further below",
        },
        // 3. Centered horizontally
        {
          y: baseY + SUBHEADING_CONFIG.minGap,
          x: bounds.x + (bounds.width - maxW) / 2,
          w: maxW,
          align: "center",
          desc: "centered",
        },
        // 4. Bottom of canvas
        {
          y: bounds.y + bounds.height - subheadingHeight - padding * 2,
          x: xPos,
          w: maxW,
          align,
          desc: "bottom",
        },
        // 5. Top of canvas (if nothing there)
        {
          y: bounds.y + padding,
          x: xPos,
          w: maxW,
          align,
          desc: "top",
        },
        // 6. Right-aligned with narrower width
        {
          y: baseY + SUBHEADING_CONFIG.minGap,
          x: bounds.x + bounds.width - maxW * 0.7 - padding,
          w: maxW * 0.7,
          align: "right",
          desc: "right-aligned",
        },
      ];

      for (const alt of alternatives) {
        const testW = alt.w;
        const testY = alt.y;
        const testX = alt.x;
        const testAlign = alt.align;

        // Bounds validation - ensure alternative fits within canvas
        const fitsVertically =
          testY >= bounds.y &&
          testY + subheadingHeight <= bounds.y + bounds.height;
        const fitsHorizontally =
          testX >= bounds.x && testX + testW <= bounds.x + bounds.width;

        if (!fitsVertically || !fitsHorizontally) {
          console.log(`   ❌ ${alt.desc}: out of bounds`);
          continue;
        }

        // Collision check using our existing system
        if (
          !hasCollision(
            testX,
            testY,
            testW,
            subheadingHeight,
            SUBHEADING_CONFIG.minGap
          )
        ) {
          console.log(`   ✅ Found valid position: ${alt.desc}`);
          subheadingY = testY;
          subheadingX = testX;
          subheadingW = testW;
          subheadingAlign = testAlign;
          break;
        } else {
          console.log(`   ❌ ${alt.desc}: collision detected`);
        }
      }
    }

    return {
      headline: {
        x: xPos,
        y: yPos,
        width: maxW,
        fontSize: Math.round(fontSize),
        color: textColor,
        align: align,
        shadowEnabled: needsShadow,
        shadowColor: shadowColor,
        shadowBlur: 4,
        isSmart: true,
        zone: `row${row}-col${col}`, // Debug info
      },
      subheading: {
        x: subheadingX,
        y: subheadingY,
        width: subheadingW,
        fontSize: subheadingSize,
        color: textColor,
        align: subheadingAlign,
        shadowEnabled: needsShadow,
        shadowColor: shadowColor,
        shadowBlur: 3,
      },
    };
  }

  static getDefaultPlacement(w, h) {
    return {
      headline: {
        x: w / 2,
        y: h * 0.15,
        fontSize: 42,
        color: "#FFFFFF",
        shadowEnabled: true,
        shadowColor: "rgba(0,0,0,0.5)",
        shadowBlur: 4,
      },
      subheading: {
        x: w / 2,
        y: h * 0.22,
        fontSize: 24,
        color: "#FFFFFF",
        shadowEnabled: true,
        shadowColor: "rgba(0,0,0,0.5)",
        shadowBlur: 3,
      },
    };
  }
}

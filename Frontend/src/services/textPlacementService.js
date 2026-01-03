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
   */
  static async analyze(imageSrc, canvasWidth, canvasHeight, logoPosition = 'bottom-right', imageBounds = null) {
    try {
      // 1. Get pixel data
      const { data, width, height } = await this.getImageData(imageSrc);
      
      // 2. Skip analysis if image is too small
      if (width < 200 || height < 200) {
        console.log('⚠️ [PLACEMENT] Image too small, using defaults');
        return this.getDefaultPlacement(canvasWidth, canvasHeight);
      }
      
      // 3. Create and analyze 3x3 grid
      const cells = this.createGrid(width, height, 3, 3);
      const scoredCells = cells.map(cell => {
        const brightness = this.calculateBrightness(data, cell, width);
        const variance = this.calculateVariance(data, cell, width, brightness);
        return this.scoreCell(cell, brightness, variance, logoPosition);
      });
      
      // 4. Sort by score (highest first)
      scoredCells.sort((a, b) => b.score - a.score);
      const winner = scoredCells[0];
      
      console.log('🎯 [PLACEMENT] Winning Zone:', winner);
      console.log('🎯 [PLACEMENT] Using Image Bounds:', imageBounds || 'canvas fallback');
      
      // 5. Convert to coordinates (pass imageBounds for TescoLogo-style placement)
      const coordinates = this.calculateCoordinates(winner, canvasWidth, canvasHeight, imageBounds);
      console.log('✅ [PLACEMENT] Calculated Coordinates:', coordinates);
      return coordinates;
      
    } catch (e) {
      console.warn('❌ [PLACEMENT] Analysis failed, using defaults:', e);
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
        reject(new Error('Image load timeout (3s)'));
      }, 3000);
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          resolve({ data: imageData.data, width: img.width, height: img.height });
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
          h: cellH
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
  static scoreCell(cell, brightness, variance, logoPosition, gridRows = 3, gridCols = 3) {
    let score = 50; // Base score
    
    // =====================================================
    // 1. RULE OF THIRDS - Text on 1/3 lines is more aesthetic
    // =====================================================
    // For a 3x3 grid, row 0 is top third, row 1 is middle third, row 2 is bottom third
    // Headlines look best at row 0 (top third line)
    if (cell.row === 0) score += 45;      // TOP THIRD: Ideal for headlines
    if (cell.row === 2) score += 15;      // BOTTOM THIRD: Good for CTA
    // Middle third is less desirable (usually has product)
    
    // =====================================================
    // 2. VISUAL BALANCE - Edge positions create natural hierarchy
    // =====================================================
    // Side columns create visual tension with product in center
    if (cell.col === 0) score += 10;      // Left side - good for LTR reading
    if (cell.col === 2) score += 8;       // Right side - acceptable
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
      'top-left': { r: 0, c: 0 },
      'top-right': { r: 0, c: 2 },
      'bottom-left': { r: 2, c: 0 },
      'bottom-right': { r: 2, c: 2 } // Default for Tesco/Drinkaware
    };
    
    const logoLoc = logoMap[logoPosition] || logoMap['bottom-right'];
    
    // NUCLEAR: Never place text on logo
    if (cell.row === logoLoc.r && cell.col === logoLoc.c) {
      score -= 1000;
    }
    
    // Adjacent cells also risky
    if (Math.abs(cell.row - logoLoc.r) <= 1 && Math.abs(cell.col - logoLoc.c) <= 1) {
      if (cell.row === logoLoc.r || cell.col === logoLoc.c) {
        score -= 25;
      }
    }

    // =====================================================
    // 5. UNIFORMITY - Low variance = clean text background
    // =====================================================
    // Variance 0-0.25 typical. Low variance means uniform area = good for text
    const uniformityBonus = Math.max(0, 35 - (variance * 120));
    score += uniformityBonus;

    // =====================================================
    // 6. CONTRAST - Extreme brightness is better for readability
    // =====================================================
    if (brightness < 0.25) score += 20;    // Dark background (White text pops)
    else if (brightness > 0.75) score += 15;    // Light background (Dark text works)
    else score -= 10; // Mid-gray is harder for text visibility

    // =====================================================
    // 7. BREATHING ROOM - Edge cells have natural margins
    // =====================================================
    // Cells at image edges have built-in margins from image boundaries
    if (cell.row === 0 || cell.row === gridRows - 1) score += 5;  // Top/bottom edge
    if (cell.col === 0 || cell.col === gridCols - 1) score += 5;  // Left/right edge
    
    return { ...cell, brightness, variance, score };
  }
  /**
   * Calculate AESTHETIC coordinates using design principles
   * - Golden Ratio (φ = 1.618) for spacing
   * - Rule of Thirds for positioning
   * - Visual Hierarchy (2:1 headline:subheading ratio)
   * - Proper breathing room and margins
   * - COLUMN-BASED LAYOUT to avoid product overlap
   */
  static calculateCoordinates(zone, canvasW, canvasH, imageBounds = null) {
    const bounds = imageBounds || { x: 0, y: 0, width: canvasW, height: canvasH };
    
    // === DESIGN CONSTANTS ===
    const GOLDEN_RATIO = 1.618;
    const THIRDS_TOP = bounds.height / 3;
    const THIRDS_BOTTOM = (bounds.height * 2) / 3;
    
    // === COLUMN-BASED LAYOUT: TEXT SAFE ZONE ===
    // Text occupies LEFT 40% of canvas to avoid product (typically center-right)
    const SAFE_TEXT_ZONE_WIDTH = 0.42; // 42% of canvas width for text
    const safeTextWidth = bounds.width * SAFE_TEXT_ZONE_WIDTH;
    
    console.log('📐 [LAYOUT] Column-based layout: Text zone = left', (SAFE_TEXT_ZONE_WIDTH * 100).toFixed(0) + '%');
    
    // === DETERMINE TEXT COLOR BASED ON BACKGROUND ===
    const isDarkBg = zone.brightness < 0.5;
    const textColor = isDarkBg ? '#FFFFFF' : '#1a1a1a';
    
    // === ELEGANT SHADOW STYLING ===
    const needsShadow = zone.variance > 0.015 || (zone.brightness > 0.25 && zone.brightness < 0.75);
    const shadowColor = isDarkBg ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)';
    const shadowBlur = 6;
    
    // === AESTHETIC MARGINS ===
    const horizontalMargin = bounds.width * 0.05; // 5% margin from left edge
    const verticalMargin = bounds.height * 0.05;
    
    // === FONT SIZING (Visual Hierarchy) ===
    const baseFontSize = Math.max(28, Math.min(52, bounds.width / 16));
    const headlineFontSize = Math.round(baseFontSize);
    const subheadingFontSize = Math.round(baseFontSize / 2);
    
    // === WIDTH CALCULATION: Stay within safe zone ===
    // Text width is the safe zone minus margins
    const textWidth = safeTextWidth - horizontalMargin * 2;
    
    console.log('📐 [LAYOUT] Text width:', textWidth.toFixed(0), 'px (safe zone:', safeTextWidth.toFixed(0), 'px)');
    
    // === POSITIONING: Always left-aligned in safe zone ===
    const headlineX = bounds.x + horizontalMargin;
    const align = 'left'; // Left-align for column layout
    
    // Get zone info for Y positioning
    const row = zone.row || 0; // Default to top row for column layout
    const col = zone.col || 0;
    
    // Y Position: Rule of Thirds with Golden Ratio spacing
    let headlineY, subheadingY;
    
    if (row === 0) {
      // TOP ZONE - Position at top (most common for column layout)
      headlineY = bounds.y + verticalMargin + (THIRDS_TOP * 0.15);
    } else if (row === 2) {
      // BOTTOM ZONE - Position above bottom third
      const textBlockHeight = headlineFontSize * 2.5;
      headlineY = bounds.y + THIRDS_BOTTOM - textBlockHeight;
    } else {
      // MIDDLE ZONE - 30% from top
      headlineY = bounds.y + (bounds.height * 0.3);
    }
    
    // === GOLDEN RATIO SPACING BETWEEN HEADLINE AND SUBHEADING ===
    // Gap = headline font size / golden ratio ≈ 0.618 * fontSize
    const goldenGap = headlineFontSize / GOLDEN_RATIO;
    subheadingY = headlineY + headlineFontSize * 1.3 + goldenGap;
    
    console.log('✨ [AESTHETIC] Golden Ratio Gap:', goldenGap.toFixed(1), 'px');
    console.log('✨ [AESTHETIC] Headline→Subheading spacing:', (subheadingY - headlineY).toFixed(1), 'px');

    return {
      headline: {
        x: headlineX,
        y: headlineY,
        width: textWidth,
        fontSize: headlineFontSize,
        color: textColor,
        align: align,
        shadowEnabled: needsShadow,
        shadowColor: shadowColor,
        shadowBlur: shadowBlur,
        shadowOffsetX: 0,
        shadowOffsetY: 2, // Subtle downward shadow
        letterSpacing: 0.5, // Slight letter spacing for headlines
        isSmart: true,
        zone: `row${row}-col${col}`
      },
      subheading: {
        x: headlineX,
        y: subheadingY,
        width: textWidth,
        fontSize: subheadingFontSize,
        color: textColor,
        align: align,
        shadowEnabled: needsShadow,
        shadowColor: shadowColor,
        shadowBlur: shadowBlur - 2,
        shadowOffsetX: 0,
        shadowOffsetY: 1,
        letterSpacing: 0.2,
        lineHeight: 1.5, // More readable line height for subheadings
        isSmart: true
      }
    };
  }

  /**
   * Aesthetic default placement with golden ratio spacing
   */
  static getDefaultPlacement(w, h) {
    const GOLDEN_RATIO = 1.618;
    const headlineFontSize = Math.max(28, Math.min(48, w / 16));
    const subheadingFontSize = Math.round(headlineFontSize / 2);
    const goldenGap = headlineFontSize / GOLDEN_RATIO;
    const textWidth = w * 0.62; // Golden ratio based width
    
    return {
      headline: {
        x: (w - textWidth) / 2,
        y: h * 0.12, // Top placement
        width: textWidth,
        fontSize: headlineFontSize,
        color: '#FFFFFF',
        align: 'center',
        shadowEnabled: true,
        shadowColor: 'rgba(0,0,0,0.5)',
        shadowBlur: 6,
        shadowOffsetY: 2,
        letterSpacing: 0.5
      },
      subheading: {
        x: (w - textWidth) / 2,
        y: h * 0.12 + headlineFontSize * 1.3 + goldenGap,
        width: textWidth,
        fontSize: subheadingFontSize,
        color: '#FFFFFF',
        align: 'center',
        shadowEnabled: true,
        shadowColor: 'rgba(0,0,0,0.5)',
        shadowBlur: 4,
        shadowOffsetY: 1,
        letterSpacing: 0.2,
        lineHeight: 1.5
      }
    };
  }
}

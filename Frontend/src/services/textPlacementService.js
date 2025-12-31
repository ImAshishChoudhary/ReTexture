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

  static scoreCell(cell, brightness, variance, logoPosition) {
    let score = 50; // Base score
    
    // 1. Position preference
    if (cell.row === 0) score += 40;      // Top Row: Ideal for headlines
    if (cell.row === 1) score += 10;      // Middle: Acceptable
    if (cell.row === 2) score -= 20;      // Bottom: Often has footer/logo

    // 2. Center Avoidance (Subject typically in center)
    if (cell.row === 1 && cell.col === 1) score -= 50; 
    
    // 3. DYNAMIC LOGO AVOIDANCE
    // Map logo position strings to grid coordinates
    const logoMap = {
      'top-left': { r: 0, c: 0 },
      'top-right': { r: 0, c: 2 },
      'bottom-left': { r: 2, c: 0 },
      'bottom-right': { r: 2, c: 2 } // Default
    };
    
    const logoLoc = logoMap[logoPosition] || logoMap['bottom-right'];
    
    // STRICT Check: Is this cell the logo cell?
    if (cell.row === logoLoc.r && cell.col === logoLoc.c) {
      score -= 1000; // NUCLEAR OPTION: Do not place text here.
    }
    
    // Proximity Check: Adjacent cells might also be risky
    if (Math.abs(cell.row - logoLoc.r) <= 1 && Math.abs(cell.col - logoLoc.c) <= 1) {
       // Only penalize if it's the SAME row or SAME column (direct overlap risk)
       // Diagonals are usually fine
       if (cell.row === logoLoc.r || cell.col === logoLoc.c) {
         score -= 20; 
       }
    }

    // 4. Uniformity (Low variance = readable text)
    // Variance 0-0.25. Low variance is good (+30 max)
    score += Math.max(0, 30 - (variance * 100));

    // 5. Contrast preference (Dark/Light extremes are better than mid-gray)
    if (brightness < 0.3) score += 15;    // Dark background (White text)
    if (brightness > 0.7) score += 10;    // Light background (Dark text)
    
    return { ...cell, brightness, variance, score };
  }

  static calculateCoordinates(zone, canvasW, canvasH, imageBounds = null) {
    // Use provided bounds or default to full canvas
    const bounds = imageBounds || { x: 0, y: 0, width: canvasW, height: canvasH };
    
    // Determine text color based on brightness
    const isDarkBg = zone.brightness < 0.5;
    const textColor = isDarkBg ? '#FFFFFF' : '#1a1a1a';
    
    // Determine shadow need
    const needsShadow = zone.variance > 0.02 || (zone.brightness > 0.3 && zone.brightness < 0.7);
    const shadowColor = isDarkBg ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)';
    
    // --- TESCO LOGO-STYLE POSITIONING ---
    // Dynamic padding: 3% of image width, minimum 15px
    const padding = Math.max(15, bounds.width * 0.03);
    
    // Base font size relative to image bounds (not canvas)
    const baseSize = Math.max(24, Math.min(60, bounds.width / 15));
    
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
      maxW = bounds.width * 0.80;
      fontSize = zone.variance < 0.005 ? baseSize * 1.3 : baseSize;
    }
    
    // === X POSITION (TescoLogo-style corner math) ===
    switch (col) {
      case 0: // LEFT column
        xPos = bounds.x + padding;
        align = 'left';
        break;
      case 2: // RIGHT column
        xPos = bounds.x + bounds.width - maxW - padding;
        align = 'right';
        break;
      default: // CENTER column
        xPos = bounds.x + (bounds.width - maxW) / 2;
        align = 'center';
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
    
    // Subheading positioned dynamically below headline
    const subheadingY = yPos + fontSize * 1.3;

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
        zone: `row${row}-col${col}` // Debug info
      },
      subheading: {
        x: xPos,
        y: subheadingY,
        width: maxW,
        fontSize: Math.round(fontSize * 0.6),
        color: textColor,
        align: align,
        shadowEnabled: needsShadow,
        shadowColor: shadowColor,
        shadowBlur: 3
      }
    };
  }

  static getDefaultPlacement(w, h) {
    return {
      headline: {
        x: w / 2,
        y: h * 0.15,
        fontSize: 42,
        color: '#FFFFFF',
        shadowEnabled: true,
        shadowColor: 'rgba(0,0,0,0.5)',
        shadowBlur: 4
      },
      subheading: {
        x: w / 2,
        y: h * 0.22,
        fontSize: 24,
        color: '#FFFFFF',
        shadowEnabled: true,
        shadowColor: 'rgba(0,0,0,0.5)',
        shadowBlur: 3
      }
    };
  }
}

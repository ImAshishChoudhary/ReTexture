/**
 * Headline API Client
 * Communicates with Agent's headline generation endpoints
 */

const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8001';

/**
 * Suggest keywords based on product image
 * @param {string} imageBase64 - Base64 encoded image
 * @returns {Promise<{success: boolean, keywords: string[], error?: string}>}
 */
export async function suggestKeywords(imageBase64) {
  console.log('📤 [HEADLINE API] Requesting keyword suggestions...');
  
  try {
    const response = await fetch(`${AGENT_API_URL}/api/headline/suggest-keywords`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_base64: imageBase64
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    console.log('📥 [HEADLINE API] Keywords received:', data);
    return data;
    
  } catch (error) {
    console.error('❌ [HEADLINE API] Keyword suggestion failed:', error);
    return {
      success: false,
      keywords: [],
      error: error.message
    };
  }
}

/**
 * Generate 3 headline options
 * @param {Object} params
 * @param {string} params.imageBase64 - Base64 encoded image
 * @param {string} [params.designId] - Design ID for rate limiting
 * @param {string} [params.campaignType] - Campaign type (promotion, seasonal, etc)
 * @param {string[]} [params.userKeywords] - User-provided keywords
 * @returns {Promise<{success: boolean, headlines: Array<{text: string, confidence: number}>, error?: string}>}
 */
export async function generateHeadlines({ imageBase64, designId, campaignType, userKeywords }) {
  console.log('📤 [HEADLINE API] Generating headlines...');
  console.log('  ↳ designId:', designId);
  console.log('  ↳ campaignType:', campaignType);
  console.log('  ↳ userKeywords:', userKeywords);
  
  try {
    const response = await fetch(`${AGENT_API_URL}/api/headline/generate-headlines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_base64: imageBase64,
        design_id: designId || 'default',
        campaign_type: campaignType,
        user_keywords: userKeywords
      })
    });
    
    if (response.status === 429) {
      return {
        success: false,
        headlines: [],
        error: 'Rate limit exceeded. Maximum 10 generations per design.'
      };
    }
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    console.log('📥 [HEADLINE API] Headlines received:', data);
    return data;
    
  } catch (error) {
    console.error('❌ [HEADLINE API] Headline generation failed:', error);
    return {
      success: false,
      headlines: [],
      error: error.message
    };
  }
}

/**
 * Generate 3 subheading options
 * @param {Object} params
 * @param {string} params.imageBase64 - Base64 encoded image
 * @param {string} [params.designId] - Design ID for rate limiting
 * @param {string} [params.campaignType] - Campaign type
 * @param {string[]} [params.userKeywords] - User-provided keywords
 * @returns {Promise<{success: boolean, subheadings: Array<{text: string, confidence: number}>, error?: string}>}
 */
export async function generateSubheadings({ imageBase64, designId, campaignType, userKeywords }) {
  console.log('📤 [HEADLINE API] Generating subheadings...');
  
  try {
    const response = await fetch(`${AGENT_API_URL}/api/headline/generate-subheadings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_base64: imageBase64,
        design_id: designId || 'default',
        campaign_type: campaignType,
        user_keywords: userKeywords
      })
    });
    
    if (response.status === 429) {
      return {
        success: false,
        subheadings: [],
        error: 'Rate limit exceeded. Maximum 10 generations per design.'
      };
    }
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    console.log('📥 [HEADLINE API] Subheadings received:', data);
    return data;
    
  } catch (error) {
    console.error('❌ [HEADLINE API] Subheading generation failed:', error);
    return {
      success: false,
      subheadings: [],
      error: error.message
    };
  }
}

/**
 * Calculate optimal placement for text
 * @param {Object} params
 * @param {number} params.canvasWidth
 * @param {number} params.canvasHeight
 * @param {string} [params.backgroundColor]
 * @returns {Promise<{headline: Object, subheading: Object, text_color: string}>}
 */
export async function calculatePlacement({ canvasWidth, canvasHeight, backgroundColor }) {
  console.log('📐 [HEADLINE API] Calculating placement...');
  
  try {
    const response = await fetch(`${AGENT_API_URL}/api/headline/calculate-placement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        canvas_width: canvasWidth,
        canvas_height: canvasHeight,
        background_color: backgroundColor || '#1a1a1a'
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    console.log('📥 [HEADLINE API] Placement received:', data);
    return data;
    
  } catch (error) {
    console.error('❌ [HEADLINE API] Placement calculation failed:', error);
    // Return default placement on error
    return {
      headline: { x: canvasWidth / 2, y: 100, fontSize: 36, align: 'center', color: '#FFFFFF' },
      subheading: { x: canvasWidth / 2, y: 150, fontSize: 20, align: 'center', color: '#FFFFFF' },
      text_color: '#FFFFFF'
    };
  }
}

/**
 * 🎯 AI-Powered Smart Placement
 * Uses Gemini Vision to analyze image and find optimal text position
 * @param {Object} params
 * @param {string} params.imageBase64 - Base64 encoded image
 * @param {number} params.canvasWidth
 * @param {number} params.canvasHeight
 * @returns {Promise<{success: boolean, placement: Object}>}
 */
export async function getSmartPlacement({ imageBase64, canvasWidth, canvasHeight }) {
  console.log('🎯 [HEADLINE API] Getting smart AI placement...');
  console.log('  ↳ canvas:', canvasWidth, 'x', canvasHeight);
  
  try {
    const response = await fetch(`${AGENT_API_URL}/api/headline/smart-placement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_base64: imageBase64,
        canvas_width: canvasWidth,
        canvas_height: canvasHeight
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    console.log('🎯 [HEADLINE API] Smart placement received:', data);
    return data;
    
  } catch (error) {
    console.error('❌ [HEADLINE API] Smart placement failed:', error);
    // Return default placement on error
    return {
      success: true,
      placement: {
        headline: { 
          x: canvasWidth / 2, 
          y: canvasHeight * 0.15, 
          fontSize: 42, 
          fontWeight: 'bold',
          align: 'center', 
          color: '#FFFFFF',
          shadow: true,
          shadowColor: 'rgba(0,0,0,0.5)',
          shadowBlur: 4,
          shadowOffsetX: 2,
          shadowOffsetY: 2
        },
        subheading: { 
          x: canvasWidth / 2, 
          y: canvasHeight * 0.22, 
          fontSize: 22, 
          fontWeight: 'normal',
          align: 'center', 
          color: '#FFFFFF',
          shadow: true,
          shadowColor: 'rgba(0,0,0,0.3)'
        }
      }
    };
  }
}

/**
 * 🎨 AI-Powered Font Style Recommendation
 * Analyzes product image and recommends typography styling
 * @param {Object} params
 * @param {string} params.imageBase64 - Base64 encoded image
 * @returns {Promise<{success: boolean, fontStyle: Object}>}
 */
export async function getFontStyle({ imageBase64 }) {
  console.log('🎨 [HEADLINE API] Getting AI font style recommendation...');
  
  try {
    const response = await fetch(`${AGENT_API_URL}/api/headline/font-style`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_base64: imageBase64
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    console.log('🎨 [HEADLINE API] Font style received:', data);
    return data;
    
  } catch (error) {
    console.error('❌ [HEADLINE API] Font style analysis failed:', error);
    // Return default font style on error
    return {
      success: true,
      fontStyle: {
        mood: 'modern',
        reasoning: 'Default style due to API error',
        fontWeight: 'semibold',
        letterSpacing: 'normal',
        textTransform: 'none',
        suggestedCase: 'Title Case'
      }
    };
  }
}

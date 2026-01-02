/**
 * Validation API Client
 * Handles backend compliance validation and auto-fix requests
 */

const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8001';

console.log('🔧 [Validation API] Backend URL configured:', AGENT_API_URL);

/**
 * Request AI-powered auto-fix for compliance violations
 * 
 * @param {Object} params - Auto-fix parameters
 * @param {string} params.html - Canvas HTML with base64 images
 * @param {string} params.css - Canvas CSS styles
 * @param {Object} params.images - Image map {placeholder_id: base64_data_url}
 * @param {Array} params.violations - Array of violation objects
 * @param {number} params.canvasWidth - Canvas width in pixels (default: 1080)
 * @param {number} params.canvasHeight - Canvas height in pixels (default: 1920)
 * @returns {Promise<Object>} Auto-fix response with corrected HTML/CSS
 */
export async function requestAutoFix({
  html,
  css,
  images = {},
  violations = [],
  canvasWidth = 1080,
  canvasHeight = 1920
}) {
  try {
    console.log('🤖 [Validation API] Requesting auto-fix for', violations.length, 'violations');
    console.log('🌐 [Validation API] Target URL:', `${AGENT_API_URL}/validate/auto-fix`);
    console.log('📦 [Validation API] Request payload:', {
      htmlLength: html.length,
      cssLength: css.length,
      imageCount: Object.keys(images).length,
      violationCount: violations.length,
      canvasSize: { width: canvasWidth, height: canvasHeight }
    });
    
    const requestBody = {
      html,
      css,
      images,
      violations: violations.map(v => ({
        elementId: v.elementId || null,
        rule: v.rule,
        severity: v.severity || 'hard',
        message: v.message,
        autoFixable: v.autoFixable !== false
      })),
      canvas_width: canvasWidth,
      canvas_height: canvasHeight
    };
    
    console.log('📡 [Validation API] Sending POST request...');
    
    const response = await fetch(`${AGENT_API_URL}/validate/auto-fix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 [Validation API] Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    // Handle rate limiting
    if (response.status === 429) {
      console.warn('⚠️ [Validation API] Rate limit exceeded');
      return {
        success: false,
        error: 'Rate limit exceeded. Please wait a moment and try again.',
        corrected_html: html,
        corrected_css: css,
        fixes_applied: [],
        remaining_violations: violations.map(v => v.rule),
        llm_iterations: 0
      };
    }

    // Handle server errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('✅ [Validation API] Auto-fix completed:', {
      success: data.success,
      fixesApplied: data.fixes_applied?.length || 0,
      iterations: data.llm_iterations
    });

    return {
      success: data.success,
      corrected_html: data.corrected_html,
      corrected_css: data.corrected_css,
      fixes_applied: data.fixes_applied || [],
      remaining_violations: data.remaining_violations || [],
      llm_iterations: data.llm_iterations || 0,
      error: data.error || null
    };

  } catch (error) {
    console.error('❌ [Validation API] Auto-fix failed:', error);
    console.error('❌ [Validation API] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    
    return {
      success: false,
      error: error.message || 'Failed to connect to validation service',
      corrected_html: html,
      corrected_css: css,
      fixes_applied: [],
      remaining_violations: violations.map(v => v.rule),
      llm_iterations: 0
    };
  }
}


/**
 * Validate canvas HTML/CSS (legacy endpoint)
 * 
 * @param {string} canvasHtml - Base64-encoded canvas HTML
 * @returns {Promise<Object>} Validation response
 */
export async function validateCanvas(canvasHtml) {
  try {
    const response = await fetch(`${AGENT_API_URL}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        canvas: canvasHtml
      })
    });

    if (!response.ok) {
      throw new Error(`Validation failed: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    console.error('❌ [Validation API] Validation failed:', error);
    throw error;
  }
}


/**
 * Extract images from HTML/CSS for backend processing
 * Finds all base64 data URLs and creates a map
 * 
 * @param {string} html - HTML string
 * @param {string} css - CSS string
 * @returns {Object} {cleanedHtml, cleanedCss, imageMap}
 */
export function extractImagesForBackend(html, css) {
  const imageMap = {};
  let counter = 0;

  // Extract from <img> tags
  const imgRegex = /<img[^>]+src="(data:image\/[^"]+)"[^>]*>/gi;
  const cleanedHtml = html.replace(imgRegex, (match, dataUrl) => {
    const placeholder = `IMG_${++counter}`;
    imageMap[placeholder] = dataUrl;
    return match.replace(dataUrl, `{{ ${placeholder} }}`);
  });

  // Extract from CSS backgrounds
  const cssRegex = /background-image:\s*url\((data:image\/[^)]+)\)/gi;
  const cleanedCss = css.replace(cssRegex, (match, dataUrl) => {
    const placeholder = `IMG_${++counter}`;
    imageMap[placeholder] = dataUrl;
    return match.replace(dataUrl, `{{ ${placeholder} }}`);
  });

  return {
    cleanedHtml,
    cleanedCss,
    imageMap
  };
}


/**
 * Check if validation API is available
 * 
 * @returns {Promise<boolean>} True if API is reachable
 */
export async function checkValidationApiHealth() {
  try {
    const response = await fetch(`${AGENT_API_URL}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    return response.ok;
  } catch (error) {
    console.warn('⚠️ [Validation API] Health check failed:', error.message);
    return false;
  }
}

/**
 * Agent API utility for validation and generation services
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

/**
 * Validate canvas state with compliance checks
 * @param {object} canvasData - Canvas state object
 * @returns {Promise<object>} Validation response with compliance status
 */
export async function validateCanvasState(canvasData) {
  try {
    const canvasJSON = JSON.stringify(canvasData);
    const base64Canvas = btoa(canvasJSON);

    const response = await fetch(`${BACKEND_URL}/process/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ canvas: base64Canvas }),
    });

    if (!response.ok) {
      throw new Error(`Validation failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Validation error:', error);
    throw error;
  }
}

/**
 * Generate image variations via backend
 * @param {File} imageFile - Product image file
 * @param {string} concept - Generation concept/prompt
 * @returns {Promise<object>} Generation response with variations
 */
export async function generateVariationViaBackend(imageFile, concept) {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('concept', concept);

    const response = await fetch(`${BACKEND_URL}/process/generate/variations`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Generation failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Generation error:', error);
    throw error;
  }
}

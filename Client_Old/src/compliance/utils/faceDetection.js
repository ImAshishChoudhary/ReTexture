import * as blazeface from '@tensorflow-models/blazeface';
import '@tensorflow/tfjs';

console.log('📦 [FACE DETECTION MODULE] Loaded');

// Cache the model to avoid re-loading
let modelCache = null;
let modelLoadingPromise = null;

/**
 * Loads the BlazeFace model with caching
 * @returns {Promise<blazeface.BlazeFaceModel>}
 */
export async function loadModel() {
  // Return cached model if available
  if (modelCache) {
    console.log('✅ [FACE DETECTION] Using cached model');
    return modelCache;
  }

  // Return existing loading promise if model is currently loading
  if (modelLoadingPromise) {
    console.log('⏳ [FACE DETECTION] Model loading in progress, waiting...');
    return modelLoadingPromise;
  }

  // Start loading the model
  console.log('📦 [FACE DETECTION] Loading BlazeFace model...');
  const startTime = performance.now();
  
  modelLoadingPromise = blazeface.load()
    .then(model => {
      const duration = performance.now() - startTime;
      console.log(`✅ [FACE DETECTION] Model loaded in ${duration.toFixed(0)}ms`);
      modelCache = model;
      modelLoadingPromise = null;
      return model;
    })
    .catch(error => {
      console.error('❌ [FACE DETECTION] Model loading failed:', error);
      modelLoadingPromise = null;
      throw error;
    });

  return modelLoadingPromise;
}

/**
 * Detects faces in an image element
 * @param {HTMLImageElement | HTMLCanvasElement} imageElement - The image to analyze
 * @returns {Promise<{faceCount: number, faces: Array, hasFaces: boolean, error?: Error}>}
 */
export async function detectFaces(imageElement) {
  console.log('🔍 [FACE DETECTION] Starting face detection...');
  
  if (!imageElement) {
    console.warn('⚠️ [FACE DETECTION] No image element provided');
    return { faceCount: 0, faces: [], hasFaces: false };
  }

  try {
    const model = await loadModel();
    
    console.log('📸 [FACE DETECTION] Analyzing image...');
    const startTime = performance.now();
    
    // returnTensors: false means we get simple arrays, not TensorFlow tensors
    const predictions = await model.estimateFaces(imageElement, false);
    
    const duration = performance.now() - startTime;
    const faceCount = predictions.length;
    
    console.log(`✅ [FACE DETECTION] Detection complete in ${duration.toFixed(0)}ms`);
    console.log(`  ↳ Faces detected: ${faceCount}`);
    
    if (faceCount > 0) {
      predictions.forEach((face, idx) => {
        console.log(`  ↳ Face ${idx + 1}:`, {
          topLeft: face.topLeft,
          bottomRight: face.bottomRight,
          probability: face.probability?.[0]?.toFixed(2)
        });
      });
    }
    
    return {
      faceCount,
      faces: predictions,
      hasFaces: faceCount > 0
    };
  } catch (error) {
    console.error('❌ [FACE DETECTION] Detection failed:', error);
    return {
      faceCount: 0,
      faces: [],
      hasFaces: false,
      error
    };
  }
}

/**
 * Pre-loads the model for better performance on first validation
 * Call this on app initialization (optional)
 */
export async function preloadModel() {
  console.log('🚀 [FACE DETECTION] Pre-loading model...');
  try {
    await loadModel();
    console.log('✅ [FACE DETECTION] Model pre-loaded successfully');
  } catch (error) {
    console.warn('⚠️ [FACE DETECTION] Pre-load failed, will load on demand:', error);
  }
}

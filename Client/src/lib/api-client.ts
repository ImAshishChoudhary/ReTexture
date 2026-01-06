/**
 * API Client for Agents Backend
 * Connects to FastAPI backend for AI features
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

console.log('[API CLIENT] Backend URL:', API_BASE_URL);

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: error || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}

/**
 * Upload file (for images)
 */
async function uploadFile<T>(
  endpoint: string,
  file: File | Blob,
  fieldName: string = 'file'
): Promise<ApiResponse<T>> {
  try {
    const formData = new FormData();
    formData.append(fieldName, file);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: error || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error(`Upload Error [${endpoint}]:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
}

// ============================================================================
// BACKGROUND REMOVAL API
// ============================================================================

export interface RemoveBgResponse {
  success: boolean;
  image_data: string; // base64 encoded PNG
  format: string;
}

export async function removeBackground(imageFile: File | Blob): Promise<ApiResponse<RemoveBgResponse>> {
  return uploadFile<RemoveBgResponse>('/remove-bg', imageFile, 'file');
}

// ============================================================================
// HEADLINE GENERATION API
// ============================================================================

export interface HeadlineRequest {
  imageBase64?: string | null;
  designId?: string;
  campaignType?: string;
  userKeywords?: string[] | null;
}

export interface HeadlineResult {
  text: string;
  confidence: number;
  rating?: number;
  complianceStatus?: 'pass' | 'warning' | 'fail';
  issues?: string[];
}

export interface HeadlineResponse {
  success: boolean;
  headlines: HeadlineResult[];
  metadata?: {
    model: string;
    generationTime: number;
  };
}

export async function generateHeadlines(request: HeadlineRequest): Promise<ApiResponse<HeadlineResponse>> {
  return fetchApi<HeadlineResponse>('/api/headline/generate-headlines', {
    method: 'POST',
    body: JSON.stringify({
      image_base64: request.imageBase64 || '',
      design_id: request.designId || 'default',
      campaign_type: request.campaignType || null,
      user_keywords: request.userKeywords || null,
    }),
  });
}

export interface SubheadingResponse {
  success: boolean;
  subheadings: HeadlineResult[];
}

export async function generateSubheadings(request: HeadlineRequest): Promise<ApiResponse<SubheadingResponse>> {
  return fetchApi<SubheadingResponse>('/api/headline/generate-subheadings', {
    method: 'POST',
    body: JSON.stringify({
      image_base64: request.imageBase64 || '',
      design_id: request.designId || 'default',
      campaign_type: request.campaignType || null,
      user_keywords: request.userKeywords || null,
    }),
  });
}

export interface KeywordRequest {
  imageBase64: string;
}

export interface KeywordResponse {
  success: boolean;
  keywords: string[];
}

export async function suggestKeywords(request: KeywordRequest): Promise<ApiResponse<KeywordResponse>> {
  return fetchApi<KeywordResponse>('/api/headline/suggest-keywords', {
    method: 'POST',
    body: JSON.stringify({
      image_base64: request.imageBase64,
    }),
  });
}

// ============================================================================
// TEXT PLACEMENT API
// ============================================================================

export interface PlacementRequest {
  imageBase64?: string | null;
  canvasWidth: number;
  canvasHeight: number;
  existingElements?: Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export interface PlacementPosition {
  x?: number;
  y?: number;
  x_percent?: number;
  y_percent?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  align?: string;
  fontWeight?: string;
  shadow?: boolean;
  shadowColor?: string;
}

export interface PlacementResult {
  headline?: PlacementPosition;
  subheading?: PlacementPosition;
  subject_position?: string;
  empty_zones?: string[];
  background_brightness?: string;
}

export interface PlacementResponse {
  success: boolean;
  placement: PlacementResult;
}

export async function getSmartPlacement(request: PlacementRequest): Promise<ApiResponse<PlacementResponse>> {
  return fetchApi<PlacementResponse>('/api/headline/smart-placement', {
    method: 'POST',
    body: JSON.stringify({
      image_base64: request.imageBase64 || '',
      canvas_width: request.canvasWidth,
      canvas_height: request.canvasHeight,
    }),
  });
}

// ============================================================================
// VALIDATION API
// ============================================================================

export interface ValidationViolation {
  elementId: string;
  rule: string;
  severity: 'hard' | 'soft' | 'warning' | 'critical';
  message: string;
  autoFixable: boolean;
  autoFix?: {
    property: string;
    value: string | number;
  };
}

export interface CanvasObject {
  id?: string;
  type: string;
  left: number;
  top: number;
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  fill?: string;
  fontFamily?: string;
  textAlign?: string;
  scaleX?: number;
  scaleY?: number;
  // Custom properties for compliance recognition
  customId?: string;
  isTescoTag?: boolean;
  isLogo?: boolean;
  isBackground?: boolean;
  stickerType?: string;
  src?: string;
}

export interface CanvasData {
  width: number;
  height: number;
  objects: CanvasObject[];
  background?: string;
}

export interface ValidationRequest {
  canvas: string; // base64 encoded canvas JSON
}

export interface ValidationIssue {
  rule: string;
  message: string;
  severity?: string;
  details?: string;
  elementId?: string;
  autoFixable?: boolean;
}

export interface ValidationResponse {
  success: boolean;
  canvas: string; // corrected canvas
  compliant: boolean;
  issues: ValidationIssue[];
  warnings?: ValidationIssue[];
  suggestions: string[];
}

/**
 * Validate canvas against Tesco compliance rules
 * Accepts either a base64 string, a CanvasData object, or a ValidationRequest
 */
export async function validateCanvas(canvasData: CanvasData | string | ValidationRequest): Promise<ApiResponse<ValidationResponse>> {
  // Convert CanvasData to base64 string if needed
  let base64Canvas: string;
  
  if (typeof canvasData === 'string') {
    base64Canvas = canvasData;
  } else if ('canvas' in canvasData) {
    // ValidationRequest object
    base64Canvas = canvasData.canvas;
  } else {
    const canvasJson = JSON.stringify(canvasData);
    base64Canvas = btoa(encodeURIComponent(canvasJson).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
  }
  
  return fetchApi<ValidationResponse>('/validate', {
    method: 'POST',
    body: JSON.stringify({ canvas: base64Canvas }),
  });
}

// ============================================================================
// AUTO-FIX API
// ============================================================================

export interface AutoFixRequest {
  html: string;
  css: string;
  images?: Record<string, string>;
  violations: ValidationViolation[];
  canvasWidth: number;
  canvasHeight: number;
}

export interface AutoFixResponse {
  success: boolean;
  corrected_html: string;
  corrected_css: string;
  fixes_applied: Array<{
    rule: string;
    elementId: string;
    fix: string;
  }>;
  llm_iterations: number;
}

export async function requestAutoFix(request: AutoFixRequest): Promise<ApiResponse<AutoFixResponse>> {
  return fetchApi<AutoFixResponse>('/validate/auto-fix', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ============================================================================
// GENERATE CONTENT FOR AUTO-FIX API
// ============================================================================

export interface GenerateContentRequest {
  rule: string;
  context?: string;
  product_name?: string;
  canvas_objects?: Array<{
    type?: string;
    text?: string;
    fontSize?: number;
    [key: string]: unknown;
  }>;
}

export interface GenerateContentResponse {
  content: string;
  rule: string;
  suggestion?: string;
}

export async function generateContentForFix(request: GenerateContentRequest): Promise<ApiResponse<GenerateContentResponse>> {
  return fetchApi<GenerateContentResponse>('/validate/generate-content', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ============================================================================
// IMAGE GENERATION API
// ============================================================================

export interface GenerateImageRequest {
  prompt: string;
  style?: string;
  width?: number;
  height?: number;
}

export interface GenerateImageResponse {
  success: boolean;
  image: string; // base64
  prompt: string;
}

export async function generateImage(request: GenerateImageRequest): Promise<ApiResponse<GenerateImageResponse>> {
  return fetchApi<GenerateImageResponse>('/generate', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// Export API base for custom requests
export { API_BASE_URL, fetchApi, uploadFile };

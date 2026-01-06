import { useState, useCallback } from "react";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

console.log('[VARIATIONS] API Base URL:', API_BASE_URL);

export interface Variation {
  id: string;
  url: string;
  name: string;
}

interface UseVariationsOptions {
  onVariationReceived?: (variation: Variation) => void;
  onComplete?: (variations: Variation[]) => void;
  onError?: (error: Error) => void;
}

export const useGenerateVariations = (options?: UseVariationsOptions) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loadingStyles, setLoadingStyles] = useState<string[]>([]);

  const generateVariations = useCallback(async (imageData: string, concept: string = "product photography") => {
    console.log('[VARIATIONS] ========================================');
    console.log('[VARIATIONS] generateVariations called');
    console.log('[VARIATIONS] Timestamp:', new Date().toISOString());
    console.log('[VARIATIONS] Image data length:', imageData.length, 'characters');
    console.log('[VARIATIONS] Concept:', concept);
    console.log('[VARIATIONS] API Base URL:', API_BASE_URL);
    console.log('[VARIATIONS] ========================================');
    
    setIsGenerating(true);
    setVariations([]);
    setLoadingStyles(["Studio", "Lifestyle", "Creative"]);

    const styleNames = ["Studio", "Lifestyle", "Creative"];
    
    // Show message about Render cold start
    const coldStartToast = toast.loading(
      "Starting AI service... (This may take 30-60 seconds on first request)",
      { duration: 60000 }
    );
    console.log('[VARIATIONS] Cold start toast displayed');

    try {
      // Call streaming endpoint with longer timeout for Render cold start
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error('[VARIATIONS] Request timeout after 120 seconds');
        controller.abort();
      }, 120000); // 2 min timeout

      const apiUrl = `${API_BASE_URL}/generate/variations/stream`;
      console.log('[VARIATIONS] Calling API:', apiUrl);
      console.log('[VARIATIONS] Request method: POST');
      console.log('[VARIATIONS] Request headers:', { "Content-Type": "application/json" });
      console.log('[VARIATIONS] Request body size:', JSON.stringify({
          image_data: imageData,
          concept: concept,
        }).length, 'bytes');

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_data: imageData,
          concept: concept,
        }),
        signal: controller.signal,
      });

      console.log('[VARIATIONS] Response status:', response.status);
      console.log('[VARIATIONS] Response headers:', Object.fromEntries(response.headers.entries()));

      clearTimeout(timeoutId);
      toast.dismiss(coldStartToast);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('[VARIATIONS] Error response:', errorText);
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      const receivedVariations: Variation[] = [];
      
      console.log('[VARIATIONS] Starting to read SSE stream...');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[VARIATIONS] Stream reading complete');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        console.log('[VARIATIONS] Buffer chunk received, size:', value.length);

        // Process complete SSE events
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          if (!event.trim()) continue;

          const lines = event.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6);
              try {
                const data = JSON.parse(jsonStr);
                console.log('[VARIATIONS] SSE event received:', data.type, data);

                if (data.type === "progress") {
                  console.log(`[VARIATIONS] Progress: Generating ${styleNames[data.index]} (index ${data.index})`);
                  toast.loading(`Generating ${styleNames[data.index]} style...`, {
                    id: `var-progress-${data.index}`,
                  });
                }

                if (data.type === "variation" && data.data) {
                  console.log(`[VARIATIONS] Variation received: ${styleNames[data.index]}, data length: ${data.data.length}`);
                  const newVariation: Variation = {
                    id: `var${Date.now()}_${data.index}`,
                    url: `data:image/png;base64,${data.data}`,
                    name: styleNames[data.index] || `Variation ${data.index + 1}`,
                  };

                  // Remove from loading
                  setLoadingStyles((prev) =>
                    prev.filter((s) => s !== styleNames[data.index])
                  );

                  // Add to variations
                  setVariations((prev) => [...prev, newVariation]);
                  receivedVariations.push(newVariation);
                  console.log(`[VARIATIONS] Total variations so far: ${receivedVariations.length}`);
                  
                  options?.onVariationReceived?.(newVariation);
                  
                  toast.success(`${styleNames[data.index]} ready!`, {
                    id: `var-progress-${data.index}`,
                  });
                }

                if (data.type === "error" && data.index !== undefined) {
                  console.error(`[VARIATIONS] Error for ${styleNames[data.index]}:`, data.message || 'Unknown error');
                  setLoadingStyles((prev) =>
                    prev.filter((s) => s !== styleNames[data.index])
                  );
                  toast.error(`Failed to generate ${styleNames[data.index]}`);
                }

                if (data.type === "complete") {
                  console.log('[VARIATIONS] Generation complete! Total variations:', receivedVariations.length);
                  setLoadingStyles([]);
                  options?.onComplete?.(receivedVariations);
                  toast.success("All variations generated!");
                }
              } catch (e) {
                console.warn("[VARIATIONS] Failed to parse SSE data:", jsonStr, e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("[VARIATIONS] ========================================");
      console.error("[VARIATIONS] ERROR caught in generateVariations");
      console.error("[VARIATIONS] Timestamp:", new Date().toISOString());
      console.error("[VARIATIONS] Error type:", error instanceof Error ? error.name : typeof error);
      console.error("[VARIATIONS] Error object:", error);
      if (error instanceof Error) {
        console.error("[VARIATIONS] Error message:", error.message);
        console.error("[VARIATIONS] Error stack:", error.stack);
      }
      console.error("[VARIATIONS] ========================================");
      
      toast.dismiss(coldStartToast);
      
      let errorMessage = "Generation failed";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn("[VARIATIONS] Request aborted due to timeout");
          errorMessage = "Request timeout. The service may be waking up. Please try again.";
        } else if (error.message.includes('502')) {
          console.warn("[VARIATIONS] Backend returned 502 Bad Gateway (cold start)");
          errorMessage = "Backend service is starting up (Free tier cold start). Please wait 30 seconds and try again.";
        } else if (error.message.includes('Failed to fetch')) {
          console.error("[VARIATIONS] Network error - cannot reach backend");
          console.error("[VARIATIONS] Check backend URL:", API_BASE_URL);
          errorMessage = "Cannot connect to backend. Please check if the backend URL is correct in environment variables.";
        } else {
          errorMessage = error.message;
        }
      }
      
      console.error("[VARIATIONS] Final error message to user:", errorMessage);
      
      const err = new Error(errorMessage);
      options?.onError?.(err);
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      console.log('[VARIATIONS] Cleanup: Setting isGenerating to false');
      setIsGenerating(false);
      setLoadingStyles([]);
      console.log('[VARIATIONS] generateVariations function complete');
    }
  }, [options]);

  const reset = useCallback(() => {
    setVariations([]);
    setLoadingStyles([]);
    setIsGenerating(false);
  }, []);

  return {
    generateVariations,
    isGenerating,
    variations,
    loadingStyles,
    reset,
  };
};

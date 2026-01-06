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
    setIsGenerating(true);
    setVariations([]);
    setLoadingStyles(["Studio", "Lifestyle", "Creative"]);

    const styleNames = ["Studio", "Lifestyle", "Creative"];
    
    // Show message about Render cold start
    const coldStartToast = toast.loading(
      "Starting AI service... (This may take 30-60 seconds on first request)",
      { duration: 60000 }
    );

    try {
      // Call streaming endpoint with longer timeout for Render cold start
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

      console.log('[VARIATIONS] Calling API:', `${API_BASE_URL}/generate/variations/stream`);
      console.log('[VARIATIONS] Image data length:', imageData.length);
      console.log('[VARIATIONS] Concept:', concept);

      const response = await fetch(`${API_BASE_URL}/generate/variations/stream`, {
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

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

                if (data.type === "progress") {
                  toast.loading(`Generating ${styleNames[data.index]} style...`, {
                    id: `var-progress-${data.index}`,
                  });
                }

                if (data.type === "variation" && data.data) {
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
                  
                  options?.onVariationReceived?.(newVariation);
                  
                  toast.success(`${styleNames[data.index]} ready!`, {
                    id: `var-progress-${data.index}`,
                  });
                }

                if (data.type === "error" && data.index !== undefined) {
                  setLoadingStyles((prev) =>
                    prev.filter((s) => s !== styleNames[data.index])
                  );
                  toast.error(`Failed to generate ${styleNames[data.index]}`);
                }

                if (data.type === "complete") {
                  setLoadingStyles([]);
                  options?.onComplete?.(receivedVariations);
                  toast.success("All variations generated!");
                }
              } catch (e) {
                console.warn("Failed to parse SSE data:", e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Variation generation error:", error);
      toast.dismiss(coldStartToast);
      
      let errorMessage = "Generation failed";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Request timeout. The service may be waking up. Please try again.";
        } else if (error.message.includes('502')) {
          errorMessage = "Backend service is starting up (Free tier cold start). Please wait 30 seconds and try again.";
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = "Cannot connect to backend. Please check if the backend URL is correct in environment variables.";
        } else {
          errorMessage = error.message;
        }
      }
      
      const err = new Error(errorMessage);
      options?.onError?.(err);
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setIsGenerating(false);
      setLoadingStyles([]);
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

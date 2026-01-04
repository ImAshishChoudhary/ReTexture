import { useState, useCallback } from "react";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

    try {
      // Call streaming endpoint
      const response = await fetch(`${API_BASE_URL}/generate/variations/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_data: imageData,
          concept: concept,
        }),
      });

      if (!response.ok) {
        throw new Error(`Stream failed: ${response.status}`);
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
      const err = error instanceof Error ? error : new Error("Generation failed");
      options?.onError?.(err);
      toast.error(err.message);
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

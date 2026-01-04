"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  generateHeadlines,
  generateSubheadings,
  suggestKeywords,
  getSmartPlacement,
  type HeadlineRequest,
  type HeadlineResponse,
  type SubheadingResponse,
  type KeywordResponse,
  type PlacementResponse,
  type PlacementRequest,
} from "@/lib/api-client";

/**
 * Hook for generating AI headlines
 */
export const useGenerateHeadlines = () => {
  return useMutation<HeadlineResponse | undefined, Error, HeadlineRequest>({
    mutationFn: async (request) => {
      const result = await generateHeadlines(request);
      if (!result.success) {
        throw new Error(result.error || "Failed to generate headlines");
      }
      return result.data;
    },
    onSuccess: (data) => {
      if (data?.headlines?.length) {
        toast.success(`Generated ${data.headlines.length} headlines`);
      }
    },
    onError: (error) => {
      console.error("Headline generation error:", error);
      toast.error("Failed to generate headlines");
    },
  });
};

/**
 * Hook for generating AI subheadings
 */
export const useGenerateSubheadings = () => {
  return useMutation<SubheadingResponse | undefined, Error, HeadlineRequest>({
    mutationFn: async (request) => {
      const result = await generateSubheadings(request);
      if (!result.success) {
        throw new Error(result.error || "Failed to generate subheadings");
      }
      return result.data;
    },
    onSuccess: (data) => {
      if (data?.subheadings?.length) {
        toast.success(`Generated ${data.subheadings.length} subheadings`);
      }
    },
    onError: (error) => {
      console.error("Subheading generation error:", error);
      toast.error("Failed to generate subheadings");
    },
  });
};

/**
 * Hook for suggesting keywords from image
 */
export const useSuggestKeywords = () => {
  return useMutation<KeywordResponse | undefined, Error, { imageBase64: string }>({
    mutationFn: async (request) => {
      const result = await suggestKeywords(request);
      if (!result.success) {
        throw new Error(result.error || "Failed to suggest keywords");
      }
      return result.data;
    },
    onSuccess: (data) => {
      if (data?.keywords?.length) {
        toast.success(`Found ${data.keywords.length} keywords`);
      }
    },
    onError: (error) => {
      console.error("Keyword suggestion error:", error);
      toast.error("Failed to analyze image");
    },
  });
};

/**
 * Hook for smart text placement
 */
export const useSmartPlacement = () => {
  return useMutation<PlacementResponse | undefined, Error, PlacementRequest>({
    mutationFn: async (request) => {
      const result = await getSmartPlacement(request);
      if (!result.success) {
        throw new Error(result.error || "Failed to calculate placement");
      }
      return result.data;
    },
    onError: (error) => {
      console.error("Placement error:", error);
      // Silent fail - will use fallback placement
    },
  });
};

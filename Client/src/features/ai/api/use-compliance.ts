"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  validateCanvas,
  requestAutoFix,
  type ValidationRequest,
  type ValidationResponse,
  type AutoFixRequest,
  type AutoFixResponse,
} from "@/lib/api-client";

/**
 * Hook for validating canvas compliance
 */
export const useValidateCanvas = () => {
  return useMutation<ValidationResponse | undefined, Error, ValidationRequest>({
    mutationFn: async (request) => {
      const result = await validateCanvas(request);
      if (!result.success) {
        throw new Error(result.error || "Validation failed");
      }
      return result.data;
    },
    onSuccess: (data) => {
      if (data?.compliant) {
        toast.success(`Canvas is compliant! ✓`);
      } else {
        const issueCount = data?.issues?.length || 0;
        toast.warning(`Found ${issueCount} issue${issueCount !== 1 ? 's' : ''}`);
      }
    },
    onError: (error) => {
      console.error("Validation error:", error);
      toast.error("Failed to validate canvas");
    },
  });
};

/**
 * Hook for auto-fixing compliance issues
 */
export const useAutoFix = () => {
  return useMutation<AutoFixResponse | undefined, Error, AutoFixRequest>({
    mutationFn: async (request) => {
      const result = await requestAutoFix(request);
      if (!result.success) {
        throw new Error(result.error || "Auto-fix failed");
      }
      return result.data;
    },
    onSuccess: (data) => {
      if (data?.fixes_applied?.length) {
        toast.success(`Applied ${data.fixes_applied.length} fixes`);
      }
    },
    onError: (error) => {
      console.error("Auto-fix error:", error);
      toast.error("Failed to auto-fix issues");
    },
  });
};

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { removeBackground, type RemoveBgResponse } from "@/lib/api-client";

interface UseRemoveBackgroundOptions {
  onSuccess?: (resultUrl: string) => void;
  onError?: (error: Error) => void;
}

export const useRemoveBackground = (options?: UseRemoveBackgroundOptions) => {
  return useMutation({
    mutationKey: ["remove-background"],
    mutationFn: async (file: File | Blob) => {
      const result = await removeBackground(file);
      if (!result.success || !result.data) {
        throw new Error(result.error || "Background removal failed");
      }
      return result.data;
    },
    onSuccess: (data) => {
      toast.success("Background removed successfully!");
      // The result is a base64 string from the API - use image_data field
      const imageUrl = `data:image/png;base64,${data.image_data}`;
      options?.onSuccess?.(imageUrl);
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove background: ${error.message}`);
      options?.onError?.(error);
    },
  });
};

// Hook for file-based background removal
export const useRemoveBackgroundFile = (options?: UseRemoveBackgroundOptions) => {
  return useMutation({
    mutationKey: ["remove-background-file"],
    mutationFn: async (file: File) => {
      const result = await removeBackground(file);
      if (!result.success || !result.data) {
        throw new Error(result.error || "Background removal failed");
      }
      return result.data;
    },
    onSuccess: (data) => {
      toast.success("Background removed successfully!");
      const imageUrl = `data:image/png;base64,${data.image_data}`;
      options?.onSuccess?.(imageUrl);
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove background: ${error.message}`);
      options?.onError?.(error);
    },
  });
};


"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface RequestType {
  imageUrl: string;
}

interface ResponseType {
  data: string;
}

export const useRemoveBg = () => {
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ imageUrl }) => {
      const { removeBackground } = await import("@imgly/background-removal");

      const response = await fetch(imageUrl);
      const blob = await response.blob();

      const resultBlob = await removeBackground(blob, {
        progress: (key, current, total) => {
          console.log(`Processing: ${key} - ${Math.round((current / total) * 100)}%`);
        },
      });

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          resolve({ data: base64String });
        };
        reader.onerror = reject;
        reader.readAsDataURL(resultBlob);
      });
    },
    onSuccess: () => {
      toast.success("Background removed successfully");
    },
    onError: (error) => {
      console.error("Background removal error:", error);
      toast.error("Failed to remove background");
    },
  });

  return mutation;
};

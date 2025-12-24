"use client";

import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface UploadedImage {
  id: string;
  url: string;
  name: string;
  uploadedAt: string;
}

const STORAGE_KEY = "uploaded-images";

const getUploadedImagesFromStorage = (): UploadedImage[] => {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to get uploaded images from storage:", error);
    return [];
  }
};

const saveUploadedImagesToStorage = (images: UploadedImage[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
  } catch (error) {
    console.error("Failed to save uploaded images to storage:", error);
  }
};

interface RequestType {
  file: File;
}

interface ResponseType {
  data: UploadedImage;
}

export const useUploadImage = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ file }) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          const base64String = reader.result as string;

          const uploadedImage: UploadedImage = {
            id: crypto.randomUUID(),
            url: base64String,
            name: file.name,
            uploadedAt: new Date().toISOString(),
          };

          const images = getUploadedImagesFromStorage();
          images.unshift(uploadedImage); // Add to beginning of array
          saveUploadedImagesToStorage(images);

          resolve({ data: uploadedImage });
        };

        reader.onerror = () => {
          reject(new Error("Failed to read file"));
        };

        reader.readAsDataURL(file);
      });
    },
    onSuccess: () => {
      toast.success("Image uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["uploaded-images"] });
    },
    onError: () => {
      toast.error("Failed to upload image");
    }
  });

  return mutation;
};

export const useGetUploadedImages = () => {
  return {
    data: getUploadedImagesFromStorage(),
    isLoading: false,
    isError: false,
  };
};

interface DeleteRequestType {
  id: string;
}

interface DeleteResponseType {
  data: { id: string };
}

export const useDeleteUploadedImage = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<DeleteResponseType, Error, DeleteRequestType>({
    mutationFn: async ({ id }) => {
      const images = getUploadedImagesFromStorage();
      const filteredImages = images.filter(img => img.id !== id);

      if (filteredImages.length === images.length) {
        throw new Error("Image not found");
      }

      saveUploadedImagesToStorage(filteredImages);

      return { data: { id } };
    },
    onSuccess: () => {
      toast.success("Image deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["uploaded-images"] });
    },
    onError: () => {
      toast.error("Failed to delete image");
    }
  });

  return mutation;
};

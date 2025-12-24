"use client";

import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Project, getProjectsFromStorage, saveProjectsToStorage } from "./use-get-projects";

interface RequestType {
  name: string;
  json: string;
  width: number;
  height: number;
  thumbnailUrl?: string;
}

interface ResponseType {
  data: Project;
}

export const useSaveAsTemplate = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (data) => {
      const newTemplate: Project = {
        id: crypto.randomUUID(),
        name: data.name,
        json: data.json,
        width: data.width,
        height: data.height,
        userId: "anonymous",
        isTemplate: true,
        isPro: false,
        thumbnailUrl: data.thumbnailUrl || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const projects = getProjectsFromStorage();
      projects.push(newTemplate);
      saveProjectsToStorage(projects);

      return { data: newTemplate };
    },
    onSuccess: () => {
      toast.success("Saved as template!");
      // Invalidate all queries that start with "templates"
      queryClient.invalidateQueries({ queryKey: ["templates"], refetchType: "all" });
    },
    onError: () => {
      toast.error("Failed to save as template.");
    },
  });

  return mutation;
};

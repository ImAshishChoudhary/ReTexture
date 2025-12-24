"use client";

import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Project, getProjectsFromStorage, saveProjectsToStorage } from "./use-get-projects";

interface RequestType {
  name?: string;
  json?: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

interface ResponseType {
  data: Project;
}

export const useUpdateProject = (id: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationKey: ["project", { id }],
    mutationFn: async (updates) => {
      const projects = getProjectsFromStorage();
      const index = projects.findIndex(p => p.id === id);

      if (index === -1) {
        throw new Error("Project not found");
      }

      const updatedProject: Project = {
        ...projects[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      projects[index] = updatedProject;
      saveProjectsToStorage(projects);

      return { data: updatedProject };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", { id }] });
    },
    onError: () => {
      toast.error("Failed to update project");
    }
  });

  return mutation;
};

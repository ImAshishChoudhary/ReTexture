"use client";

import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Project, getProjectsFromStorage, saveProjectsToStorage } from "./use-get-projects";

interface RequestType {
  id: string;
}

interface ResponseType {
  data: Project;
}

export const useDuplicateProject = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (param) => {
      const projects = getProjectsFromStorage();
      const project = projects.find(p => p.id === param.id);

      if (!project) {
        throw new Error("Project not found");
      }

      const duplicatedProject: Project = {
        ...project,
        id: crypto.randomUUID(),
        name: `Copy of ${project.name}`,
        isTemplate: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      projects.push(duplicatedProject);
      saveProjectsToStorage(projects);

      return { data: duplicatedProject };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: () => {
      toast.error("Failed to duplicate project");
    }
  });

  return mutation;
};

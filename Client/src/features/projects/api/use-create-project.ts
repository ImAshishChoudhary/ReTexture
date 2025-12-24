"use client";

import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Project, getProjectsFromStorage, saveProjectsToStorage } from "./use-get-projects";

interface RequestType {
  name: string;
  json: string;
  width: number;
  height: number;
}

interface ResponseType {
  data: Project;
}

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const newProject: Project = {
        id: crypto.randomUUID(),
        name: json.name,
        json: json.json,
        width: json.width,
        height: json.height,
        userId: "anonymous",
        isTemplate: false,
        isPro: false,
        thumbnailUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const projects = getProjectsFromStorage();
      projects.push(newProject);
      saveProjectsToStorage(projects);

      return { data: newProject };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: () => {
      toast.error("Failed to create project.");
    },
  });

  return mutation;
};

"use client";

import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getProjectsFromStorage, saveProjectsToStorage } from "./use-get-projects";

interface RequestType {
  id: string;
}

interface ResponseType {
  data: { id: string };
}

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (param) => {
      const projects = getProjectsFromStorage();
      const filteredProjects = projects.filter(p => p.id !== param.id);

      if (filteredProjects.length === projects.length) {
        throw new Error("Project not found");
      }

      saveProjectsToStorage(filteredProjects);

      return { data: { id: param.id } };
    },
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", { id: data.id }] });
    },
    onError: () => {
      toast.error("Failed to delete project");
    }
  });

  return mutation;
};

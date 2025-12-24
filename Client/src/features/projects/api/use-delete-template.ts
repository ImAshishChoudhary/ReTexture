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

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (param) => {
      const projects = getProjectsFromStorage();
      const template = projects.find(p => p.id === param.id && p.isTemplate);

      if (!template) {
        throw new Error("Template not found");
      }

      const filteredProjects = projects.filter(p => p.id !== param.id);
      saveProjectsToStorage(filteredProjects);

      return { data: { id: param.id } };
    },
    onSuccess: ({ data }) => {
      toast.success("Template deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", { id: data.id }] });
    },
    onError: () => {
      toast.error("Failed to delete template");
    }
  });

  return mutation;
};

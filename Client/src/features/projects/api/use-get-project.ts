"use client";

import { useQuery } from "@tanstack/react-query";
import { Project, getProjectsFromStorage } from "./use-get-projects";

export type ResponseType = { data: Project };

export const useGetProject = (id: string) => {
  const query = useQuery({
    enabled: !!id,
    queryKey: ["project", { id }],
    queryFn: async () => {
      const projects = getProjectsFromStorage();
      const project = projects.find(p => p.id === id);

      if (!project) {
        throw new Error("Project not found");
      }

      return project;
    },
  });

  return query;
};

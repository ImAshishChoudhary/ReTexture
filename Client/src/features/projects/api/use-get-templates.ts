"use client";

import { useQuery } from "@tanstack/react-query";
import { Project, getProjectsFromStorage } from "./use-get-projects";

export type ResponseType = Project[];

export const useGetTemplates = () => {
  const query = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const allTemplates = getProjectsFromStorage()
        .filter(p => p.isTemplate)
        .sort((a, b) => {
          if (a.isPro !== b.isPro) return (a.isPro ? 1 : 0) - (b.isPro ? 1 : 0);
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

      return allTemplates;
    },
  });

  return query;
};

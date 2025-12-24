"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

export interface Project {
  id: string;
  name: string;
  json: string;
  width: number;
  height: number;
  userId: string;
  isTemplate?: boolean;
  isPro?: boolean;
  thumbnailUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResponseType {
  data: Project[];
  nextPage: number | null;
}

const STORAGE_KEY = "texona_projects";

export const getProjectsFromStorage = (): Project[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveProjectsToStorage = (projects: Project[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

export const useGetProjects = () => {
  const query = useInfiniteQuery<ResponseType, Error>({
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    queryKey: ["projects"],
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      const limit = 5;

      const allProjects = getProjectsFromStorage()
        .filter(p => !p.isTemplate)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      const start = (page - 1) * limit;
      const end = start + limit;
      const data = allProjects.slice(start, end);

      return {
        data,
        nextPage: end < allProjects.length ? page + 1 : null,
      };
    },
  });

  return query;
};

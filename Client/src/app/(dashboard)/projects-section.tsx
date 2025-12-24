"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Loader2, MoreHorizontal, Copy, Trash2, FolderOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useDeleteProject } from "@/features/projects/api/use-delete-project";
import { useDuplicateProject } from "@/features/projects/api/use-duplicate-project";

import { useConfirm } from "@/hooks/use-confirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const ProjectsSection = () => {
  const [ConfirmDialog, confirm] = useConfirm("Delete Project?", "This action cannot be undone.");
  const duplicateMutation = useDuplicateProject();
  const removeMutation = useDeleteProject();
  const router = useRouter();

  const onCopy = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    duplicateMutation.mutate({ id });
  };

  const onDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const ok = await confirm();
    if (ok) removeMutation.mutate({ id });
  };

  const { data, status, fetchNextPage, isFetchingNextPage, hasNextPage } = useGetProjects();

  if (status === "pending") {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500 text-[15px]">Failed to load projects</p>
      </div>
    );
  }

  if (!data.pages.length || !data.pages[0].data.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/10">
          <FolderOpen className="w-6 h-6 text-neutral-500" />
        </div>
        <p className="text-white font-medium">No projects yet</p>
        <p className="text-neutral-500 text-[14px] mt-1">Create your first design to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ConfirmDialog />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {data.pages.map((group, i) => (
          <React.Fragment key={i}>
            {group.data.map((project) => (
              <div key={project.id} className="group">
                <button
                  onClick={() => router.push(`/editor/${project.id}`)}
                  disabled={duplicateMutation.isPending || removeMutation.isPending}
                  className="w-full text-left"
                >
                  <div className="relative overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                    {project.thumbnailUrl ? (
                      <img
                        src={project.thumbnailUrl}
                        alt={project.name}
                        className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full aspect-[4/3] flex items-center justify-center">
                        <span className="text-neutral-500 text-[13px]">No preview</span>
                      </div>
                    )}
                  </div>
                </button>
                <div className="mt-2.5 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14px] font-medium text-white truncate">{project.name}</h3>
                    <p className="text-[13px] text-neutral-500">
                      {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-neutral-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => onCopy(e, project.id)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => onDelete(e, project.id)} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
      {hasNextPage && (
        <div className="flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="text-[14px] text-neutral-500 hover:text-white transition-colors"
          >
            {isFetchingNextPage ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
};

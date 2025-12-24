"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Plus, FolderOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { useCreateProject } from "@/features/projects/api/use-create-project";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { FormatModal } from "@/components/format-modal";

export default function Home() {
  const router = useRouter();
  const mutation = useCreateProject();
  const { data: projectsData, status } = useGetProjects();
  const [showModal, setShowModal] = useState(false);

  const handleCreate = (name: string, width: number, height: number) => {
    setShowModal(false);
    toast.loading("Creating design...");
    mutation.mutate(
      { name, json: "", width, height },
      { 
        onSuccess: ({ data }) => {
          toast.dismiss();
          router.push(`/editor/${data.id}`);
        }
      }
    );
  };

  const recentProjects = projectsData?.pages?.[0]?.data?.slice(0, 4) || [];

  return (
    <>
      <FormatModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onSelect={handleCreate}
      />
      
      <div className="min-h-full bg-black relative overflow-auto">
        <div className="absolute inset-0 grid-background" />
        <div className="absolute inset-0 gradient-mesh" />
        
        <div className="relative z-10 max-w-5xl mx-auto px-8 py-16">
          {/* Hero */}
          <div className="mb-16">
            <h1 className="text-5xl font-light text-white tracking-tight">
              Create retail media
              <br />
              <span className="text-neutral-500">that converts.</span>
            </h1>
            <p className="mt-6 text-neutral-500 text-lg max-w-md">
              Design professional creatives for any retail channel. Fast, compliant, and beautiful.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={() => setShowModal(true)}
                disabled={mutation.isPending}
                className="h-11 px-6 bg-white text-black text-sm font-medium rounded-full hover:bg-neutral-200 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Design
              </button>
              <button
                onClick={() => router.push("/templates")}
                className="h-11 px-6 text-sm font-medium text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
              >
                Browse Templates
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Recent Projects */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-white">Recent Projects</h2>
              {recentProjects.length > 0 && (
                <button 
                  onClick={() => router.push("/projects")}
                  className="text-sm text-neutral-500 hover:text-white transition-colors flex items-center gap-1"
                >
                  View all
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {status === "pending" && (
              <div className="grid grid-cols-4 gap-4">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="aspect-[4/3] rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            )}

            {status === "success" && recentProjects.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-white/10">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4">
                  <FolderOpen className="w-5 h-5 text-neutral-500" />
                </div>
                <p className="text-white font-medium">No projects yet</p>
                <p className="text-neutral-500 text-sm mt-1">Create your first design to get started</p>
              </div>
            )}

            {status === "success" && recentProjects.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recentProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => router.push(`/editor/${project.id}`)}
                    className="group text-left"
                  >
                    <div className="aspect-[4/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                      {project.thumbnailUrl ? (
                        <img
                          src={project.thumbnailUrl}
                          alt={project.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-neutral-600 text-xs">No preview</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium text-white truncate">{project.name}</p>
                      <p className="text-xs text-neutral-500">
                        {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

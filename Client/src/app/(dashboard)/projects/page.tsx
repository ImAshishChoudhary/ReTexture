"use client";

import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { useCreateProject } from "@/features/projects/api/use-create-project";
import { ProjectsSection } from "../projects-section";

export default function ProjectsPage() {
  const router = useRouter();
  const mutation = useCreateProject();

  const handleCreateNew = () => {
    toast.loading("Creating design...");
    mutation.mutate(
      { name: "Untitled", json: "", width: 1080, height: 1080 },
      { onSuccess: ({ data }) => router.push(`/editor/${data.id}`) }
    );
  };

  return (
    <div className="h-full overflow-auto bg-black">
      <div className="absolute inset-0 grid-background" />
      <div className="absolute inset-0 gradient-mesh" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-light text-white">Projects</h1>
            <p className="mt-1 text-[15px] text-neutral-500">Manage and edit your designs</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Search..."
                className="w-56 h-10 pl-10 pr-4 bg-white/5 border border-white/10 rounded-full text-[14px] text-white placeholder-neutral-500 focus:outline-none focus:border-white/20"
              />
            </div>
            <button
              onClick={handleCreateNew}
              disabled={mutation.isPending}
              className="h-10 px-5 bg-white text-black text-[14px] font-medium rounded-full hover:bg-neutral-200 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>
        </div>

        <ProjectsSection />
      </div>
    </div>
  );
}

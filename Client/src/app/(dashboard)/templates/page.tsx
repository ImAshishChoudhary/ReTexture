"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";

import { useCreateProject } from "@/features/projects/api/use-create-project";
import { useDeleteTemplate } from "@/features/projects/api/use-delete-template";
import { ResponseType, useGetTemplates } from "@/features/projects/api/use-get-templates";
import { useConfirm } from "@/hooks/use-confirm";

export default function TemplatesPage() {
  const router = useRouter();
  const mutation = useCreateProject();
  const deleteMutation = useDeleteTemplate();

  const [ConfirmDialog, confirm] = useConfirm(
    "Delete Template?",
    "This action cannot be undone."
  );

  const { data, isLoading, isError } = useGetTemplates({ page: "1", limit: "20" });

  const handleTemplateClick = (template: ResponseType[0]) => {
    toast.loading("Creating design...");
    mutation.mutate(
      {
        name: `${template.name} project`,
        json: template.json,
        width: template.width,
        height: template.height,
      },
      { onSuccess: ({ data }) => router.push(`/editor/${data.id}`) }
    );
  };

  return (
    <div className="h-full overflow-auto bg-black">
      <ConfirmDialog />
      
      <div className="absolute inset-0 grid-background" />
      <div className="absolute inset-0 gradient-mesh" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-light text-white">Templates</h1>
            <p className="mt-1 text-[15px] text-neutral-500">Start with a professionally designed template</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search..."
              className="w-56 h-10 pl-10 pr-4 bg-white/5 border border-white/10 rounded-full text-[14px] text-white placeholder-neutral-500 focus:outline-none focus:border-white/20"
            />
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center h-64">
            <p className="text-neutral-500 text-[15px]">Failed to load templates</p>
          </div>
        )}

        {!isLoading && !isError && data && data.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {data.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                disabled={mutation.isPending}
                className="group text-left"
              >
                <div className="relative overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                  {template.thumbnailUrl ? (
                    <img
                      src={template.thumbnailUrl}
                      alt={template.name}
                      className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full aspect-[4/3] flex items-center justify-center">
                      <span className="text-neutral-500 text-[13px]">No preview</span>
                    </div>
                  )}
                </div>
                <h3 className="mt-2.5 text-[14px] font-medium text-white truncate">{template.name}</h3>
                <p className="text-[13px] text-neutral-500">{template.width} × {template.height}</p>
              </button>
            ))}
          </div>
        )}

        {!isLoading && !isError && data && data.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-white font-medium">No templates yet</p>
            <p className="text-neutral-500 text-[14px] mt-1">Create your first template in the editor</p>
          </div>
        )}
      </div>
    </div>
  );
}

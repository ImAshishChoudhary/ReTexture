"use client";

import { useRef } from "react";
import { AlertTriangle, Loader, Trash2, ImagePlus } from "lucide-react";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";
import { useUploadImage, useGetUploadedImages, useDeleteUploadedImage } from "@/features/images/api/use-upload-image";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConfirm } from "@/hooks/use-confirm";

interface ImageSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const ImageSidebar = ({ editor, activeTool, onChangeActiveTool }: ImageSidebarProps) => {
  const uploadedImages = useGetUploadedImages();
  const uploadMutation = useUploadImage();
  const deleteMutation = useDeleteUploadedImage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ConfirmDialog, confirm] = useConfirm(
    "Delete Image?",
    "This action cannot be undone."
  );

  const onClose = () => {
    onChangeActiveTool("select");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(
        { file },
        {
          onSuccess: ({ data }) => {
            editor?.addImage(data.url);
          },
        }
      );
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteImage = async (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    const ok = await confirm();
    if (ok) {
      deleteMutation.mutate({ id: imageId });
    }
  };

  return (
    <aside
      className={cn(
        "editor-tool-panel relative z-[40] w-[360px] h-full flex flex-col",
        activeTool === "images" ? "visible" : "hidden"
      )}
    >
      <ConfirmDialog />
      <ToolSidebarHeader title="Images" description="Add images to your design" />
      
      <div className="p-4 border-b border-white/5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="w-full h-11 rounded-xl border border-dashed border-white/20 text-sm text-neutral-400 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {uploadMutation.isPending ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <ImagePlus className="w-4 h-4" />
          )}
          {uploadMutation.isPending ? "Uploading..." : "Upload Image"}
        </button>
      </div>
      
      <ScrollArea className="flex-1">
        {uploadedImages.isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-5 h-5 text-neutral-500 animate-spin" />
          </div>
        )}

        {uploadedImages.isError && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <AlertTriangle className="w-6 h-6 text-neutral-500" />
            <p className="text-sm text-neutral-500">Failed to load images</p>
          </div>
        )}

        {uploadedImages.data && uploadedImages.data.length > 0 ? (
          <div className="p-4">
            <h4 className="text-xs font-medium text-neutral-400 mb-3">Your Uploads</h4>
            <div className="grid grid-cols-2 gap-2">
              {uploadedImages.data.map((image) => (
                <div key={image.id} className="relative group">
                  <button
                    onClick={() => editor?.addImage(image.url)}
                    className="w-full aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all bg-white/5"
                  >
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                  <button
                    onClick={(e) => handleDeleteImage(e, image.id)}
                    className="absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center bg-black/60 hover:bg-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          !uploadedImages.isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <ImagePlus className="w-8 h-8 text-neutral-600" />
              <p className="text-sm text-neutral-400">No images uploaded</p>
              <p className="text-xs text-neutral-500">Upload images to use in your designs</p>
            </div>
          )
        )}
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};

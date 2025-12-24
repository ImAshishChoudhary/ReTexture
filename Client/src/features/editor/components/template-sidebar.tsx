"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertTriangle, Loader, Trash2 } from "lucide-react";

import {
  ActiveTool,
  Editor,
} from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { useGetTemplates } from "@/features/projects/api/use-get-templates";
import { useDeleteTemplate } from "@/features/projects/api/use-delete-template";
import { predefinedTemplates, templateCategories, getTemplatesByCategory, PredefinedTemplate } from "@/features/editor/data/templates";
import { Project } from "@/features/projects/api/use-get-projects";
import { fabric } from "fabric";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConfirm } from "@/hooks/use-confirm";

interface TemplateSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

// Clean preview with size overlay tag
const TemplatePreview = ({ 
  template, 
  onClick 
}: { 
  template: PredefinedTemplate; 
  onClick: () => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const previewWidth = 165;
    const previewHeight = 100;

    const canvas = new fabric.StaticCanvas(canvasRef.current, {
      width: previewWidth,
      height: previewHeight,
      backgroundColor: "#1a1a1a",
    });

    const scaleX = previewWidth / template.width;
    const scaleY = previewHeight / template.height;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (previewWidth - template.width * scale) / 2;
    const offsetY = (previewHeight - template.height * scale) / 2;

    const scaledJson = JSON.parse(JSON.stringify(template.json));
    
    if (scaledJson.objects) {
      scaledJson.objects = scaledJson.objects.map((obj: any) => {
        const scaled = { ...obj };
        
        scaled.left = (obj.left || 0) * scale + offsetX;
        scaled.top = (obj.top || 0) * scale + offsetY;
        
        if (obj.type === "rect") {
          scaled.width = (obj.width || 100) * scale;
          scaled.height = (obj.height || 100) * scale;
          if (obj.rx) scaled.rx = obj.rx * scale;
          if (obj.ry) scaled.ry = obj.ry * scale;
        }
        
        if (obj.type === "image") {
          scaled.scaleX = scale;
          scaled.scaleY = scale;
        }
        
        if (obj.type === "circle") {
          scaled.radius = (obj.radius || 50) * scale;
        }
        
        if (obj.type === "textbox" || obj.type === "text") {
          scaled.fontSize = Math.max((obj.fontSize || 24) * scale, 2);
          scaled.width = (obj.width || 100) * scale;
        }
        
        if (obj.strokeWidth) {
          scaled.strokeWidth = Math.max(obj.strokeWidth * scale, 0.2);
        }
        
        return scaled;
      });
    }

    canvas.loadFromJSON(scaledJson, () => {
      canvas.renderAll();
      setIsLoaded(true);
    });

    return () => {
      canvas.dispose();
    };
  }, [template]);

  return (
    <button
      onClick={onClick}
      className="group w-full text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
    >
      {/* Preview with size tag overlay */}
      <div className="relative h-[100px] rounded-lg overflow-hidden bg-neutral-900">
        <canvas ref={canvasRef} className="w-full h-full" />
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
            <Loader className="w-3 h-3 text-neutral-600 animate-spin" />
          </div>
        )}
        {/* Size tag overlay - top right */}
        <span className="absolute top-1.5 right-1.5 text-[9px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm">
          {template.width}×{template.height}
        </span>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {/* Only name below */}
      <p className="mt-1.5 text-[11px] font-medium text-neutral-300 truncate">{template.name}</p>
    </button>
  );
};

export const TemplateSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: TemplateSidebarProps) => {
  const [activeCategory, setActiveCategory] = useState("all");

  const [DeleteConfirmDialog, confirmDelete] = useConfirm(
    "Delete Template?",
    "This action cannot be undone."
  );

  const { data, isLoading, isError } = useGetTemplates();
  const deleteMutation = useDeleteTemplate();

  const filteredTemplates = useMemo(() => {
    return getTemplatesByCategory(activeCategory);
  }, [activeCategory]);

  const onClose = () => {
    onChangeActiveTool("select");
  };

  // Load saved template - change size first then load
  const onClickSaved = (template: Project) => {
    // First change canvas size to match template
    editor?.changeSize({ width: template.width, height: template.height });
    // Then load the JSON after a small delay to let canvas resize
    setTimeout(() => {
      editor?.loadJson(template.json);
    }, 150);
  };

  // Load predefined template
  const onClickPredefined = (template: PredefinedTemplate) => {
    editor?.changeSize({ width: template.width, height: template.height });
    setTimeout(() => {
      editor?.loadJson(JSON.stringify(template.json));
    }, 150);
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    const ok = await confirmDelete();
    if (ok) {
      deleteMutation.mutate({ id: templateId });
    }
  };

  return (
    <aside
      className={cn(
        "editor-tool-panel relative border-r z-[40] w-[380px] h-full flex flex-col",
        activeTool === "templates" ? "visible" : "hidden",
      )}
    >
      <DeleteConfirmDialog />
      <ToolSidebarHeader
        title="Templates"
        description="Beautiful designs ready to use"
      />
      
      {/* Category Filter - minimal pills */}
      <div className="px-4 pb-3">
        <div className="flex flex-wrap gap-1.5">
          {templateCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[11px] font-medium transition-all",
                activeCategory === cat.id
                  ? "bg-white text-black"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="px-4 pb-4">
          {/* Templates Grid */}
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredTemplates.map((template) => (
                <TemplatePreview
                  key={template.id}
                  template={template}
                  onClick={() => onClickPredefined(template)}
                />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-xs text-neutral-500">No templates</p>
            </div>
          )}

          {/* User Saved Templates */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader className="size-4 text-neutral-600 animate-spin" />
            </div>
          )}
          
          {isError && (
            <div className="flex flex-col gap-y-2 items-center justify-center py-8">
              <AlertTriangle className="size-4 text-neutral-600" />
              <p className="text-neutral-500 text-xs">Failed to load</p>
            </div>
          )}
          
          {data && data.length > 0 && (
            <div className="mt-5 pt-4 border-t border-white/5">
              <h4 className="text-[11px] font-medium text-neutral-500 mb-3 uppercase tracking-wider">
                Saved Templates
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {data.map((template) => (
                  <div key={template.id} className="relative group">
                    <button
                      onClick={() => onClickSaved(template)}
                      className="w-full text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <div className="relative h-[100px] rounded-lg overflow-hidden bg-neutral-900">
                        <Image
                          fill
                          src={template.thumbnailUrl || ""}
                          alt={template.name || "Template"}
                          className="object-cover"
                        />
                        {/* Size tag overlay */}
                        <span className="absolute top-1.5 right-1.5 text-[9px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm">
                          {template.width}×{template.height}
                        </span>
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {/* Only name below */}
                      <p className="mt-1.5 text-[11px] font-medium text-neutral-300 truncate">{template.name}</p>
                    </button>
                    <button
                      onClick={(e) => handleDeleteTemplate(e, template.id)}
                      className="absolute top-1.5 left-1.5 h-5 w-5 flex items-center justify-center bg-black/60 hover:bg-red-500 rounded-full z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="size-2.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};

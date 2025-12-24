"use client";

import { useFilePicker } from "use-file-picker";
import { useMutationState } from "@tanstack/react-query";
import {
  ChevronDown,
  Download,
  Loader2,
  Redo2,
  Undo2,
  FolderOpen,
  Save,
  FileJson,
  FileImage,
  Check,
  X,
  Home,
} from "lucide-react";
import Link from "next/link";

import { ActiveTool, Editor } from "@/features/editor/types";
import { useSaveAsTemplate } from "@/features/projects/api/use-save-as-template";

import { Hint } from "@/components/hint";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  id: string;
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const Navbar = ({
  id,
  editor,
}: NavbarProps) => {
  const saveAsTemplateMutation = useSaveAsTemplate();

  const data = useMutationState({
    filters: {
      mutationKey: ["project", { id }],
      exact: true,
    },
    select: (mutation) => mutation.state.status,
  });

  const currentStatus = data[data.length - 1];

  const isError = currentStatus === "error";
  const isPending = currentStatus === "pending";

  const { openFilePicker } = useFilePicker({
    accept: ".json",
    onFilesSuccessfullySelected: ({ plainFiles }: any) => {
      if (plainFiles && plainFiles.length > 0) {
        const file = plainFiles[0];
        const reader = new FileReader();
        reader.readAsText(file, "UTF-8");
        reader.onload = () => {
          editor?.loadJson(reader.result as string);
        };
      }
    },
  });

  const onSaveAsTemplate = () => {
    if (!editor) return;

    const workspace = editor.getWorkspace();
    if (!workspace) return;

    const width = workspace.width || 900;
    const height = workspace.height || 1200;

    // Generate thumbnail properly
    let thumbnailUrl: string | undefined = undefined;
    try {
      const originalTransform = editor.canvas.viewportTransform;
      
      // Reset viewport for clean export
      editor.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      editor.canvas.renderAll();

      const options = {
        format: 'png' as const,
        quality: 0.9,
        multiplier: 0.4,
        left: workspace.left || 0,
        top: workspace.top || 0,
        width: width,
        height: height,
        enableRetinaScaling: false,
      };

      thumbnailUrl = editor.canvas.toDataURL(options);

      // Restore viewport
      if (originalTransform) {
        editor.canvas.setViewportTransform(originalTransform);
        editor.canvas.renderAll();
      }
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
    }

    // Get canvas JSON with all keys
    const json = editor.canvas.toJSON([
      "name",
      "gradientAngle",
      "selectable",
      "hasControls",
      "linkData",
      "editable",
      "extensionType",
      "extension",
    ]);

    saveAsTemplateMutation.mutate({
      name: `Template ${new Date().toLocaleDateString()}`,
      json: JSON.stringify(json),
      width: width,
      height: height,
      thumbnailUrl: thumbnailUrl,
    });
  };

  return (
    <nav className="w-full flex items-center px-3 h-14 editor-navbar">
      {/* Left */}
      <div className="flex items-center gap-2">
        <Link 
          href="/"
          className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <Home className="w-4 h-4 text-neutral-400" />
        </Link>
        
        <div className="h-5 w-px bg-white/5 mx-1" />
        
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 h-8 px-2.5 rounded-md text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-colors">
              File
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44 bg-[#111] border-white/10">
            <DropdownMenuItem onClick={() => openFilePicker()} className="text-neutral-300 focus:bg-white/5 focus:text-white">
              <FolderOpen className="w-4 h-4 mr-2 text-neutral-500" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onSaveAsTemplate}
              disabled={saveAsTemplateMutation.isPending}
              className="text-neutral-300 focus:bg-white/5 focus:text-white"
            >
              <Save className="w-4 h-4 mr-2 text-neutral-500" />
              Save as Template
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="h-5 w-px bg-white/5 mx-2" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5">
        <Hint label="Undo" side="bottom" sideOffset={8}>
          <button
            disabled={!editor?.canUndo()}
            onClick={() => editor?.onUndo()}
            className="w-8 h-8 rounded-md flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
          >
            <Undo2 className="w-4 h-4" />
          </button>
        </Hint>
        
        <Hint label="Redo" side="bottom" sideOffset={8}>
          <button
            disabled={!editor?.canRedo()}
            onClick={() => editor?.onRedo()}
            className="w-8 h-8 rounded-md flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </Hint>
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5 ml-3 px-2.5 py-1 rounded-md bg-white/[0.02]">
        {isPending && (
          <>
            <Loader2 className="w-3 h-3 animate-spin text-neutral-500" />
            <span className="text-xs text-neutral-500">Saving</span>
          </>
        )}
        {!isPending && isError && (
          <>
            <X className="w-3 h-3 text-red-400" />
            <span className="text-xs text-red-400">Error</span>
          </>
        )}
        {!isPending && !isError && (
          <>
            <Check className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-neutral-500">Saved</span>
          </>
        )}
      </div>

      {/* Right */}
      <div className="ml-auto">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 h-9 px-4 rounded-lg bg-white text-black text-sm font-medium hover:bg-neutral-200 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40 bg-[#111] border-white/10">
            <DropdownMenuItem onClick={() => editor?.savePng()} className="text-neutral-300 focus:bg-white/5 focus:text-white">
              <FileImage className="w-4 h-4 mr-2 text-neutral-500" />
              PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor?.saveJpg()} className="text-neutral-300 focus:bg-white/5 focus:text-white">
              <FileImage className="w-4 h-4 mr-2 text-neutral-500" />
              JPG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor?.saveSvg()} className="text-neutral-300 focus:bg-white/5 focus:text-white">
              <FileImage className="w-4 h-4 mr-2 text-neutral-500" />
              SVG
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem onClick={() => editor?.saveJson()} className="text-neutral-300 focus:bg-white/5 focus:text-white">
              <FileJson className="w-4 h-4 mr-2 text-neutral-500" />
              JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};

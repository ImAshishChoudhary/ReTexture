"use client";

import { useState } from "react";
import { 
  Loader2, 
  Send,
  Eraser,
  ImagePlus,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Type,
  Sticker,
  Building2,
  BadgeCheck,
  ChevronRight,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";
import { HeadlineGenerator } from "@/features/editor/components/headline-generator";
import { BackgroundRemoval } from "@/features/editor/components/background-removal";
import { TescoLogo } from "@/features/editor/components/tesco-logo";
import { TescoTag } from "@/features/editor/components/tesco-tag";
import { StickerLibrary } from "@/features/editor/components/sticker-library";
import { CompliancePanel } from "@/features/editor/components/compliance-panel";
import { ImageGeneration } from "@/features/editor/components/image-generation";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AiSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

const TESCO_LOGO_TEXT = "Tesco";
const TESCO_BLUE = "#00539F";
const TESCO_RED = "#E53935";
const TESCO_YELLOW = "#FFCC00";

type AIPanel = "tools" | "headlines" | "remove-bg" | "generate" | "logo" | "badge" | "stickers" | "compliance";

interface PanelItem {
  id: AIPanel;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const PANELS: PanelItem[] = [
  { id: "headlines", label: "Headlines", icon: <Type className="w-4 h-4" />, description: "AI-generated headlines" },
  { id: "remove-bg", label: "Remove BG", icon: <Eraser className="w-4 h-4" />, description: "Background removal" },
  { id: "generate", label: "Generate BG", icon: <Wand2 className="w-4 h-4" />, description: "AI background generation" },
  { id: "logo", label: "Tesco Logo", icon: <Building2 className="w-4 h-4" />, description: "Brand logo" },
  { id: "badge", label: "Badges", icon: <BadgeCheck className="w-4 h-4" />, description: "Availability tags" },
  { id: "stickers", label: "Stickers", icon: <Sticker className="w-4 h-4" />, description: "Sticker library" },
  { id: "compliance", label: "Compliance", icon: <ShieldCheck className="w-4 h-4" />, description: "Validation check" },
];

export const AiSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: AiSidebarProps) => {
  const [activePanel, setActivePanel] = useState<AIPanel>("tools");

  const onClose = () => {
    onChangeActiveTool("select");
  };

  // Get canvas dimensions
  const canvasWidth = editor?.canvas?.getWidth() || 1080;
  const canvasHeight = editor?.canvas?.getHeight() || 1920;

  const renderPanel = () => {
    switch (activePanel) {
      case "headlines":
        return (
          <HeadlineGenerator 
            editor={editor} 
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
          />
        );
      case "remove-bg":
        return <BackgroundRemoval editor={editor} />;
      case "logo":
        return (
          <TescoLogo 
            editor={editor}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
          />
        );
      case "badge":
        return (
          <TescoTag
            editor={editor}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
          />
        );
      case "stickers":
        return (
          <StickerLibrary
            editor={editor}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
          />
        );
      case "compliance":
        return (
          <CompliancePanel
            editor={editor}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
          />
        );
      case "generate":
        return <ImageGeneration editor={editor} />;
      default:
        return renderToolsPanel();
    }
  };

  const renderToolsPanel = () => (
    <div className="space-y-6">
      {/* AI Tools Grid */}
      <div>
        <h4 className="text-xs font-medium text-neutral-400 mb-3">AI Features</h4>
        <div className="grid grid-cols-2 gap-2">
          {PANELS.map((panel) => (
            <button
              key={panel.id}
              onClick={() => setActivePanel(panel.id)}
              className="p-3 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-2 group-hover:bg-white/10 transition-colors text-neutral-400 group-hover:text-white">
                {panel.icon}
              </div>
              <p className="text-xs font-medium text-neutral-300 group-hover:text-white transition-colors">
                {panel.label}
              </p>
              <p className="text-[10px] text-neutral-500">{panel.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Brand Colors */}
      <div>
        <h4 className="text-xs font-medium text-neutral-400 mb-3">Brand Colors</h4>
        <div className="flex gap-2">
          {[
            { name: "Tesco Blue", color: TESCO_BLUE },
            { name: "Tesco Red", color: TESCO_RED },
            { name: "Tesco Yellow", color: TESCO_YELLOW },
            { name: "White", color: "#FFFFFF" },
            { name: "Black", color: "#000000" },
          ].map((brand) => (
            <button
              key={brand.name}
              onClick={() => {
                if (editor?.selectedObjects?.[0]) {
                  editor.changeFillColor(brand.color);
                  toast.success(`${brand.name} applied`);
                } else {
                  toast.error("Select an element first");
                }
              }}
              className="w-10 h-10 rounded-xl border border-white/10 hover:border-white/30 transition-all hover:scale-105"
              style={{ backgroundColor: brand.color }}
              title={brand.name}
            />
          ))}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
        <h4 className="text-xs font-medium text-white mb-2">💡 Quick Tips</h4>
        <ul className="text-[10px] text-neutral-400 space-y-1">
          <li>• Use Remove BG for product shots</li>
          <li>• Headlines follow Tesco guidelines</li>
          <li>• Run Compliance before exporting</li>
          <li>• Tesco Logo is required on all assets</li>
        </ul>
      </div>
    </div>
  );

  return (
    <aside
      className={cn(
        "editor-tool-panel relative z-[40] w-[360px] h-full flex flex-col",
        activeTool === "ai" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader
        title={activePanel === "tools" ? "AI Studio" : PANELS.find(p => p.id === activePanel)?.label || "AI Studio"}
        description={activePanel === "tools" ? "Tesco creative assistant" : "Back to tools"}
      />
      
      {/* Back Button */}
      {activePanel !== "tools" && (
        <button
          onClick={() => setActivePanel("tools")}
          className="mx-4 mb-2 px-3 py-2 text-xs text-neutral-400 hover:text-white flex items-center gap-2 rounded-lg hover:bg-white/5 transition-all"
        >
          <ChevronRight className="w-3 h-3 rotate-180" />
          Back to AI Tools
        </button>
      )}
      
      <ScrollArea className="flex-1">
        <div className="p-4">
          {renderPanel()}
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};

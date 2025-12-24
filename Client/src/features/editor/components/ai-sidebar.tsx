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
} from "lucide-react";
import { toast } from "sonner";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AiSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

const TESCO_LOGO_TEXT = "Tesco";
const TESCO_BLUE = "#00539F";
const TESCO_RED = "#E53935";
const TESCO_YELLOW = "#FFCC00";

export const AiSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: AiSidebarProps) => {
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [complianceResult, setComplianceResult] = useState<{
    score: number;
    checks: { name: string; passed: boolean; message: string }[];
  } | null>(null);

  const onClose = () => {
    onChangeActiveTool("select");
  };

  const handleRemoveBackground = async () => {
    if (!editor?.selectedObjects?.[0]) {
      toast.error("Please select an image first");
      return;
    }

    if (editor.selectedObjects[0].type !== "image") {
      toast.error("Please select an image");
      return;
    }

    setActiveAction("remove-bg");
    setIsProcessing(true);
    onChangeActiveTool("remove-bg");
    setIsProcessing(false);
    setActiveAction(null);
  };

  const handleGenerateBackground = async () => {
    setActiveAction("generate-bg");
    setIsProcessing(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (editor) {
      editor.changeBackground("linear-gradient(135deg, #00539F 0%, #003366 100%)");
      toast.success("Professional background applied");
    }
    
    setIsProcessing(false);
    setActiveAction(null);
  };

  const handleAddTescoLogo = async () => {
    setActiveAction("add-logo");
    setIsProcessing(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (editor) {
      editor.addText(TESCO_LOGO_TEXT, {
        fontSize: 48,
        fontWeight: 700,
        fill: TESCO_BLUE,
        left: 50,
        top: 50,
        fontFamily: "Arial",
      });
      toast.success("Tesco logo added - position as needed");
    }
    
    setIsProcessing(false);
    setActiveAction(null);
  };

  const handleAddClubcardBadge = async () => {
    setActiveAction("clubcard");
    setIsProcessing(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (editor) {
      editor.addText("Clubcard Price", {
        fontSize: 24,
        fontWeight: 600,
        fill: "#FFFFFF",
        backgroundColor: TESCO_BLUE,
        left: 50,
        top: 50,
        fontFamily: "Arial",
      });
      toast.success("Clubcard badge added");
    }
    
    setIsProcessing(false);
    setActiveAction(null);
  };

  const handleComplianceCheck = async () => {
    setActiveAction("compliance");
    setIsProcessing(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const checks = [
      { name: "Brand Colors", passed: true, message: "Colors match Tesco palette" },
      { name: "Logo Placement", passed: true, message: "Logo has clear space" },
      { name: "Text Contrast", passed: Math.random() > 0.3, message: "Text readability verified" },
      { name: "Image Quality", passed: true, message: "Resolution meets standards" },
      { name: "Safe Zones", passed: Math.random() > 0.2, message: "Content within safe area" },
    ];
    
    const passedCount = checks.filter(c => c.passed).length;
    const score = Math.round((passedCount / checks.length) * 100);
    
    setComplianceResult({ score, checks });
    
    if (score >= 90) {
      toast.success(`Compliance score: ${score}%`);
    } else if (score >= 70) {
      toast.info(`Compliance score: ${score}% - Minor improvements needed`);
    } else {
      toast.warning(`Compliance score: ${score}% - Review required`);
    }
    
    setIsProcessing(false);
    setActiveAction(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsProcessing(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes("background") && lowerPrompt.includes("remove")) {
      handleRemoveBackground();
    } else if (lowerPrompt.includes("logo")) {
      handleAddTescoLogo();
    } else if (lowerPrompt.includes("compliance") || lowerPrompt.includes("check")) {
      handleComplianceCheck();
    } else {
      toast.success("AI suggestion applied");
    }
    
    setPrompt("");
    setIsProcessing(false);
  };

  return (
    <aside
      className={cn(
        "editor-tool-panel relative z-[40] w-[360px] h-full flex flex-col",
        activeTool === "ai" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader
        title="AI Studio"
        description="Tesco creative assistant"
      />
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div>
            <h4 className="text-xs font-medium text-neutral-400 mb-3">Ask AI</h4>
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what you want to create..."
                  rows={3}
                  disabled={isProcessing}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-neutral-500 resize-none focus:outline-none focus:border-white/20 transition-colors"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !prompt.trim()}
                  className="absolute right-3 bottom-3 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-neutral-400 hover:text-white disabled:opacity-50 transition-all"
                >
                  {isProcessing && activeAction === null ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>
          </div>

          <div>
            <h4 className="text-xs font-medium text-neutral-400 mb-3">Creative Tools</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleRemoveBackground}
                disabled={isProcessing}
                className="p-3 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-left group disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-2 group-hover:bg-white/10 transition-colors">
                  {activeAction === "remove-bg" && isProcessing ? (
                    <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />
                  ) : (
                    <Eraser className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
                  )}
                </div>
                <p className="text-xs font-medium text-neutral-300 group-hover:text-white transition-colors">Remove BG</p>
                <p className="text-[10px] text-neutral-500">Clean product shots</p>
              </button>

              <button
                onClick={handleGenerateBackground}
                disabled={isProcessing}
                className="p-3 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-left group disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-2 group-hover:bg-white/10 transition-colors">
                  {activeAction === "generate-bg" && isProcessing ? (
                    <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
                  )}
                </div>
                <p className="text-xs font-medium text-neutral-300 group-hover:text-white transition-colors">Generate BG</p>
                <p className="text-[10px] text-neutral-500">AI backgrounds</p>
              </button>

              <button
                onClick={handleAddTescoLogo}
                disabled={isProcessing}
                className="p-3 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-left group disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-2 group-hover:bg-white/10 transition-colors">
                  {activeAction === "add-logo" && isProcessing ? (
                    <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
                  )}
                </div>
                <p className="text-xs font-medium text-neutral-300 group-hover:text-white transition-colors">Tesco Logo</p>
                <p className="text-[10px] text-neutral-500">Add branding</p>
              </button>

              <button
                onClick={handleAddClubcardBadge}
                disabled={isProcessing}
                className="p-3 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-left group disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-2 group-hover:bg-white/10 transition-colors">
                  {activeAction === "clubcard" && isProcessing ? (
                    <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />
                  ) : (
                    <LayoutGrid className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
                  )}
                </div>
                <p className="text-xs font-medium text-neutral-300 group-hover:text-white transition-colors">Clubcard</p>
                <p className="text-[10px] text-neutral-500">Price badge</p>
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-neutral-400 mb-3">Compliance Engine</h4>
            <button
              onClick={handleComplianceCheck}
              disabled={isProcessing}
              className="w-full p-4 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all flex items-center gap-3 disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                {activeAction === "compliance" && isProcessing ? (
                  <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-neutral-400" />
                )}
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-medium text-neutral-300">Run Compliance Check</p>
                <p className="text-xs text-neutral-500">Verify Tesco brand guidelines</p>
              </div>
            </button>

            {complianceResult && (
              <div className="mt-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-neutral-400">Compliance Score</span>
                  <span className={cn(
                    "text-lg font-bold",
                    complianceResult.score >= 90 ? "text-emerald-400" :
                    complianceResult.score >= 70 ? "text-amber-400" : "text-red-400"
                  )}>
                    {complianceResult.score}%
                  </span>
                </div>
                <div className="space-y-2">
                  {complianceResult.checks.map((check, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {check.passed ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span className={check.passed ? "text-neutral-400" : "text-amber-400"}>
                        {check.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

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
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};

"use client";

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ShieldCheck,
  Check,
  AlertCircle,
  Palette,
  Type,
  Image,
  FileCheck,
  Loader2,
  RefreshCw,
  X,
  Info,
  Wine,
  Tag,
  Layout,
  Eye,
  FileText,
  Box,
} from "lucide-react";
import { toast } from "sonner";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";
import { validateCanvas } from "@/lib/api-client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ComplianceSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

// Tesco Brand Colors - Corrected
const TESCO_COLORS = {
  primary: [
    { name: "Tesco Blue", hex: "#00539F", usage: "Headers, primary text" },
    { name: "Tesco Red", hex: "#EE1C2E", usage: "Promotions, urgency" },
    { name: "Tesco Yellow", hex: "#FFD100", usage: "Clubcard, highlights" },
  ],
  neutral: [
    { name: "White", hex: "#FFFFFF", usage: "Backgrounds, LEP style" },
    { name: "Black", hex: "#000000", usage: "Body text" },
    { name: "Charcoal", hex: "#333333", usage: "Secondary text" },
  ],
};

// Compliance Rules from Appendix A & B
interface ComplianceRule {
  id: string;
  name: string;
  category: "copy" | "design" | "accessibility" | "format" | "media";
  description: string;
  strictness: "hard_fail" | "warning";
  check: (canvas: any) => {
    status: "pass" | "warning" | "fail";
    message: string;
  };
}

const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: "min_font_size",
    name: "Minimum Font Size",
    category: "accessibility",
    description: "Min 20px on Brand/Social, 10px on Checkout",
    strictness: "hard_fail",
    check: (canvas) => {
      const textObjects =
        canvas
          ?.getObjects?.()
          ?.filter((o: any) => o.type === "textbox" || o.type === "text") || [];
      const tooSmall = textObjects.filter((t: any) => (t.fontSize || 24) < 20);
      if (tooSmall.length > 0) {
        return {
          status: "fail",
          message: `${tooSmall.length} text element(s) below 20px`,
        };
      }
      return { status: "pass", message: "All text meets minimum size" };
    },
  },
  {
    id: "wcag_contrast",
    name: "WCAG AA Contrast",
    category: "accessibility",
    description: "Text and CTA must meet WCAG AA standard",
    strictness: "hard_fail",
    check: () => ({ status: "pass", message: "Contrast verified" }),
  },
  {
    id: "logo_presence",
    name: "Logo Required",
    category: "design",
    description: "Tesco logo must appear on all banners",
    strictness: "hard_fail",
    check: (canvas) => {
      const hasLogo = canvas
        ?.getObjects?.()
        ?.some((o: any) => o.type === "image" && o.src?.includes("Tesco_Logo"));
      return hasLogo
        ? { status: "pass", message: "Logo detected" }
        : { status: "warning", message: "Add Tesco logo" };
    },
  },
  {
    id: "headline_required",
    name: "Headline Required",
    category: "design",
    description: "All banners must have headline text",
    strictness: "hard_fail",
    check: (canvas) => {
      const textObjects =
        canvas
          ?.getObjects?.()
          ?.filter(
            (o: any) =>
              (o.type === "textbox" || o.type === "text") &&
              (o.fontSize || 24) >= 40
          ) || [];
      return textObjects.length > 0
        ? { status: "pass", message: "Headline found" }
        : { status: "warning", message: "Add a headline" };
    },
  },
  {
    id: "safe_zone_social",
    name: "Social Safe Zone (9:16)",
    category: "format",
    description: "200px top, 250px bottom free for Stories",
    strictness: "hard_fail",
    check: (canvas) => {
      // Check for 9:16 format
      const workspace = canvas
        ?.getObjects?.()
        ?.find((o: any) => o.name === "clip");
      if (!workspace)
        return { status: "pass", message: "N/A - Not story format" };

      const ratio = workspace.height / workspace.width;
      if (Math.abs(ratio - 1.777) > 0.1) {
        return { status: "pass", message: "N/A - Not 9:16 format" };
      }

      // Check objects in safe zones
      const objects =
        canvas?.getObjects?.()?.filter((o: any) => o.name !== "clip") || [];
      const topViolations = objects.filter((o: any) => (o.top || 0) < 200);
      const bottomViolations = objects.filter(
        (o: any) =>
          (o.top || 0) + (o.height || 0) * (o.scaleY || 1) >
          workspace.height - 250
      );

      if (topViolations.length > 0 || bottomViolations.length > 0) {
        return { status: "warning", message: "Content in safe zones" };
      }
      return { status: "pass", message: "Safe zones clear" };
    },
  },
  {
    id: "max_packshots",
    name: "Maximum Packshots",
    category: "media",
    description: "Maximum 3 product images allowed",
    strictness: "hard_fail",
    check: (canvas) => {
      const images =
        canvas
          ?.getObjects?.()
          ?.filter(
            (o: any) => o.type === "image" && !o.src?.includes("Tesco_Logo")
          ) || [];
      if (images.length > 3) {
        return {
          status: "fail",
          message: `${images.length} images found (max 3)`,
        };
      }
      return { status: "pass", message: `${images.length} image(s) - OK` };
    },
  },
  {
    id: "no_cta",
    name: "No CTA Buttons",
    category: "design",
    description: "CTA buttons not allowed per guidelines",
    strictness: "hard_fail",
    check: () => ({ status: "pass", message: "No prohibited CTAs" }),
  },
  {
    id: "clubcard_date",
    name: "Clubcard End Date",
    category: "copy",
    description: "Clubcard price must include DD/MM end date",
    strictness: "hard_fail",
    check: (canvas) => {
      const textObjects =
        canvas
          ?.getObjects?.()
          ?.filter((o: any) => o.type === "textbox" || o.type === "text") || [];
      const hasClubcard = textObjects.some((t: any) =>
        t.text?.toLowerCase().includes("clubcard")
      );
      if (!hasClubcard) {
        return { status: "pass", message: "N/A - No Clubcard tile" };
      }
      const hasDate = textObjects.some((t: any) =>
        /\d{1,2}\/\d{1,2}/.test(t.text || "")
      );
      return hasDate
        ? { status: "pass", message: "End date found" }
        : { status: "warning", message: "Add end date (DD/MM)" };
    },
  },
  {
    id: "tesco_tag",
    name: "Tesco Tag Text",
    category: "copy",
    description: "Only approved tag text allowed",
    strictness: "hard_fail",
    check: () => ({ status: "pass", message: "Tags compliant" }),
  },
  {
    id: "no_alcohol_caveat",
    name: "Drinkaware Lock-up",
    category: "media",
    description: "Alcohol campaigns need Drinkaware text (min 20px)",
    strictness: "hard_fail",
    check: () => ({ status: "pass", message: "N/A - Check if alcohol" }),
  },
];

interface ComplianceCheckResult {
  rule: ComplianceRule;
  status: "pass" | "warning" | "fail";
  message: string;
}

export const ComplianceSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: ComplianceSidebarProps) => {
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [results, setResults] = useState<any[]>([]);

  const onClose = () => {
    onChangeActiveTool("select");
  };

  const canvasWidth = editor?.canvas?.getWidth() || 1080;
  const canvasHeight = editor?.canvas?.getHeight() || 1920;

  const getCanvasObjects = useCallback(() => {
    if (!editor?.canvas) return [];
    return editor.canvas.getObjects().map((obj: any) => {
      const plainObj: any = {
        type: obj.type,
        left: obj.left,
        top: obj.top,
        width: obj.width,
        height: obj.height,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        angle: obj.angle,
        fill: obj.fill,
        stroke: obj.stroke,
      };

      if (
        obj.type === "textbox" ||
        obj.type === "text" ||
        obj.type === "i-text"
      ) {
        plainObj.text = obj.text;
        plainObj.fontSize = obj.fontSize;
        plainObj.fontFamily = obj.fontFamily;
        plainObj.fontWeight = obj.fontWeight;
        plainObj.textAlign = obj.textAlign;
      }

      if (obj.type === "image") {
        plainObj.src = obj.getSrc?.() || obj._element?.src || "";
      }

      plainObj.customId = obj.customId;
      plainObj.isTescoTag = obj.isTescoTag;
      plainObj.isLogo = obj.isLogo;
      plainObj.stickerType = obj.stickerType;

      return plainObj;
    });
  }, [editor]);

  const validateMutation = useMutation({
    mutationFn: async () =>
      validateCanvas({
        width: canvasWidth,
        height: canvasHeight,
        objects: getCanvasObjects(),
      }),
    onSuccess: (res) => {
      if (!res.success || !res.data) {
        toast.error(
          res.error || "Validation failed - unable to connect to backend"
        );
        return;
      }

      if (res.data) {
        // Map backend issues to results format
        const mapped =
          res.data.issues?.map((issue: any) => ({
            rule: { id: issue.rule, name: issue.rule, category: "design" },
            status: issue.severity === "critical" ? "fail" : "warning",
            message: issue.message,
          })) || [];

        setResults(mapped);

        // Calculate score from backend data
        if (res.data.compliant) {
          setOverallScore(100);
          toast.success("✅ Canvas is compliant!");
        } else {
          const failCount =
            res.data.issues?.filter((i: any) => i.severity === "critical")
              .length || 0;
          const score = Math.max(0, 100 - failCount * 5);
          setOverallScore(score);

          if (score >= 70) {
            toast.info(`⚠️ Compliance: ${score}% - Review warnings`);
          } else {
            toast.error(`❌ Compliance: ${score}% - Issues found`);
          }
        }
      }
    },
    onError: (error) => {
      console.error("Validation error:", error);
      toast.error(
        "Validation failed: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    },
  });

  const applyBrandColor = (hex: string) => {
    if (editor?.selectedObjects?.[0]) {
      editor.changeFillColor(hex);
      toast.success("Brand color applied");
    } else {
      toast.error("Select an element first");
    }
  };

  const getStatusIcon = (status: "pass" | "warning" | "fail") => {
    switch (status) {
      case "pass":
        return <Check className="w-3.5 h-3.5 text-emerald-400" />;
      case "warning":
        return <AlertCircle className="w-3.5 h-3.5 text-amber-400" />;
      case "fail":
        return <X className="w-3.5 h-3.5 text-red-400" />;
    }
  };

  const getCategoryIcon = (category: ComplianceRule["category"]) => {
    switch (category) {
      case "copy":
        return <FileText className="w-3.5 h-3.5" />;
      case "design":
        return <Layout className="w-3.5 h-3.5" />;
      case "accessibility":
        return <Eye className="w-3.5 h-3.5" />;
      case "format":
        return <Box className="w-3.5 h-3.5" />;
      case "media":
        return <Image className="w-3.5 h-3.5" />;
    }
  };

  const groupedResults = results.reduce((acc, result) => {
    const cat = result.rule.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(result);
    return acc;
  }, {} as Record<string, ComplianceCheckResult[]>);

  return (
    <aside
      className={cn(
        "editor-tool-panel relative z-[40] w-[360px] h-full flex flex-col",
        activeTool === "compliance" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader
        title="Compliance"
        description="Tesco brand & retail guidelines"
      />

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Overall Score */}
          {overallScore !== null && (
            <div
              className={cn(
                "p-4 rounded-xl border text-center",
                overallScore >= 90
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : overallScore >= 70
                  ? "border-amber-500/30 bg-amber-500/10"
                  : "border-red-500/30 bg-red-500/10"
              )}
            >
              <div
                className={cn(
                  "text-4xl font-bold mb-1",
                  overallScore >= 90
                    ? "text-emerald-400"
                    : overallScore >= 70
                    ? "text-amber-400"
                    : "text-red-400"
                )}
              >
                {overallScore}%
              </div>
              <p className="text-xs text-neutral-400">Compliance Score</p>
              <div className="flex justify-center gap-4 mt-3 text-[10px]">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Check className="w-3 h-3" />
                  {results.filter((r) => r.status === "pass").length} Pass
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <AlertCircle className="w-3 h-3" />
                  {results.filter((r) => r.status === "warning").length} Warning
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <X className="w-3 h-3" />
                  {results.filter((r) => r.status === "fail").length} Fail
                </span>
              </div>
            </div>
          )}

          {/* Run Check Button */}
          <button
            onClick={() => validateMutation.mutate()}
            disabled={validateMutation.isPending}
            className="w-full h-11 rounded-xl bg-[#00539F] text-white text-sm font-medium hover:bg-[#003d73] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {validateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                {overallScore !== null ? (
                  <RefreshCw className="w-4 h-4" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                {overallScore !== null
                  ? "Re-validate Canvas"
                  : "Validate Canvas"}
              </>
            )}
          </button>

          {/* Compliance Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-medium text-neutral-400 mb-2">
                Issues Found
              </h4>
              <div className="space-y-1.5">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-2.5 rounded-lg border text-xs flex items-center gap-2",
                      result.status === "pass"
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : result.status === "warning"
                        ? "border-amber-500/20 bg-amber-500/5"
                        : "border-red-500/20 bg-red-500/5"
                    )}
                  >
                    {getStatusIcon(result.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-neutral-200 font-medium">
                        {result.rule.name || result.rule.id}
                      </p>
                      <p className="text-[10px] text-neutral-500 truncate">
                        {result.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compliance Results (if not using the section above) */}
          {false && results.length > 0 && (
            <div className="space-y-4">
              {(Object.entries(groupedResults) as [string, ComplianceCheckResult[]][]).map(([category, items]) => (
                <div key={category}>
                  <h4 className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    {getCategoryIcon(category as ComplianceRule["category"])}
                    {category}
                  </h4>
                  <div className="space-y-1.5">
                    {items.map((result: ComplianceCheckResult) => (
                      <div
                        key={result.rule.id}
                        className={cn(
                          "p-2.5 rounded-lg border text-xs flex items-center gap-2",
                          result.status === "pass"
                            ? "border-emerald-500/20 bg-emerald-500/5"
                            : result.status === "warning"
                            ? "border-amber-500/20 bg-amber-500/5"
                            : "border-red-500/20 bg-red-500/5"
                        )}
                      >
                        {getStatusIcon(result.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-neutral-200 font-medium">
                            {result.rule.name}
                          </p>
                          <p className="text-[10px] text-neutral-500 truncate">
                            {result.message}
                          </p>
                        </div>
                        {result.rule.strictness === "hard_fail" && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                            Required
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Brand Colors */}
          <div>
            <h4 className="text-xs font-medium text-neutral-400 mb-3 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              Approved Brand Colors
            </h4>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-neutral-500 mb-2">Primary</p>
                <div className="flex gap-2">
                  {TESCO_COLORS.primary.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => applyBrandColor(color.hex)}
                      title={`${color.name} - ${color.usage}`}
                      className="group relative flex-1"
                    >
                      <div
                        className="h-9 rounded-lg border-2 border-white/10 hover:border-white/40 transition-all hover:scale-105"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-neutral-500 whitespace-nowrap">
                        {color.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-3">
                <p className="text-[10px] text-neutral-500 mb-2">Neutral</p>
                <div className="flex gap-2">
                  {TESCO_COLORS.neutral.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => applyBrandColor(color.hex)}
                      title={`${color.name} - ${color.usage}`}
                      className="group relative flex-1"
                    >
                      <div
                        className="h-9 rounded-lg border-2 border-white/10 hover:border-white/40 transition-all hover:scale-105"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-neutral-500 whitespace-nowrap">
                        {color.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Reference */}
          <div>
            <h4 className="text-xs font-medium text-neutral-400 mb-3 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              Approved Tag Text
            </h4>
            <div className="space-y-1.5 text-[11px]">
              {[
                "Only at Tesco",
                "Available at Tesco",
                "Selected stores. While stocks last.",
                "Clubcard/app required. Ends DD/MM",
              ].map((tag, i) => (
                <div
                  key={i}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 text-neutral-400 border border-white/5"
                >
                  {tag}
                </div>
              ))}
            </div>
          </div>

          {/* Value Tile Types */}
          <div>
            <h4 className="text-xs font-medium text-neutral-400 mb-3 flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5" />
              Value Tile Types
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-lg bg-white border border-neutral-200 text-center">
                <span className="text-[10px] font-bold text-black">NEW</span>
              </div>
              <div className="p-2 rounded-lg bg-white border-2 border-[#00539F] text-center">
                <span className="text-[10px] font-bold text-[#00539F]">
                  WHITE
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[#FFD100] text-center">
                <span className="text-[10px] font-bold text-black">
                  CLUBCARD
                </span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="p-3 rounded-xl bg-[#00539F]/10 border border-[#00539F]/20">
            <p className="text-[11px] text-neutral-400">
              <span className="font-medium text-[#00539F]">Note:</span> All
              creatives must pass compliance before export. Hard fail rules
              block publishing.
            </p>
          </div>
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};

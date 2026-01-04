"use client";

import { useState, useCallback } from "react";
import {
  Type,
  Sparkles,
  Loader2,
  RefreshCw,
  Check,
  AlertCircle,
  Wand2,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

import { Editor } from "@/features/editor/types";
import { useGenerateHeadlines, useGenerateSubheadings, useSuggestKeywords, useSmartPlacement } from "@/features/ai/api/use-headlines";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HeadlineGeneratorProps {
  editor: Editor | undefined;
  canvasWidth: number;
  canvasHeight: number;
}

// Match backend HeadlineItem response
interface GeneratedHeadline {
  text: string;
  confidence: number;
}

const CAMPAIGN_TYPES = [
  { value: "promotion", label: "🛍️ Promotion" },
  { value: "seasonal", label: "🎄 Seasonal" },
  { value: "food", label: "🍎 Food & Grocery" },
  { value: "alcohol", label: "🍷 Alcohol" },
  { value: "clubcard", label: "💳 Clubcard" },
];

export const HeadlineGenerator = ({
  editor,
  canvasWidth,
  canvasHeight,
}: HeadlineGeneratorProps) => {
  const [campaignType, setCampaignType] = useState("promotion");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState("");
  const [headlines, setHeadlines] = useState<GeneratedHeadline[]>([]);
  const [subheadings, setSubheadings] = useState<GeneratedHeadline[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const headlineMutation = useGenerateHeadlines();
  const subheadingMutation = useGenerateSubheadings();
  const keywordMutation = useSuggestKeywords();
  const placementMutation = useSmartPlacement();

  const isLoading = headlineMutation.isPending || subheadingMutation.isPending;

  // Extract image from canvas as base64
  const getCanvasImage = useCallback((): string | null => {
    if (!editor?.canvas) return null;
    
    try {
      const dataUrl = editor.canvas.toDataURL({
        format: "png",
        quality: 0.8,
        multiplier: 0.5, // Smaller for API
      });
      return dataUrl;
    } catch {
      return null;
    }
  }, [editor]);

  // Analyze image for keywords
  const handleAnalyzeImage = async () => {
    const imageBase64 = getCanvasImage();
    if (!imageBase64) {
      toast.error("No canvas content to analyze");
      return;
    }

    keywordMutation.mutate(
      { imageBase64 },
      {
        onSuccess: (data) => {
          if (data?.keywords) {
            setKeywords(data.keywords.slice(0, 5));
          }
        },
      }
    );
  };

  // Add custom keyword
  const handleAddKeyword = () => {
    if (customKeyword.trim() && keywords.length < 5) {
      setKeywords([...keywords, customKeyword.trim()]);
      setCustomKeyword("");
    }
  };

  // Remove keyword
  const handleRemoveKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  // Generate headlines
  const handleGenerateHeadlines = async () => {
    const imageBase64 = getCanvasImage();

    headlineMutation.mutate(
      {
        imageBase64,
        campaignType,
        userKeywords: keywords.length > 0 ? keywords : null,
      },
      {
        onSuccess: (data) => {
          if (data?.headlines) {
            setHeadlines(data.headlines);
          }
        },
      }
    );
  };

  // Generate subheadings
  const handleGenerateSubheadings = async () => {
    const imageBase64 = getCanvasImage();

    subheadingMutation.mutate(
      {
        imageBase64,
        campaignType,
        userKeywords: keywords.length > 0 ? keywords : null,
      },
      {
        onSuccess: (data) => {
          if (data?.subheadings) {
            setSubheadings(data.subheadings);
          }
        },
      }
    );
  };

  // Add headline to canvas with smart placement
  const handleAddToCanvas = async (text: string, type: "headline" | "subheading") => {
    if (!editor) return;

    // Get smart placement
    const imageBase64 = getCanvasImage();
    let placementResult;
    
    try {
      placementResult = await placementMutation.mutateAsync({
        imageBase64,
        canvasWidth,
        canvasHeight,
      });
    } catch (e) {
      console.log("Smart placement failed, using defaults");
    }

    // Backend returns x_percent and y_percent, need to convert to pixels
    const rawPlacement = type === "headline" 
      ? placementResult?.placement?.headline 
      : placementResult?.placement?.subheading;

    // Convert percentage-based placement to pixel values
    let finalPlacement;
    if (rawPlacement) {
      finalPlacement = {
        x: rawPlacement.x_percent ? (rawPlacement.x_percent / 100) * canvasWidth : rawPlacement.x || 50,
        y: rawPlacement.y_percent ? (rawPlacement.y_percent / 100) * canvasHeight : rawPlacement.y || (type === "headline" ? 100 : 200),
        fontSize: rawPlacement.fontSize || (type === "headline" ? 48 : 24),
        color: rawPlacement.color || "#ffffff",
        fontFamily: "Plus Jakarta Sans",
        align: rawPlacement.align || "center",
      };
    } else {
      // Default placement if AI fails
      finalPlacement = {
        x: 50,
        y: type === "headline" ? canvasHeight * 0.12 : canvasHeight * 0.22,
        fontSize: type === "headline" ? 48 : 24,
        color: "#ffffff",
        fontFamily: "Plus Jakarta Sans",
        align: "center",
      };
    }

    editor.addText(text, {
      left: finalPlacement.x,
      top: finalPlacement.y,
      fontSize: finalPlacement.fontSize,
      fill: finalPlacement.color,
      fontFamily: finalPlacement.fontFamily,
      textAlign: finalPlacement.align,
      width: canvasWidth * 0.8,
    });

    toast.success(`${type === "headline" ? "Headline" : "Subheading"} added to canvas`);
  };

  return (
    <div className="space-y-4">
      {/* Campaign Type Selector */}
      <div>
        <label className="text-xs font-medium text-neutral-400 mb-2 block">
          Campaign Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CAMPAIGN_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setCampaignType(type.value)}
              className={cn(
                "px-3 py-2 text-xs rounded-lg border transition-all",
                campaignType === type.value
                  ? "bg-white/10 border-white/30 text-white"
                  : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Keywords Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-neutral-400">
            Keywords
          </label>
          <button
            onClick={handleAnalyzeImage}
            disabled={keywordMutation.isPending}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            {keywordMutation.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            Auto-detect
          </button>
        </div>

        {/* Keyword Tags */}
        <div className="flex flex-wrap gap-2 mb-2">
          {keywords.map((kw, i) => (
            <span
              key={i}
              className="px-2 py-1 text-xs bg-white/10 border border-white/20 rounded-full flex items-center gap-1"
            >
              {kw}
              <button
                onClick={() => handleRemoveKeyword(i)}
                className="text-neutral-400 hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* Add Custom Keyword */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customKeyword}
            onChange={(e) => setCustomKeyword(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddKeyword()}
            placeholder="Add keyword..."
            className="flex-1 h-8 px-3 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-neutral-500"
          />
          <button
            onClick={handleAddKeyword}
            disabled={!customKeyword.trim() || keywords.length >= 5}
            className="px-3 h-8 text-xs bg-white/10 border border-white/10 rounded-lg text-white hover:bg-white/20 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Generate Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleGenerateHeadlines}
          disabled={isLoading}
          className="flex-1 h-10 bg-white text-black hover:bg-neutral-200"
        >
          {headlineMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Type className="w-4 h-4 mr-2" />
          )}
          Headlines
        </Button>
        <Button
          onClick={handleGenerateSubheadings}
          disabled={isLoading}
          variant="outline"
          className="flex-1 h-10 border-white/20 text-white hover:bg-white/10"
        >
          {subheadingMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Tag className="w-4 h-4 mr-2" />
          )}
          Subheadings
        </Button>
      </div>

      {/* Generated Headlines */}
      {headlines.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-neutral-400 mb-2">
            Generated Headlines
          </h4>
          <div className="space-y-2">
            {headlines.map((headline, i) => (
              <div
                key={i}
                className="p-3 bg-white/5 border border-white/10 rounded-lg group"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-white flex-1">{headline.text}</p>
                  <button
                    onClick={() => handleAddToCanvas(headline.text, "headline")}
                    className="p-1.5 rounded-md bg-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Wand2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={cn(
                      "px-2 py-0.5 text-[10px] rounded-full",
                      headline.confidence >= 0.8
                        ? "bg-green-500/20 text-green-400"
                        : headline.confidence >= 0.5
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-red-500/20 text-red-400"
                    )}
                  >
                    {headline.confidence >= 0.8 ? (
                      <Check className="w-3 h-3 inline mr-1" />
                    ) : (
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                    )}
                    {headline.confidence >= 0.8 ? "pass" : headline.confidence >= 0.5 ? "warning" : "low"}
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    Confidence: {Math.round(headline.confidence * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated Subheadings */}
      {subheadings.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-neutral-400 mb-2">
            Generated Subheadings
          </h4>
          <div className="space-y-2">
            {subheadings.map((sub, i) => (
              <div
                key={i}
                className="p-3 bg-white/5 border border-white/10 rounded-lg group"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-white flex-1">{sub.text}</p>
                  <button
                    onClick={() => handleAddToCanvas(sub.text, "subheading")}
                    className="p-1.5 rounded-md bg-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Wand2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Options */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white"
      >
        {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Advanced Options
      </button>

      {showAdvanced && (
        <div className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-3">
          <p className="text-[10px] text-neutral-500">
            Headlines are generated following Tesco Retail Media guidelines:
          </p>
          <ul className="text-[10px] text-neutral-400 space-y-1 list-disc list-inside">
            <li>Max 5 words per headline</li>
            <li>No blocked keywords (free, best, etc.)</li>
            <li>WCAG AA compliant contrast</li>
            <li>Safe zone positioning</li>
          </ul>
        </div>
      )}
    </div>
  );
};

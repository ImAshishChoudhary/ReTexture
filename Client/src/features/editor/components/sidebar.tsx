"use client";

import {
  LayoutTemplate,
  ImageIcon,
  Pencil,
  Settings,
  Shapes,
  Type,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ActiveTool } from "@/features/editor/types";

interface SidebarProps {
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

const tools = [
  { id: "templates" as ActiveTool, icon: LayoutTemplate, label: "Templates" },
  { id: "images" as ActiveTool, icon: ImageIcon, label: "Images" },
  { id: "text" as ActiveTool, icon: Type, label: "Text" },
  { id: "shapes" as ActiveTool, icon: Shapes, label: "Shapes" },
  { id: "draw" as ActiveTool, icon: Pencil, label: "Draw" },
  { id: "ai" as ActiveTool, icon: Sparkles, label: "AI" },
  { id: "compliance" as ActiveTool, icon: ShieldCheck, label: "Compliance" },
];

export const Sidebar = ({ activeTool, onChangeActiveTool }: SidebarProps) => {
  return (
    <aside className="w-[68px] editor-sidebar flex flex-col h-full">
      <div className="flex-1 py-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          
          return (
            <button
              key={tool.id}
              onClick={() => onChangeActiveTool(tool.id)}
              className={cn(
                "editor-sidebar-item w-full",
                isActive && "active"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 mb-0.5",
                isActive 
                  ? "bg-white text-black" 
                  : "text-current hover:bg-white/5"
              )}>
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </div>
              <span className="text-[10px] font-medium leading-tight">
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>
      
      <div className="h-px bg-white/5 mx-3" />
      
      <div className="py-3">
        <button
          onClick={() => onChangeActiveTool("settings")}
          className={cn(
            "editor-sidebar-item w-full",
            activeTool === "settings" && "active"
          )}
        >
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 mb-0.5",
            activeTool === "settings" 
              ? "bg-white text-black" 
              : "text-current hover:bg-white/5"
          )}>
            <Settings className="w-[18px] h-[18px]" strokeWidth={1.5} />
          </div>
          <span className="text-[10px] font-medium">
            Settings
          </span>
        </button>
      </div>
    </aside>
  );
};

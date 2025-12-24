"use client";

import { ChevronsLeft } from "lucide-react";

interface ToolSidebarCloseProps {
  onClick: () => void;
}

export const ToolSidebarClose = ({ onClick }: ToolSidebarCloseProps) => {
  return (
    <button
      onClick={onClick}
      className="absolute top-4 -right-10 h-8 w-8 rounded-r-lg bg-white/5 hover:bg-white/10 border border-l-0 border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all duration-200"
    >
      <ChevronsLeft className="w-4 h-4" />
    </button>
  );
};

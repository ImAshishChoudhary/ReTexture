"use client";

interface ToolSidebarHeaderProps {
  title: string;
  description?: string;
}

export const ToolSidebarHeader = ({
  title,
  description,
}: ToolSidebarHeaderProps) => {
  return (
    <div className="p-5 border-b border-white/5">
      <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
      {description && (
        <p className="text-xs text-neutral-500 mt-1">{description}</p>
      )}
    </div>
  );
};

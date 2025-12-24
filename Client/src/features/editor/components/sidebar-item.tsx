import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  onClick: () => void;
}

export const SidebarItem = ({
  icon: Icon,
  label,
  isActive,
  onClick,
}: SidebarItemProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full aspect-square py-3 px-2 flex flex-col items-center justify-center hover:bg-neutral-100 transition-colors text-neutral-600 hover:text-neutral-900",
        isActive && "bg-neutral-100 text-neutral-900"
      )}
    >
      <Icon className="size-5 stroke-[1.5]" />
      <span className="text-[10px] mt-1.5 font-medium">{label}</span>
    </button>
  );
};

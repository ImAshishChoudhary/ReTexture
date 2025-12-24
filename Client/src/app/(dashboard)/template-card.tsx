import { MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TemplateCardProps {
  imageSrc: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  description: string;
  width: number;
  height: number;
  isPro: boolean | null;
  onDelete?: (e: React.MouseEvent) => void;
}

export const TemplateCard = ({
  imageSrc,
  title,
  onClick,
  disabled,
  description,
  isPro,
  onDelete
}: TemplateCardProps) => {
  return (
    <div className="group">
      <button
        onClick={onClick}
        disabled={disabled}
        className="w-full text-left disabled:opacity-50"
      >
        <div className="relative overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={title}
              className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full aspect-[4/3] flex items-center justify-center">
              <span className="text-neutral-500 text-sm">No preview</span>
            </div>
          )}
          {isPro && (
            <span className="absolute top-2 right-2 px-2 py-1 bg-white text-neutral-900 text-xs font-medium rounded">
              PRO
            </span>
          )}
        </div>
      </button>
      
      <div className="mt-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-white truncate">{title}</h3>
          <p className="text-sm text-neutral-500">{description}</p>
        </div>
        
        {onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
                <MoreHorizontal className="w-4 h-4 text-neutral-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

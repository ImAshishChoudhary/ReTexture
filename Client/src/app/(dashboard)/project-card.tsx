import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Copy, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectCardProps {
  id: string;
  name: string;
  width: number;
  height: number;
  thumbnailUrl?: string | null;
  updatedAt: string;
  onClick: () => void;
  onCopy: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  disabled?: boolean;
}

export const ProjectCard = ({
  name,
  width,
  height,
  thumbnailUrl,
  updatedAt,
  onClick,
  onCopy,
  onDelete,
  disabled,
}: ProjectCardProps) => {
  return (
    <div className="group">
      <button
        onClick={onClick}
        disabled={disabled}
        className="w-full text-left disabled:opacity-50"
      >
        <div className="relative overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={name}
              className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full aspect-[4/3] flex items-center justify-center">
              <span className="text-neutral-500 text-sm">No preview</span>
            </div>
          )}
        </div>
      </button>
      
      <div className="mt-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-white truncate">{name}</h3>
          <p className="text-sm text-neutral-500">
            {width} × {height} · {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
              <MoreHorizontal className="w-4 h-4 text-neutral-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onCopy}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

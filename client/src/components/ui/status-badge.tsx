import { cn } from "@/lib/utils";
import { type TaskStatus } from "@shared/schema";

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const baseStyles = "text-white text-xs px-3 py-1 rounded-full";
  
  const statusStyles = {
    pending: "bg-pending",
    in_progress: "bg-accent",
    done: "bg-secondary",
  };
  
  const statusDisplay = {
    pending: "Pending",
    in_progress: "In Progress",
    done: "Done",
  };
  
  return (
    <span className={cn(baseStyles, statusStyles[status], className)}>
      {statusDisplay[status]}
    </span>
  );
}

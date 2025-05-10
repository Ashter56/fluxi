import { cn } from "@/lib/utils";
import { type TaskStatus } from "@shared/schema";

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Map status to appropriate color schemes
  const statusStyles = {
    pending: "bg-red-100 text-red-700 border-red-200",
    in_progress: "bg-blue-100 text-blue-700 border-blue-200",
    done: "bg-green-100 text-green-700 border-green-200",
  };

  // Map status to display text
  const statusLabels = {
    pending: "Pending",
    in_progress: "In Progress",
    done: "Completed",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        statusStyles[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
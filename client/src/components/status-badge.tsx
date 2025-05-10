import { cn } from "@/lib/utils";
import { type TaskStatus } from "@shared/schema";

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Map status to appropriate color schemes with opaque colors and white text
  const statusStyles = {
    pending: "bg-red-500 text-white border-red-600",
    in_progress: "bg-blue-500 text-white border-blue-600",
    done: "bg-green-500 text-white border-green-600",
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
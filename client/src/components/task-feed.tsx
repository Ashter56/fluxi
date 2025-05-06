import { useQuery } from "@tanstack/react-query";
import { type TaskWithDetails } from "@shared/schema";
import { TaskCard } from "@/components/task-card";
import { Skeleton } from "@/components/ui/skeleton";

export function TaskFeed() {
  const { data: tasks, isLoading, error } = useQuery<TaskWithDetails[]>({
    queryKey: ["/api/tasks"],
  });
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-start gap-2 mb-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
            <Skeleton className="w-full h-48 rounded-lg" />
            <div className="flex justify-between items-center mt-3">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 p-4 rounded-lg text-red-700">
        Failed to load tasks. Please try again later.
      </div>
    );
  }
  
  if (!tasks?.length) {
    return (
      <div className="bg-muted p-8 rounded-lg text-center">
        <p className="text-muted-foreground">No tasks found. Add your first task!</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}

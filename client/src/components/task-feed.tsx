import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type TaskWithDetails, type TaskStatus } from "@shared/schema";
import { TaskCard } from "@/components/task-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebSocket, WebSocketEvent } from "@/hooks/use-websocket";
import { queryClient } from "@/lib/queryClient";

export function TaskFeed() {
  const { subscribe } = useWebSocket();
  
  const { data: tasks, isLoading, error } = useQuery<TaskWithDetails[]>({
    queryKey: ["/api/tasks"],
    staleTime: 0, // Always consider data stale to ensure fresh data
    refetchInterval: 5000, // Refresh every 5 seconds
  });
  
  // Handle WebSocket events to update our React Query cache
  useEffect(() => {
    // When a new task is created
    const newTaskHandler = (newTask: TaskWithDetails) => {
      // Force refetch tasks to ensure we always have the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/pending-count"] });
      
      // Also update the cache immediately for a faster UI response
      const currentTasks = queryClient.getQueryData<TaskWithDetails[]>(["/api/tasks"]);
      if (currentTasks) {
        // If the task already exists, don't add it again
        if (currentTasks.some(task => task.id === newTask.id)) {
          return;
        }
        
        // Update cache with the new task at the beginning
        queryClient.setQueryData(["/api/tasks"], [newTask, ...currentTasks]);
      }
    };
    
    // When a task's status is updated
    const statusUpdateHandler = (updatedTask: TaskWithDetails) => {
      // Force refetch tasks
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", updatedTask.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/pending-count"] });
      
      // Also update the cache immediately for a faster UI response
      const currentTasks = queryClient.getQueryData<TaskWithDetails[]>(["/api/tasks"]);
      if (currentTasks) {
        const updatedTasks = currentTasks.map(task => 
          task.id === updatedTask.id 
            ? { ...task, status: updatedTask.status } 
            : task
        );
        queryClient.setQueryData(["/api/tasks"], updatedTasks);
      }
    };
    
    // When a task is liked/unliked
    const likeHandler = (likeData: { taskId: number, count: number, liked: boolean }) => {
      // Force refetch tasks
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", likeData.taskId] });
      
      // Also update the cache immediately for a faster UI response
      const currentTasks = queryClient.getQueryData<TaskWithDetails[]>(["/api/tasks"]);
      if (currentTasks) {
        const updatedTasks = currentTasks.map(task => 
          task.id === likeData.taskId 
            ? { ...task, likes: likeData.count, liked: likeData.liked } 
            : task
        );
        queryClient.setQueryData(["/api/tasks"], updatedTasks);
      }
    };
    
    // Subscribe to WebSocket events
    const unsubscribeNewTask = subscribe(WebSocketEvent.NEW_TASK, newTaskHandler);
    const unsubscribeStatusUpdate = subscribe(WebSocketEvent.TASK_STATUS_UPDATE, statusUpdateHandler);
    const unsubscribeLike = subscribe(WebSocketEvent.LIKE, likeHandler);
    
    // Cleanup subscriptions
    return () => {
      unsubscribeNewTask();
      unsubscribeStatusUpdate();
      unsubscribeLike();
    };
  }, [subscribe]);
  
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

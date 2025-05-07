import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type TaskWithDetails, type TaskStatus } from "@shared/schema";
import { TaskCard } from "@/components/task-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebSocketStatus } from "@/hooks/websocket-provider";
import { useWebSocket, WebSocketEvent } from "@/hooks/use-websocket";

export function TaskFeed() {
  const [localTasks, setLocalTasks] = useState<TaskWithDetails[]>([]);
  const { connected } = useWebSocketStatus();
  const { subscribe } = useWebSocket();
  
  const { data: tasks, isLoading, error } = useQuery<TaskWithDetails[]>({
    queryKey: ["/api/tasks"],
  });
  
  // Sync task data from API with local state
  useEffect(() => {
    if (tasks) {
      setLocalTasks(tasks);
    }
  }, [tasks]);
  
  // Handle new task events
  useEffect(() => {
    const newTaskHandler = (newTask: TaskWithDetails) => {
      setLocalTasks(prevTasks => {
        // If the task already exists, don't add it again
        if (prevTasks.some(task => task.id === newTask.id)) {
          return prevTasks;
        }
        
        // Add the new task at the beginning of the array
        return [newTask, ...prevTasks];
      });
    };
    
    // Handle task status update events
    const statusUpdateHandler = (updatedTask: TaskWithDetails) => {
      setLocalTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === updatedTask.id 
            ? { ...task, status: updatedTask.status } 
            : task
        )
      );
    };
    
    // Handle like events
    const likeHandler = (likeData: { taskId: number, count: number, liked: boolean }) => {
      setLocalTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === likeData.taskId 
            ? { ...task, likes: likeData.count, liked: likeData.liked } 
            : task
        )
      );
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
  
  if (!localTasks?.length) {
    return (
      <div className="bg-muted p-8 rounded-lg text-center">
        <p className="text-muted-foreground">No tasks found. Add your first task!</p>
      </div>
    );
  }
  
  // Render connection status indicator if needed
  const connectionIndicator = connected ? (
    <div className="text-xs text-right mb-2 text-green-600">Live Updates</div>
  ) : null;
  
  return (
    <div>
      {connectionIndicator}
      <div className="space-y-4">
        {localTasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

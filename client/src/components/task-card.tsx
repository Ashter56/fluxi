import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Heart, MessageSquare, Share2, Edit, Trash2, MoreVertical } from "lucide-react";
import { type TaskWithDetails } from "@shared/schema";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { UpdateTaskModal } from "./update-task-modal";
import { ShareTaskModal } from "./share-task-modal";
import { useAuth } from "@/hooks/auth-provider";
import { useWebSocketStatus } from "@/hooks/websocket-provider";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TaskCardProps {
  task: TaskWithDetails;
  detailed?: boolean;
}

export function TaskCard({ task, detailed = false }: TaskCardProps) {
  const [, navigate] = useLocation();
  const [isLiked, setIsLiked] = useState(task.liked);
  const [likeCount, setLikeCount] = useState(task.likes);
  const [taskStatus, setTaskStatus] = useState(task.status);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const { user } = useAuth();
  
  // Check if current user is an admin (Ashter Abbas is admin)
  const isAdmin = user && user.username === "ashterabbas";
  const { connected } = useWebSocketStatus();
  const { toast } = useToast();
  
  // Initialize state from localStorage and props
  useEffect(() => {
    try {
      // Get stored like state from localStorage
      const likedTasksStr = localStorage.getItem('likedTasks');
      if (likedTasksStr) {
        const likedTasks = JSON.parse(likedTasksStr);
        // Check if this task has stored like state
        if (likedTasks[task.id]) {
          // Use localStorage values as they're more up-to-date than server
          setIsLiked(likedTasks[task.id].liked);
          setLikeCount(likedTasks[task.id].likes);
        } else {
          // Otherwise use the props from the server
          setIsLiked(task.liked);
          setLikeCount(task.likes);
        }
      } else {
        // If no localStorage, use props
        setIsLiked(task.liked);
        setLikeCount(task.likes);
      }
      
      // Check for stored task status
      const taskStatusesStr = localStorage.getItem('taskStatuses');
      if (taskStatusesStr) {
        const taskStatuses = JSON.parse(taskStatusesStr);
        if (taskStatuses[task.id]) {
          // Use localStorage status if available
          setTaskStatus(taskStatuses[task.id]);
        } else {
          // Otherwise use the props from the server
          setTaskStatus(task.status);
        }
      } else {
        // If no localStorage, use props
        setTaskStatus(task.status);
      }
    } catch (err) {
      // On any error, fallback to props
      console.error('Error reading from localStorage:', err);
      setIsLiked(task.liked);
      setLikeCount(task.likes);
      setTaskStatus(task.status);
    }
  }, [task.id, task.liked, task.likes, task.status]);

  // Like/unlike mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/tasks/${task.id}/like`, {});
      return res.json();
    },
    onSuccess: (data) => {
      // Update local state immediately - this updates this specific component
      setIsLiked(data.liked);
      setLikeCount(data.likes);
      
      // MORE AGGRESSIVE - force refetch of tasks when returning to feed
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      // Update the task in the localStorage for persistence
      try {
        // Get current liked tasks
        const likedTasksStr = localStorage.getItem('likedTasks') || '{}';
        const likedTasks = JSON.parse(likedTasksStr);
        
        // Update the specific task's like state
        likedTasks[task.id] = { liked: data.liked, likes: data.likes };
        
        // Save back to localStorage
        localStorage.setItem('likedTasks', JSON.stringify(likedTasks));
      } catch (err) {
        console.error('Error updating localStorage:', err);
      }
    },
  });
  
  // Delete task mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/tasks/${task.id}`);
    },
    onSuccess: () => {
      // Invalidate and refetch tasks after deletion
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/pending-count"] });
      
      toast({
        title: "Task deleted",
        description: "Your task has been successfully deleted",
      });
      
      // If we're on the detailed view, navigate back to home
      if (detailed) {
        navigate("/");
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    likeMutation.mutate();
  };

  const handleCardClick = () => {
    if (!detailed) {
      navigate(`/tasks/${task.id}`);
    }
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!detailed) {
      navigate(`/tasks/${task.id}`);
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareModal(true);
  };
  
  const handleUpdateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowUpdateModal(true);
  };
  
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };
  
  const confirmDelete = () => {
    deleteMutation.mutate();
  };

  const getTaskContent = () => {
    return (
      <div className="flex flex-col space-y-3 mb-3">
        <div className="flex items-start gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={task.user.avatarUrl || ""} alt={task.user.displayName} />
            <AvatarFallback>{task.user.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            {/* Only show status update text for in-progress and completed tasks */}
            {taskStatus !== "pending" ? (
              <p className="text-sm">
                <span className="font-medium">{task.user.displayName}</span> has {taskStatus === "done" ? "completed" : "started work on"} the task:
              </p>
            ) : (
              <p className="text-sm">
                <span className="font-medium">{task.user.displayName}</span>
              </p>
            )}
            
            {/* Display title with status badge to the right */}
            <div className="flex justify-between items-center mt-1">
              <h3 className="font-semibold">{task.title}</h3>
              <StatusBadge status={taskStatus} />
            </div>
          </div>
        </div>
        
        {/* Always show task description */}
        <p className="text-muted-foreground text-sm">{task.description}</p>
        
        {/* Timestamp */}
        <div className="flex items-center">
          <span className="text-muted-foreground text-xs">
            {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={cn(
        "bg-white rounded-xl shadow-sm overflow-hidden max-w-md mx-auto w-full", 
        !detailed && "cursor-pointer hover:shadow-md transition-shadow"
      )}
      onClick={handleCardClick}
    >
      <div className="p-4 relative">
        {/* Three-dot menu is positioned at top-right corner now */}
        {/* Only show the menu for task owners or if user is admin */}
        {user && (task.userId === user.id || isAdmin) && (
          <div className="absolute top-2 right-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center text-muted-foreground hover:text-primary">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={handleDeleteClick}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isAdmin && task.userId !== user.id ? "Remove (Admin)" : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        
        {getTaskContent()}
        
        {task.imageUrl && (
          <img 
            src={task.imageUrl} 
            alt="Task image" 
            className={cn(
              "w-full object-cover rounded-lg", 
              detailed ? "max-h-80" : "h-48"
            )}
          />
        )}
        
        <div className="flex justify-between items-center mt-3">
          <button 
            className="flex items-center gap-1 text-muted-foreground hover:text-primary"
            onClick={handleCommentClick}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-sm">{task.comments}</span>
          </button>
          
          <button 
            className={cn(
              "flex items-center gap-1", 
              isLiked 
                ? "text-red-500" 
                : "text-muted-foreground hover:text-red-500"
            )}
            onClick={handleLike}
            disabled={likeMutation.isPending}
          >
            <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
            <span className="text-sm">{likeCount}</span>
          </button>
          
          {/* Status update button for task owner */}
          {user && task.userId === user.id && (
            <button 
              className="flex items-center gap-1 text-muted-foreground hover:text-primary"
              onClick={handleUpdateClick}
            >
              <Edit className="h-5 w-5" />
            </button>
          )}
          
          <button 
            className="flex items-center gap-1 text-muted-foreground hover:text-primary"
            onClick={handleShareClick}
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Update Task Modal */}
      <UpdateTaskModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        taskId={task.id}
        taskTitle={task.title}
        currentStatus={task.status}
      />
      
      {/* Share Task Modal */}
      <ShareTaskModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        taskId={task.id}
        taskTitle={task.title}
      />
      
      {/* Delete Task Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task "{task.title}" and remove it from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

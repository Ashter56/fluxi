import { useState } from "react";
import { useLocation } from "wouter";
import { Heart, MessageSquare, Share2, Edit } from "lucide-react";
import { type TaskWithDetails } from "@shared/schema";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { UpdateTaskModal } from "./update-task-modal";
import { useAuth } from "@/hooks/auth-provider";

interface TaskCardProps {
  task: TaskWithDetails;
  detailed?: boolean;
}

export function TaskCard({ task, detailed = false }: TaskCardProps) {
  const [, navigate] = useLocation();
  const [isLiked, setIsLiked] = useState(task.liked);
  const [likeCount, setLikeCount] = useState(task.likes);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const { user } = useAuth();

  // Like/unlike mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/tasks/${task.id}/like`, {});
      return res.json();
    },
    onSuccess: (data) => {
      setIsLiked(data.liked);
      setLikeCount(data.likes);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
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
    // Share functionality could be implemented here
  };
  
  const handleUpdateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowUpdateModal(true);
  };

  const getTaskContent = () => {
    if (task.title && task.description) {
      return (
        <div className="mb-3">
          <h3 className="font-semibold">{task.title}</h3>
          {detailed && (
            <p className="text-muted-foreground mt-1">{task.description}</p>
          )}
        </div>
      );
    } else {
      // Activity style display
      return (
        <div className="flex items-start gap-2 mb-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={task.user.avatarUrl || ""} alt={task.user.displayName} />
            <AvatarFallback>{task.user.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm">
              <span className="font-medium">{task.user.displayName}</span> has {task.status === "done" ? "completed" : "created"} the task '{task.title}'
            </p>
            <div className="mt-1 flex items-center">
              <StatusBadge status={task.status} />
              {detailed && (
                <span className="text-muted-foreground text-sm ml-2">
                  {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div 
      className={cn(
        "bg-white rounded-xl shadow-sm overflow-hidden", 
        !detailed && "cursor-pointer hover:shadow-md transition-shadow"
      )}
      onClick={handleCardClick}
    >
      <div className="p-4">
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
          
          {/* Show edit button if this is the user's own task */}
          {user && task.userId === user.id && (
            <button 
              className="flex items-center gap-1 text-muted-foreground hover:text-secondary"
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
    </div>
  );
}

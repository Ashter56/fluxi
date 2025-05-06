import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { type TaskWithDetails, type CommentWithUser } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommentItem } from "@/components/comment-item";
import { X, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TaskDetailModalProps {
  taskId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskDetailModal({ taskId, isOpen, onClose }: TaskDetailModalProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [newComment, setNewComment] = useState("");
  
  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/current"],
  });
  
  // Get task details
  const { data: task, isLoading: isLoadingTask } = useQuery<TaskWithDetails>({
    queryKey: [`/api/tasks/${taskId}`],
    enabled: isOpen && !!taskId,
  });
  
  // Get task comments
  const { data: comments = [], isLoading: isLoadingComments } = useQuery<CommentWithUser[]>({
    queryKey: [`/api/tasks/${taskId}/comments`],
    enabled: isOpen && !!taskId,
  });
  
  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/tasks/${taskId}/comments`, { content });
      return res.json();
    },
    onSuccess: (newComment) => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
      setNewComment("");
    },
    onError: () => {
      toast({
        title: "Failed to add comment",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment);
    }
  };
  
  const handleClose = () => {
    onClose();
    // Update URL if on task details page
    if (window.location.pathname.includes('/tasks/')) {
      navigate('/');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-4 border-b">
            <div className="flex justify-between items-center">
              <SheetTitle>Task Details</SheetTitle>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>
          
          {isLoadingTask ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : task ? (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <h3 className="font-semibold text-lg">{task.title}</h3>
                {task.description && (
                  <p className="text-muted-foreground mt-1">{task.description}</p>
                )}
                
                <div className="flex items-center mt-2 gap-2">
                  <StatusBadge status={task.status} />
                  <span className="text-muted-foreground text-sm">
                    Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              
              {task.imageUrl && (
                <img 
                  src={task.imageUrl} 
                  alt="Task visual" 
                  className="w-full max-h-80 object-cover"
                />
              )}
              
              <div className="p-4">
                <h4 className="font-semibold mb-3">Comments</h4>
                
                {isLoadingComments ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No comments yet. Be the first to comment!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <CommentItem key={comment.id} comment={comment} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Task not found
            </div>
          )}
          
          {task && currentUser && (
            <div className="border-t p-4">
              <form onSubmit={handleSubmitComment} className="flex gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.displayName} />
                  <AvatarFallback>{currentUser.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    placeholder="Add a comment..."
                    className="pr-10"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={addCommentMutation.isPending}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    variant="ghost" 
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-primary"
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { TaskWithDetails } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { Loader2, ArrowLeft, Heart, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/auth-provider";

export default function SharedTaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  // Fetch the shared task
  const { data: task, isLoading, error } = useQuery<TaskWithDetails>({
    queryKey: [`/api/tasks/${taskId}`],
    enabled: !!taskId,
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error || !task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen max-w-md mx-auto px-4">
        <h1 className="text-2xl font-bold mb-4">Task Not Found</h1>
        <p className="text-muted-foreground mb-6">The task you're looking for may have been deleted or doesn't exist.</p>
        <Button onClick={() => navigate("/")}>
          Go to Home Page
        </Button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto pt-8 px-4">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/")}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Shared Task</h1>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          {/* Task Header with User Info */}
          <div className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src={task.user.avatarUrl || ""} alt={task.user.displayName} />
                <AvatarFallback>{task.user.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm">
                  <span className="font-medium">{task.user.displayName}</span> 
                  {task.status !== "pending" && (
                    <span>
                      {task.status === "done" ? " completed" : " started work on"} this task
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                </p>
              </div>
              <div className="ml-auto">
                <StatusBadge status={task.status} />
              </div>
            </div>
            
            {/* Task Content */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold">{task.title}</h2>
              <p className="text-gray-700">{task.description}</p>
              
              {task.imageUrl && (
                <img 
                  src={task.imageUrl} 
                  alt="Task image" 
                  className="w-full max-h-96 object-cover rounded-lg" 
                />
              )}
              
              {/* Stats */}
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Heart className="h-5 w-5" />
                  <span className="text-sm">{task.likes}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MessageSquare className="h-5 w-5" />
                  <span className="text-sm">{task.comments}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Call to Action */}
          <div className="bg-gray-50 p-6 border-t">
            {user ? (
              <Button 
                className="w-full"
                onClick={() => navigate(`/tasks/${taskId}`)}
              >
                View Full Details
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-center text-sm text-muted-foreground mb-2">
                  Sign in to interact with this task and see more details
                </p>
                <Button 
                  className="w-full"
                  onClick={() => navigate("/auth")}
                >
                  Sign In / Register
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
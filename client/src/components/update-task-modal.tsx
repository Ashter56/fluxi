import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TaskStatus } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Update task form schema
const updateTaskSchema = z.object({
  status: z.enum(["pending", "in_progress", "done"])
});

type UpdateTaskFormValues = z.infer<typeof updateTaskSchema>;

interface UpdateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  taskTitle: string;
  currentStatus: TaskStatus;
}

export function UpdateTaskModal({ 
  isOpen, 
  onClose, 
  taskId, 
  taskTitle, 
  currentStatus 
}: UpdateTaskModalProps) {
  const { toast } = useToast();
  
  // Form setup
  const form = useForm<UpdateTaskFormValues>({
    resolver: zodResolver(updateTaskSchema),
    defaultValues: {
      status: currentStatus,
    },
  });
  
  // Create task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (data: UpdateTaskFormValues) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, data);
      return await res.json();
    },
    onSuccess: (updatedTask) => {
      toast({
        title: "Task updated",
        description: "Your task has been updated successfully.",
      });
      
      // Update the tasks in the cache directly
      const currentTasks = queryClient.getQueryData<any[]>(["/api/tasks"]);
      if (currentTasks) {
        const updatedTasks = currentTasks.map(task => 
          task.id === taskId ? { ...task, status: updatedTask.status } : task
        );
        queryClient.setQueryData(["/api/tasks"], updatedTasks);
      }
      
      // Also update the individual task cache if it exists
      queryClient.setQueryData([`/api/tasks/${taskId}`], updatedTask);
      
      // Update the pending count
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/pending-count"] });
      
      form.reset();
      onClose();
    },
    onError: () => {
      toast({
        title: "Failed to update task",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: UpdateTaskFormValues) => {
    updateTaskMutation.mutate(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Task Status</DialogTitle>
          <DialogDescription>
            Update the status for "{taskTitle}"
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={updateTaskMutation.isPending}
              >
                {updateTaskMutation.isPending ? "Updating..." : "Update Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
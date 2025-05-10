import React, { useState, useRef } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema } from "@shared/schema";
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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X, Image } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Task form schema
const taskFormSchema = insertTaskSchema
  .pick({
    title: true,
    description: true,
    status: true,
    imageUrl: true,
  })
  .extend({
    title: z.string().min(3, "Title must be at least 3 characters"),
  });

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddTaskModal({ isOpen, onClose }: AddTaskModalProps) {
  const { toast } = useToast();
  
  // For image upload
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form setup
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "pending",
      imageUrl: "",
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormValues) => {
      // In a real-world scenario, we would upload the image to a server
      // and get a permanent URL. For now, we'll use data URLs for persistence
      
      // If we have a selected image, create a data URL
      if (selectedImage) {
        return new Promise<Response>((resolve) => {
          const reader = new FileReader();
          reader.onload = async (event) => {
            // Replace the temporary object URL with a data URL that can persist
            const dataUrl = event.target?.result as string;
            const taskData = { ...data, imageUrl: dataUrl };
            
            // Now send the task with the data URL
            const res = await apiRequest("POST", "/api/tasks", taskData);
            resolve(res);
          };
          
          // Read the image as a data URL
          reader.readAsDataURL(selectedImage);
        }).then(res => res.json());
      } else {
        // No image selected, proceed normally
        const res = await apiRequest("POST", "/api/tasks", data);
        return res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: "Task created",
        description: "Your task has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/pending-count"] });
      
      // Clean up any object URLs we created to prevent memory leaks
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      form.reset();
      setPreviewUrl(null);
      setSelectedImage(null);
      onClose();
    },
    onError: () => {
      toast({
        title: "Failed to create task",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Create a preview URL
    const url = URL.createObjectURL(file);
    setSelectedImage(file);
    setPreviewUrl(url);
    
    // Update the form with the preview URL
    form.setValue("imageUrl", url);
  };
  
  // Trigger file input click
  const openFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Clear selected image
  const clearSelectedImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    form.setValue("imageUrl", "");
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = (data: TaskFormValues) => {
    // Submit the form data to create the task
    createTaskMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter task title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="What needs to be done?" 
                      rows={3}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
            
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Image</FormLabel>
                  
                  {/* Hidden file input */}
                  <input 
                    type="file" 
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                    ref={fileInputRef}
                  />
                  
                  {/* Image preview or upload button */}
                  {previewUrl ? (
                    <div className="relative rounded-md overflow-hidden border-2 border-primary">
                      <img 
                        src={previewUrl} 
                        alt="Task preview" 
                        className="w-full h-48 object-cover"
                      />
                      <button 
                        type="button"
                        className="absolute top-2 right-2 bg-destructive text-white p-1 rounded-full"
                        onClick={clearSelectedImage}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="border-2 border-dashed border-muted-foreground/50 rounded-md p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={openFileSelector}
                    >
                      <Image className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground text-center">
                        Click to upload an image for your task<br />
                        <span className="text-xs">JPG, PNG, or GIF up to 5MB</span>
                      </p>
                    </div>
                  )}
                  
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
                disabled={createTaskMutation.isPending}
              >
                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

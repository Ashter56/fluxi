import React, { useState, useRef } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema } from "../shared/schema";
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
  const [isProcessingImage, setIsProcessingImage] = useState(false);
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
      // Use the preview URL directly if it exists, which is much faster
      // than converting to DataURL during submission
      if (previewUrl && selectedImage) {
        // Just use the existing previewUrl that we already created
        const taskData = { ...data, imageUrl: previewUrl };
        const res = await apiRequest("POST", "/api/tasks", taskData);
        return res.json();
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

  // Handle image selection with optimization
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Show loading state
    setIsProcessingImage(true);
    
    // Create a temporary preview URL immediately for better UX
    const tempUrl = URL.createObjectURL(file);
    setPreviewUrl(tempUrl);
    
    // Use setTimeout to allow UI to update with loading state before heavy processing
    setTimeout(() => {
      // Compress/optimize the image before using it
      const img = document.createElement('img');
      img.onload = () => {
        try {
          // Create a canvas to resize and compress the image
          const canvas = document.createElement('canvas');
          
          // Max dimensions - balance between quality and performance
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 1000;
          
          // Calculate new dimensions while maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round(height * (MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round(width * (MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }
          
          // Set canvas dimensions and draw the resized image
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to optimized data URL with low quality for better performance
            const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
            
            // Update state with the optimized image
            setSelectedImage(file); // Keep original file reference for type checking
            setPreviewUrl(optimizedDataUrl);
            
            // Update form value with optimized image
            form.setValue("imageUrl", optimizedDataUrl);
          }
        } catch (err) {
          console.error('Error processing image:', err);
          toast({
            title: "Image processing error",
            description: "There was a problem processing your image. Please try a smaller image.",
            variant: "destructive"
          });
          // Keep the original file as fallback
          setSelectedImage(file);
          form.setValue("imageUrl", tempUrl);
        } finally {
          // Clean up the temporary preview
          // URL.revokeObjectURL(tempUrl); - Don't revoke if we're using it as fallback
          
          // Hide loading state
          setIsProcessingImage(false);
        }
      };
      
      // Handle errors during image loading
      img.onerror = () => {
        setIsProcessingImage(false);
        toast({
          title: "Image loading error",
          description: "Could not load the selected image. Please try another one.",
          variant: "destructive"
        });
        setPreviewUrl(null);
        setSelectedImage(null);
        form.setValue("imageUrl", "");
      };
      
      // Load the image to trigger the optimization process
      img.src = tempUrl;
    }, 100); // Short delay for better UI responsiveness
  };
  
  // Trigger file input click
  const openFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Clear selected image
  const clearSelectedImage = () => {
    // Only allow clearing if not currently processing
    if (!isProcessingImage) {
      if (previewUrl) {
        // Clean up the object URL to prevent memory leaks
        URL.revokeObjectURL(previewUrl);
      }
      
      setSelectedImage(null);
      setPreviewUrl(null);
      form.setValue("imageUrl", "");
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
                      {isProcessingImage && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <div className="flex flex-col items-center">
                            <div className="h-8 w-8 rounded-full border-4 border-t-transparent border-primary animate-spin"></div>
                            <p className="text-white mt-2 font-medium">Optimizing image...</p>
                          </div>
                        </div>
                      )}
                      <button 
                        type="button"
                        className="absolute top-2 right-2 bg-destructive text-white p-1 rounded-full"
                        onClick={clearSelectedImage}
                        disabled={isProcessingImage}
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
                disabled={createTaskMutation.isPending || isProcessingImage}
              >
                {createTaskMutation.isPending 
                  ? "Creating..." 
                  : (isProcessingImage ? "Processing Image..." : "Create Task")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

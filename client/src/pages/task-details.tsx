import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { TaskDetailModal } from "@/components/task-detail-modal";

export function TaskDetails() {
  const { id } = useParams();
  const taskId = id ? parseInt(id) : undefined;
  
  // This page acts as a wrapper for the task detail modal
  // The modal handles all the task details loading and display
  
  return (
    <>
      <Header showBackButton title="Task Details" />
      
      <TaskDetailModal 
        taskId={taskId || 0}
        isOpen={!!taskId}
        onClose={() => {/* Closing handled in the modal */}}
      />
      
      <BottomNavigation />
    </>
  );
}

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AddTaskModal } from "@/components/add-task-modal";

export function TaskCounter() {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  
  const { data: pendingCount, isLoading } = useQuery({
    queryKey: ["/api/tasks/pending-count"],
    select: (data) => data.count,
  });
  
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">
          Pending Tasks: <span>{isLoading ? "..." : pendingCount}</span>
        </h2>
        <Button onClick={() => setIsAddTaskOpen(true)}>
          Add Task
        </Button>
      </div>
      
      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
      />
    </>
  );
}

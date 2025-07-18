import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { TaskCard } from "@/components/task-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { TaskStatus, TaskWithDetails, User } from "../shared/schema"; // Fixed import path
import { AddTaskModal } from "@/components/add-task-modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function MyTasks() {
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TaskStatus | "all">("all");
  
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/current"],
  });
  
  // Fetch tasks from the API
  const { data: tasks, isLoading } = useQuery<TaskWithDetails[]>({
    queryKey: ["/api/tasks"],
  });
  
  // Filter to only show the current user's tasks
  const myTasks = tasks?.filter(task => task.userId === currentUser?.id) || [];
  
  // Filter tasks based on the selected status
  const filteredTasks = activeTab === "all" 
    ? myTasks 
    : myTasks.filter(task => task.status === activeTab);
  
  const handleOpenAddTask = () => {
    setShowAddTaskModal(true);
  };
  
  const handleCloseAddTask = () => {
    setShowAddTaskModal(false);
  };
  
  return (
    <>
      <Header title="My Tasks" />
      
      <main className="p-4 pb-20">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">My Tasks</h2>
          <Button 
            size="sm" 
            onClick={handleOpenAddTask}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full mb-6" onValueChange={(value) => setActiveTab(value as TaskStatus | "all")}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-center my-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        {/* Empty state */}
        {!isLoading && filteredTasks.length === 0 && (
          <div className="text-center my-12 p-6 bg-muted/50 rounded-lg">
            <p className="text-muted-foreground">No tasks found</p>
            <Button onClick={handleOpenAddTask} variant="outline" className="mt-4">
              Create your first task
            </Button>
          </div>
        )}
        
        {/* Tasks list */}
        {!isLoading && filteredTasks.length > 0 && (
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <TaskCard key={task.id} task={task} detailed={true} />
            ))}
          </div>
        )}
      </main>
      
      <BottomNavigation />
      
      {/* New Task Modal */}
      <AddTaskModal 
        isOpen={showAddTaskModal} 
        onClose={handleCloseAddTask} 
      />
    </>
  );
}

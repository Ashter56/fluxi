import { useState } from "react";
import { Header } from "@/components/header";
import { TaskCounter } from "@/components/task-counter";
import { TaskFeed } from "@/components/task-feed";
import { BottomNavigation } from "@/components/bottom-navigation";
import { CreateTaskForm } from "@/components/create-task-form";
import { useAuth } from "@/hooks/auth-provider";

export function Home() {
  const { user } = useAuth();
  
  return (
    <>
      <Header />
      
      <main className="p-4">
        <TaskCounter />
        
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-4">Home</h2>
          <TaskFeed />
        </div>
      </main>
      
      <BottomNavigation />
    </>
  );
}

import { useLocation } from "wouter";
import { Home, CheckSquare, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { User as UserType } from "@shared/schema";
import { useState } from "react";
import { AddTaskModal } from "./add-task-modal";

// Define our navigation item types
type NavItem = {
  icon: typeof Home;
  label: string;
  path?: string;
  action?: () => void;
  className?: string;
};

export function BottomNavigation() {
  const [location, navigate] = useLocation();
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  
  // Get current user info for the profile link
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/users/current"],
  });
  
  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };
  
  const handleAddTask = () => {
    setShowAddTaskModal(true);
  };
  
  const handleCloseAddTask = () => {
    setShowAddTaskModal(false);
  };
  
  const navItems: NavItem[] = [
    { icon: Home, label: "Feed", path: "/" },
    { icon: CheckSquare, label: "My Tasks", path: "/my-tasks" },
    { 
      icon: User, 
      label: "Profile", 
      path: currentUser ? `/profile/${currentUser.id}` : "/profile" 
    }
  ];
  
  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)] border-t border-gray-200 z-40">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center">
            {navItems.map((item, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.preventDefault();
                  if (item.action) {
                    item.action();
                  } else if (item.path) {
                    navigate(item.path);
                  }
                }}
                className={cn(
                  "flex flex-col items-center p-3 flex-1",
                  item.className,
                  item.path && isActive(item.path) ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", item.className ? "h-6 w-6" : "")} />
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
      
      {/* Add Task Modal */}
      <AddTaskModal 
        isOpen={showAddTaskModal} 
        onClose={handleCloseAddTask} 
      />
    </>
  );
}

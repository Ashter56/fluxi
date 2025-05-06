import { useLocation } from "wouter";
import { Home, CheckSquare, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNavigation() {
  const [location, navigate] = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };
  
  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: CheckSquare, label: "Tasks", path: "/tasks" },
    { icon: Bell, label: "Alerts", path: "/alerts" },
    { icon: User, label: "Profile", path: "/profile/3" } // Default to David's profile (user id 3)
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)] border-t border-gray-200 z-40">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.path);
              }}
              className={cn(
                "flex flex-col items-center p-3 flex-1",
                isActive(item.path) ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

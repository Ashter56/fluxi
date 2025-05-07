import { useLocation } from "wouter";
import { Menu, Search, ArrowLeft, LogOut, User as UserIcon, FileText, Home, Plus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/auth-provider";
import type { User } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  showBackButton?: boolean;
  title?: string;
}

export function Header({ showBackButton = false, title = "Fluxion" }: HeaderProps) {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { user, logoutMutation } = useAuth();
  
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/current"],
  });
  
  const handleBack = () => {
    navigate("/");
  };
  
  const handleProfileClick = () => {
    if (currentUser) {
      navigate(`/profile/${currentUser.id}`);
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate("/auth");
      }
    });
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };
  
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="flex items-center p-4 justify-between">
        <div className="flex items-center gap-2">
          {showBackButton ? (
            <button 
              className="p-1" 
              onClick={handleBack}
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                  aria-label="Menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Navigation</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleNavigate("/")}>
                  <Home className="mr-2 h-4 w-4" />
                  <span>Feed</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavigate("/my-tasks")}>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>My Tasks</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => currentUser && handleNavigate(`/profile/${currentUser.id}`)}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>
        
        <div className="flex-1 mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search users..."
              className="w-full py-2 pl-9 pr-4 bg-muted/50 border-none rounded-full text-sm focus-visible:ring-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <button
          className="relative"
          onClick={handleProfileClick}
          aria-label="User profile"
        >
          {currentUser ? (
            <Avatar className="w-8 h-8">
              <AvatarImage src={currentUser.avatarUrl ?? undefined} alt={currentUser.displayName} />
              <AvatarFallback>{currentUser.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse"></div>
          )}
        </button>
      </div>
    </header>
  );
}

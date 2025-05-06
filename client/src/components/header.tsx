import { useLocation } from "wouter";
import { Menu, Search, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface HeaderProps {
  showBackButton?: boolean;
  title?: string;
}

export function Header({ showBackButton = false, title = "Fluxion" }: HeaderProps) {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: currentUser } = useQuery({
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
            <button 
              className="p-1" 
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
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
              <AvatarImage src={currentUser.avatarUrl} alt={currentUser.displayName} />
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

import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

export function useAuth() {
  const [, navigate] = useLocation();
  
  const { data: currentUser, isLoading, error } = useQuery({
    queryKey: ["/api/users/current"],
  });
  
  // In a real app, we would have login/register functions
  // and proper auth state management
  
  return {
    user: currentUser,
    isLoading,
    error,
    isAuthenticated: !!currentUser,
  };
}

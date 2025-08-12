import React, { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import type { User } from "../../../shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "../lib/queryClient"; // Added import

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  email: string;
  username: string;
  displayName: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/user", { // Changed to relative URL
          credentials: "include", // Added credentials
        });
        
        if (!res.ok) {
          if (res.status === 401) return null;
          throw new Error("Failed to fetch user");
        }
        
        return await res.json();
      } catch (err) {
        console.error("User query error:", err);
        return null;
      }
    },
    retry: false,
    refetchInterval: false,
    refetchOnWindowFocus: true // Changed to true for session validation
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        console.log("Logging in with:", credentials.username);
        const res = await fetch("/api/login", { // Changed to relative URL
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
          credentials: "include", // Keep credentials
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || `Error ${res.status}: ${res.statusText}`);
        }
        
        const userData = await res.json();
        console.log("Login success, user data:", userData);
        return userData;
      } catch (err) {
        console.error("Login API error:", err);
        throw err;
      }
    },
    onSuccess: (user: User) => {
      console.log("Login mutation success");
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.displayName}!`,
      });
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      console.error("Login mutation error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const res = await fetch("/api/register", { // Changed to relative URL
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include", // Keep credentials
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Error ${res.status}: ${res.statusText}`);
      }
      
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome to Fluxion, ${user.displayName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        console.log("Logging out user");
        const res = await fetch("/api/logout", { // Changed to relative URL
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Keep credentials
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || `Error ${res.status}: ${res.statusText}`);
        }
      } catch (err) {
        console.error("Logout API error:", err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    },
    onError: (error: Error) => {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: error.message || "An error occurred during logout",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

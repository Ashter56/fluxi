import { FormEvent, useState } from "react";
import { useAuth } from "@/hooks/auth-provider";
import { Redirect, Link } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, LogIn } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { queryClient } from "../lib/queryClient";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// 🔽🔽🔽 ADD THIS LINE (should be at line 17) 🔽🔽🔽
const { trackDailyUser } = require("../analytics");

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { user, loginMutation } = useAuth();
  const { toast } = useToast();
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "testuser",
      password: "password123",
    },
  });

  if (user || redirectAfterLogin) {
    return <Redirect to="/" />;
  }

  const handleLogin = async (data: LoginFormValues) => {
    try {
      console.log("Attempting login with:", data);
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (response.ok) {
        const userData = await response.json();
        console.log("Login success, user data:", userData);

        // Update the cache manually
        queryClient.setQueryData(["/api/user"], userData);

        // 🔼🔼🔼 ADD THIS LINE (should be at line 71) 🔼🔼🔼
        trackDailyUser(userData.id);

        toast({
          title: "Login successful",
          description: `Welcome back, ${userData.displayName}!`,
        });

        setRedirectAfterLogin(true);
      } else {
        let errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          errorText = errorJson.message || errorText;
        } catch (e) {}

        toast({
          title: "Login failed",
          description: errorText,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Error",
        description: error instanceof Error ? error.message : "Failed to login.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex flex-col justify-center items-center p-4 w-full max-w-md mx-auto">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <Form {...form}>
            <form className="space-y-4" action="#" method="POST" onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(handleLogin)(e);
            }}>
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username or Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your username/email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                Sign In
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">No account? </span>
            <Link href="/register" className="text-primary hover:underline font-medium">
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
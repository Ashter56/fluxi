import { useState, FormEvent } from "react";
import { useAuth } from "@/hooks/auth-provider";
import { Redirect } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");

  // If user is already logged in, redirect to homepage
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Form Section */}
      <div className="flex flex-col justify-center p-4 md:p-10 md:w-1/2">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Welcome to Fluxion</h1>
            <p className="text-sm text-muted-foreground mt-2">
              The social task management app for productive teams
            </p>
          </div>

          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-4">
              <LoginForm
                onSuccess={() => {}}
                isPending={loginMutation.isPending}
              />
              <div className="text-center text-sm mt-6">
                <span className="text-muted-foreground">Don't have an account? </span>
                <button
                  onClick={() => setActiveTab("register")}
                  className="text-primary hover:underline font-medium"
                >
                  Register
                </button>
              </div>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 mt-4">
              <RegisterForm
                onSuccess={() => {}}
                isPending={registerMutation.isPending}
              />
              <div className="text-center text-sm mt-6">
                <span className="text-muted-foreground">Already have an account? </span>
                <button
                  onClick={() => setActiveTab("login")}
                  className="text-primary hover:underline font-medium"
                >
                  Login
                </button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hidden md:flex flex-1 bg-gradient-to-br from-primary-foreground to-primary/10 p-10 items-center justify-center">
        <div className="max-w-md space-y-6">
          <h2 className="text-3xl font-bold">Get More Done Together</h2>
          <Separator className="bg-primary/20" />
          <div className="space-y-4">
            <div className="flex gap-3 items-start">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">✓</div>
              <div>
                <h3 className="font-medium">Share Your Tasks</h3>
                <p className="text-sm text-muted-foreground">
                  Create tasks and share them with your team for better collaboration
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">✓</div>
              <div>
                <h3 className="font-medium">Interactive Feedback</h3>
                <p className="text-sm text-muted-foreground">
                  Like and comment on tasks to provide feedback and support
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">✓</div>
              <div>
                <h3 className="font-medium">Track Your Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor your productivity with detailed stats and analytics
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onSuccess, isPending }: { onSuccess: () => void, isPending: boolean }) {
  const { loginMutation } = useAuth();
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    try {
      await loginMutation.mutateAsync(data);
      form.reset();
      onSuccess();
    } catch (error) {
      console.error("Login error:", error);
      // Error is handled in the mutation
    }
  }

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    form.handleSubmit(onSubmit)(e);
  };

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username or Email</FormLabel>
              <FormControl>
                <Input placeholder="Enter your username or email" {...field} />
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
                <Input type="password" placeholder="Enter your password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Log In
        </Button>
      </form>
    </Form>
  );
}

function RegisterForm({ onSuccess, isPending }: { onSuccess: () => void, isPending: boolean }) {
  const { registerMutation } = useAuth();
  
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: RegisterFormValues) {
    try {
      // Remove confirmPassword as it's not needed in the API call
      const { confirmPassword, ...registerData } = data;
      await registerMutation.mutateAsync(registerData);
      form.reset();
      onSuccess();
    } catch (error) {
      console.error("Registration error:", error);
      // Error is handled in the mutation
    }
  }

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    form.handleSubmit(onSubmit)(e);
  };

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" {...field} />
              </FormControl>
              <FormDescription>
                This will be your unique identifier
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
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
                <Input type="password" placeholder="Create a password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Confirm your password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Register
        </Button>
      </form>
    </Form>
  );
}
import { Switch, Route } from "wouter";
import { Home } from "@/pages/home";
import { Profile } from "@/pages/profile";
import { TaskDetails } from "@/pages/task-details";
import { MyTasks } from "@/pages/my-tasks";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import LoginPage from "@/pages/login-page";
import RegisterPage from "@/pages/register-page";
import SharedTaskPage from "@/pages/shared-task";
import { ProtectedRoute } from "@/components/protected-route";
import { AuthProvider } from "@/hooks/auth-provider";
import { disableHMR } from "./lib/disable-hmr";
import { Toaster } from "@/components/ui/toaster";
import { WebSocketProvider } from "@/hooks/websocket-provider";

// Try to disable HMR for App.tsx to stabilize connections
if (typeof window !== 'undefined') {
  disableHMR();
}

function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <div className="min-h-screen bg-background relative pb-20">
          <Switch>
            <ProtectedRoute path="/" component={Home} />
            <ProtectedRoute path="/profile/:id" component={Profile} />
            <ProtectedRoute path="/tasks/:id" component={TaskDetails} />
            <ProtectedRoute path="/my-tasks" component={MyTasks} />
            <Route path="/auth" component={AuthPage} />
            <Route path="/login" component={LoginPage} />
            <Route path="/register" component={RegisterPage} />
            <Route path="/share/:taskId" component={SharedTaskPage} />
            <Route component={NotFound} />
          </Switch>
        </div>
        <Toaster />
      </WebSocketProvider>
    </AuthProvider>
  );
}

export default App;
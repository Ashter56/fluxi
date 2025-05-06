import { Switch, Route } from "wouter";
import { Home } from "@/pages/home";
import { Profile } from "@/pages/profile";
import { TaskDetails } from "@/pages/task-details";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "@/components/protected-route";
import { AuthProvider } from "@/hooks/auth-provider";

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background relative pb-20">
        <Switch>
          <ProtectedRoute path="/" component={Home} />
          <ProtectedRoute path="/profile/:id" component={Profile} />
          <ProtectedRoute path="/tasks/:id" component={TaskDetails} />
          <Route path="/auth" component={AuthPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </AuthProvider>
  );
}

export default App;

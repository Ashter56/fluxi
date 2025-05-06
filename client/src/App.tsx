import { Switch, Route } from "wouter";
import { Home } from "@/pages/home";
import { Profile } from "@/pages/profile";
import { TaskDetails } from "@/pages/task-details";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <div className="min-h-screen max-w-md mx-auto bg-background relative pb-20">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/profile/:id" component={Profile} />
        <Route path="/tasks/:id" component={TaskDetails} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

export default App;

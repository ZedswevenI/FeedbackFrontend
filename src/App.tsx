import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import AdminDashboard from "@/pages/AdminDashboard";
import StudentDashboard from "@/pages/StudentDashboard";
import FeedbackForm from "@/pages/FeedbackForm";
import MultiFeedbackForm from "@/pages/MultiFeedbackForm";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      {/* Public Route */}
      <Route path="/login" component={Login} />

      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} allowedRoles={["ADMIN", "SUPER_ADMIN", "AO"]} />
      </Route>

      {/* Student Routes */}
      <Route path="/student">
        <ProtectedRoute component={StudentDashboard} allowedRoles={["STUDENT"]} />
      </Route>
      <Route path="/student/feedback/all">
        <ProtectedRoute component={MultiFeedbackForm} allowedRoles={["STUDENT"]} />
      </Route>
      <Route path="/student/feedback/:id">
        <ProtectedRoute component={FeedbackForm} allowedRoles={["STUDENT"]} />
      </Route>

      {/* Root redirect logic */}
      <Route path="/">
        <Login />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

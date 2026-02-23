import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import DailyReports from "@/pages/daily-reports";
import DailyReportForm from "@/pages/daily-report-form";
import Projects from "@/pages/projects";
import WeeklyPlans from "@/pages/weekly-plans";
import WeeklyPlanForm from "@/pages/weekly-plan-form";
import WeeklyReport from "@/pages/weekly-report";
import ExecutiveSummary from "@/pages/executive-summary";
import SettingsPage from "@/pages/settings";
import LoginPage from "@/pages/login";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/daily-reports" component={DailyReports} />
      <Route path="/daily-reports/new" component={DailyReportForm} />
      <Route path="/daily-reports/:id" component={DailyReportForm} />
      <Route path="/projects" component={Projects} />
      <Route path="/weekly-plans" component={WeeklyPlans} />
      <Route path="/weekly-plans/new" component={WeeklyPlanForm} />
      <Route path="/weekly-plans/:id" component={WeeklyPlanForm} />
      <Route path="/weekly-report" component={WeeklyReport} />
      <Route path="/executive-summary" component={ExecutiveSummary} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

const sidebarStyle = {
  "--sidebar-width": "16rem",
  "--sidebar-width-icon": "3rem",
};

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <div className="flex-1 overflow-auto">
            <Router />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <AuthenticatedApp />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

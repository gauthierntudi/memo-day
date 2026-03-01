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
import { usePermissions } from "@/hooks/use-permissions";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import DailyReports from "@/pages/daily-reports";
import DailyReportForm from "@/pages/daily-report-form";
import Projects from "@/pages/projects";
import WeeklyPlans from "@/pages/weekly-plans";
import WeeklyPlanForm from "@/pages/weekly-plan-form";
import WeeklyReport from "@/pages/weekly-report";
import ExecutiveSummary from "@/pages/executive-summary";
import ProjectsOverview from "@/pages/projects-overview";
import SettingsPage from "@/pages/settings";
import LoginPage from "@/pages/login";
import LandingPage from "@/pages/landing";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useState, type ComponentType } from "react";

function AccessDenied() {
  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldAlert className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
          <p className="text-sm text-muted-foreground text-center">You do not have permission to access this page. Contact your administrator to update your privileges.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ProtectedRoute({ component: Component, permission }: { component: ComponentType; permission: string | null }) {
  const { hasPermission, isLoading } = usePermissions();
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (permission && !hasPermission(permission)) return <AccessDenied />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/">{() => <ProtectedRoute component={Dashboard} permission={null} />}</Route>
      <Route path="/daily-reports">{() => <ProtectedRoute component={DailyReports} permission="view_daily_report" />}</Route>
      <Route path="/daily-reports/new">{() => <ProtectedRoute component={DailyReportForm} permission="view_daily_report" />}</Route>
      <Route path="/daily-reports/:id">{() => <ProtectedRoute component={DailyReportForm} permission="view_daily_report" />}</Route>
      <Route path="/projects" component={Projects} />
      <Route path="/projects-overview">{() => <ProtectedRoute component={ProjectsOverview} permission="view_projects_overview" />}</Route>
      <Route path="/weekly-plans">{() => <ProtectedRoute component={WeeklyPlans} permission="view_weekly_plan" />}</Route>
      <Route path="/weekly-plans/new">{() => <ProtectedRoute component={WeeklyPlanForm} permission="view_weekly_plan" />}</Route>
      <Route path="/weekly-plans/:id">{() => <ProtectedRoute component={WeeklyPlanForm} permission="view_weekly_plan" />}</Route>
      <Route path="/weekly-report">{() => <ProtectedRoute component={WeeklyReport} permission="view_weekly_report" />}</Route>
      <Route path="/executive-summary">{() => <ProtectedRoute component={ExecutiveSummary} permission="view_executive_summary" />}</Route>
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
  const [showLogin, setShowLogin] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    if (showLogin) {
      return <LoginPage onBack={() => setShowLogin(false)} />;
    }
    return <LandingPage onGetStarted={() => setShowLogin(true)} />;
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

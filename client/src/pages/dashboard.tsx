import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  ClipboardList,
  CalendarRange,
  AlertTriangle,
  Users,
  TrendingUp,
  HardHat,
  Plus,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import type { DailyReport, Project, WeeklyPlan } from "@shared/schema";

function StatCard({ title, value, icon: Icon, description, color }: {
  title: string;
  value: string | number;
  icon: any;
  description: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${color}`}>
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: projects, isLoading: loadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: reports, isLoading: loadingReports } = useQuery<DailyReport[]>({
    queryKey: ["/api/daily-reports"],
  });

  const { data: plans, isLoading: loadingPlans } = useQuery<WeeklyPlan[]>({
    queryKey: ["/api/weekly-plans"],
  });

  const isLoading = loadingProjects || loadingReports || loadingPlans;

  const totalLabour = reports?.reduce((sum, r) => {
    const labour = r.labourForce as any[];
    return sum + (labour?.reduce((s: number, l: any) => s + (l.count || 0), 0) || 0);
  }, 0) || 0;

  const safetyIncidentCount = reports?.reduce((sum, r) => {
    const incidents = r.safetyIncidents as any[];
    return sum + (incidents?.length || 0);
  }, 0) || 0;

  const recentReports = reports?.slice(-5).reverse() || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="dashboard-page">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Construction site activity overview</p>
        </div>
        <Link href="/daily-reports/new">
          <Button data-testid="button-new-report">
            <Plus className="mr-2 h-4 w-4" />
            New Daily Report
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Projects"
          value={projects?.filter(p => p.status === "active").length || 0}
          icon={HardHat}
          description="Currently in progress"
          color="bg-primary"
        />
        <StatCard
          title="Daily Reports"
          value={reports?.length || 0}
          icon={ClipboardList}
          description="Total submitted"
          color="bg-chart-2"
        />
        <StatCard
          title="Total Workers"
          value={totalLabour}
          icon={Users}
          description="Across all reports"
          color="bg-chart-4"
        />
        <StatCard
          title="Safety Incidents"
          value={safetyIncidentCount}
          icon={AlertTriangle}
          description="Total recorded"
          color={safetyIncidentCount > 0 ? "bg-destructive" : "bg-chart-4"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Recent Daily Reports</CardTitle>
            <Link href="/daily-reports">
              <Button variant="ghost" size="sm" data-testid="button-view-all-reports">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentReports.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No reports yet</p>
                <Link href="/daily-reports/new">
                  <Button variant="outline" size="sm" className="mt-3" data-testid="button-create-first-report">
                    Create first report
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentReports.map((report) => {
                  const project = projects?.find(p => p.id === report.projectId);
                  return (
                    <Link key={report.id} href={`/daily-reports/${report.id}`}>
                      <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/40 hover-elevate cursor-pointer" data-testid={`report-item-${report.id}`}>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{report.reportNumber}</p>
                          <p className="text-xs text-muted-foreground">{project?.name || "—"} · {report.reportDate}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={report.status === "submitted" ? "default" : "secondary"} className="text-xs">
                            {report.status}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Active Projects</CardTitle>
            <Link href="/projects">
              <Button variant="ghost" size="sm" data-testid="button-view-all-projects">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!projects || projects.length === 0 ? (
              <div className="text-center py-8">
                <HardHat className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No projects yet</p>
                <Link href="/projects">
                  <Button variant="outline" size="sm" className="mt-3">
                    Add project
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 5).map((project) => {
                  const projectReports = reports?.filter(r => r.projectId === project.id) || [];
                  return (
                    <div key={project.id} className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/40" data-testid={`project-item-${project.id}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{project.name}</p>
                        <p className="text-xs text-muted-foreground">{project.code} · {project.location}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{projectReports.length} reports</span>
                        <Badge variant={project.status === "active" ? "default" : "secondary"} className="text-xs">
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Weekly Plans</CardTitle>
            <Link href="/weekly-plans">
              <Button variant="ghost" size="sm" data-testid="button-view-weekly-plans">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!plans || plans.length === 0 ? (
              <div className="text-center py-8">
                <CalendarRange className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No weekly plans yet</p>
                <Link href="/weekly-plans/new">
                  <Button variant="outline" size="sm" className="mt-3">
                    Create weekly plan
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {plans.slice(-3).reverse().map((plan) => {
                  const project = projects?.find(p => p.id === plan.projectId);
                  return (
                    <div key={plan.id} className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/40" data-testid={`plan-item-${plan.id}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">Week {plan.weekNumber}</p>
                        <p className="text-xs text-muted-foreground">{project?.name || "—"} · {plan.weekStartDate} - {plan.weekEndDate}</p>
                      </div>
                      <Badge variant={plan.status === "approved" ? "default" : "secondary"} className="text-xs">
                        {plan.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/daily-reports/new">
                <div className="flex flex-col items-center gap-2 p-4 rounded-md bg-muted/40 hover-elevate cursor-pointer text-center" data-testid="link-quick-daily-report">
                  <ClipboardList className="h-6 w-6 text-primary" />
                  <span className="text-xs font-medium">New Daily Report</span>
                </div>
              </Link>
              <Link href="/weekly-plans/new">
                <div className="flex flex-col items-center gap-2 p-4 rounded-md bg-muted/40 hover-elevate cursor-pointer text-center" data-testid="link-quick-weekly-plan">
                  <CalendarRange className="h-6 w-6 text-primary" />
                  <span className="text-xs font-medium">New Weekly Plan</span>
                </div>
              </Link>
              <Link href="/weekly-report">
                <div className="flex flex-col items-center gap-2 p-4 rounded-md bg-muted/40 hover-elevate cursor-pointer text-center" data-testid="link-quick-weekly-report">
                  <BarChart3 className="h-6 w-6 text-primary" />
                  <span className="text-xs font-medium">Weekly Report</span>
                </div>
              </Link>
              <Link href="/executive-summary">
                <div className="flex flex-col items-center gap-2 p-4 rounded-md bg-muted/40 hover-elevate cursor-pointer text-center" data-testid="link-quick-exec-summary">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <span className="text-xs font-medium">Exec Summary</span>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

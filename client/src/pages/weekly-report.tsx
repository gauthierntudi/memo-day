import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BarChart3,
  Users,
  Hammer,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  Target,
  ClipboardList,
  FileWarning,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { DailyReport, Project, WeeklyPlan } from "@shared/schema";
import { usePermissions } from "@/hooks/use-permissions";

const CHART_COLORS = [
  "hsl(210, 85%, 42%)",
  "hsl(195, 75%, 42%)",
  "hsl(30, 85%, 45%)",
  "hsl(160, 70%, 40%)",
  "hsl(270, 65%, 48%)",
  "hsl(350, 70%, 45%)",
  "hsl(45, 85%, 50%)",
  "hsl(120, 55%, 40%)",
];

export default function WeeklyReport() {
  const { projectIds: allowedProjectIds, hasAllProjects } = usePermissions();
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedWeek, setSelectedWeek] = useState("all");

  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: reports, isLoading: loadingReports } = useQuery<DailyReport[]>({ queryKey: ["/api/daily-reports"] });
  const { data: plans } = useQuery<WeeklyPlan[]>({ queryKey: ["/api/weekly-plans"] });

  if (loadingReports) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>)}
        </div>
      </div>
    );
  }

  const approvedPlans = plans?.filter(p => p.status === "approved") || [];
  const approvedReports = reports?.filter(r => r.status === "approved") || [];

  const matchedPlan = selectedWeek !== "all"
    ? approvedPlans.find(p => p.id === Number(selectedWeek))
    : approvedPlans.filter(p => selectedProject === "all" || p.projectId === Number(selectedProject))
        .sort((a, b) => b.weekNumber - a.weekNumber)[0];

  const filteredReports = approvedReports.filter(r => {
    if (selectedProject !== "all" && r.projectId !== Number(selectedProject)) return false;
    if (matchedPlan) {
      return r.reportDate >= matchedPlan.weekStartDate && r.reportDate <= matchedPlan.weekEndDate
        && (selectedProject === "all" || r.projectId === matchedPlan.projectId);
    }
    return true;
  });

  const missingPlan = !matchedPlan && selectedProject !== "all";
  const missingReports = filteredReports.length === 0 && (matchedPlan || selectedProject !== "all");

  const totalWorkers = filteredReports.reduce((sum, r) => {
    const labour = r.labourForce as any[];
    return sum + (labour?.reduce((s: number, l: any) => s + (l.count || 0), 0) || 0);
  }, 0);

  const totalSafetyIncidents = filteredReports.reduce((sum, r) => {
    return sum + ((r.safetyIncidents as any[])?.length || 0);
  }, 0);

  const totalSecurityIncidents = filteredReports.reduce((sum, r) => {
    return sum + ((r.securityIncidents as any[])?.length || 0);
  }, 0);

  const avgProgress = filteredReports.length > 0
    ? Math.round(filteredReports.reduce((sum, r) => sum + (r.overallProgress || 0), 0) / filteredReports.length)
    : 0;

  const labourByTrade: Record<string, number> = {};
  filteredReports.forEach(r => {
    const labour = r.labourForce as any[];
    labour?.forEach((l: any) => {
      if (l.trade) labourByTrade[l.trade] = (labourByTrade[l.trade] || 0) + l.count;
    });
  });

  const labourChartData = Object.entries(labourByTrade)
    .map(([trade, count]) => ({ trade: trade.length > 12 ? trade.substring(0, 12) + "..." : trade, count }))
    .sort((a, b) => b.count - a.count);

  const activityByStatus: Record<string, number> = {};
  filteredReports.forEach(r => {
    const acts = r.workActivities as any[];
    acts?.forEach((a: any) => {
      if (a.status) activityByStatus[a.status] = (activityByStatus[a.status] || 0) + 1;
    });
  });

  const statusPieData = Object.entries(activityByStatus).map(([name, value]) => ({ name, value }));

  const plannedLabour = matchedPlan?.plannedLabour as any[] || [];
  const totalPlannedWorkers = plannedLabour.reduce((s: number, l: any) => s + (l.plannedCount || 0), 0);

  const comparisonData = plannedLabour.map((pl: any) => ({
    trade: pl.trade?.length > 10 ? pl.trade.substring(0, 10) + "..." : pl.trade,
    planned: pl.plannedCount || 0,
    actual: labourByTrade[pl.trade] || 0,
  }));

  return (
    <div className="p-6 space-y-6" data-testid="weekly-report-page">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Weekly Report</h1>
          <p className="text-sm text-muted-foreground">Auto-generated from daily reports vs weekly plan</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[180px]" data-testid="select-report-project">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.filter(p => hasAllProjects || allowedProjectIds.includes(p.id)).sort((a, b) => a.name.localeCompare(b.name)).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-[180px]" data-testid="select-report-week">
              <SelectValue placeholder="Week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Latest Plan</SelectItem>
              {approvedPlans
                .filter(p => selectedProject === "all" || p.projectId === Number(selectedProject))
                .sort((a, b) => b.weekNumber - a.weekNumber)
                .map(p => {
                  const proj = projects?.find(pr => pr.id === p.projectId);
                  return <SelectItem key={p.id} value={String(p.id)}>Week {p.weekNumber}{proj ? ` - ${proj.name}` : ""}</SelectItem>;
                })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {(missingPlan || missingReports) && (
        <Alert variant="destructive" data-testid="alert-missing-documents">
          <FileWarning className="h-4 w-4" />
          <AlertTitle>Missing Approved Documents</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 mt-1 space-y-1 text-sm">
              {missingPlan && (
                <li>No approved weekly plan found for {projects?.find(p => p.id === Number(selectedProject))?.name || "the selected project"}{matchedPlan ? ` (Week ${matchedPlan.weekNumber})` : ""}. Please ensure a weekly plan has been submitted and approved.</li>
              )}
              {missingReports && (
                <li>No approved daily reports found for {projects?.find(p => p.id === Number(selectedProject))?.name || "the selected project"}{matchedPlan ? ` during Week ${matchedPlan.weekNumber} (${matchedPlan.weekStartDate} to ${matchedPlan.weekEndDate})` : ""}. Please ensure daily reports have been submitted and approved.</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Reports Filed</p>
                <p className="text-2xl font-bold">{filteredReports.length}</p>
                <p className="text-xs text-muted-foreground">this period</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary">
                <BarChart3 className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Man-Days</p>
                <p className="text-2xl font-bold">{totalWorkers}</p>
                {totalPlannedWorkers > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    {totalWorkers >= totalPlannedWorkers ? (
                      <TrendingUp className="h-3 w-3 text-chart-4" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <span className="text-muted-foreground">vs {totalPlannedWorkers} planned</span>
                  </div>
                )}
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-chart-2">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Progress</p>
                <p className="text-2xl font-bold">{avgProgress}%</p>
                <Progress value={avgProgress} className="mt-2 h-1.5" />
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-chart-4">
                <Target className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Safety Incidents</p>
                <p className="text-2xl font-bold">{totalSafetyIncidents}</p>
                <p className="text-xs text-muted-foreground">{totalSecurityIncidents} security</p>
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${totalSafetyIncidents > 0 ? "bg-destructive" : "bg-chart-4"}`}>
                <AlertTriangle className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Labour Distribution by Trade</CardTitle>
          </CardHeader>
          <CardContent>
            {labourChartData.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No labour data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={labourChartData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="trade" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {statusPieData.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No activity data available</div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={250}>
                  <PieChart>
                    <Pie data={statusPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {statusPieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {statusPieData.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span>{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {matchedPlan && comparisonData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Planned vs Actual Labour</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="trade" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="planned" fill="hsl(var(--chart-2))" name="Planned" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="hsl(var(--primary))" name="Actual" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Reports Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No reports for the selected period</div>
          ) : (
            <div className="space-y-3">
              {[...filteredReports].reverse().map(report => {
                const project = projects?.find(p => p.id === report.projectId);
                const labour = report.labourForce as any[];
                const workers = labour?.reduce((s: number, l: any) => s + (l.count || 0), 0) || 0;
                const incidents = (report.safetyIncidents as any[])?.length || 0;

                return (
                  <div key={report.id} className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/30" data-testid={`summary-report-${report.id}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        <ClipboardList className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{report.reportNumber} - {report.reportDate}</p>
                        <p className="text-xs text-muted-foreground">{project?.name} | {report.weatherCondition} | {workers} workers</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {incidents > 0 && <Badge variant="destructive" className="text-xs">{incidents}</Badge>}
                      <Badge variant={report.isWorkingDay ? "default" : "secondary"} className="text-xs">
                        {report.isWorkingDay ? <CheckCircle className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
                        {report.isWorkingDay ? "Working" : "Non-working"}
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
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Users,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Shield,
  Wrench,
  Package,
  FileText,
  Target,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import type { DailyReport, Project, WeeklyPlan } from "@shared/schema";

export default function ExecutiveSummary() {
  const [period, setPeriod] = useState("weekly");
  const [selectedProject, setSelectedProject] = useState("all");

  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: reports, isLoading } = useQuery<DailyReport[]>({ queryKey: ["/api/daily-reports"] });
  const { data: plans } = useQuery<WeeklyPlan[]>({ queryKey: ["/api/weekly-plans"] });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>)}
        </div>
      </div>
    );
  }

  const filtered = reports?.filter(r => {
    if (selectedProject !== "all" && r.projectId !== Number(selectedProject)) return false;
    return true;
  }) || [];

  const totalReports = filtered.length;
  const workingDays = filtered.filter(r => r.isWorkingDay).length;
  const nonWorkingDays = totalReports - workingDays;

  const totalWorkers = filtered.reduce((sum, r) => {
    const labour = r.labourForce as any[];
    return sum + (labour?.reduce((s: number, l: any) => s + (l.count || 0), 0) || 0);
  }, 0);

  const avgWorkersPerDay = workingDays > 0 ? Math.round(totalWorkers / workingDays) : 0;

  const totalManHours = filtered.reduce((sum, r) => {
    const labour = r.labourForce as any[];
    return sum + (labour?.reduce((s: number, l: any) => s + ((l.count || 0) * (l.hours || 8)), 0) || 0);
  }, 0);

  const safetyIncidents = filtered.reduce((sum, r) => sum + ((r.safetyIncidents as any[])?.length || 0), 0);
  const securityIncidents = filtered.reduce((sum, r) => sum + ((r.securityIncidents as any[])?.length || 0), 0);

  const avgProgress = totalReports > 0
    ? Math.round(filtered.reduce((sum, r) => sum + (r.overallProgress || 0), 0) / totalReports)
    : 0;

  const safetyBySeverity: Record<string, number> = {};
  filtered.forEach(r => {
    (r.safetyIncidents as any[])?.forEach((inc: any) => {
      safetyBySeverity[inc.severity] = (safetyBySeverity[inc.severity] || 0) + 1;
    });
  });

  const labourTrend = filtered.map(r => {
    const labour = r.labourForce as any[];
    const workers = labour?.reduce((s: number, l: any) => s + (l.count || 0), 0) || 0;
    return { date: r.reportDate, workers, progress: r.overallProgress || 0 };
  });

  const equipmentUsage: Record<string, number> = {};
  filtered.forEach(r => {
    (r.equipment as any[])?.forEach((eq: any) => {
      if (eq.type) equipmentUsage[eq.type] = (equipmentUsage[eq.type] || 0) + (eq.hoursUsed || 0);
    });
  });

  const equipmentData = Object.entries(equipmentUsage)
    .map(([type, hours]) => ({ type: type.length > 12 ? type.substring(0, 12) + "..." : type, hours: Math.round(hours) }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 8);

  const tradePerformance: Record<string, { workers: number; activities: number; completed: number }> = {};
  filtered.forEach(r => {
    (r.labourForce as any[])?.forEach((l: any) => {
      if (!l.trade) return;
      if (!tradePerformance[l.trade]) tradePerformance[l.trade] = { workers: 0, activities: 0, completed: 0 };
      tradePerformance[l.trade].workers += l.count || 0;
    });
    (r.workActivities as any[])?.forEach((a: any) => {
      if (!a.trade) return;
      if (!tradePerformance[a.trade]) tradePerformance[a.trade] = { workers: 0, activities: 0, completed: 0 };
      tradePerformance[a.trade].activities += 1;
      if (a.status === "Completed") tradePerformance[a.trade].completed += 1;
    });
  });

  const cleaningBreakdown: Record<string, number> = {};
  filtered.forEach(r => {
    cleaningBreakdown[r.cleaningStatus] = (cleaningBreakdown[r.cleaningStatus] || 0) + 1;
  });

  const totalMaterialsReceived = filtered.reduce((sum, r) => {
    return sum + ((r.materialsIn as any[])?.length || 0);
  }, 0);

  const totalMaterialsUsed = filtered.reduce((sum, r) => {
    return sum + ((r.materialsUsed as any[])?.length || 0);
  }, 0);

  return (
    <div className="p-6 space-y-6" data-testid="executive-summary-page">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executive Summary</h1>
          <p className="text-sm text-muted-foreground">Comprehensive overview of construction operations</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[180px]" data-testid="select-exec-project">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={period} onValueChange={setPeriod}>
        <TabsList>
          <TabsTrigger value="weekly" data-testid="tab-weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly</TabsTrigger>
          <TabsTrigger value="quarterly" data-testid="tab-quarterly">Quarterly</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="mt-4 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Reports</p>
                    <p className="text-2xl font-bold">{totalReports}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="default" className="text-xs">{workingDays} working</Badge>
                      <Badge variant="secondary" className="text-xs">{nonWorkingDays} off</Badge>
                    </div>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary">
                    <FileText className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Man-Hours</p>
                    <p className="text-2xl font-bold">{totalManHours.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{avgWorkersPerDay} avg workers/day</p>
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
                    <TrendingUp className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Incidents</p>
                    <p className="text-2xl font-bold">{safetyIncidents + securityIncidents}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={safetyIncidents > 0 ? "destructive" : "secondary"} className="text-xs">{safetyIncidents} safety</Badge>
                      <Badge variant="secondary" className="text-xs">{securityIncidents} security</Badge>
                    </div>
                  </div>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${safetyIncidents > 0 ? "bg-destructive" : "bg-chart-4"}`}>
                    <Shield className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Workforce & Progress Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {labourTrend.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={labourTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="workers" stroke="hsl(var(--primary))" name="Workers" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="progress" stroke="hsl(var(--chart-4))" name="Progress %" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Equipment Utilization (hours)</CardTitle>
              </CardHeader>
              <CardContent>
                {equipmentData.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">No equipment data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={equipmentData} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="type" tick={{ fontSize: 10 }} width={80} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="hours" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Safety Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(safetyBySeverity).length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle className="h-8 w-8 mx-auto text-chart-4 mb-2" />
                    <p className="text-sm font-medium">No Safety Incidents</p>
                    <p className="text-xs text-muted-foreground">All clear for this period</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(safetyBySeverity).map(([severity, count]) => (
                      <div key={severity} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={severity === "Critical" || severity === "High" ? "destructive" : "secondary"} className="text-xs">
                            {severity}
                          </Badge>
                        </div>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4" /> Site Housekeeping</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(cleaningBreakdown).length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">No data</div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(cleaningBreakdown).map(([status, count]) => (
                      <div key={status} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{status}</span>
                          <span className="font-medium">{count} ({totalReports > 0 ? Math.round((count / totalReports) * 100) : 0}%)</span>
                        </div>
                        <Progress value={totalReports > 0 ? (count / totalReports) * 100 : 0} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> Materials Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">Materials Received</p>
                      <p className="text-xs text-muted-foreground">Total delivery entries</p>
                    </div>
                    <span className="text-2xl font-bold">{totalMaterialsReceived}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">Materials Used</p>
                      <p className="text-xs text-muted-foreground">Total usage entries</p>
                    </div>
                    <span className="text-2xl font-bold">{totalMaterialsUsed}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Trade Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(tradePerformance).length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No trade data available</div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(tradePerformance).map(([trade, data]) => (
                    <div key={trade} className="p-3 rounded-md bg-muted/30">
                      <p className="text-sm font-medium mb-2">{trade}</p>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Total Workers:</span>
                          <span className="font-medium text-foreground">{data.workers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Activities:</span>
                          <span className="font-medium text-foreground">{data.activities}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Completed:</span>
                          <span className="font-medium text-foreground">{data.completed}</span>
                        </div>
                        {data.activities > 0 && (
                          <div className="pt-1">
                            <Progress value={(data.completed / data.activities) * 100} className="h-1.5" />
                            <p className="text-right mt-0.5">{Math.round((data.completed / data.activities) * 100)}% completion</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ClipboardList, Search, Eye } from "lucide-react";
import { useState } from "react";
import type { DailyReport, Project, WeeklyPlan, PlannedLabour } from "@shared/schema";
import { usePermissions } from "@/hooks/use-permissions";

export default function DailyReports() {
  const { hasPermission, projectIds: allowedProjectIds, hasAllProjects } = usePermissions();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");

  const { data: reports, isLoading } = useQuery<DailyReport[]>({
    queryKey: ["/api/daily-reports"],
  });
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  const { data: weeklyPlans } = useQuery<WeeklyPlan[]>({
    queryKey: ["/api/weekly-plans"],
  });

  const filtered = reports?.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (projectFilter !== "all" && r.projectId !== Number(projectFilter)) return false;
    if (search) {
      const s = search.toLowerCase();
      return r.reportNumber.toLowerCase().includes(s) || r.preparedBy.toLowerCase().includes(s) || r.reportDate.includes(s);
    }
    return true;
  })?.reverse() || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="daily-reports-page">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Reports</h1>
          <p className="text-sm text-muted-foreground">{reports?.length || 0} reports total</p>
        </div>
        {hasPermission("create_daily_report") && (
          <Link href="/daily-reports/new">
            <Button data-testid="button-new-daily-report">
              <Plus className="mr-2 h-4 w-4" /> New Report
            </Button>
          </Link>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by report number, date..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-reports"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-project-filter">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects?.filter(p => hasAllProjects || allowedProjectIds.includes(p.id)).sort((a, b) => a.name.localeCompare(b.name)).map(p => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground mb-2">No daily reports found</p>
            <Link href="/daily-reports/new">
              <Button variant="outline" size="sm" className="mt-2">
                Create your first report
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => {
            const project = projects?.find(p => p.id === report.projectId);
            const labour = report.labourForce as any[];
            const additionalWorkers = labour?.reduce((s: number, l: any) => s + (l.count || 0), 0) || 0;
            const plannedActualWorkers = ((report.plannedLabourActuals as { index: number; actualCount: number }[]) || []).reduce(
              (s, l) => s + (l.actualCount || 0),
              0
            );
            const totalWorkers = additionalWorkers + plannedActualWorkers;
            const safetyCount = (report.safetyIncidents as any[])?.length || 0;

            return (
              <Link key={report.id} href={`/daily-reports/${report.id}`}>
                <Card className="hover-elevate cursor-pointer" data-testid={`card-report-${report.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold">{report.reportNumber}</span>
                          <Badge
                            variant={report.status === "approved" ? "default" : report.status === "rejected" ? "destructive" : report.status === "submitted" ? "secondary" : "outline"}
                            className={`text-xs ${report.status === "approved" ? "bg-green-600" : ""}`}
                            data-testid={`badge-status-${report.id}`}
                          >
                            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                          </Badge>
                          {safetyCount > 0 && (
                            <Badge variant="destructive" className="text-xs">{safetyCount} incident{safetyCount > 1 ? "s" : ""}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{project?.name || "—"}</p>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span>Date: {report.reportDate}</span>
                          <span>Workers: {totalWorkers}</span>
                          <span>Weather: {report.weatherCondition}</span>
                          <span>By: {report.preparedBy}</span>
                          {report.submittedBy && <span>Submitted by: {report.submittedBy}</span>}
                          {report.approvedBy && <span>Approved by: {report.approvedBy}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" data-testid={`button-view-report-${report.id}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

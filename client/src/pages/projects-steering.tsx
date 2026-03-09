import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermissions } from "@/hooks/use-permissions";
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  Calendar,
  Activity,
  MapPin,
  User,
  Briefcase,
  Clock,
  TrendingUp,
  AlertTriangle,
  FileText,
  List,
} from "lucide-react";
import { PhotoGrid } from "@/components/photo-grid";
import type { Project, User as UserType, DailyReport, WeeklyPlan, DirectCostDetails, IndirectCostDetails } from "@shared/schema";
import { DIRECT_COST_LABELS, INDIRECT_COST_LABELS } from "@shared/schema";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

interface SlideInfo {
  type: "project-info" | "project-progress" | "project-operational" | "project-photos" | "weekly-report" | "weekly-plan";
  projectId: number;
  label: string;
}

function CostBreakdownRow({ label, amount, details, labels }: {
  label: string;
  amount: number | null | undefined;
  details: Record<string, number | null> | null;
  labels: Record<string, string>;
}) {
  if (amount == null && !details) return null;
  const hasDetails = details && Object.values(details).some(v => v != null && v > 0);
  return (
    <div className="space-y-1">
      <div className="flex justify-between font-medium">
        <span>{label}:</span>
        <span>{formatCurrency(amount)}</span>
      </div>
      {hasDetails && (
        <div className="pl-4 space-y-0.5">
          {Object.entries(details!).map(([key, val]) => val != null && val > 0 ? (
            <div key={key} className="flex justify-between text-xs text-muted-foreground">
              <span>{labels[key] || key}:</span>
              <span>{formatCurrency(val)}</span>
            </div>
          ) : null)}
        </div>
      )}
    </div>
  );
}

export default function ProjectsSteering() {
  const { hasPermission } = usePermissions();
  const canViewOperational = hasPermission("view_project_operational");

  const { data: projects, isLoading } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: users } = useQuery<UserType[]>({ queryKey: ["/api/users"] });
  const { data: allReports } = useQuery<DailyReport[]>({ queryKey: ["/api/daily-reports"] });
  const { data: allPlans } = useQuery<WeeklyPlan[]>({ queryKey: ["/api/weekly-plans"] });
  const activeUsers = users?.filter(u => u.isActive) || [];

  const [projectFilter, setProjectFilter] = useState("all");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showProjectList, setShowProjectList] = useState(true);

  const sorted = useMemo(() =>
    (projects ?? [])
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" })),
    [projects]
  );

  const filtered = useMemo(() => sorted.filter(p => {
    if (projectFilter === "all") return true;
    if (projectFilter === "Own" || projectFilter === "Group" || projectFilter === "Non-group") return p.clientType === projectFilter;
    if (projectFilter === "active" || projectFilter === "completed") return p.status === projectFilter;
    return true;
  }), [sorted, projectFilter]);

  const getAssignedUsersByRole = (projectId: number, role: string) => {
    return activeUsers.filter(u =>
      u.orgRole === role &&
      u.projectIds &&
      (u.projectIds.includes(-1) || u.projectIds.includes(projectId))
    );
  };

  const selectedProject = selectedProjectId ? sorted.find(p => p.id === selectedProjectId) : null;

  const getWeekBounds = (refDate: Date, offset: number) => {
    const d = new Date(refDate);
    d.setDate(d.getDate() + offset * 7);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (dt: Date) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const dd = String(dt.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    };
    return { start: fmt(monday), end: fmt(sunday) };
  };

  const today = new Date();
  const prevWeek = getWeekBounds(today, -1);
  const thisWeek = getWeekBounds(today, 0);

  const prevWeekReports = useMemo(() => {
    if (!selectedProjectId || !allReports) return [];
    return allReports.filter(r =>
      r.projectId === selectedProjectId &&
      r.status === "approved" &&
      r.reportDate >= prevWeek.start &&
      r.reportDate <= prevWeek.end
    );
  }, [selectedProjectId, allReports, prevWeek.start, prevWeek.end]);

  const thisWeekPlan = useMemo(() => {
    if (!selectedProjectId || !allPlans) return null;
    const candidates = allPlans.filter(p =>
      p.projectId === selectedProjectId &&
      p.status === "approved" &&
      p.weekStartDate <= thisWeek.end &&
      p.weekEndDate >= thisWeek.start
    );
    return candidates.sort((a, b) => b.weekNumber - a.weekNumber)[0] || null;
  }, [selectedProjectId, allPlans, thisWeek.start, thisWeek.end]);

  const slides = useMemo<SlideInfo[]>(() => {
    if (!selectedProject) return [];
    const s: SlideInfo[] = [
      { type: "project-info", projectId: selectedProject.id, label: "Info" },
      { type: "project-progress", projectId: selectedProject.id, label: "Progress" },
    ];
    if (canViewOperational) {
      s.push({ type: "project-operational", projectId: selectedProject.id, label: "Operations" });
    }
    s.push({ type: "weekly-report", projectId: selectedProject.id, label: "Last Week" });
    s.push({ type: "weekly-plan", projectId: selectedProject.id, label: "This Week" });
    const photos = (selectedProject.photos as string[]) ?? [];
    if (photos.length > 0) {
      s.push({ type: "project-photos", projectId: selectedProject.id, label: "Photos" });
    }
    return s;
  }, [selectedProject, canViewOperational]);

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    setCurrentSlide(0);
  }, [selectedProjectId]);

  useEffect(() => {
    if (currentSlide >= slides.length && slides.length > 0) {
      setCurrentSlide(slides.length - 1);
    }
  }, [slides.length, currentSlide]);

  const goNext = useCallback(() => setCurrentSlide(i => Math.min(i + 1, slides.length - 1)), [slides.length]);
  const goPrev = useCallback(() => setCurrentSlide(i => Math.max(i - 1, 0)), []);

  useEffect(() => {
    if (!selectedProject) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goPrev(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, selectedProject]);

  const handleSelectProject = (id: number) => {
    setSelectedProjectId(id);
    setShowProjectList(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  const slide = slides[currentSlide];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]" data-testid="projects-steering-deck">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold" data-testid="text-steering-title">Projects Steering</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[140px] h-9" data-testid="select-project-filter">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Own">Own</SelectItem>
              <SelectItem value="Group">Group</SelectItem>
              <SelectItem value="Non-group">Non-group</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          {!showProjectList && (
            <Button variant="outline" size="sm" onClick={() => setShowProjectList(true)} data-testid="button-show-project-list">
              <List className="h-4 w-4 mr-1.5" /> Projects
            </Button>
          )}
          {selectedProject && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground" data-testid="text-slide-counter">
                {currentSlide + 1} / {slides.length}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goPrev} disabled={currentSlide === 0} data-testid="button-prev-slide">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goNext} disabled={currentSlide === slides.length - 1} data-testid="button-next-slide">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {showProjectList && (
        <div className="shrink-0 px-4 py-3 border-b" data-testid="project-list-section">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5" data-testid="project-list-grid">
            {filtered.length === 0 ? (
              <div className="col-span-3 flex flex-col items-center justify-center py-8">
                <Building2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">{projects && projects.length > 0 ? "No projects match the selected filter" : "No projects added yet"}</p>
              </div>
            ) : (
              filtered.map(project => (
                <button
                  key={project.id}
                  onClick={() => handleSelectProject(project.id)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors truncate ${
                    selectedProjectId === project.id
                      ? "bg-primary text-primary-foreground border-primary font-semibold"
                      : "bg-card hover:bg-muted/60 border-border"
                  }`}
                  data-testid={`button-select-project-${project.id}`}
                >
                  <span className="truncate block">{project.name}</span>
                  <span className={`text-[10px] ${selectedProjectId === project.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{project.code}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto flex items-center justify-center p-4 md:p-8 bg-gradient-to-br from-background to-muted/20">
        <div className="w-full max-w-5xl">
          {!selectedProject ? (
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-16">
              <div className="p-5 rounded-full bg-primary/10">
                <Building2 className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Select a Project</h2>
              <p className="text-muted-foreground">Choose a project from the list above to view its steering slides</p>
            </div>
          ) : (
            <>
              {slide?.type === "project-info" && (
                <ProjectInfoSlide project={selectedProject} assignedPMs={getAssignedUsersByRole(selectedProject.id, "Project Manager")} assignedDMs={getAssignedUsersByRole(selectedProject.id, "Development Manager")} />
              )}
              {slide?.type === "project-progress" && <ProjectProgressSlide project={selectedProject} />}
              {slide?.type === "project-operational" && <ProjectOperationalSlide project={selectedProject} />}
              {slide?.type === "weekly-report" && <WeeklyReportSlide reports={prevWeekReports} weekStart={prevWeek.start} weekEnd={prevWeek.end} />}
              {slide?.type === "weekly-plan" && <WeeklyPlanSlide plan={thisWeekPlan} weekStart={thisWeek.start} weekEnd={thisWeek.end} />}
              {slide?.type === "project-photos" && <ProjectPhotosSlide project={selectedProject} />}
            </>
          )}
        </div>
      </div>

      {selectedProject && slides.length > 0 && (
        <div className="shrink-0 border-t bg-muted/20 px-4 py-2 overflow-x-auto">
          <div className="flex gap-1">
            {slides.map((s, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`px-3 py-1.5 text-xs rounded whitespace-nowrap transition-colors ${
                  i === currentSlide
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
                data-testid={`button-slide-${i}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectInfoSlide({ project: p, assignedPMs, assignedDMs }: { project: Project; assignedPMs: UserType[]; assignedDMs: UserType[] }) {
  return (
    <div className="space-y-6" data-testid={`slide-info-${p.id}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-muted-foreground font-semibold">{p.code}</span>
            <Badge variant={p.status === "active" ? "default" : p.status === "completed" ? "outline" : "secondary"} className="capitalize">{p.status}</Badge>
          </div>
          <h2 className="text-3xl font-bold">{p.name}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="py-4 px-5 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> General Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Location:</span><span className="font-medium">{p.location}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Client:</span><span className="font-medium">{p.client}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Client Type:</span><Badge variant="outline" className="text-xs">{p.clientType || "Own"}</Badge></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Project Manager:</span>
                <span className="font-medium text-xs">{assignedPMs.length > 0 ? assignedPMs.map(u => u.name).join(", ") : <span className="italic text-muted-foreground">Not assigned</span>}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Dev. Manager:</span>
                <span className="font-medium text-xs">{assignedDMs.length > 0 ? assignedDMs.map(u => u.name).join(", ") : <span className="italic text-muted-foreground">Not assigned</span>}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 px-5 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Key Dates
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Start Date:</span><span className="font-medium">{p.startDate || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Planned Completion:</span><span className="font-medium">{p.plannedDeliveryDate || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Revised Baseline:</span><span className="font-medium">{p.revisedBaselineDate || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Expected Completion:</span><span className="font-medium">{p.updatedDeliveryDate || "—"}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {p.scopeOfWork && (
        <Card>
          <CardContent className="py-4 px-5 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <FileText className="h-4 w-4" /> Scope of Work
            </h3>
            <p className="text-sm whitespace-pre-wrap">{p.scopeOfWork}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ProjectProgressSlide({ project: p }: { project: Project }) {
  const progress = p.overallProgress ?? 0;
  const schedule = p.schedulePercentage ?? 0;
  const performance = p.performancePercentage ?? null;
  const delay = p.delayDays ?? 0;

  return (
    <div className="space-y-6" data-testid={`slide-progress-${p.id}`}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-mono text-muted-foreground font-semibold">{p.code}</span>
          <Badge variant={p.status === "active" ? "default" : p.status === "completed" ? "outline" : "secondary"} className="capitalize">{p.status}</Badge>
        </div>
        <h2 className="text-3xl font-bold">{p.name}</h2>
        <p className="text-muted-foreground">Progress & Schedule</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-5 px-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-4xl font-bold text-primary">{progress}%</p>
            <p className="text-xs text-muted-foreground mt-1">Overall Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5 px-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-amber-600" />
            <p className="text-4xl font-bold text-amber-600">{schedule}%</p>
            <p className="text-xs text-muted-foreground mt-1">Schedule %</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5 px-4 text-center">
            <Activity className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <p className="text-4xl font-bold text-blue-600">{performance != null ? `${performance}%` : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Performance %</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5 px-4 text-center">
            <AlertTriangle className={`h-6 w-6 mx-auto mb-2 ${delay > 0 ? "text-red-500" : "text-emerald-600"}`} />
            <p className={`text-4xl font-bold ${delay > 0 ? "text-red-500" : "text-emerald-600"}`}>{delay}</p>
            <p className="text-xs text-muted-foreground mt-1">Delay (Days)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-5 px-5">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Progress vs Schedule</span>
                <span className={`font-semibold ${progress >= schedule ? "text-emerald-600" : "text-red-500"}`}>
                  {progress >= schedule ? "On Track" : `Behind by ${(schedule - progress).toFixed(2)}%`}
                </span>
              </div>
              <div className="relative h-8 w-full rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full flex items-center justify-end pr-2 transition-all"
                  style={{ width: `${Math.min(progress, 100)}%`, background: "linear-gradient(90deg, #2563eb, #06b6d4)" }}
                >
                  {progress > 10 && <span className="text-xs font-semibold text-white">{progress}%</span>}
                </div>
                {schedule > 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-500"
                    style={{ left: `${Math.min(schedule, 100)}%` }}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-amber-600 font-semibold whitespace-nowrap">Schedule {schedule}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProjectOperationalSlide({ project: p }: { project: Project }) {
  const actualTotalCost = (p.actualDirectCost != null || p.actualIndirectCost != null)
    ? (p.actualDirectCost ?? 0) + (p.actualIndirectCost ?? 0) : null;

  return (
    <div className="space-y-6" data-testid={`slide-operational-${p.id}`}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-mono text-muted-foreground font-semibold">{p.code}</span>
          <Badge variant={p.status === "active" ? "default" : p.status === "completed" ? "outline" : "secondary"} className="capitalize">{p.status}</Badge>
        </div>
        <h2 className="text-3xl font-bold">{p.name}</h2>
        <p className="text-muted-foreground flex items-center gap-1.5"><Activity className="h-4 w-4" /> Operational Indicators</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 px-5 text-center">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Budgeted Cost</p>
            <p className="text-2xl font-bold">{formatCurrency(p.budgetedCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 px-5 text-center">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Updated Cost</p>
            <p className="text-2xl font-bold">{formatCurrency(p.updatedCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 px-5 text-center">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Actual Total Cost</p>
            <p className="text-2xl font-bold">{actualTotalCost != null ? formatCurrency(actualTotalCost) : "—"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="py-4 px-5 space-y-2 text-sm">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Direct Costs</h3>
            <CostBreakdownRow
              label="Direct Cost"
              amount={p.actualDirectCost}
              details={p.directCostDetails as DirectCostDetails | null}
              labels={DIRECT_COST_LABELS}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 px-5 space-y-2 text-sm">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Indirect Costs</h3>
            <CostBreakdownRow
              label="Indirect Cost"
              amount={p.actualIndirectCost}
              details={p.indirectCostDetails as IndirectCostDetails | null}
              labels={INDIRECT_COST_LABELS}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WeeklyReportSlide({ reports, weekStart, weekEnd }: { reports: DailyReport[]; weekStart: string; weekEnd: string }) {
  const totalWorkers = reports.reduce((sum, r) => {
    const labour = r.labourForce as any[];
    return sum + (labour?.reduce((s: number, l: any) => s + (l.count || 0), 0) || 0);
  }, 0);

  const totalSafety = reports.reduce((sum, r) => sum + ((r.safetyIncidents as any[])?.length || 0), 0);
  const totalSecurity = reports.reduce((sum, r) => sum + ((r.securityIncidents as any[])?.length || 0), 0);

  const avgProgress = reports.length > 0
    ? Math.round(reports.reduce((sum, r) => sum + (r.overallProgress || 0), 0) / reports.length)
    : 0;

  const labourByTrade: Record<string, number> = {};
  reports.forEach(r => {
    const labour = r.labourForce as any[];
    labour?.forEach((l: any) => {
      if (l.trade) labourByTrade[l.trade] = (labourByTrade[l.trade] || 0) + (l.count || 0);
    });
  });
  const topTrades = Object.entries(labourByTrade).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const allActivities: any[] = [];
  reports.forEach(r => {
    const acts = r.workActivities as any[];
    acts?.forEach(a => { if (a.trade || a.description) allActivities.push(a); });
  });
  const activityByStatus: Record<string, number> = {};
  allActivities.forEach(a => {
    const s = a.status || "Unknown";
    activityByStatus[s] = (activityByStatus[s] || 0) + 1;
  });

  const workingDays = reports.filter(r => r.isWorkingDay).length;

  return (
    <div className="space-y-4" data-testid="slide-weekly-report">
      <div>
        <h2 className="text-2xl font-bold">Last Week Report</h2>
        <p className="text-muted-foreground text-sm">{weekStart} — {weekEnd}</p>
      </div>

      {reports.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No approved daily reports found for last week.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="py-3 px-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Reports</p>
              <p className="text-2xl font-bold">{reports.length}</p>
              <p className="text-xs text-muted-foreground">{workingDays} working days</p>
            </CardContent></Card>
            <Card><CardContent className="py-3 px-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Workers</p>
              <p className="text-2xl font-bold">{totalWorkers.toLocaleString()}</p>
            </CardContent></Card>
            <Card><CardContent className="py-3 px-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Progress</p>
              <p className="text-2xl font-bold">{avgProgress}%</p>
            </CardContent></Card>
            <Card><CardContent className="py-3 px-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Incidents</p>
              <p className="text-2xl font-bold">{totalSafety + totalSecurity}</p>
              <p className="text-xs text-muted-foreground">{totalSafety} safety · {totalSecurity} security</p>
            </CardContent></Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-sm font-semibold">Labour by Trade</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3">
                {topTrades.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">No labour data</p>
                ) : (
                  <div className="space-y-1.5">
                    {topTrades.map(([trade, count]) => (
                      <div key={trade} className="flex items-center justify-between text-sm">
                        <span className="truncate mr-2">{trade}</span>
                        <span className="font-semibold tabular-nums">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-sm font-semibold">Activities Summary</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3">
                {allActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">No activities recorded</p>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span>Total Activities</span>
                      <span className="font-semibold">{allActivities.length}</span>
                    </div>
                    {Object.entries(activityByStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between text-sm">
                        <span className="truncate mr-2 text-muted-foreground capitalize">{status}</span>
                        <span className="font-semibold tabular-nums">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function WeeklyPlanSlide({ plan, weekStart, weekEnd }: { plan: WeeklyPlan | null; weekStart: string; weekEnd: string }) {
  const activities = (plan?.plannedActivities as any[]) || [];
  const labour = (plan?.plannedLabour as any[]) || [];
  const milestones = (plan?.milestones as any[]) || [];
  const subcontractors = (plan?.plannedSubcontractors as any[]) || [];
  const totalPlannedWorkers = labour.reduce((s: number, l: any) => s + (l.plannedCount || 0), 0);

  return (
    <div className="space-y-4" data-testid="slide-weekly-plan">
      <div>
        <h2 className="text-2xl font-bold">This Week Plan</h2>
        <p className="text-muted-foreground text-sm">
          {weekStart} — {weekEnd}
          {plan ? ` · Week ${plan.weekNumber}` : ""}
        </p>
      </div>

      {!plan ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No approved weekly plan found for this week.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="py-3 px-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Activities</p>
              <p className="text-2xl font-bold">{activities.length}</p>
            </CardContent></Card>
            <Card><CardContent className="py-3 px-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Planned Workers</p>
              <p className="text-2xl font-bold">{totalPlannedWorkers}</p>
            </CardContent></Card>
            <Card><CardContent className="py-3 px-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Subcontractors</p>
              <p className="text-2xl font-bold">{subcontractors.length}</p>
            </CardContent></Card>
            <Card><CardContent className="py-3 px-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Milestones</p>
              <p className="text-2xl font-bold">{milestones.length}</p>
            </CardContent></Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-sm font-semibold">Planned Activities</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3">
                {activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">No activities planned</p>
                ) : (
                  <div className="space-y-2">
                    {activities.map((a: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Badge variant={a.priority === "High" ? "destructive" : a.priority === "Low" ? "secondary" : "outline"} className="text-[10px] shrink-0 mt-0.5">{a.priority}</Badge>
                        <div className="min-w-0">
                          <span className="font-medium">{a.trade}</span>
                          {a.description && <span className="text-muted-foreground"> — {a.description}</span>}
                          {a.targetPercent > 0 && <span className="text-muted-foreground ml-1">({a.targetPercent}%)</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-sm font-semibold">Labour Plan</CardTitle></CardHeader>
                <CardContent className="px-4 pb-3">
                  {labour.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No labour planned</p>
                  ) : (
                    <div className="space-y-1.5">
                      {labour.map((l: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="truncate mr-2">{l.trade}</span>
                          <span className="font-semibold tabular-nums">{l.plannedCount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {milestones.length > 0 && (
                <Card>
                  <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-sm font-semibold">Milestones</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="space-y-1.5">
                      {milestones.map((m: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm gap-2">
                          <span className="truncate">{m.description}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground">{m.targetDate}</span>
                            <Badge variant={m.status === "Completed" ? "default" : m.status === "In Progress" ? "outline" : "secondary"} className="text-[10px]">{m.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {plan.notes && (
            <Card>
              <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-sm font-semibold">Notes</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-sm whitespace-pre-wrap">{plan.notes}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ProjectPhotosSlide({ project: p }: { project: Project }) {
  const photos = (p.photos as string[]) ?? [];
  if (photos.length === 0) return null;

  return (
    <div className="space-y-6" data-testid={`slide-photos-${p.id}`}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-mono text-muted-foreground font-semibold">{p.code}</span>
          <Badge variant={p.status === "active" ? "default" : p.status === "completed" ? "outline" : "secondary"} className="capitalize">{p.status}</Badge>
        </div>
        <h2 className="text-3xl font-bold">{p.name}</h2>
        <p className="text-muted-foreground">Site Photos</p>
      </div>

      <Card>
        <CardContent className="py-4 px-5">
          <PhotoGrid
            photos={photos}
            canEdit={false}
            maxPhotos={20}
            defaultVisible={20}
            thumbWidth={200}
            thumbHeight={150}
            testIdPrefix={`steering-photo-${p.id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}

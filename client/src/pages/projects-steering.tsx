import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
import type { Project, User as UserType, DirectCostDetails, IndirectCostDetails } from "@shared/schema";
import { DIRECT_COST_LABELS, INDIRECT_COST_LABELS } from "@shared/schema";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

interface SlideInfo {
  type: "project-info" | "project-progress" | "project-operational" | "project-photos";
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

  const slides = useMemo<SlideInfo[]>(() => {
    if (!selectedProject) return [];
    const s: SlideInfo[] = [
      { type: "project-info", projectId: selectedProject.id, label: "Info" },
      { type: "project-progress", projectId: selectedProject.id, label: "Progress" },
    ];
    if (canViewOperational) {
      s.push({ type: "project-operational", projectId: selectedProject.id, label: "Operations" });
    }
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
                  {progress >= schedule ? "On Track" : `Behind by ${schedule - progress}%`}
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

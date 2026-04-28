import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Save, ListChecks } from "lucide-react";
import type { WeeklyPlan, Project, PlannedActivity } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";

export default function PlannedActivities() {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const canEdit = hasPermission("edit_save_weekly_plan");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [activities, setActivities] = useState<PlannedActivity[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: plans, isLoading } = useQuery<WeeklyPlan[]>({ queryKey: ["/api/weekly-plans"] });

  const filteredPlans = useMemo(() => {
    const list = plans || [];
    const sorted = [...list].sort((a, b) => (b.weekStartDate > a.weekStartDate ? 1 : -1));
    return selectedProject === "all" ? sorted : sorted.filter(p => p.projectId === Number(selectedProject));
  }, [plans, selectedProject]);

  useEffect(() => {
    if (!selectedPlanId && filteredPlans.length > 0) {
      setSelectedPlanId(String(filteredPlans[0].id));
    }
    if (selectedPlanId && !filteredPlans.find(p => String(p.id) === selectedPlanId)) {
      setSelectedPlanId(filteredPlans.length > 0 ? String(filteredPlans[0].id) : "");
    }
  }, [filteredPlans, selectedPlanId]);

  const selectedPlan = useMemo(
    () => (plans || []).find(p => String(p.id) === selectedPlanId),
    [plans, selectedPlanId]
  );

  useEffect(() => {
    if (selectedPlan) {
      const planActivities = (selectedPlan.plannedActivities as PlannedActivity[]) || [];
      setActivities(planActivities.map(a => ({ ...a, actualPercent: a.actualPercent ?? 0 })));
    } else {
      setActivities([]);
    }
  }, [selectedPlan]);

  const projectName = useMemo(() => {
    if (!selectedPlan || !projects) return "—";
    return projects.find(p => p.id === selectedPlan.projectId)?.name || "—";
  }, [selectedPlan, projects]);

  const updateActual = (i: number, raw: string) => {
    const trimmed = raw.trim();
    const parsed = trimmed === "" ? 0 : parseFloat(trimmed);
    const safe = Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
    setActivities(arr => arr.map((a, idx) => (idx === i ? { ...a, actualPercent: safe } : a)));
  };

  const handleSave = async () => {
    if (!selectedPlan) return;
    setSaving(true);
    try {
      const actuals = activities.map((a, index) => ({
        index,
        actualPercent: Number.isFinite(a.actualPercent) ? Math.max(0, Math.min(100, Number(a.actualPercent))) : 0,
      }));
      await apiRequest("POST", `/api/weekly-plans/${selectedPlan.id}/actual-progress`, { actuals });
      await queryClient.invalidateQueries({ queryKey: ["/api/weekly-plans"] });
      toast({ title: "Actual progress saved" });
    } catch (err: any) {
      const msg = err?.message?.replace(/^\d+:\s*/, "").replace(/[{}"]/g, "").replace(/message:/, "").trim();
      toast({ title: "Failed to save", description: msg || "Please try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    if (activities.length === 0) return { avgTarget: 0, avgActual: 0, variance: 0 };
    const avgTarget = Math.round(activities.reduce((s, a) => s + (a.targetPercent || 0), 0) / activities.length);
    const avgActual = Math.round(activities.reduce((s, a) => s + (a.actualPercent || 0), 0) / activities.length);
    return { avgTarget, avgActual, variance: avgActual - avgTarget };
  }, [activities]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="planned-activities-page">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planned Activities</h1>
          <p className="text-sm text-muted-foreground">Track actual progress against the weekly plan</p>
        </div>
        {canEdit && selectedPlan && (
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-actuals">
            <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save Progress"}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Project</label>
              <Select value={selectedProject} onValueChange={(v) => { setSelectedProject(v); setSelectedPlanId(""); }}>
                <SelectTrigger data-testid="select-project"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {(projects || []).map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Weekly Plan</label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={filteredPlans.length === 0}>
                <SelectTrigger data-testid="select-weekly-plan">
                  <SelectValue placeholder={filteredPlans.length === 0 ? "No weekly plans" : "Select a week"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredPlans.map(p => {
                    const proj = projects?.find(pr => pr.id === p.projectId);
                    return (
                      <SelectItem key={p.id} value={String(p.id)}>
                        Week {p.weekNumber} ({p.weekStartDate} → {p.weekEndDate}){selectedProject === "all" && proj ? ` · ${proj.name}` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedPlan ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListChecks className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Select a weekly plan to view planned activities</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Project</p>
                <p className="text-sm font-semibold truncate" data-testid="text-project-name">{projectName}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Week</p>
                <p className="text-sm font-semibold" data-testid="text-week-info">
                  Week {selectedPlan.weekNumber}
                </p>
                <p className="text-xs text-muted-foreground">{selectedPlan.weekStartDate} → {selectedPlan.weekEndDate}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Avg Target / Actual</p>
                <p className="text-sm font-semibold" data-testid="text-avg-progress">
                  {summary.avgTarget}% / {summary.avgActual}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Variance</p>
                <p className={`text-sm font-semibold ${summary.variance < 0 ? "text-destructive" : "text-chart-4"}`} data-testid="text-variance">
                  {summary.variance > 0 ? "+" : ""}{summary.variance}%
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" /> Activities ({activities.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No planned activities for this week</p>
              ) : (
                <div className="space-y-2">
                  <div className="hidden md:grid grid-cols-[1fr_2.5fr_100px_110px_120px] gap-3 px-2 pb-2 text-xs font-medium text-muted-foreground border-b">
                    <span>Trade</span>
                    <span>Description</span>
                    <span>Target %</span>
                    <span>Priority</span>
                    <span>Actual %</span>
                  </div>
                  {activities.map((a, i) => {
                    const variance = (a.actualPercent ?? 0) - (a.targetPercent || 0);
                    return (
                      <div
                        key={i}
                        className="grid grid-cols-1 md:grid-cols-[1fr_2.5fr_100px_110px_120px] gap-3 items-center px-2 py-2 rounded-md border md:border-0 md:border-b last:border-b-0"
                        data-testid={`activity-row-${i}`}
                      >
                        <div className="text-sm font-medium" data-testid={`text-trade-${i}`}>{a.trade || "—"}</div>
                        <div className="text-sm text-muted-foreground" data-testid={`text-description-${i}`}>{a.description || "—"}</div>
                        <div>
                          <Badge variant="outline" data-testid={`badge-target-${i}`}>{a.targetPercent || 0}%</Badge>
                        </div>
                        <div>
                          <Badge
                            variant={a.priority === "High" ? "destructive" : a.priority === "Low" ? "secondary" : "default"}
                            className="text-xs"
                            data-testid={`badge-priority-${i}`}
                          >
                            {a.priority || "—"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={a.actualPercent ?? 0}
                            onChange={e => updateActual(i, e.target.value)}
                            disabled={!canEdit}
                            className="h-8"
                            data-testid={`input-actual-${i}`}
                          />
                          {a.actualPercent !== undefined && (
                            <span
                              className={`text-xs shrink-0 ${variance < 0 ? "text-destructive" : variance > 0 ? "text-chart-4" : "text-muted-foreground"}`}
                              data-testid={`text-row-variance-${i}`}
                            >
                              {variance > 0 ? "+" : ""}{variance}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

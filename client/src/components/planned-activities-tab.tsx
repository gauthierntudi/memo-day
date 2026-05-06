import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Target, Save, Info } from "lucide-react";
import type { WeeklyPlan, PlannedActivity } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";

interface PlannedActivitiesTabProps {
  projectId: number;
  reportDate: string;
}

export function PlannedActivitiesTab({ projectId, reportDate }: PlannedActivitiesTabProps) {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const canEdit = hasPermission("edit_save_daily_report");
  const [activities, setActivities] = useState<PlannedActivity[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: plans, isLoading } = useQuery<WeeklyPlan[]>({ queryKey: ["/api/weekly-plans"] });

  const matchedPlan = useMemo(() => {
    if (!plans || !projectId || !reportDate) return undefined;
    return plans.find(
      p => p.projectId === projectId && p.weekStartDate <= reportDate && p.weekEndDate >= reportDate
    );
  }, [plans, projectId, reportDate]);

  useEffect(() => {
    if (matchedPlan) {
      const planActivities = (matchedPlan.plannedActivities as PlannedActivity[]) || [];
      setActivities(planActivities.map(a => ({ ...a, actualPercent: a.actualPercent ?? 0 })));
    } else {
      setActivities([]);
    }
  }, [matchedPlan]);

  const updateActual = (i: number, raw: string) => {
    const trimmed = raw.trim();
    const parsed = trimmed === "" ? 0 : parseFloat(trimmed);
    const safe = Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
    setActivities(arr => arr.map((a, idx) => (idx === i ? { ...a, actualPercent: safe } : a)));
  };

  const handleSave = async () => {
    if (!matchedPlan) return;
    setSaving(true);
    try {
      const actuals = activities.map((a, index) => ({
        index,
        actualPercent: Number.isFinite(a.actualPercent) ? Math.max(0, Math.min(100, Number(a.actualPercent))) : 0,
      }));
      await apiRequest("POST", `/api/weekly-plans/${matchedPlan.id}/actual-progress`, { actuals });
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
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading planned activities…</CardContent>
      </Card>
    );
  }

  if (!projectId) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-3 text-sm text-muted-foreground" data-testid="planned-activities-no-project">
          <Info className="h-4 w-4 shrink-0" />
          <span>Select a project on the General tab to see planned activities for this week.</span>
        </CardContent>
      </Card>
    );
  }

  if (!matchedPlan) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-3 text-sm text-muted-foreground" data-testid="planned-activities-no-plan">
          <Info className="h-4 w-4 shrink-0" />
          <span>No weekly plan found for this project covering {reportDate}.</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="planned-activities-tab">
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Week</p>
              <p className="text-sm font-semibold" data-testid="text-pa-week">Week {matchedPlan.weekNumber}</p>
              <p className="text-xs text-muted-foreground">{matchedPlan.weekStartDate} → {matchedPlan.weekEndDate}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plan Status</p>
              <Badge
                variant={matchedPlan.status === "approved" ? "default" : matchedPlan.status === "rejected" ? "destructive" : matchedPlan.status === "submitted" ? "secondary" : "outline"}
                className={`text-xs ${matchedPlan.status === "approved" ? "bg-green-600" : ""}`}
                data-testid="badge-pa-plan-status"
              >
                {matchedPlan.status.charAt(0).toUpperCase() + matchedPlan.status.slice(1)}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Target / Actual</p>
              <p className="text-sm font-semibold" data-testid="text-pa-avg">{summary.avgTarget}% / {summary.avgActual}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Variance</p>
              <p className={`text-sm font-semibold ${summary.variance < 0 ? "text-destructive" : "text-chart-4"}`} data-testid="text-pa-variance">
                {summary.variance > 0 ? "+" : ""}{summary.variance}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" /> Planned Activities ({activities.length})
          </CardTitle>
          {canEdit && activities.length > 0 && (
            <Button size="sm" onClick={handleSave} disabled={saving} data-testid="button-save-actuals">
              <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save Progress"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No planned activities for this week</p>
          ) : (
            <div className="space-y-2">
              <div className="hidden md:grid grid-cols-[1fr_2.5fr_100px_110px_140px] gap-3 px-2 pb-2 text-xs font-medium text-muted-foreground border-b">
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
                    className="grid grid-cols-1 md:grid-cols-[1fr_2.5fr_100px_110px_140px] gap-3 items-center px-2 py-2 rounded-md border md:border-0 md:border-b last:border-b-0"
                    data-testid={`pa-activity-row-${i}`}
                  >
                    <div className="text-sm font-medium" data-testid={`pa-text-trade-${i}`}>{a.trade || "—"}</div>
                    <div className="text-sm text-muted-foreground" data-testid={`pa-text-description-${i}`}>{a.description || "—"}</div>
                    <div>
                      <Badge variant="outline" data-testid={`pa-badge-target-${i}`}>{a.targetPercent || 0}%</Badge>
                    </div>
                    <div>
                      <Badge
                        variant={a.priority === "High" ? "destructive" : a.priority === "Low" ? "secondary" : "default"}
                        className="text-xs"
                        data-testid={`pa-badge-priority-${i}`}
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
                        data-testid={`pa-input-actual-${i}`}
                      />
                      <span
                        className={`text-xs shrink-0 w-10 text-right ${variance < 0 ? "text-destructive" : variance > 0 ? "text-chart-4" : "text-muted-foreground"}`}
                        data-testid={`pa-text-row-variance-${i}`}
                      >
                        {variance > 0 ? "+" : ""}{variance}%
                      </span>
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

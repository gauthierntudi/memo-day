import { useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Target, Info } from "lucide-react";
import type { WeeklyPlan, PlannedActivity, DailyReport, PlannedActivityActual } from "@shared/schema";
import { usePermissions } from "@/hooks/use-permissions";

interface PlannedActivitiesTabProps {
  projectId: number;
  reportDate: string;
  currentReportId?: number;
  value: PlannedActivityActual[];
  onChange: (v: PlannedActivityActual[]) => void;
}

export function PlannedActivitiesTab({ projectId, reportDate, currentReportId, value, onChange }: PlannedActivitiesTabProps) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("edit_save_daily_report");

  const { data: plans, isLoading } = useQuery<WeeklyPlan[]>({ queryKey: ["/api/weekly-plans"] });
  const { data: reports } = useQuery<DailyReport[]>({ queryKey: ["/api/daily-reports"] });

  const matchedPlan = useMemo(() => {
    if (!plans || !projectId || !reportDate) return undefined;
    return plans.find(
      p => p.projectId === projectId && p.weekStartDate <= reportDate && p.weekEndDate >= reportDate
    );
  }, [plans, projectId, reportDate]);

  const activities = useMemo<PlannedActivity[]>(() => {
    if (!matchedPlan) return [];
    return (matchedPlan.plannedActivities as PlannedActivity[]) || [];
  }, [matchedPlan]);

  // Floor per activity index = max actualPercent across PRIOR daily reports for same project+week (excluding self)
  const floors = useMemo<number[]>(() => {
    if (!matchedPlan || !reports || activities.length === 0) return activities.map(() => 0);
    const prior = reports.filter(
      r =>
        r.projectId === projectId &&
        r.reportDate >= matchedPlan.weekStartDate &&
        r.reportDate < reportDate &&
        r.id !== currentReportId
    );
    return activities.map((_, i) => {
      let max = 0;
      for (const r of prior) {
        const arr = (r.plannedActivitiesActuals as PlannedActivityActual[]) || [];
        const found = arr.find(a => a.index === i);
        if (found && Number.isFinite(found.actualPercent) && found.actualPercent > max) {
          max = found.actualPercent;
        }
      }
      return max;
    });
  }, [matchedPlan, reports, activities, projectId, reportDate, currentReportId]);

  const hasPriorInWeek = useMemo(() => {
    if (!matchedPlan || !reports) return false;
    return reports.some(
      r =>
        r.projectId === projectId &&
        r.reportDate >= matchedPlan.weekStartDate &&
        r.reportDate < reportDate &&
        r.id !== currentReportId
    );
  }, [reports, matchedPlan, projectId, reportDate, currentReportId]);

  const valueByIndex = useMemo(() => {
    const m = new Map<number, number>();
    for (const v of value || []) m.set(v.index, v.actualPercent);
    return m;
  }, [value]);

  // Initialize snapshot when activities/floors change. For new reports, reseed
  // when plan context changes (project/date) to drop stale values from a prior plan.
  // For edit mode, only seed when the snapshot is empty (preserve persisted values).
  const initKeyRef = useRef<string>("");
  useEffect(() => {
    if (!matchedPlan || activities.length === 0) return;
    const key = `${matchedPlan.id}|${activities.length}|${currentReportId ?? "new"}`;
    if (initKeyRef.current === key) return;
    initKeyRef.current = key;
    const isNew = currentReportId === undefined;
    if (isNew || (value || []).length === 0) {
      const seeded = activities.map((_, i) => ({ index: i, actualPercent: floors[i] ?? 0 }));
      onChange(seeded);
    }
  }, [matchedPlan, activities, floors, currentReportId, value, onChange]);

  const updateActual = (i: number, raw: string) => {
    const trimmed = raw.trim();
    const parsed = trimmed === "" ? 0 : parseFloat(trimmed);
    const floor = floors[i] ?? 0;
    const safe = Number.isFinite(parsed) ? Math.max(floor, Math.min(100, parsed)) : floor;
    const existing = value || [];
    const idx = existing.findIndex(v => v.index === i);
    let next: PlannedActivityActual[];
    if (idx >= 0) {
      next = existing.map((v, k) => (k === idx ? { index: i, actualPercent: safe } : v));
    } else {
      next = [...existing, { index: i, actualPercent: safe }];
    }
    onChange(next);
  };

  const summary = useMemo(() => {
    if (activities.length === 0) return { avgTarget: 0, avgActual: 0, variance: 0 };
    const avgTarget = Math.round(activities.reduce((s, a) => s + (a.targetPercent || 0), 0) / activities.length);
    const avgActual = Math.round(
      activities.reduce((s, _a, i) => s + (valueByIndex.get(i) ?? floors[i] ?? 0), 0) / activities.length
    );
    return { avgTarget, avgActual, variance: avgActual - avgTarget };
  }, [activities, valueByIndex, floors]);

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
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" /> Planned Activities ({activities.length})
          </CardTitle>
        </CardHeader>
        {hasPriorInWeek && activities.length > 0 && (
          <div className="px-6 -mt-2 pb-2">
            <p className="text-xs text-muted-foreground flex items-start gap-2" data-testid="pa-prior-day-notice">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Actuals are pre-filled from the previous day's report and can only be increased (progress cannot go backwards within the week). Values are saved with this daily report only — earlier days remain unchanged.
            </p>
          </div>
        )}
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
                const actual = valueByIndex.get(i) ?? floors[i] ?? 0;
                const variance = actual - (a.targetPercent || 0);
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
                        min={floors[i] ?? 0}
                        max={100}
                        value={actual}
                        onChange={e => updateActual(i, e.target.value)}
                        disabled={!canEdit}
                        className="h-8"
                        data-testid={`pa-input-actual-${i}`}
                        title={hasPriorInWeek ? `Cannot be less than previous day's value (${floors[i] ?? 0}%)` : undefined}
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

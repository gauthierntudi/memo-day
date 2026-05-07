import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Save, Info } from "lucide-react";
import type { WeeklyPlan, PlannedLabour } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";

interface PlannedLabourTabProps {
  projectId: number;
  reportDate: string;
  onActualTotalChange?: (total: number) => void;
}

export function PlannedLabourTab({ projectId, reportDate, onActualTotalChange }: PlannedLabourTabProps) {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const canEdit = hasPermission("edit_save_daily_report");
  const [labour, setLabour] = useState<PlannedLabour[]>([]);
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
      const planLabour = (matchedPlan.plannedLabour as PlannedLabour[]) || [];
      setLabour(planLabour.map(l => ({ ...l, actualCount: l.actualCount ?? 0 })));
    } else {
      setLabour([]);
    }
  }, [matchedPlan]);

  const updateActual = (i: number, raw: string) => {
    const trimmed = raw.trim();
    const parsed = trimmed === "" ? 0 : parseFloat(trimmed);
    const safe = Number.isFinite(parsed) ? Math.max(0, Math.min(100000, parsed)) : 0;
    setLabour(arr => arr.map((l, idx) => (idx === i ? { ...l, actualCount: safe } : l)));
  };

  const handleSave = async () => {
    if (!matchedPlan) return;
    setSaving(true);
    try {
      const actuals = labour.map((l, index) => ({
        index,
        actualCount: Number.isFinite(l.actualCount) ? Math.max(0, Math.min(100000, Number(l.actualCount))) : 0,
      }));
      await apiRequest("POST", `/api/weekly-plans/${matchedPlan.id}/actual-labour`, { actuals });
      await queryClient.invalidateQueries({ queryKey: ["/api/weekly-plans"] });
      toast({ title: "Actual labour saved" });
    } catch (err: any) {
      const msg = err?.message?.replace(/^\d+:\s*/, "").replace(/[{}"]/g, "").replace(/message:/, "").trim();
      toast({ title: "Failed to save", description: msg || "Please try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    if (labour.length === 0) return { totalPlanned: 0, totalActual: 0, variance: 0 };
    const totalPlanned = labour.reduce((s, l) => s + (l.plannedCount || 0), 0);
    const totalActual = labour.reduce((s, l) => s + (l.actualCount || 0), 0);
    return { totalPlanned, totalActual, variance: totalActual - totalPlanned };
  }, [labour]);

  useEffect(() => {
    onActualTotalChange?.(summary.totalActual);
  }, [summary.totalActual, onActualTotalChange]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading planned labour…</CardContent>
      </Card>
    );
  }

  if (!projectId) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-3 text-sm text-muted-foreground" data-testid="planned-labour-no-project">
          <Info className="h-4 w-4 shrink-0" />
          <span>Select a project on the General tab to see planned labour for this week.</span>
        </CardContent>
      </Card>
    );
  }

  if (!matchedPlan) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-3 text-sm text-muted-foreground" data-testid="planned-labour-no-plan">
          <Info className="h-4 w-4 shrink-0" />
          <span>No weekly plan found for this project covering {reportDate}.</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="planned-labour-tab">
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Week</p>
              <p className="text-sm font-semibold" data-testid="text-pl-week">Week {matchedPlan.weekNumber}</p>
              <p className="text-xs text-muted-foreground">{matchedPlan.weekStartDate} → {matchedPlan.weekEndDate}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plan Status</p>
              <Badge
                variant={matchedPlan.status === "approved" ? "default" : matchedPlan.status === "rejected" ? "destructive" : matchedPlan.status === "submitted" ? "secondary" : "outline"}
                className={`text-xs ${matchedPlan.status === "approved" ? "bg-green-600" : ""}`}
                data-testid="badge-pl-plan-status"
              >
                {matchedPlan.status.charAt(0).toUpperCase() + matchedPlan.status.slice(1)}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Planned / Actual</p>
              <p className="text-sm font-semibold" data-testid="text-pl-totals">{summary.totalPlanned} / {summary.totalActual}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Variance</p>
              <p className={`text-sm font-semibold ${summary.variance < 0 ? "text-destructive" : "text-chart-4"}`} data-testid="text-pl-variance">
                {summary.variance > 0 ? "+" : ""}{summary.variance}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Planned Labour ({labour.length})
          </CardTitle>
          {canEdit && labour.length > 0 && (
            <Button size="sm" onClick={handleSave} disabled={saving} data-testid="button-save-actual-labour">
              <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save Actuals"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {labour.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No planned labour for this week</p>
          ) : (
            <div className="space-y-2">
              <div className="hidden md:grid grid-cols-[1fr_120px_140px_100px] gap-3 px-2 pb-2 text-xs font-medium text-muted-foreground border-b">
                <span>Trade</span>
                <span>Planned Workers</span>
                <span>Actual Workers</span>
                <span>Variance</span>
              </div>
              {labour.map((l, i) => {
                const variance = (l.actualCount ?? 0) - (l.plannedCount || 0);
                return (
                  <div
                    key={i}
                    className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px_100px] gap-3 items-center px-2 py-2 rounded-md border md:border-0 md:border-b last:border-b-0"
                    data-testid={`pl-labour-row-${i}`}
                  >
                    <div className="text-sm font-medium" data-testid={`pl-text-trade-${i}`}>{l.trade || "—"}</div>
                    <div>
                      <Badge variant="outline" data-testid={`pl-badge-planned-${i}`}>{l.plannedCount || 0}</Badge>
                    </div>
                    <div>
                      <Input
                        type="number"
                        min={0}
                        value={l.actualCount ?? 0}
                        onChange={e => updateActual(i, e.target.value)}
                        disabled={!canEdit}
                        className="h-8"
                        data-testid={`pl-input-actual-${i}`}
                      />
                    </div>
                    <div>
                      <span
                        className={`text-xs ${variance < 0 ? "text-destructive" : variance > 0 ? "text-chart-4" : "text-muted-foreground"}`}
                        data-testid={`pl-text-row-variance-${i}`}
                      >
                        {variance > 0 ? "+" : ""}{variance}
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

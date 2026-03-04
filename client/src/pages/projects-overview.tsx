import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Activity, BarChart3, AlertTriangle, CheckCircle2, Target, Building2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#2563eb", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

function fmt$(v: number | null | undefined) {
  if (v == null) return "—";
  return "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtPct(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toFixed(v % 1 === 0 ? 0 : 1) + "%";
}

function fmtIdx(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toFixed(2);
}

function KpiCard({ title, value, subtitle, icon: Icon, trend, color }: {
  title: string; value: string; subtitle?: string;
  icon: typeof TrendingUp; trend?: "up" | "down" | "neutral"; color?: string;
}) {
  return (
    <Card data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold mt-1" style={color ? { color } : {}}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className="rounded-lg p-2 bg-muted/50 shrink-0">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


export default function ProjectsOverview() {
  const { data: projects, isLoading } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const all = projects ?? [];
  const active = all.filter(p => p.status === "active");
  const completed = all.filter(p => p.status === "completed");
  const onHold = all.filter(p => p.status === "on_hold");

  const owned = all.filter(p => p.clientType === "Own");
  const external = all.filter(p => p.clientType !== "Own");

  function calcGP(cv: number, cost: number) {
    return cv !== 0 ? ((cv - cost) / cv) * 100 : null;
  }

  const budgetProjects = all.filter(p => p.projectValue != null && p.budgetedCost != null);
  const hasBudgetData = budgetProjects.length > 0;
  const totalBudgetContractValue = budgetProjects.reduce((s, p) => s + (p.projectValue ?? 0), 0);
  const totalBudgetedCost = budgetProjects.reduce((s, p) => s + (p.budgetedCost ?? 0), 0);
  const budgetedGP = calcGP(totalBudgetContractValue, totalBudgetedCost);
  const ownBudgetProjects = budgetProjects.filter(p => p.clientType === "Own");
  const ownBudgetCV = ownBudgetProjects.reduce((s, p) => s + (p.projectValue ?? 0), 0);
  const ownBudgetCost = ownBudgetProjects.reduce((s, p) => s + (p.budgetedCost ?? 0), 0);
  const ownBudgetGP = ownBudgetProjects.length > 0 ? calcGP(ownBudgetCV, ownBudgetCost) : null;
  const extBudgetProjects = budgetProjects.filter(p => p.clientType !== "Own");
  const extBudgetCV = extBudgetProjects.reduce((s, p) => s + (p.projectValue ?? 0), 0);
  const extBudgetCost = extBudgetProjects.reduce((s, p) => s + (p.budgetedCost ?? 0), 0);
  const extBudgetGP = extBudgetProjects.length > 0 ? calcGP(extBudgetCV, extBudgetCost) : null;

  const updatedProjects = all.filter(p => (p.updatedProjectValue ?? p.projectValue) != null && (p.updatedCost ?? p.budgetedCost) != null);
  const hasUpdatedData = updatedProjects.length > 0;
  const totalUpdatedContractValue = updatedProjects.reduce((s, p) => s + (p.updatedProjectValue ?? p.projectValue ?? 0), 0);
  const totalUpdatedCost = updatedProjects.reduce((s, p) => s + (p.updatedCost ?? p.budgetedCost ?? 0), 0);
  const updatedGP = calcGP(totalUpdatedContractValue, totalUpdatedCost);
  const ownUpdProjects = updatedProjects.filter(p => p.clientType === "Own");
  const ownUpdCV = ownUpdProjects.reduce((s, p) => s + (p.updatedProjectValue ?? p.projectValue ?? 0), 0);
  const ownUpdCost = ownUpdProjects.reduce((s, p) => s + (p.updatedCost ?? p.budgetedCost ?? 0), 0);
  const ownUpdGP = ownUpdProjects.length > 0 ? calcGP(ownUpdCV, ownUpdCost) : null;
  const extUpdProjects = updatedProjects.filter(p => p.clientType !== "Own");
  const extUpdCV = extUpdProjects.reduce((s, p) => s + (p.updatedProjectValue ?? p.projectValue ?? 0), 0);
  const extUpdCost = extUpdProjects.reduce((s, p) => s + (p.updatedCost ?? p.budgetedCost ?? 0), 0);
  const extUpdGP = extUpdProjects.length > 0 ? calcGP(extUpdCV, extUpdCost) : null;

  const currentProjects = all.filter(p => (p.billedAmount != null || p.unbilledAmount != null) && (p.actualDirectCost != null || p.actualIndirectCost != null));
  const totalContractValue = all.reduce((s, p) => s + (p.updatedProjectValue ?? p.projectValue ?? 0), 0);
  const totalBilled = all.reduce((s, p) => s + (p.billedAmount ?? 0), 0);
  const totalEarnedValue = currentProjects.reduce((s, p) => s + (p.billedAmount ?? 0) + (p.unbilledAmount ?? 0), 0);
  const totalActualCost = currentProjects.reduce((s, p) => s + (p.actualDirectCost ?? 0) + (p.actualIndirectCost ?? 0), 0);
  const totalCostVariance = totalEarnedValue - totalActualCost;
  const hasCurrentData = currentProjects.length > 0;
  const currentGP = calcGP(totalEarnedValue, totalActualCost);
  const ownCurProjects = currentProjects.filter(p => p.clientType === "Own");
  const ownCurEV = ownCurProjects.reduce((s, p) => s + (p.billedAmount ?? 0) + (p.unbilledAmount ?? 0), 0);
  const ownCurCost = ownCurProjects.reduce((s, p) => s + (p.actualDirectCost ?? 0) + (p.actualIndirectCost ?? 0), 0);
  const ownCurGP = ownCurProjects.length > 0 ? calcGP(ownCurEV, ownCurCost) : null;
  const extCurProjects = currentProjects.filter(p => p.clientType !== "Own");
  const extCurEV = extCurProjects.reduce((s, p) => s + (p.billedAmount ?? 0) + (p.unbilledAmount ?? 0), 0);
  const extCurCost = extCurProjects.reduce((s, p) => s + (p.actualDirectCost ?? 0) + (p.actualIndirectCost ?? 0), 0);
  const extCurGP = extCurProjects.length > 0 ? calcGP(extCurEV, extCurCost) : null;

  const projectsWithSpi = active.filter(p => p.spiIndex != null);
  const projectsWithCpi = active.filter(p => p.cpiIndex != null);
  const avgSpi = projectsWithSpi.length > 0 ? projectsWithSpi.reduce((s, p) => s + (p.spiIndex ?? 0), 0) / projectsWithSpi.length : null;
  const avgCpi = projectsWithCpi.length > 0 ? projectsWithCpi.reduce((s, p) => s + (p.cpiIndex ?? 0), 0) / projectsWithCpi.length : null;

  const avgProgress = active.length > 0 ? active.reduce((s, p) => s + (p.overallProgress ?? 0), 0) / active.length : 0;
  const avgSchedule = active.filter(p => p.schedulePercentage != null).length > 0
    ? active.filter(p => p.schedulePercentage != null).reduce((s, p) => s + (p.schedulePercentage ?? 0), 0) / active.filter(p => p.schedulePercentage != null).length : 0;

  const totalDelayDays = all.reduce((s, p) => s + (p.delayDays ?? 0), 0);
  const delayedProjects = all.filter(p => (p.delayDays ?? 0) > 0);

  const statusData = [
    { name: "Active", value: active.length, fill: "#10b981" },
    { name: "Completed", value: completed.length, fill: "#2563eb" },
    { name: "On Hold", value: onHold.length, fill: "#f59e0b" },
  ].filter(d => d.value > 0);

  const progressData = active
    .sort((a, b) => (b.overallProgress ?? 0) - (a.overallProgress ?? 0))
    .map(p => ({
      name: p.code || p.name.slice(0, 12),
      achieved: p.overallProgress ?? 0,
      planned: p.schedulePercentage ?? 0,
    }));

  const spiCpiData = active
    .filter(p => p.spiIndex != null || p.cpiIndex != null)
    .map(p => ({
      name: p.code || p.name.slice(0, 12),
      SPI: p.spiIndex ?? 0,
      CPI: p.cpiIndex ?? 0,
    }));

  const costData = active
    .filter(p => (p.billedAmount ?? 0) > 0 || (p.actualDirectCost ?? 0) > 0)
    .map(p => ({
      name: p.code || p.name.slice(0, 12),
      earnedValue: (p.billedAmount ?? 0) + (p.unbilledAmount ?? 0),
      actualCost: (p.actualDirectCost ?? 0) + (p.actualIndirectCost ?? 0),
      contractValue: p.updatedProjectValue ?? p.projectValue ?? 0,
    }));

  const clientTypeData = (() => {
    const counts: Record<string, number> = {};
    all.forEach(p => { counts[p.clientType] = (counts[p.clientType] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const overallHealth = (() => {
    if (avgSpi == null && avgCpi == null) return { label: "Insufficient Data", color: "text-muted-foreground", bg: "bg-muted" };
    const spiOk = avgSpi == null || avgSpi >= 0.95;
    const cpiOk = avgCpi == null || avgCpi >= 0.95;
    if (spiOk && cpiOk) return { label: "Healthy", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" };
    if ((avgSpi ?? 1) >= 0.85 && (avgCpi ?? 1) >= 0.85) return { label: "Needs Attention", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" };
    return { label: "At Risk", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" };
  })();

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto" data-testid="page-projects-overview">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Projects Overview</h1>
          <p className="text-sm text-muted-foreground">Portfolio performance indicators and analytics</p>
        </div>
        <div className={`px-4 py-2 rounded-lg ${overallHealth.bg}`} data-testid="badge-portfolio-health">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Portfolio Health</p>
          <p className={`text-lg font-bold ${overallHealth.color}`}>{overallHealth.label}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="section-kpi-cards">
        <KpiCard title="Total Projects" value={all.length.toString()} subtitle={`${active.length} active`} icon={Building2} />
        <KpiCard title="Portfolio Value" value={fmt$(totalContractValue)} subtitle={`Billed: ${fmt$(totalBilled)}`} icon={DollarSign} />
        <KpiCard title="Avg Progress" value={fmtPct(avgProgress)} subtitle={`Schedule: ${fmtPct(avgSchedule)}`} icon={Activity} />
        <KpiCard title="Avg SPI" value={fmtIdx(avgSpi)} subtitle={avgSpi != null ? (avgSpi >= 1 ? "On/Ahead of schedule" : "Behind schedule") : undefined} icon={TrendingUp} color={avgSpi != null ? (avgSpi >= 1 ? "#10b981" : "#ef4444") : undefined} />
        <KpiCard title="Avg CPI" value={fmtIdx(avgCpi)} subtitle={avgCpi != null ? (avgCpi >= 1 ? "Under budget" : "Over budget") : undefined} icon={TrendingDown} color={avgCpi != null ? (avgCpi >= 1 ? "#10b981" : "#ef4444") : undefined} />
        <KpiCard title="Cost Variance" value={fmt$(totalCostVariance)} subtitle={totalCostVariance >= 0 ? "Favorable" : "Unfavorable"} icon={DollarSign} color={totalCostVariance >= 0 ? "#10b981" : "#ef4444"} />
      </div>

      {(hasBudgetData || hasUpdatedData || hasCurrentData) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3" data-testid="section-gross-profit-cards">
          {hasBudgetData && (
            <Card data-testid="kpi-budget-gp">
              <CardContent className="py-3 px-4 space-y-2">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Budget</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contract Value:</span>
                  <span className="font-medium">{fmt$(totalBudgetContractValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Budgeted Cost:</span>
                  <span className="font-medium">{fmt$(totalBudgetedCost)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-1">
                  <span className="text-muted-foreground font-medium">Gross Profit:</span>
                  <span className={`text-lg font-bold ${budgetedGP != null && budgetedGP >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {budgetedGP != null ? `${budgetedGP.toFixed(1)}%` : "—"}
                  </span>
                </div>
                {(ownBudgetGP != null || extBudgetGP != null) ? (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    {ownBudgetGP != null && (
                      <span>Own: <span className={ownBudgetGP >= 0 ? "text-emerald-600" : "text-red-500"}>{ownBudgetGP.toFixed(1)}%</span></span>
                    )}
                    {extBudgetGP != null && (
                      <span>External: <span className={extBudgetGP >= 0 ? "text-emerald-600" : "text-red-500"}>{extBudgetGP.toFixed(1)}%</span></span>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
          {hasUpdatedData && (
            <Card data-testid="kpi-updated-gp">
              <CardContent className="py-3 px-4 space-y-2">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Updated Situation (At Completion)</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contract Value:</span>
                  <span className="font-medium">{fmt$(totalUpdatedContractValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="font-medium">{fmt$(totalUpdatedCost)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-1">
                  <span className="text-muted-foreground font-medium">Gross Profit:</span>
                  <span className={`text-lg font-bold ${updatedGP != null && updatedGP >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {updatedGP != null ? `${updatedGP.toFixed(1)}%` : "—"}
                  </span>
                </div>
                {(ownUpdGP != null || extUpdGP != null) ? (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    {ownUpdGP != null && (
                      <span>Own: <span className={ownUpdGP >= 0 ? "text-emerald-600" : "text-red-500"}>{ownUpdGP.toFixed(1)}%</span></span>
                    )}
                    {extUpdGP != null && (
                      <span>External: <span className={extUpdGP >= 0 ? "text-emerald-600" : "text-red-500"}>{extUpdGP.toFixed(1)}%</span></span>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
          {hasCurrentData && (
            <Card data-testid="kpi-current-gp">
              <CardContent className="py-3 px-4 space-y-2">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Current Situation</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Earned Value:</span>
                  <span className="font-medium">{fmt$(totalEarnedValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="font-medium">{fmt$(totalActualCost)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-1">
                  <span className="text-muted-foreground font-medium">Gross Profit:</span>
                  <span className={`text-lg font-bold ${currentGP != null && currentGP >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {currentGP != null ? `${currentGP.toFixed(1)}%` : "—"}
                  </span>
                </div>
                {(ownCurGP != null || extCurGP != null) ? (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    {ownCurGP != null && (
                      <span>Own: <span className={ownCurGP >= 0 ? "text-emerald-600" : "text-red-500"}>{ownCurGP.toFixed(1)}%</span></span>
                    )}
                    {extCurGP != null && (
                      <span>External: <span className={extCurGP >= 0 ? "text-emerald-600" : "text-red-500"}>{extCurGP.toFixed(1)}%</span></span>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card data-testid="section-portfolio-appreciation" className={overallHealth.bg}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Portfolio Performance Appreciation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Schedule Performance</h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {avgSpi != null ? (
                  avgSpi >= 1
                    ? `The portfolio is performing on or ahead of schedule with an average SPI of ${avgSpi.toFixed(2)}. ${active.length - projectsWithSpi.filter(p => (p.spiIndex ?? 0) < 1).length} out of ${projectsWithSpi.length} tracked projects are meeting schedule targets.`
                    : `The portfolio is behind schedule with an average SPI of ${avgSpi.toFixed(2)}. ${projectsWithSpi.filter(p => (p.spiIndex ?? 0) < 1).length} out of ${projectsWithSpi.length} tracked projects are falling behind schedule. Immediate attention is needed to recover lost time.`
                ) : "Insufficient schedule data to assess portfolio schedule performance. Ensure projects have schedule percentages and performance data entered."}
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Cost Performance</h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {avgCpi != null ? (
                  avgCpi >= 1
                    ? `The portfolio is under budget with an average CPI of ${avgCpi.toFixed(2)}. Total earned value of ${fmt$(totalEarnedValue)} against actual costs of ${fmt$(totalActualCost)} shows a favorable variance of ${fmt$(totalCostVariance)}.`
                    : `The portfolio is over budget with an average CPI of ${avgCpi.toFixed(2)}. Total earned value of ${fmt$(totalEarnedValue)} against actual costs of ${fmt$(totalActualCost)} shows an unfavorable variance of ${fmt$(Math.abs(totalCostVariance))}. Cost controls should be reviewed.`
                ) : "Insufficient cost data to assess portfolio cost performance. Ensure projects have billing and cost data entered."}
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Progress Overview</h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                The active portfolio of {active.length} project{active.length !== 1 ? "s" : ""} has an average progress of {avgProgress.toFixed(1)}%{avgSchedule > 0 ? ` against a planned schedule of ${avgSchedule.toFixed(1)}%` : ""}.
                {completed.length > 0 ? ` ${completed.length} project${completed.length > 1 ? "s have" : " has"} been completed.` : ""}
                {onHold.length > 0 ? ` ${onHold.length} project${onHold.length > 1 ? "s are" : " is"} currently on hold.` : ""}
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Delays & Risks</h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {delayedProjects.length > 0
                  ? `${delayedProjects.length} project${delayedProjects.length > 1 ? "s" : ""} reporting delays totaling ${totalDelayDays} days. Projects affected: ${delayedProjects.map(p => p.code || p.name).join(", ")}. Mitigation strategies should be evaluated for critical-path impacts.`
                  : "No projects are currently reporting delays. Continue monitoring schedule compliance to maintain this positive trend."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" data-testid="chart-progress-comparison">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4" /> Achieved vs Planned Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {progressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={progressData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} fontSize={11} />
                  <YAxis type="category" dataKey="name" width={60} fontSize={11} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Bar dataKey="planned" name="Planned %" fill="#f59e0b" opacity={0.4} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="achieved" name="Achieved %" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">No active projects with progress data</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-status-distribution">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" label={({ name, value }) => `${name}: ${value}`} fontSize={12}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">No projects</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="chart-spi-cpi">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> SPI & CPI by Project
            </CardTitle>
          </CardHeader>
          <CardContent>
            {spiCpiData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={spiCpiData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis domain={[0, "auto"]} fontSize={11} />
                  <Tooltip formatter={(v: number) => v.toFixed(2)} />
                  <Bar dataKey="SPI" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="CPI" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Legend />
                  {/* reference line at 1.0 */}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">No SPI/CPI data available</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-cost-analysis">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Cost Analysis by Project
            </CardTitle>
          </CardHeader>
          <CardContent>
            {costData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={costData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt$(v)} />
                  <Bar dataKey="contractValue" name="Contract Value" fill="#8b5cf6" opacity={0.3} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="earnedValue" name="Earned Value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actualCost" name="Actual Cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">No cost data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card data-testid="chart-client-type">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Projects by Client Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={clientTypeData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} fontSize={11}>
                  {clientTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="table-project-summary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Project Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[250px]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-1.5 px-2 font-medium">Project</th>
                    <th className="text-right py-1.5 px-2 font-medium">Progress</th>
                    <th className="text-right py-1.5 px-2 font-medium">SPI</th>
                    <th className="text-right py-1.5 px-2 font-medium">CPI</th>
                    <th className="text-right py-1.5 px-2 font-medium">Delay</th>
                    <th className="text-center py-1.5 px-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {all.map(p => (
                    <tr key={p.id} className="border-b border-muted/40 hover:bg-muted/30" data-testid={`row-project-${p.id}`}>
                      <td className="py-1.5 px-2 font-medium">{p.code || p.name.slice(0, 15)}</td>
                      <td className="text-right py-1.5 px-2">
                        <div className="flex items-center gap-1 justify-end">
                          <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(p.overallProgress ?? 0, 100)}%` }} />
                          </div>
                          <span>{fmtPct(p.overallProgress)}</span>
                        </div>
                      </td>
                      <td className="text-right py-1.5 px-2">
                        <span className={p.spiIndex != null ? (p.spiIndex >= 1 ? "text-emerald-600" : "text-red-500") : ""}>
                          {fmtIdx(p.spiIndex)}
                        </span>
                      </td>
                      <td className="text-right py-1.5 px-2">
                        <span className={p.cpiIndex != null ? (p.cpiIndex >= 1 ? "text-emerald-600" : "text-red-500") : ""}>
                          {fmtIdx(p.cpiIndex)}
                        </span>
                      </td>
                      <td className="text-right py-1.5 px-2">
                        {(p.delayDays ?? 0) > 0 ? (
                          <span className="text-amber-600">{p.delayDays}d</span>
                        ) : "—"}
                      </td>
                      <td className="text-center py-1.5 px-2">
                        <Badge variant={p.status === "active" ? "default" : p.status === "completed" ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0">
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}


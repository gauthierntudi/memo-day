import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Save, Send, Plus, Trash2, CalendarRange, Users, Target, Milestone as MilestoneIcon } from "lucide-react";
import type { Project, WeeklyPlan, PlannedActivity, PlannedLabour, PlannedSubcontractor, ProductivityTarget, Milestone } from "@shared/schema";
import { TRADES, PRIORITY_LEVELS } from "@shared/schema";

const emptyPlannedActivity: PlannedActivity = { trade: "", description: "", targetPercent: 0, priority: "Medium" };
const emptyPlannedLabour: PlannedLabour = { trade: "", plannedCount: 0 };
const emptyPlannedSub: PlannedSubcontractor = { company: "", specialty: "", plannedWorkers: 0, scope: "" };
const emptyTarget: ProductivityTarget = { trade: "", metric: "", target: 0, unit: "" };
const emptyMilestone: Milestone = { description: "", targetDate: "", status: "Pending" };

export default function WeeklyPlanForm() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isEdit = params.id && params.id !== "new";

  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: existing } = useQuery<WeeklyPlan>({
    queryKey: ["/api/weekly-plans", params.id],
    enabled: !!isEdit,
  });

  const [projectId, setProjectId] = useState<number>(0);
  const [weekStartDate, setWeekStartDate] = useState("");
  const [weekEndDate, setWeekEndDate] = useState("");
  const [weekNumber, setWeekNumber] = useState(1);
  const [plannedActivities, setPlannedActivities] = useState<PlannedActivity[]>([{ ...emptyPlannedActivity }]);
  const [plannedLabour, setPlannedLabour] = useState<PlannedLabour[]>([{ ...emptyPlannedLabour }]);
  const [plannedSubcontractors, setPlannedSubcontractors] = useState<PlannedSubcontractor[]>([]);
  const [productivityTargets, setProductivityTargets] = useState<ProductivityTarget[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (existing) {
      setProjectId(existing.projectId);
      setWeekStartDate(existing.weekStartDate);
      setWeekEndDate(existing.weekEndDate);
      setWeekNumber(existing.weekNumber);
      setPlannedActivities(existing.plannedActivities as PlannedActivity[]);
      setPlannedLabour(existing.plannedLabour as PlannedLabour[]);
      setPlannedSubcontractors(existing.plannedSubcontractors as PlannedSubcontractor[]);
      setProductivityTargets(existing.productivityTargets as ProductivityTarget[]);
      setMilestones(existing.milestones as Milestone[]);
      setNotes(existing.notes || "");
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async (status: string) => {
      const payload = {
        projectId,
        weekStartDate,
        weekEndDate,
        weekNumber,
        plannedActivities,
        plannedLabour,
        plannedSubcontractors,
        productivityTargets,
        milestones,
        notes: notes || null,
        status,
      };
      if (isEdit) {
        const res = await apiRequest("PATCH", `/api/weekly-plans/${params.id}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/weekly-plans", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-plans"] });
      toast({ title: `Weekly plan ${isEdit ? "updated" : "created"} successfully` });
      navigate("/weekly-plans");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function updateArrayItem<T>(arr: T[], index: number, field: keyof T, value: any): T[] {
    const next = [...arr];
    next[index] = { ...next[index], [field]: value };
    return next;
  }

  return (
    <div className="p-6 space-y-6" data-testid="weekly-plan-form">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/weekly-plans")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{isEdit ? "Edit" : "New"} Weekly Plan</h1>
          <p className="text-sm text-muted-foreground">Define the planned activities and targets for the week</p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Button variant="outline" onClick={() => saveMutation.mutate("draft")} disabled={saveMutation.isPending} data-testid="button-save-plan-draft">
            <Save className="mr-2 h-4 w-4" /> Save Draft
          </Button>
          <Button onClick={() => saveMutation.mutate("approved")} disabled={saveMutation.isPending} data-testid="button-approve-plan">
            <Send className="mr-2 h-4 w-4" /> Approve
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CalendarRange className="h-4 w-4" /> Plan Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={String(projectId)} onValueChange={v => setProjectId(Number(v))}>
                <SelectTrigger data-testid="select-plan-project"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Week Number</Label>
              <Input type="number" min={1} value={weekNumber} onChange={e => setWeekNumber(Number(e.target.value))} data-testid="input-week-number" />
            </div>
            <div className="space-y-2">
              <Label>Week Start</Label>
              <Input type="date" value={weekStartDate} onChange={e => setWeekStartDate(e.target.value)} data-testid="input-week-start" />
            </div>
            <div className="space-y-2">
              <Label>Week End</Label>
              <Input type="date" value={weekEndDate} onChange={e => setWeekEndDate(e.target.value)} data-testid="input-week-end" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Planned Activities</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setPlannedActivities(a => [...a, { ...emptyPlannedActivity }])} data-testid="button-add-planned-activity">
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {plannedActivities.map((act, i) => (
            <div key={i} className="p-4 rounded-md bg-muted/30 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Activity {i + 1}</span>
                {plannedActivities.length > 1 && (
                  <Button size="icon" variant="ghost" onClick={() => setPlannedActivities(a => a.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Trade</Label>
                  <Select value={act.trade} onValueChange={v => setPlannedActivities(a => updateArrayItem(a, i, "trade", v))}>
                    <SelectTrigger><SelectValue placeholder="Select trade" /></SelectTrigger>
                    <SelectContent>{TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Priority</Label>
                  <Select value={act.priority} onValueChange={v => setPlannedActivities(a => updateArrayItem(a, i, "priority", v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITY_LEVELS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Target %</Label>
                  <Input type="number" min={0} max={100} value={act.targetPercent} onChange={e => setPlannedActivities(a => updateArrayItem(a, i, "targetPercent", Number(e.target.value)))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea value={act.description} onChange={e => setPlannedActivities(a => updateArrayItem(a, i, "description", e.target.value))} className="min-h-[50px]" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Planned Labour</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setPlannedLabour(l => [...l, { ...emptyPlannedLabour }])} data-testid="button-add-planned-labour">
              <Plus className="mr-1 h-3 w-3" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {plannedLabour.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_40px] gap-2 items-end">
                <Select value={l.trade} onValueChange={v => setPlannedLabour(a => updateArrayItem(a, i, "trade", v))}>
                  <SelectTrigger><SelectValue placeholder="Trade" /></SelectTrigger>
                  <SelectContent>{TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" min={0} value={l.plannedCount} onChange={e => setPlannedLabour(a => updateArrayItem(a, i, "plannedCount", Number(e.target.value)))} />
                {plannedLabour.length > 1 && (
                  <Button size="icon" variant="ghost" onClick={() => setPlannedLabour(a => a.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            <div className="flex justify-between text-sm font-medium pt-2 border-t">
              <span>Total Planned:</span>
              <span>{plannedLabour.reduce((s, l) => s + l.plannedCount, 0)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2"><MilestoneIcon className="h-4 w-4" /> Milestones</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setMilestones(m => [...m, { ...emptyMilestone }])} data-testid="button-add-milestone">
              <Plus className="mr-1 h-3 w-3" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No milestones defined</p>
            ) : (
              milestones.map((m, i) => (
                <div key={i} className="p-3 rounded-md bg-muted/30 space-y-2">
                  <div className="flex justify-between gap-2">
                    <Input value={m.description} onChange={e => setMilestones(a => updateArrayItem(a, i, "description", e.target.value))} placeholder="Milestone description" className="flex-1" />
                    <Button size="icon" variant="ghost" onClick={() => setMilestones(a => a.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" value={m.targetDate} onChange={e => setMilestones(a => updateArrayItem(a, i, "targetDate", e.target.value))} />
                    <Select value={m.status} onValueChange={v => setMilestones(a => updateArrayItem(a, i, "status", v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Delayed">Delayed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Planned Subcontractors</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setPlannedSubcontractors(s => [...s, { ...emptyPlannedSub }])} data-testid="button-add-planned-sub">
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          {plannedSubcontractors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No subcontractors planned</p>
          ) : (
            <div className="space-y-3">
              {plannedSubcontractors.map((s, i) => (
                <div key={i} className="p-3 rounded-md bg-muted/30 grid grid-cols-1 md:grid-cols-[1fr_1fr_80px_1fr_40px] gap-2 items-end">
                  <Input value={s.company} onChange={e => setPlannedSubcontractors(a => updateArrayItem(a, i, "company", e.target.value))} placeholder="Company" />
                  <Select value={s.specialty} onValueChange={v => setPlannedSubcontractors(a => updateArrayItem(a, i, "specialty", v))}>
                    <SelectTrigger><SelectValue placeholder="Specialty" /></SelectTrigger>
                    <SelectContent>{TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" min={0} value={s.plannedWorkers} onChange={e => setPlannedSubcontractors(a => updateArrayItem(a, i, "plannedWorkers", Number(e.target.value)))} placeholder="#" />
                  <Input value={s.scope} onChange={e => setPlannedSubcontractors(a => updateArrayItem(a, i, "scope", e.target.value))} placeholder="Scope of work" />
                  <Button size="icon" variant="ghost" onClick={() => setPlannedSubcontractors(a => a.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Productivity Targets</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setProductivityTargets(t => [...t, { ...emptyTarget }])} data-testid="button-add-target">
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          {productivityTargets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No productivity targets defined</p>
          ) : (
            <div className="space-y-2">
              {productivityTargets.map((t, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_80px_80px_40px] gap-2 items-end p-2 rounded-md bg-muted/30">
                  <Select value={t.trade} onValueChange={v => setProductivityTargets(a => updateArrayItem(a, i, "trade", v))}>
                    <SelectTrigger><SelectValue placeholder="Trade" /></SelectTrigger>
                    <SelectContent>{TRADES.map(tr => <SelectItem key={tr} value={tr}>{tr}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={t.metric} onChange={e => setProductivityTargets(a => updateArrayItem(a, i, "metric", e.target.value))} placeholder="Metric (e.g. m2/day)" />
                  <Input type="number" min={0} value={t.target} onChange={e => setProductivityTargets(a => updateArrayItem(a, i, "target", Number(e.target.value)))} placeholder="Target" />
                  <Input value={t.unit} onChange={e => setProductivityTargets(a => updateArrayItem(a, i, "unit", e.target.value))} placeholder="Unit" />
                  <Button size="icon" variant="ghost" onClick={() => setProductivityTargets(a => a.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes or instructions..." className="min-h-[80px]" data-testid="input-plan-notes" />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => navigate("/weekly-plans")}>Cancel</Button>
        <Button variant="outline" onClick={() => saveMutation.mutate("draft")} disabled={saveMutation.isPending}>
          <Save className="mr-2 h-4 w-4" /> Save Draft
        </Button>
        <Button onClick={() => saveMutation.mutate("approved")} disabled={saveMutation.isPending}>
          <Send className="mr-2 h-4 w-4" /> Approve Plan
        </Button>
      </div>
    </div>
  );
}

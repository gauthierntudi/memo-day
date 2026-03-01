import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowLeft, Save, Send, Plus, Trash2, CalendarRange, Users, Target, Milestone as MilestoneIcon, CheckCircle2, XCircle, Clock, FileText, FilePlus2, Copy } from "lucide-react";
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
  const { user } = useAuth();
  const { hasPermission, projectIds: allowedProjectIds, hasAllProjects } = usePermissions();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [createPopoverOpen, setCreatePopoverOpen] = useState(false);

  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: existing } = useQuery<WeeklyPlan>({
    queryKey: ["/api/weekly-plans", params.id],
    enabled: !!isEdit,
  });
  const { data: allPlans } = useQuery<WeeklyPlan[]>({
    queryKey: ["/api/weekly-plans"],
    enabled: !isEdit,
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

  const previousPlanForProject = (() => {
    if (isEdit || !projectId || !allPlans) return null;
    const projectPlans = allPlans
      .filter(p => p.projectId === projectId)
      .sort((a, b) => b.id - a.id);
    return projectPlans.length > 0 ? projectPlans[0] : null;
  })();

  const loadFromPreviousPlan = () => {
    if (!previousPlanForProject) return;
    const prev = previousPlanForProject;
    setPlannedActivities((prev.plannedActivities as PlannedActivity[]).map(a => ({ ...a, targetPercent: 0 })));
    setPlannedLabour([...(prev.plannedLabour as PlannedLabour[])]);
    setPlannedSubcontractors([...(prev.plannedSubcontractors as PlannedSubcontractor[])]);
    setProductivityTargets([...(prev.productivityTargets as ProductivityTarget[])]);
    setMilestones((prev.milestones as Milestone[]).map(m => ({ ...m, status: "Pending" })));
    setNotes("");
    setWeekNumber(prev.weekNumber + 1);
    toast({ title: "Loaded from previous plan", description: `Week ${prev.weekNumber} data copied. Targets reset.` });
    setCreatePopoverOpen(false);
  };

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

  const invalidatePlan = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/weekly-plans"] });
    queryClient.invalidateQueries({ queryKey: ["/api/weekly-plans", params.id] });
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/weekly-plans/${params.id}/submit`);
      return res.json();
    },
    onSuccess: () => {
      invalidatePlan();
      toast({ title: "Weekly plan submitted for approval" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/weekly-plans/${params.id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      invalidatePlan();
      toast({ title: "Weekly plan approved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await apiRequest("POST", `/api/weekly-plans/${params.id}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      invalidatePlan();
      setRejectDialogOpen(false);
      setRejectionReason("");
      toast({ title: "Weekly plan rejected" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const planStatus = existing?.status || "draft";
  const isDraft = planStatus === "draft";
  const isSubmitted = planStatus === "submitted";
  const isApproved = planStatus === "approved";
  const isRejected = planStatus === "rejected";
  const canCreatePlan = hasPermission("create_weekly_plan");
  const canEditSavePlan = hasPermission("edit_save_weekly_plan");
  const canSubmitPlan = hasPermission("submit_weekly_plan");
  const canApproveRejectPlan = hasPermission("approve_reject_weekly_plan");
  const canEdit = (isEdit ? canEditSavePlan : canCreatePlan) && (!isEdit || isDraft || isRejected);
  const canApprove = canApproveRejectPlan && isSubmitted;

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
          {canEdit && (
            <>
              <Button variant="outline" onClick={() => saveMutation.mutate("draft")} disabled={saveMutation.isPending} data-testid="button-save-plan-draft">
                <Save className="mr-2 h-4 w-4" /> Save Draft
              </Button>
              {isEdit && (isDraft || isRejected) && canSubmitPlan && (
                <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} data-testid="button-submit-plan">
                  <Send className="mr-2 h-4 w-4" /> Submit for Approval
                </Button>
              )}
              {!isEdit && (
                <Popover open={createPopoverOpen} onOpenChange={setCreatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button disabled={saveMutation.isPending} data-testid="button-create-plan">
                      <Save className="mr-2 h-4 w-4" /> Create Plan
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 p-1.5" data-testid="popover-create-options">
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
                      onClick={() => { setCreatePopoverOpen(false); saveMutation.mutate("draft"); }}
                      data-testid="button-create-blank"
                    >
                      <FilePlus2 className="h-4 w-4 text-muted-foreground" />
                      Create Blank
                    </button>
                    {previousPlanForProject ? (
                      <button
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
                        onClick={loadFromPreviousPlan}
                        data-testid="button-use-previous-plan"
                      >
                        <Copy className="h-4 w-4 text-muted-foreground" />
                        Use Previous Plan (Wk {previousPlanForProject.weekNumber})
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        No previous plan for this project
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              )}
            </>
          )}
          {canApprove && (
            <>
              <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending} data-testid="button-approve-plan">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
              </Button>
              <Button variant="destructive" onClick={() => setRejectDialogOpen(true)} data-testid="button-reject-plan">
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {isEdit && existing && (
        <Card className={`border-l-4 ${isApproved ? "border-l-green-500 bg-green-50 dark:bg-green-950/20" : isSubmitted ? "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20" : isRejected ? "border-l-red-500 bg-red-50 dark:bg-red-950/20" : "border-l-gray-300"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              {isDraft && <Clock className="h-5 w-5 text-muted-foreground" />}
              {isSubmitted && <Send className="h-5 w-5 text-blue-600" />}
              {isApproved && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {isRejected && <XCircle className="h-5 w-5 text-red-600" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={isApproved ? "default" : isSubmitted ? "secondary" : isRejected ? "destructive" : "outline"} data-testid="badge-plan-status">
                    {planStatus.charAt(0).toUpperCase() + planStatus.slice(1)}
                  </Badge>
                  {existing.submittedBy && (
                    <span className="text-sm text-muted-foreground">Submitted by: <strong>{existing.submittedBy}</strong></span>
                  )}
                  {existing.approvedBy && (
                    <span className="text-sm text-muted-foreground">Approved by: <strong>{existing.approvedBy}</strong></span>
                  )}
                </div>
                {isRejected && existing.rejectionReason && (
                  <p className="text-sm text-red-600 mt-1" data-testid="text-plan-rejection-reason">Rejection reason: {existing.rejectionReason}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CalendarRange className="h-4 w-4" /> Plan Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={String(projectId)} onValueChange={v => setProjectId(Number(v))} disabled={!canEdit}>
                <SelectTrigger data-testid="select-plan-project"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects?.filter(p => hasAllProjects || allowedProjectIds.includes(p.id)).map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Week Number</Label>
              <Input type="number" min={1} value={weekNumber} onChange={e => setWeekNumber(Number(e.target.value))} data-testid="input-week-number" disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={weekStartDate} onChange={e => setWeekStartDate(e.target.value)} data-testid="input-week-start" disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={weekEndDate} onChange={e => setWeekEndDate(e.target.value)} data-testid="input-week-end" disabled={!canEdit} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Planned Activities</CardTitle>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => setPlannedActivities([...plannedActivities, { ...emptyPlannedActivity }])} data-testid="button-add-activity">
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {plannedActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">No planned activities</p>
          ) : (
            <div className="space-y-3">
              {plannedActivities.map((a, i) => (
                <div key={i} className="grid grid-cols-[1fr_2fr_80px_100px_auto] gap-2 items-center" data-testid={`planned-activity-${i}`}>
                  <Select value={a.trade} onValueChange={v => setPlannedActivities(arr => updateArrayItem(arr, i, "trade", v))} disabled={!canEdit}>
                    <SelectTrigger><SelectValue placeholder="Trade" /></SelectTrigger>
                    <SelectContent>
                      {TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input value={a.description} onChange={e => setPlannedActivities(arr => updateArrayItem(arr, i, "description", e.target.value))} placeholder="Description" disabled={!canEdit} />
                  <Input type="number" min={0} max={100} value={a.targetPercent} onChange={e => setPlannedActivities(arr => updateArrayItem(arr, i, "targetPercent", Number(e.target.value)))} placeholder="%" disabled={!canEdit} />
                  <Select value={a.priority} onValueChange={v => setPlannedActivities(arr => updateArrayItem(arr, i, "priority", v))} disabled={!canEdit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITY_LEVELS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {canEdit && (
                    <Button size="icon" variant="ghost" onClick={() => setPlannedActivities(a => a.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Planned Labour</CardTitle>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => setPlannedLabour([...plannedLabour, { ...emptyPlannedLabour }])} data-testid="button-add-labour">
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {plannedLabour.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">No planned labour</p>
          ) : (
            <div className="space-y-3">
              {plannedLabour.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_auto] gap-2 items-center" data-testid={`planned-labour-${i}`}>
                  <Select value={l.trade} onValueChange={v => setPlannedLabour(arr => updateArrayItem(arr, i, "trade", v))} disabled={!canEdit}>
                    <SelectTrigger><SelectValue placeholder="Trade" /></SelectTrigger>
                    <SelectContent>
                      {TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" min={0} value={l.plannedCount} onChange={e => setPlannedLabour(arr => updateArrayItem(arr, i, "plannedCount", Number(e.target.value)))} placeholder="Count" disabled={!canEdit} />
                  {canEdit && (
                    <Button size="icon" variant="ghost" onClick={() => setPlannedLabour(a => a.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Planned Subcontractors</CardTitle>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => setPlannedSubcontractors([...plannedSubcontractors, { ...emptyPlannedSub }])} data-testid="button-add-sub">
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {plannedSubcontractors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">No subcontractors planned</p>
          ) : (
            <div className="space-y-3">
              {plannedSubcontractors.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_80px_1fr_auto] gap-2 items-center" data-testid={`planned-sub-${i}`}>
                  <Input value={s.company} onChange={e => setPlannedSubcontractors(a => updateArrayItem(a, i, "company", e.target.value))} placeholder="Company" disabled={!canEdit} />
                  <Input value={s.specialty} onChange={e => setPlannedSubcontractors(a => updateArrayItem(a, i, "specialty", e.target.value))} placeholder="Specialty" disabled={!canEdit} />
                  <Input type="number" min={0} value={s.plannedWorkers} onChange={e => setPlannedSubcontractors(a => updateArrayItem(a, i, "plannedWorkers", Number(e.target.value)))} placeholder="Workers" disabled={!canEdit} />
                  <Input value={s.scope} onChange={e => setPlannedSubcontractors(a => updateArrayItem(a, i, "scope", e.target.value))} placeholder="Scope" disabled={!canEdit} />
                  {canEdit && (
                    <Button size="icon" variant="ghost" onClick={() => setPlannedSubcontractors(a => a.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><MilestoneIcon className="h-4 w-4" /> Milestones</CardTitle>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => setMilestones([...milestones, { ...emptyMilestone }])} data-testid="button-add-milestone">
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">No milestones</p>
          ) : (
            <div className="space-y-3">
              {milestones.map((m, i) => (
                <div key={i} className="grid grid-cols-[2fr_1fr_100px_auto] gap-2 items-center" data-testid={`milestone-${i}`}>
                  <Input value={m.description} onChange={e => setMilestones(a => updateArrayItem(a, i, "description", e.target.value))} placeholder="Description" disabled={!canEdit} />
                  <Input type="date" value={m.targetDate} onChange={e => setMilestones(a => updateArrayItem(a, i, "targetDate", e.target.value))} disabled={!canEdit} />
                  <Select value={m.status} onValueChange={v => setMilestones(a => updateArrayItem(a, i, "status", v))} disabled={!canEdit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  {canEdit && (
                    <Button size="icon" variant="ghost" onClick={() => setMilestones(a => a.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Productivity Targets</CardTitle>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => setProductivityTargets([...productivityTargets, { ...emptyTarget }])} data-testid="button-add-target">
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {productivityTargets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">No productivity targets</p>
          ) : (
            <div className="space-y-3">
              {productivityTargets.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_80px_80px_auto] gap-2 items-center" data-testid={`productivity-target-${i}`}>
                  <Select value={t.trade} onValueChange={v => setProductivityTargets(a => updateArrayItem(a, i, "trade", v))} disabled={!canEdit}>
                    <SelectTrigger><SelectValue placeholder="Trade" /></SelectTrigger>
                    <SelectContent>
                      {TRADES.map(tr => <SelectItem key={tr} value={tr}>{tr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input value={t.metric} onChange={e => setProductivityTargets(a => updateArrayItem(a, i, "metric", e.target.value))} placeholder="Metric" disabled={!canEdit} />
                  <Input type="number" min={0} value={t.target} onChange={e => setProductivityTargets(a => updateArrayItem(a, i, "target", Number(e.target.value)))} placeholder="Target" disabled={!canEdit} />
                  <Input value={t.unit} onChange={e => setProductivityTargets(a => updateArrayItem(a, i, "unit", e.target.value))} placeholder="Unit" disabled={!canEdit} />
                  {canEdit && (
                    <Button size="icon" variant="ghost" onClick={() => setProductivityTargets(a => a.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
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
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes or instructions..." className="min-h-[80px]" data-testid="input-plan-notes" disabled={!canEdit} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => navigate("/weekly-plans")}>Cancel</Button>
        {canEdit && (
          <>
            <Button variant="outline" onClick={() => saveMutation.mutate("draft")} disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" /> Save Draft
            </Button>
            {isEdit && (isDraft || isRejected) && canSubmitPlan && (
              <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
                <Send className="mr-2 h-4 w-4" /> Submit for Approval
              </Button>
            )}
          </>
        )}
        {canApprove && (
          <>
            <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
            </Button>
            <Button variant="destructive" onClick={() => setRejectDialogOpen(true)}>
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </Button>
          </>
        )}
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent data-testid="dialog-reject-plan">
          <DialogHeader>
            <DialogTitle>Reject Weekly Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Reason for rejection</Label>
            <Textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Provide the reason for rejecting this weekly plan..."
              className="min-h-[100px]"
              data-testid="input-plan-rejection-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => rejectMutation.mutate(rejectionReason)} disabled={rejectMutation.isPending} data-testid="button-confirm-reject-plan">
              Reject Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

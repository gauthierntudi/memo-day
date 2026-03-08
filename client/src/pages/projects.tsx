import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Building2, Pencil, Trash2, MoreVertical, CheckCircle2, UserCircle, Calendar, DollarSign, X, ChevronDown, ChevronRight, Activity } from "lucide-react";
import { PhotoGrid } from "@/components/photo-grid";
import type { Project, User, DirectCostDetails, IndirectCostDetails } from "@shared/schema";
import { CLIENT_TYPES, DIRECT_COST_LABELS, INDIRECT_COST_LABELS } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

interface ProjectFormData {
  name: string;
  code: string;
  location: string;
  client: string;
  clientType: string;
  contractor: string;
  projectManager: string | null;
  developmentManager: string | null;
  scopeOfWork: string | null;
  startDate: string | null;
  plannedDeliveryDate: string | null;
  revisedBaselineDate: string | null;
  updatedDeliveryDate: string | null;
  projectValue: number | null;
  updatedProjectValue: number | null;
  overallProgress: number | null;
  billedAmount: number | null;
  unbilledAmount: number | null;
  budgetedCost: number | null;
  updatedCost: number | null;
  actualDirectCost: number | null;
  actualIndirectCost: number | null;
  directCostDetails: DirectCostDetails | null;
  indirectCostDetails: IndirectCostDetails | null;
  delayDays: number | null;
  schedulePercentage: number | null;
  performancePercentage: number | null;
  spiIndex: number | null;
  cpiIndex: number | null;
  photos: string[];
  status: string;
}

const emptyForm: ProjectFormData = {
  name: "",
  code: "",
  location: "",
  client: "",
  clientType: "Own",
  contractor: "",
  projectManager: null,
  developmentManager: null,
  scopeOfWork: null,
  startDate: null,
  plannedDeliveryDate: null,
  revisedBaselineDate: null,
  updatedDeliveryDate: null,
  projectValue: null,
  updatedProjectValue: null,
  overallProgress: 0,
  billedAmount: null,
  unbilledAmount: null,
  budgetedCost: null,
  updatedCost: null,
  actualDirectCost: null,
  actualIndirectCost: null,
  directCostDetails: null,
  indirectCostDetails: null,
  delayDays: null,
  schedulePercentage: null,
  performancePercentage: null,
  spiIndex: null,
  cpiIndex: null,
  photos: [],
  status: "active",
};

function CostSection<T extends Record<string, number | null>>({
  label, mainValue, onMainChange, details, onDetailsChange, labels, testIdPrefix,
}: {
  label: string;
  mainValue: number | null;
  onMainChange: (v: number | null) => void;
  details: T | null;
  onDetailsChange: (d: T) => void;
  labels: Record<string, string>;
  testIdPrefix: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const keys = Object.keys(labels) as (keyof T & string)[];
  const hasDetails = details != null && Object.values(details).some(v => v != null);
  const detailSum = details != null ? Object.values(details).reduce((s: number, v) => s + ((v as number | null) ?? 0), 0) : 0;
  const isAutoSummed = hasDetails;

  return (
    <div className="space-y-2 border rounded-lg p-3" data-testid={`section-${testIdPrefix}-cost`}>
      <div
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
        data-testid={`toggle-${testIdPrefix}-details`}
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        <Label className="cursor-pointer font-semibold text-sm flex-1">{label}</Label>
        <span className="text-sm font-bold whitespace-nowrap" data-testid={`text-${testIdPrefix}-cost-total`}>
          {mainValue != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(mainValue) : "—"}
        </span>
      </div>
      {!expanded && (
        <Input
          type="number" min={0} step={0.01}
          value={mainValue ?? ""}
          onChange={e => onMainChange(e.target.value ? Number(e.target.value) : null)}
          placeholder="0.00"
          disabled={isAutoSummed}
          data-testid={`input-${testIdPrefix}-cost`}
        />
      )}
      {expanded && (
        <div className="space-y-2 pl-4 border-l-2 border-muted ml-2">
          {keys.map((key, idx) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-6 shrink-0">{idx + 1}.</span>
              <Label className="text-xs flex-1 min-w-0">{labels[key]}</Label>
              <Input
                type="number" min={0} step={0.01}
                className="w-32"
                value={(details?.[key] as number | null) ?? ""}
                onChange={e => {
                  const newDetails = { ...(details ?? Object.fromEntries(keys.map(k => [k, null]))) } as T;
                  (newDetails as any)[key] = e.target.value ? Number(e.target.value) : null;
                  onDetailsChange(newDetails);
                }}
                placeholder="0.00"
                data-testid={`input-${testIdPrefix}-${key}`}
              />
            </div>
          ))}
          {hasDetails && (
            <div className="flex justify-between items-center bg-muted/50 rounded-md px-3 py-1.5 mt-1">
              <span className="text-xs font-medium">Sub-total</span>
              <span className="text-xs font-bold">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(detailSum)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CostTileBreakdown({
  label, amount, details, labels, testIdPrefix,
}: {
  label: string;
  amount: number | null | undefined;
  details: Record<string, number | null> | null | undefined;
  labels: Record<string, string>;
  testIdPrefix: string;
}) {
  const [open, setOpen] = useState(false);
  const hasDetails = details != null && Object.values(details).some(v => v != null);
  const hasAmount = amount != null;

  return (
    <>
      <div
        className={`flex justify-between pl-4 ${hasDetails ? "cursor-pointer hover:bg-muted/30 rounded -mx-1 px-5 py-0.5" : ""}`}
        onClick={hasDetails ? () => setOpen(!open) : undefined}
        data-testid={`tile-${testIdPrefix}-cost`}
      >
        <span className="text-muted-foreground text-xs flex items-center gap-1">
          {hasDetails && (open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
          {label}:
        </span>
        <span className="text-xs">{hasAmount ? formatCurrency(amount!) : "—"}</span>
      </div>
      {open && hasDetails && (
        <div className="pl-8 space-y-0.5">
          {Object.entries(labels).map(([key, lbl]) => {
            const val = (details as any)?.[key] as number | null;
            if (val == null) return null;
            return (
              <div key={key} className="flex justify-between" data-testid={`tile-${testIdPrefix}-${key}`}>
                <span className="text-muted-foreground text-[11px]">{lbl}:</span>
                <span className="text-[11px]">{formatCurrency(val)}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function ProjectFormDialog({
  project,
  open,
  onOpenChange,
  hideFinancial,
}: {
  project?: Project;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hideFinancial?: boolean;
}) {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canEditOperational = hasPermission("edit_project_operational");
  const canEditFinancial = hideFinancial ? false : hasPermission("edit_project_financial");
  const isEditing = !!project;

  const [form, setForm] = useState<ProjectFormData>({ ...emptyForm });

  useEffect(() => {
    if (open) {
      setForm(
        project
          ? {
              name: project.name,
              code: project.code,
              location: project.location,
              client: project.client,
              clientType: project.clientType || "Own",
              contractor: project.contractor,
              projectManager: project.projectManager || null,
              developmentManager: project.developmentManager || null,
              scopeOfWork: project.scopeOfWork || null,
              startDate: project.startDate || null,
              plannedDeliveryDate: project.plannedDeliveryDate || null,
              revisedBaselineDate: project.revisedBaselineDate || null,
              updatedDeliveryDate: project.updatedDeliveryDate || null,
              projectValue: project.projectValue || null,
              updatedProjectValue: project.updatedProjectValue || null,
              overallProgress: project.overallProgress || 0,
              billedAmount: project.billedAmount ?? null,
              unbilledAmount: project.unbilledAmount ?? null,
              budgetedCost: project.budgetedCost ?? null,
              updatedCost: project.updatedCost ?? null,
              actualDirectCost: project.actualDirectCost ?? null,
              actualIndirectCost: project.actualIndirectCost ?? null,
              directCostDetails: (project.directCostDetails as DirectCostDetails) ?? null,
              indirectCostDetails: (project.indirectCostDetails as IndirectCostDetails) ?? null,
              delayDays: project.delayDays ?? null,
              schedulePercentage: project.schedulePercentage ?? null,
              performancePercentage: project.performancePercentage ?? null,
              spiIndex: project.spiIndex ?? null,
              cpiIndex: project.cpiIndex ?? null,
              photos: (project.photos as string[]) ?? [],
              status: project.status,
            }
          : { ...emptyForm }
      );
    }
  }, [open, project]);

  const createMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project created successfully" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const res = await apiRequest("PATCH", `/api/projects/${project!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project updated successfully" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const computeDelayFromBaseline = () => {
    const baseline = form.revisedBaselineDate ?? form.plannedDeliveryDate;
    const expected = form.updatedDeliveryDate;
    if (!baseline || !expected) return null;
    const baselineMs = new Date(baseline).getTime();
    const expectedMs = new Date(expected).getTime();
    const diffDays = Math.round((expectedMs - baselineMs) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSchedule = form.schedulePercentage;
    const autoDelay = computeDelayFromBaseline();
    const finalDelay = autoDelay ?? form.delayDays;
    const computedSpi = (form.performancePercentage != null && finalSchedule != null && finalSchedule !== 0)
      ? form.performancePercentage / finalSchedule : null;
    const earnedValueForm = (form.billedAmount != null || form.unbilledAmount != null)
      ? (form.billedAmount ?? 0) + (form.unbilledAmount ?? 0) : null;
    const actualTotalCostForm = (form.actualDirectCost != null || form.actualIndirectCost != null)
      ? (form.actualDirectCost ?? 0) + (form.actualIndirectCost ?? 0) : null;
    const computedCpi = (earnedValueForm != null && actualTotalCostForm != null && actualTotalCostForm !== 0)
      ? earnedValueForm / actualTotalCostForm : null;
    const data: ProjectFormData = {
      ...form,
      schedulePercentage: finalSchedule,
      delayDays: finalDelay,
      spiIndex: computedSpi ?? form.spiIndex,
      cpiIndex: computedCpi ?? form.cpiIndex,
    };
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]" data-testid="dialog-project-form">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Project" : "Add New Project"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the project details below." : "Fill in the details to create a new project."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
        <form onSubmit={handleSubmit} className="space-y-4" id="project-form">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required data-testid="input-project-name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="code">Project Code</Label>
              <Input id="code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required placeholder="e.g. PRJ-001" data-testid="input-project-code" disabled={isEditing} />
              {isEditing && <p className="text-xs text-muted-foreground">Cannot be changed.</p>}
            </div>
            <div className="space-y-2">
              <Label>Client Type</Label>
              <Select value={form.clientType} onValueChange={v => setForm(f => ({ ...f, clientType: v }))}>
                <SelectTrigger data-testid="select-client-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} required data-testid="input-project-location" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            <Input id="client" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} required data-testid="input-project-client" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contractor">Contractor</Label>
            <Input id="contractor" value={form.contractor} onChange={e => setForm(f => ({ ...f, contractor: e.target.value }))} required data-testid="input-project-contractor" />
          </div>
          <div className="space-y-2">
            <Label>Scope of Work</Label>
            <Textarea value={form.scopeOfWork || ""} onChange={e => setForm(f => ({ ...f, scopeOfWork: e.target.value || null }))} placeholder="Describe the project scope..." className="min-h-[60px]" data-testid="input-scope-of-work" />
          </div>
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">Project Manager and Development Manager are automatically assigned based on user settings. Manage assignments in the Settings page.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate || ""} onChange={e => setForm(f => ({ ...f, startDate: e.target.value || null }))} data-testid="input-start-date" />
            </div>
            <div className="space-y-2">
              <Label>Planned Completion Date</Label>
              <Input type="date" value={form.plannedDeliveryDate || ""} onChange={e => setForm(f => ({ ...f, plannedDeliveryDate: e.target.value || null }))} data-testid="input-planned-delivery" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Revised Baseline for Completion</Label>
              <Input type="date" value={form.revisedBaselineDate || ""} onChange={e => setForm(f => ({ ...f, revisedBaselineDate: e.target.value || null }))} data-testid="input-revised-baseline" />
            </div>
            <div className="space-y-2">
              <Label>Expected Completion Date</Label>
              <Input type="date" value={form.updatedDeliveryDate || ""} onChange={e => setForm(f => ({ ...f, updatedDeliveryDate: e.target.value || null }))} data-testid="input-updated-delivery" />
            </div>
          </div>
          {canEditOperational && (
            <>
              <p className="text-xs font-semibold text-muted-foreground pt-2 border-t mt-2 flex items-center gap-1"><Activity className="h-3 w-3" /> Operational Indicators</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Budgeted Cost (USD)</Label>
                  <Input type="number" min={0} step={0.01} value={form.budgetedCost ?? ""} onChange={e => setForm(f => ({ ...f, budgetedCost: e.target.value ? Number(e.target.value) : null }))} placeholder="0.00" data-testid="input-budgeted-cost" />
                </div>
                <div className="space-y-2">
                  <Label>Updated Cost (USD)</Label>
                  <Input type="number" min={0} step={0.01} value={form.updatedCost ?? ""} onChange={e => setForm(f => ({ ...f, updatedCost: e.target.value ? Number(e.target.value) : null }))} placeholder="0.00" data-testid="input-updated-cost" />
                </div>
              </div>
              <CostSection
                label="A. Actual Direct Cost (USD)"
                mainValue={form.actualDirectCost}
                onMainChange={(v) => setForm(f => ({ ...f, actualDirectCost: v }))}
                details={form.directCostDetails}
                onDetailsChange={(d) => {
                  const sum = Object.values(d).reduce((s: number, v) => s + (v ?? 0), 0);
                  const hasAny = Object.values(d).some(v => v != null);
                  setForm(f => ({ ...f, directCostDetails: d, actualDirectCost: hasAny ? sum : null }));
                }}
                labels={DIRECT_COST_LABELS}
                testIdPrefix="direct"
              />
              <CostSection
                label="B. Actual Indirect Cost (USD)"
                mainValue={form.actualIndirectCost}
                onMainChange={(v) => setForm(f => ({ ...f, actualIndirectCost: v }))}
                details={form.indirectCostDetails}
                onDetailsChange={(d) => {
                  const sum = Object.values(d).reduce((s: number, v) => s + (v ?? 0), 0);
                  const hasAny = Object.values(d).some(v => v != null);
                  setForm(f => ({ ...f, indirectCostDetails: d, actualIndirectCost: hasAny ? sum : null }));
                }}
                labels={INDIRECT_COST_LABELS}
                testIdPrefix="indirect"
              />
              {(form.actualDirectCost != null || form.actualIndirectCost != null) && (
                <div className="flex justify-between items-center bg-muted/50 rounded-md px-3 py-2">
                  <span className="text-sm font-medium">Actual Total Cost (USD)</span>
                  <span className="text-sm font-bold" data-testid="text-actual-total-cost">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format((form.actualDirectCost ?? 0) + (form.actualIndirectCost ?? 0))}</span>
                </div>
              )}
            </>
          )}
          {canEditOperational && (
            <>
              {(() => {
                const autoDelay = computeDelayFromBaseline();
                const baselineRef = form.revisedBaselineDate ?? form.plannedDeliveryDate;
                return (
                  <>
                    {autoDelay != null && baselineRef && (
                      <p className="text-[11px] text-muted-foreground bg-blue-50 dark:bg-blue-950/30 rounded-md px-3 py-1.5">
                        Delay referenced against {form.revisedBaselineDate ? "Revised Baseline" : "Planned Completion"}: {baselineRef}
                      </p>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Delay (Days)</Label>
                        {autoDelay != null ? (
                          <div className="flex items-center bg-muted/50 rounded-md px-3 py-2 h-10 gap-2" data-testid="text-delay-days">
                            <span className={`font-bold text-sm ${autoDelay > 0 ? "text-red-500" : "text-green-600"}`}>{autoDelay}</span>
                            <span className="text-xs text-muted-foreground">(auto)</span>
                          </div>
                        ) : (
                          <Input type="number" step={1} value={form.delayDays ?? ""} onChange={e => setForm(f => ({ ...f, delayDays: e.target.value ? Number(e.target.value) : null }))} placeholder="0" data-testid="input-delay-days" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Schedule %</Label>
                        <Input type="number" min={0} max={100} step={0.01} value={form.schedulePercentage ?? ""} onChange={e => setForm(f => ({ ...f, schedulePercentage: e.target.value ? Number(e.target.value) : null }))} placeholder="0.00" data-testid="input-schedule-percentage" />
                      </div>
                      <div className="space-y-2">
                        <Label>Performance %</Label>
                        <Input type="number" min={0} max={100} step={0.01} value={form.performancePercentage ?? ""} onChange={e => setForm(f => ({ ...f, performancePercentage: e.target.value ? Number(e.target.value) : null }))} placeholder="0.00" data-testid="input-performance-percentage" />
                      </div>
                    </div>
                  </>
                );
              })()}
            </>
          )}
          {canEditFinancial && (
            <>
              <p className="text-xs font-semibold text-muted-foreground pt-2 border-t mt-2 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Financial Indicators</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Contract Value (USD)</Label>
                  <Input type="number" min={0} step={0.01} value={form.projectValue ?? ""} onChange={e => setForm(f => ({ ...f, projectValue: e.target.value ? Number(e.target.value) : null }))} placeholder="Enter value in USD" data-testid="input-project-value" />
                </div>
                <div className="space-y-2">
                  <Label>Updated Contract Value (USD)</Label>
                  <Input type="number" min={0} step={0.01} value={form.updatedProjectValue ?? ""} onChange={e => setForm(f => ({ ...f, updatedProjectValue: e.target.value ? Number(e.target.value) : null }))} placeholder="Enter updated value in USD" data-testid="input-updated-project-value" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Billed Amount (USD)</Label>
                  <Input type="number" min={0} step={0.01} value={form.billedAmount ?? ""} onChange={e => setForm(f => ({ ...f, billedAmount: e.target.value ? Number(e.target.value) : null }))} placeholder="0.00" data-testid="input-billed-amount" />
                </div>
                <div className="space-y-2">
                  <Label>Unbilled Amount (USD)</Label>
                  <Input type="number" min={0} step={0.01} value={form.unbilledAmount ?? ""} onChange={e => setForm(f => ({ ...f, unbilledAmount: e.target.value ? Number(e.target.value) : null }))} placeholder="0.00" data-testid="input-unbilled-amount" />
                </div>
              </div>
              {(form.billedAmount != null || form.unbilledAmount != null) && (
                <div className="flex justify-between items-center bg-muted/50 rounded-md px-3 py-2">
                  <span className="text-sm font-medium">Earned Value (USD)</span>
                  <span className="text-sm font-bold" data-testid="text-earned-value">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format((form.billedAmount ?? 0) + (form.unbilledAmount ?? 0))}</span>
                </div>
              )}
              {(() => {
                const budgetedGP = (form.projectValue != null && form.budgetedCost != null && form.projectValue !== 0)
                  ? ((form.projectValue - form.budgetedCost) / form.projectValue) * 100 : null;
                const updatedGP = (() => {
                  const cv = form.updatedProjectValue ?? form.projectValue;
                  const uc = form.updatedCost ?? form.budgetedCost;
                  return (cv != null && uc != null && cv !== 0) ? ((cv - uc) / cv) * 100 : null;
                })();
                if (budgetedGP == null && updatedGP == null) return null;
                return (
                  <div className="grid grid-cols-2 gap-3">
                    {budgetedGP != null && (
                      <div className="flex justify-between items-center bg-muted/50 rounded-md px-3 py-2">
                        <span className="text-sm font-medium">Budgeted Gross Profit</span>
                        <span className={`text-sm font-bold ${budgetedGP >= 0 ? "text-green-600" : "text-red-500"}`} data-testid="text-budgeted-gross-profit">{budgetedGP.toFixed(1)}%</span>
                      </div>
                    )}
                    {updatedGP != null && (
                      <div className="flex justify-between items-center bg-muted/50 rounded-md px-3 py-2">
                        <span className="text-sm font-medium">Updated Gross Profit</span>
                        <span className={`text-sm font-bold ${updatedGP >= 0 ? "text-green-600" : "text-red-500"}`} data-testid="text-updated-gross-profit">{updatedGP.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                );
              })()}
              {(() => {
                const finalSchedule = form.schedulePercentage;
                const computedSpi = (form.performancePercentage != null && finalSchedule != null && finalSchedule !== 0)
                  ? form.performancePercentage / finalSchedule : null;
                const earnedValueForm = (form.billedAmount != null || form.unbilledAmount != null)
                  ? (form.billedAmount ?? 0) + (form.unbilledAmount ?? 0) : null;
                const actualTotalCostForm = (form.actualDirectCost != null || form.actualIndirectCost != null)
                  ? (form.actualDirectCost ?? 0) + (form.actualIndirectCost ?? 0) : null;
                const computedCpi = (earnedValueForm != null && actualTotalCostForm != null && actualTotalCostForm !== 0)
                  ? earnedValueForm / actualTotalCostForm : null;
                return (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>SPI (Schedule Performance Index)</Label>
                      {computedSpi != null ? (
                        <div className="flex items-center bg-muted/50 rounded-md px-3 py-2 h-10 gap-2" data-testid="text-spi-index">
                          <span className={`font-bold text-sm ${computedSpi < 1 ? "text-red-500" : "text-green-600"}`}>{computedSpi.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground">(auto-calculated)</span>
                        </div>
                      ) : (
                        <Input type="number" min={0} step={0.01} value={form.spiIndex ?? ""} onChange={e => setForm(f => ({ ...f, spiIndex: e.target.value ? Number(e.target.value) : null }))} placeholder="1.00" data-testid="input-spi-index" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>CPI (Cost Performance Index)</Label>
                      {computedCpi != null ? (
                        <div className="flex items-center bg-muted/50 rounded-md px-3 py-2 h-10 gap-2" data-testid="text-cpi-index">
                          <span className={`font-bold text-sm ${computedCpi < 1 ? "text-red-500" : "text-green-600"}`}>{computedCpi.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground">(auto-calculated)</span>
                        </div>
                      ) : (
                        <Input type="number" min={0} step={0.01} value={form.cpiIndex ?? ""} onChange={e => setForm(f => ({ ...f, cpiIndex: e.target.value ? Number(e.target.value) : null }))} placeholder="1.00" data-testid="input-cpi-index" />
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
          <div className="space-y-2">
            <Label>Overall Progress: {form.overallProgress ?? 0}%</Label>
            <Slider value={[form.overallProgress ?? 0]} onValueChange={v => setForm(f => ({ ...f, overallProgress: v[0] }))} min={0} max={100} step={1} data-testid="slider-overall-progress" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger data-testid="select-project-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Project Photos (up to 20)</Label>
            <PhotoGrid
              photos={form.photos}
              onChange={(newPhotos) => setForm(f => ({ ...f, photos: newPhotos }))}
              maxPhotos={20}
              defaultVisible={3}
              canEdit={true}
              thumbWidth={96}
              thumbHeight={96}
              testIdPrefix="project-photo"
            />
          </div>
        </form>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button" data-testid="button-cancel-project">Cancel</Button>
          </DialogClose>
          <Button type="submit" form="project-form" disabled={isPending} data-testid="button-submit-project">
            {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

export default function Projects({ hideFinancial, pageTitle }: { hideFinancial?: boolean; pageTitle?: string }) {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canEditProjects = hasPermission("edit_projects");
  const canViewOperational = hasPermission("view_project_operational");
  const canEditOperational = hasPermission("edit_project_operational");
  const canViewFinancial = hideFinancial ? false : hasPermission("view_project_financial");
  const canEditFinancial = hideFinancial ? false : hasPermission("edit_project_financial");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const [projectFilter, setProjectFilter] = useState("all");

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: users } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const activeUsers = users?.filter(u => u.isActive) || [];

  const getAssignedUsersByRole = (projectId: number, role: string) => {
    return activeUsers.filter(u =>
      u.orgRole === role &&
      u.projectIds &&
      (u.projectIds.includes(-1) || u.projectIds.includes(projectId))
    );
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/projects/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/projects/${id}`, { status: "closed" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project closed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openAddDialog = () => {
    setEditingProject(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setDialogOpen(true);
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "default" as const;
      case "on-hold": return "secondary" as const;
      case "completed": return "outline" as const;
      case "closed": return "destructive" as const;
      default: return "secondary" as const;
    }
  };

  const filtered = useMemo(() => (projects ?? []).filter(p => {
    if (projectFilter === "all") return true;
    if (projectFilter === "Own" || projectFilter === "Group" || projectFilter === "Non-group") return p.clientType === projectFilter;
    if (projectFilter === "active" || projectFilter === "completed") return p.status === projectFilter;
    return true;
  }), [projects, projectFilter]);

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const selectedProject = filtered.find(p => p.id === selectedProjectId) ?? null;

  const filteredIds = filtered.map(p => p.id).join(",");
  useEffect(() => {
    if (filtered.length > 0 && !filtered.find(p => p.id === selectedProjectId)) {
      setSelectedProjectId(filtered[0].id);
    }
  }, [filteredIds]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-2 grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const p = selectedProject;

  const pAny = p as any;
  const ev = pAny?.computedEarnedValue ?? (p && (p.billedAmount != null || p.unbilledAmount != null)
    ? (p.billedAmount ?? 0) + (p.unbilledAmount ?? 0) : null);
  const actualTotalCost = pAny?.computedActualTotalCost ?? (p && (p.actualDirectCost != null || p.actualIndirectCost != null)
    ? (p.actualDirectCost ?? 0) + (p.actualIndirectCost ?? 0) : null);
  const costVariance = pAny?.computedCostVariance ?? (ev != null && actualTotalCost != null ? ev - actualTotalCost : null);
  const costVariancePct = costVariance != null && ev !== 0 ? (costVariance / ev!) * 100 : null;
  const contractAmount = p ? (p.updatedProjectValue ?? p.projectValue) : null;
  const financialPct = ev != null && contractAmount != null && contractAmount !== 0 ? (ev / contractAmount) * 100 : null;
  const displaySpi = p?.spiIndex ?? ((p?.performancePercentage != null && p?.schedulePercentage != null && p.schedulePercentage !== 0) ? p.performancePercentage / p.schedulePercentage : null);
  const displayCpi = p?.cpiIndex ?? (ev != null && actualTotalCost != null && actualTotalCost !== 0 ? ev / actualTotalCost : null);
  const budgetedGP = pAny?.computedBudgetedGP ?? (p && p.projectValue != null && p.budgetedCost != null && p.projectValue !== 0
    ? ((p.projectValue - p.budgetedCost) / p.projectValue) * 100 : null);
  const updatedCV = p ? (p.updatedProjectValue ?? p.projectValue) : null;
  const updatedC = p ? (p.updatedCost ?? p.budgetedCost) : null;
  const updatedGP = pAny?.computedUpdatedGP ?? (updatedCV != null && updatedC != null && updatedCV !== 0
    ? ((updatedCV - updatedC) / updatedCV) * 100 : null);
  const currentGP = pAny?.computedCurrentGP ?? (ev != null && actualTotalCost != null && ev !== 0
    ? ((ev - actualTotalCost) / ev) * 100 : null);
  const assignedPMs = p ? getAssignedUsersByRole(p.id, "Project Manager") : [];
  const assignedDMs = p ? getAssignedUsersByRole(p.id, "Development Manager") : [];
  const achieved = p?.overallProgress ?? 0;
  const planned = p?.schedulePercentage ?? 0;

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="projects-page">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold tracking-tight">{pageTitle || "Projects"}</h1>
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
          {canEditProjects && (
            <Button size="sm" onClick={openAddDialog} data-testid="button-add-project">
              <Plus className="mr-1.5 h-4 w-4" /> Add Project
            </Button>
          )}
        </div>
      </div>

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
              onClick={() => setSelectedProjectId(project.id)}
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

      {p && (
        <div className="space-y-4" data-testid={`detail-project-${p.id}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-xl font-bold truncate">{p.name}</h2>
              <Badge variant={statusBadgeVariant(p.status)} className="text-xs shrink-0 capitalize">{p.status}</Badge>
            </div>
            {canEditProjects && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="outline" size="sm" onClick={() => openEditDialog(p)} data-testid={`button-edit-project-${p.id}`}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
                {p.status !== "closed" && (
                  <Button variant="ghost" size="sm" onClick={() => closeMutation.mutate(p.id)} data-testid={`button-close-project-${p.id}`}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Close
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" data-testid={`button-delete-project-${p.id}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Project</AlertDialogTitle>
                      <AlertDialogDescription>Are you sure you want to delete "{p.name}"? This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => { deleteMutation.mutate(p.id); setSelectedProjectId(null); }} data-testid={`button-confirm-delete-project-${p.id}`}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

          {((p.photos as string[]) ?? []).length > 0 && (
            <div data-testid={`photos-project-${p.id}`}>
              <PhotoGrid
                photos={(p.photos as string[]) ?? []}
                canEdit={false}
                maxPhotos={20}
                defaultVisible={3}
                thumbWidth={120}
                thumbHeight={90}
                testIdPrefix={`detail-photo-${p.id}`}
              />
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="section-key-metrics">
            <Card>
              <CardContent className="py-3 px-4">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Progress</p>
                <p className="text-2xl font-bold text-primary">{achieved}%</p>
                <div className="relative h-2 w-full rounded-full bg-muted/50 mt-1.5">
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(achieved, 100)}%`, background: "linear-gradient(90deg, #2563eb, #06b6d4)" }} />
                  {planned > 0 && <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-sm" style={{ left: `${Math.min(planned, 100)}%`, background: "#d97706" }} />}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Schedule: {planned}%</p>
              </CardContent>
            </Card>
            {canViewFinancial && (
              <Card>
                <CardContent className="py-3 px-4">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">SPI</p>
                  <p className={`text-2xl font-bold ${displaySpi != null ? (displaySpi >= 1 ? "text-emerald-600" : "text-red-500") : ""}`}>{displaySpi != null ? displaySpi.toFixed(2) : "—"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{displaySpi != null ? (displaySpi >= 1 ? "On/Ahead of schedule" : "Behind schedule") : "Not computed"}</p>
                </CardContent>
              </Card>
            )}
            {canViewFinancial && (
              <Card>
                <CardContent className="py-3 px-4">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">CPI</p>
                  <p className={`text-2xl font-bold ${displayCpi != null ? (displayCpi >= 1 ? "text-emerald-600" : "text-red-500") : ""}`}>{displayCpi != null ? displayCpi.toFixed(2) : "—"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{displayCpi != null ? (displayCpi >= 1 ? "Under budget" : "Over budget") : "Not computed"}</p>
                </CardContent>
              </Card>
            )}
            {canViewFinancial && (
              <Card>
                <CardContent className="py-3 px-4">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Cost Variance</p>
                  <p className={`text-2xl font-bold ${costVariance != null ? (costVariance >= 0 ? "text-emerald-600" : "text-red-500") : ""}`}>{costVariance != null ? formatCurrency(costVariance) : "—"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{costVariancePct != null ? `${costVariancePct.toFixed(1)}%` : ""} {costVariance != null ? (costVariance >= 0 ? "Favorable" : "Unfavorable") : ""}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <Card data-testid="section-project-info">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Project Information</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Code:</span><span className="font-medium">{p.code}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Location:</span><span className="font-medium">{p.location}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Client:</span><span className="font-medium">{p.client}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Client Type:</span><Badge variant="outline" className="text-xs">{p.clientType || "Own"}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Project Manager:</span><span className="font-medium text-xs" data-testid={`text-pm-${p.id}`}>{assignedPMs.length > 0 ? assignedPMs.map(u => u.name).join(", ") : <span className="text-muted-foreground italic">Not assigned</span>}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Dev. Manager:</span><span className="font-medium text-xs" data-testid={`text-dm-${p.id}`}>{assignedDMs.length > 0 ? assignedDMs.map(u => u.name).join(", ") : <span className="text-muted-foreground italic">Not assigned</span>}</span></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 border-t pt-2 mt-2">
                {p.startDate && <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Start Date:</span><span className="font-medium">{p.startDate}</span></div>}
                {p.plannedDeliveryDate && <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Planned Completion:</span><span className="font-medium">{p.plannedDeliveryDate}</span></div>}
                {p.revisedBaselineDate && <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Revised Baseline:</span><span className="font-medium">{p.revisedBaselineDate}</span></div>}
                {p.updatedDeliveryDate && <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Expected Completion:</span><span className="font-medium">{p.updatedDeliveryDate}</span></div>}
              </div>
              {p.scopeOfWork && <div className="pt-1 border-t"><span className="text-muted-foreground text-xs">Scope:</span><p className="text-xs mt-0.5">{p.scopeOfWork}</p></div>}
            </CardContent>
          </Card>

          {canViewOperational && (
            <Card data-testid="section-operational-indicators">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Operational Indicators
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Budgeted Cost:</span><span className="font-medium">{formatCurrency(p.budgetedCost)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Updated Cost:</span><span className="font-medium">{formatCurrency(p.updatedCost)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Actual Total Cost:</span><span className="font-medium">{actualTotalCost != null ? formatCurrency(actualTotalCost) : "—"}</span></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <CostTileBreakdown label="Direct Cost" amount={p.actualDirectCost} details={p.directCostDetails as DirectCostDetails | null} labels={DIRECT_COST_LABELS} testIdPrefix="direct" />
                  <CostTileBreakdown label="Indirect Cost" amount={p.actualIndirectCost} details={p.indirectCostDetails as IndirectCostDetails | null} labels={INDIRECT_COST_LABELS} testIdPrefix="indirect" />
                </div>
                <div className="border-t pt-2 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {p.delayDays != null && <div className="flex justify-between"><span className="text-muted-foreground">Delay:</span><span className={`font-medium ${p.delayDays > 0 ? "text-red-500" : "text-green-600"}`}>{p.delayDays} days</span></div>}
                  {p.schedulePercentage != null && <div className="flex justify-between"><span className="text-muted-foreground">Schedule %:</span><span className="font-medium">{p.schedulePercentage}%</span></div>}
                  {p.performancePercentage != null && <div className="flex justify-between"><span className="text-muted-foreground">Performance %:</span><span className="font-medium">{p.performancePercentage}%</span></div>}
                </div>
              </CardContent>
            </Card>
          )}

          {canViewFinancial && (
            <Card data-testid="section-financial-indicators">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Financial Indicators
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Contract Value:</span><span className="font-medium">{formatCurrency(p.projectValue)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Updated Contract:</span><span className="font-medium">{formatCurrency(p.updatedProjectValue)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Earned Value:</span><span className="font-medium">{ev != null ? formatCurrency(ev) : "—"}</span></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex justify-between pl-3"><span className="text-muted-foreground text-xs">Billed:</span><span className="text-xs">{formatCurrency(p.billedAmount)}</span></div>
                  <div className="flex justify-between pl-3"><span className="text-muted-foreground text-xs">Unbilled:</span><span className="text-xs">{formatCurrency(p.unbilledAmount)}</span></div>
                  {financialPct != null && <div className="flex justify-between"><span className="text-muted-foreground">Financial %:</span><span className="font-medium">{financialPct.toFixed(1)}%</span></div>}
                </div>
                <div className="border-t pt-2 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {displaySpi != null && <div className="flex justify-between"><span className="text-muted-foreground">SPI:</span><span className={`font-medium ${displaySpi >= 1 ? "text-emerald-600" : "text-red-500"}`}>{displaySpi.toFixed(2)}</span></div>}
                  {displayCpi != null && <div className="flex justify-between"><span className="text-muted-foreground">CPI:</span><span className={`font-medium ${displayCpi >= 1 ? "text-emerald-600" : "text-red-500"}`}>{displayCpi.toFixed(2)}</span></div>}
                  {costVariance != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost Variance:</span>
                      <span className={`font-medium ${costVariance > 0 ? "text-green-600" : costVariance < 0 ? "text-red-500" : ""}`}>{formatCurrency(costVariance)}{costVariancePct != null ? ` (${costVariancePct.toFixed(1)}%)` : ""}</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t pt-2" data-testid="section-gp-comparison">
                  {(p.projectValue != null || p.budgetedCost != null) && (
                    <div className="bg-muted/30 rounded-lg p-3 space-y-1.5" data-testid="card-budget-gp">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Budget GP</p>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Contract Value:</span><span className="font-medium">{formatCurrency(p.projectValue)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Budgeted Cost:</span><span className="font-medium">{formatCurrency(p.budgetedCost)}</span></div>
                      <div className="flex justify-between text-sm border-t pt-1.5">
                        <span className="text-muted-foreground font-medium">GP:</span>
                        <span className={`text-lg font-bold ${budgetedGP != null ? (budgetedGP >= 0 ? "text-emerald-600" : "text-red-500") : ""}`}>{budgetedGP != null ? `${budgetedGP.toFixed(1)}%` : "—"}</span>
                      </div>
                    </div>
                  )}
                  {(p.updatedProjectValue != null || p.updatedCost != null) && (
                    <div className="bg-muted/30 rounded-lg p-3 space-y-1.5" data-testid="card-updated-gp">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Updated GP</p>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Contract Value:</span><span className="font-medium">{formatCurrency(updatedCV)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cost:</span><span className="font-medium">{formatCurrency(updatedC)}</span></div>
                      <div className="flex justify-between text-sm border-t pt-1.5">
                        <span className="text-muted-foreground font-medium">GP:</span>
                        <span className={`text-lg font-bold ${updatedGP != null ? (updatedGP >= 0 ? "text-emerald-600" : "text-red-500") : ""}`}>{updatedGP != null ? `${updatedGP.toFixed(1)}%` : "—"}</span>
                      </div>
                    </div>
                  )}
                  {(ev != null || actualTotalCost != null) && (
                    <div className="bg-muted/30 rounded-lg p-3 space-y-1.5" data-testid="card-current-gp">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Current GP</p>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Earned Value:</span><span className="font-medium">{ev != null ? formatCurrency(ev) : "—"}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Actual Cost:</span><span className="font-medium">{actualTotalCost != null ? formatCurrency(actualTotalCost) : "—"}</span></div>
                      <div className="flex justify-between text-sm border-t pt-1.5">
                        <span className="text-muted-foreground font-medium">GP:</span>
                        <span className={`text-lg font-bold ${currentGP != null ? (currentGP >= 0 ? "text-emerald-600" : "text-red-500") : ""}`}>{currentGP != null ? `${currentGP.toFixed(1)}%` : "—"}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <ProjectFormDialog project={editingProject} open={dialogOpen} onOpenChange={setDialogOpen} hideFinancial={hideFinancial} />
    </div>
  );
}

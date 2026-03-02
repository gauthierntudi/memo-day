import { useState, useEffect } from "react";
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
import { Plus, Building2, Pencil, Trash2, MoreVertical, CheckCircle2, UserCircle, Calendar, DollarSign, ImagePlus, X } from "lucide-react";
import type { Project, User } from "@shared/schema";
import { CLIENT_TYPES } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  delayDays: null,
  schedulePercentage: null,
  performancePercentage: null,
  spiIndex: null,
  cpiIndex: null,
  photos: [],
  status: "active",
};

function ProjectFormDialog({
  project,
  open,
  onOpenChange,
}: {
  project?: Project;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const computedSpi = (form.performancePercentage != null && form.schedulePercentage != null && form.schedulePercentage !== 0)
      ? form.performancePercentage / form.schedulePercentage : null;
    const earnedValueForm = (form.billedAmount != null || form.unbilledAmount != null)
      ? (form.billedAmount ?? 0) + (form.unbilledAmount ?? 0) : null;
    const actualTotalCostForm = (form.actualDirectCost != null || form.actualIndirectCost != null)
      ? (form.actualDirectCost ?? 0) + (form.actualIndirectCost ?? 0) : null;
    const computedCpi = (earnedValueForm != null && actualTotalCostForm != null && actualTotalCostForm !== 0)
      ? earnedValueForm / actualTotalCostForm : null;
    const data: ProjectFormData = {
      ...form,
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
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate || ""} onChange={e => setForm(f => ({ ...f, startDate: e.target.value || null }))} data-testid="input-start-date" />
            </div>
            <div className="space-y-2">
              <Label>Planned Delivery</Label>
              <Input type="date" value={form.plannedDeliveryDate || ""} onChange={e => setForm(f => ({ ...f, plannedDeliveryDate: e.target.value || null }))} data-testid="input-planned-delivery" />
            </div>
            <div className="space-y-2">
              <Label>Updated Delivery</Label>
              <Input type="date" value={form.updatedDeliveryDate || ""} onChange={e => setForm(f => ({ ...f, updatedDeliveryDate: e.target.value || null }))} data-testid="input-updated-delivery" />
            </div>
          </div>
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
              <Label>Budgeted Cost (USD)</Label>
              <Input type="number" min={0} step={0.01} value={form.budgetedCost ?? ""} onChange={e => setForm(f => ({ ...f, budgetedCost: e.target.value ? Number(e.target.value) : null }))} placeholder="0.00" data-testid="input-budgeted-cost" />
            </div>
            <div className="space-y-2">
              <Label>Updated Cost (USD)</Label>
              <Input type="number" min={0} step={0.01} value={form.updatedCost ?? ""} onChange={e => setForm(f => ({ ...f, updatedCost: e.target.value ? Number(e.target.value) : null }))} placeholder="0.00" data-testid="input-updated-cost" />
            </div>
          </div>
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
          <p className="text-xs font-semibold text-muted-foreground pt-2 border-t mt-2">Financial Tracking</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Actual Direct Cost (USD)</Label>
              <Input type="number" min={0} step={0.01} value={form.actualDirectCost ?? ""} onChange={e => setForm(f => ({ ...f, actualDirectCost: e.target.value ? Number(e.target.value) : null }))} placeholder="0.00" data-testid="input-actual-direct-cost" />
            </div>
            <div className="space-y-2">
              <Label>Actual Indirect Cost (USD)</Label>
              <Input type="number" min={0} step={0.01} value={form.actualIndirectCost ?? ""} onChange={e => setForm(f => ({ ...f, actualIndirectCost: e.target.value ? Number(e.target.value) : null }))} placeholder="0.00" data-testid="input-actual-indirect-cost" />
            </div>
          </div>
          {(form.actualDirectCost != null || form.actualIndirectCost != null) && (
            <div className="flex justify-between items-center bg-muted/50 rounded-md px-3 py-2">
              <span className="text-sm font-medium">Actual Total Cost (USD)</span>
              <span className="text-sm font-bold" data-testid="text-actual-total-cost">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format((form.actualDirectCost ?? 0) + (form.actualIndirectCost ?? 0))}</span>
            </div>
          )}
          <p className="text-xs font-semibold text-muted-foreground pt-2 border-t mt-2">Performance Metrics</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Delay (Days)</Label>
              <Input type="number" step={1} value={form.delayDays ?? ""} onChange={e => setForm(f => ({ ...f, delayDays: e.target.value ? Number(e.target.value) : null }))} placeholder="0" data-testid="input-delay-days" />
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
          {(() => {
            const computedSpi = (form.performancePercentage != null && form.schedulePercentage != null && form.schedulePercentage !== 0)
              ? form.performancePercentage / form.schedulePercentage : null;
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
            <Label>Project Photos (up to 3)</Label>
            <div className="flex gap-2 flex-wrap">
              {form.photos.map((url, i) => (
                <div key={i} className="relative group w-24 h-24 rounded-md overflow-hidden border">
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setForm(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }))} className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-remove-photo-${i}`}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {form.photos.length < 3 && (
                <label className="w-24 h-24 rounded-md border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors" data-testid="button-upload-photo">
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground mt-1">Upload</span>
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1 * 1024 * 1024) {
                      toast({ title: "File too large", description: "Each photo must be under 1 MB", variant: "destructive" });
                      e.target.value = "";
                      return;
                    }
                    const fd = new FormData();
                    fd.append("photos", file);
                    try {
                      const res = await fetch("/api/uploads", { method: "POST", body: fd, credentials: "include" });
                      if (!res.ok) throw new Error("Upload failed");
                      const data = await res.json();
                      setForm(f => ({ ...f, photos: [...f.photos, ...data.urls].slice(0, 3) }));
                    } catch {
                      toast({ title: "Upload failed", variant: "destructive" });
                    }
                    e.target.value = "";
                  }} />
                </label>
              )}
            </div>
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
  );
}

export default function Projects() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canEditProjects = hasPermission("edit_projects");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);

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

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Card key={i}><CardContent className="p-5"><Skeleton className="h-24 w-full" /></CardContent></Card>)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="projects-page">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Manage your construction projects</p>
        </div>
        {canEditProjects && (
          <Button onClick={openAddDialog} data-testid="button-add-project">
            <Plus className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        )}
      </div>

      {!projects || projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground mb-2">No projects added yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add your first construction project to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <Card key={project.id} data-testid={`card-project-${project.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Badge variant={statusBadgeVariant(project.status)} className="text-xs shrink-0 capitalize">
                      {project.status}
                    </Badge>
                    {canEditProjects && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-project-menu-${project.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(project)} data-testid={`button-edit-project-${project.id}`}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          {project.status !== "closed" && (
                            <DropdownMenuItem onClick={() => closeMutation.mutate(project.id)} data-testid={`button-close-project-${project.id}`}>
                              <CheckCircle2 className="h-4 w-4 mr-2" /> Close Project
                            </DropdownMenuItem>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive" data-testid={`button-delete-project-${project.id}`}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Project</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{project.name}"? This action cannot be undone and will remove all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(project.id)} data-testid={`button-confirm-delete-project-${project.id}`}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {((project.photos as string[]) ?? []).length > 0 && (
                  <div className="flex gap-1.5 mb-3 -mx-1" data-testid={`photos-project-${project.id}`}>
                    {((project.photos as string[]) ?? []).map((url, i) => (
                      <div key={i} className="flex-1 rounded-md overflow-hidden" style={{ aspectRatio: "4/3" }}>
                        <img src={url} alt={`${project.name} photo ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Code:</span>
                    <span className="font-medium">{project.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium">{project.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client:</span>
                    <span className="font-medium">{project.client}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client Type:</span>
                    <Badge variant="outline" className="text-xs">{project.clientType || "Own"}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contractor:</span>
                    <span className="font-medium">{project.contractor}</span>
                  </div>
                  {(() => {
                    const assignedPMs = getAssignedUsersByRole(project.id, "Project Manager");
                    const assignedDMs = getAssignedUsersByRole(project.id, "Development Manager");
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Project Manager:</span>
                          <span className="font-medium flex items-center gap-1" data-testid={`text-pm-${project.id}`}>
                            {assignedPMs.length > 0 ? (
                              <><UserCircle className="h-3.5 w-3.5" /> {assignedPMs.map(u => u.name).join(", ")}</>
                            ) : (
                              <span className="text-muted-foreground italic">Not assigned</span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dev. Manager:</span>
                          <span className="font-medium flex items-center gap-1" data-testid={`text-dm-${project.id}`}>
                            {assignedDMs.length > 0 ? (
                              <><UserCircle className="h-3.5 w-3.5" /> {assignedDMs.map(u => u.name).join(", ")}</>
                            ) : (
                              <span className="text-muted-foreground italic">Not assigned</span>
                            )}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                  {project.scopeOfWork && (
                    <div className="pt-1">
                      <span className="text-muted-foreground text-xs">Scope of Work:</span>
                      <p className="text-xs mt-0.5 line-clamp-2">{project.scopeOfWork}</p>
                    </div>
                  )}
                  <div className="pt-1.5 border-t mt-2 space-y-1.5">
                    {project.startDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Start:</span>
                        <span className="font-medium">{project.startDate}</span>
                      </div>
                    )}
                    {project.plannedDeliveryDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Planned:</span>
                        <span className="font-medium">{project.plannedDeliveryDate}</span>
                      </div>
                    )}
                    {project.updatedDeliveryDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Updated:</span>
                        <span className="font-medium">{project.updatedDeliveryDate}</span>
                      </div>
                    )}
                    {(() => {
                      const hasBudget = project.projectValue != null || project.budgetedCost != null;
                      const budgetedGP = (project.projectValue != null && project.budgetedCost != null && project.projectValue !== 0)
                        ? ((project.projectValue - project.budgetedCost) / project.projectValue) * 100 : null;

                      const hasUpdated = project.updatedProjectValue != null || project.updatedCost != null;
                      const updatedCV = project.updatedProjectValue ?? project.projectValue;
                      const updatedC = project.updatedCost ?? project.budgetedCost;
                      const updatedGP = (hasUpdated && updatedCV != null && updatedC != null && updatedCV !== 0)
                        ? ((updatedCV - updatedC) / updatedCV) * 100 : null;

                      const ev = (project.billedAmount != null || project.unbilledAmount != null)
                        ? (project.billedAmount ?? 0) + (project.unbilledAmount ?? 0) : null;
                      const actualTotalCost = (project.actualDirectCost != null || project.actualIndirectCost != null)
                        ? (project.actualDirectCost ?? 0) + (project.actualIndirectCost ?? 0) : null;
                      const hasCurrent = ev != null || actualTotalCost != null;
                      const currentGP = (ev != null && actualTotalCost != null && ev !== 0)
                        ? ((ev - actualTotalCost) / ev) * 100 : null;

                      return (
                        <>
                          {hasBudget && (
                            <div className="pt-1.5 border-t mt-1.5 space-y-1">
                              <p className="text-xs font-semibold text-muted-foreground">Budget</p>
                              {project.projectValue != null && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Contract Value:</span>
                                  <span className="font-medium">{formatCurrency(project.projectValue)}</span>
                                </div>
                              )}
                              {project.budgetedCost != null && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Budgeted Cost:</span>
                                  <span className="font-medium">{formatCurrency(project.budgetedCost)}</span>
                                </div>
                              )}
                              {budgetedGP != null && (
                                <div className="flex justify-between" data-testid={`text-budgeted-gp-${project.id}`}>
                                  <span className="text-muted-foreground">Gross Profit:</span>
                                  <span className={`font-medium ${budgetedGP >= 0 ? "text-green-600" : "text-red-500"}`}>{budgetedGP.toFixed(1)}%</span>
                                </div>
                              )}
                            </div>
                          )}
                          {hasUpdated && (
                            <div className="pt-1.5 border-t mt-1.5 space-y-1">
                              <p className="text-xs font-semibold text-muted-foreground">Updated Situation</p>
                              {updatedCV != null && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Contract Value:</span>
                                  <span className="font-medium">{formatCurrency(updatedCV)}</span>
                                </div>
                              )}
                              {updatedC != null && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Cost:</span>
                                  <span className="font-medium">{formatCurrency(updatedC)}</span>
                                </div>
                              )}
                              {updatedGP != null && (
                                <div className="flex justify-between" data-testid={`text-updated-gp-${project.id}`}>
                                  <span className="text-muted-foreground">Gross Profit:</span>
                                  <span className={`font-medium ${updatedGP >= 0 ? "text-green-600" : "text-red-500"}`}>{updatedGP.toFixed(1)}%</span>
                                </div>
                              )}
                            </div>
                          )}
                          {hasCurrent && (
                            <div className="pt-1.5 border-t mt-1.5 space-y-1">
                              <p className="text-xs font-semibold text-muted-foreground">Current Situation</p>
                              {ev != null && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Contract Value (Earned):</span>
                                  <span className="font-medium">{formatCurrency(ev)}</span>
                                </div>
                              )}
                              {actualTotalCost != null && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Actual Total Cost:</span>
                                  <span className="font-medium">{formatCurrency(actualTotalCost)}</span>
                                </div>
                              )}
                              {currentGP != null && (
                                <div className="flex justify-between" data-testid={`text-gross-profit-${project.id}`}>
                                  <span className="text-muted-foreground">Gross Profit:</span>
                                  <span className={`font-medium ${currentGP >= 0 ? "text-green-600" : "text-red-500"}`}>{currentGP.toFixed(1)}%</span>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}
                    {(() => {
                      const hasBilled = project.billedAmount != null;
                      const hasUnbilled = project.unbilledAmount != null;
                      const hasDirect = project.actualDirectCost != null;
                      const hasIndirect = project.actualIndirectCost != null;
                      const hasFinancial = hasBilled || hasUnbilled || hasDirect || hasIndirect;
                      const canComputeWorkPerformed = hasBilled || hasUnbilled;
                      const canComputeTotalCost = hasDirect || hasIndirect;
                      const totalWorkPerformed = canComputeWorkPerformed ? (project.billedAmount ?? 0) + (project.unbilledAmount ?? 0) : null;
                      const actualTotalCost = canComputeTotalCost ? (project.actualDirectCost ?? 0) + (project.actualIndirectCost ?? 0) : null;
                      const canComputeVariance = totalWorkPerformed != null && actualTotalCost != null;
                      const costVarianceUsd = canComputeVariance ? totalWorkPerformed - actualTotalCost : null;
                      const costVariancePct = canComputeVariance && totalWorkPerformed !== 0 ? ((costVarianceUsd!) / totalWorkPerformed) * 100 : null;
                      const contractAmount = project.updatedProjectValue ?? project.projectValue;
                      const financialPct = totalWorkPerformed != null && contractAmount != null && contractAmount !== 0 ? (totalWorkPerformed / contractAmount) * 100 : null;
                      const tileComputedSpi = (project.performancePercentage != null && project.schedulePercentage != null && project.schedulePercentage !== 0)
                        ? project.performancePercentage / project.schedulePercentage : null;
                      const tileComputedCpi = (totalWorkPerformed != null && actualTotalCost != null && actualTotalCost !== 0)
                        ? totalWorkPerformed / actualTotalCost : null;
                      const displaySpi = project.spiIndex ?? tileComputedSpi;
                      const displayCpi = project.cpiIndex ?? tileComputedCpi;
                      const hasPerformance = project.delayDays != null || project.schedulePercentage != null || project.performancePercentage != null || displaySpi != null || displayCpi != null;
                      return (
                        <>
                          {hasFinancial && (
                            <div className="pt-1.5 border-t mt-1.5 space-y-1">
                              <p className="text-xs font-semibold text-muted-foreground">Financial</p>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground font-medium">Earned Value:</span>
                                <span className="font-medium">{totalWorkPerformed != null ? formatCurrency(totalWorkPerformed) : "—"}</span>
                              </div>
                              <div className="flex justify-between pl-4">
                                <span className="text-muted-foreground text-xs">Billed:</span>
                                <span className="text-xs">{hasBilled ? formatCurrency(project.billedAmount!) : "—"}</span>
                              </div>
                              <div className="flex justify-between pl-4">
                                <span className="text-muted-foreground text-xs">Unbilled:</span>
                                <span className="text-xs">{hasUnbilled ? formatCurrency(project.unbilledAmount!) : "—"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground font-medium">Actual Total Cost:</span>
                                <span className="font-medium">{actualTotalCost != null ? formatCurrency(actualTotalCost) : "—"}</span>
                              </div>
                              <div className="flex justify-between pl-4">
                                <span className="text-muted-foreground text-xs">Direct Cost:</span>
                                <span className="text-xs">{hasDirect ? formatCurrency(project.actualDirectCost!) : "—"}</span>
                              </div>
                              <div className="flex justify-between pl-4">
                                <span className="text-muted-foreground text-xs">Indirect Cost:</span>
                                <span className="text-xs">{hasIndirect ? formatCurrency(project.actualIndirectCost!) : "—"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Cost Variance:</span>
                                {costVarianceUsd != null ? (
                                  <span className={`font-medium ${costVarianceUsd > 0 ? "text-green-600" : costVarianceUsd < 0 ? "text-red-500" : ""}`}>
                                    {formatCurrency(costVarianceUsd)}{costVariancePct != null ? ` (${costVariancePct.toFixed(1)}%)` : ""}
                                  </span>
                                ) : (
                                  <span className="font-medium">—</span>
                                )}
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Financial %:</span>
                                <span className="font-medium">{financialPct != null ? `${financialPct.toFixed(1)}%` : "—"}</span>
                              </div>
                            </div>
                          )}
                          {hasPerformance && (
                            <div className="pt-1.5 border-t mt-1.5 space-y-1">
                              <p className="text-xs font-semibold text-muted-foreground">Performance</p>
                              {project.delayDays != null && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Delay:</span>
                                  <span className={`font-medium ${project.delayDays > 0 ? "text-red-500" : ""}`}>{project.delayDays} days</span>
                                </div>
                              )}
                              {project.schedulePercentage != null && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Schedule %:</span>
                                  <span className="font-medium">{project.schedulePercentage}%</span>
                                </div>
                              )}
                              {project.performancePercentage != null && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Performance %:</span>
                                  <span className="font-medium">{project.performancePercentage}%</span>
                                </div>
                              )}
                              {displaySpi != null && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">SPI:</span>
                                  <span className={`font-medium ${displaySpi < 1 ? "text-red-500" : "text-green-600"}`}>{displaySpi.toFixed(2)}</span>
                                </div>
                              )}
                              {displayCpi != null && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">CPI:</span>
                                  <span className={`font-medium ${displayCpi < 1 ? "text-red-500" : "text-green-600"}`}>{displayCpi.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}
                    {(() => {
                      const achieved = project.overallProgress ?? 0;
                      const planned = project.schedulePercentage ?? 0;
                      const achievedClamped = Math.min(achieved, 100);
                      const plannedClamped = Math.min(planned, 100);
                      const fmtPct = (v: number) => v.toFixed(v % 1 === 0 ? 0 : 2);
                      return (
                        <div className="pt-2 border-t mt-2" data-testid="chart-progress-gauge">
                          <p className="text-xs font-semibold text-center text-muted-foreground mb-1">Project Status</p>
                          <div className="px-1">
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-sm" style={{ background: "linear-gradient(90deg, #2563eb, #06b6d4)" }} />
                                <span className="text-[10px] text-muted-foreground">Achieved</span>
                                <span className="text-[11px] font-bold" style={{ color: "#2563eb" }}>{fmtPct(achieved)}%</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full border-2" style={{ borderColor: "#d97706" }} />
                                <span className="text-[10px] text-muted-foreground">Planned</span>
                                <span className="text-[11px] font-bold" style={{ color: "#d97706" }}>{fmtPct(planned)}%</span>
                              </div>
                            </div>
                            <div className="relative h-4 w-full rounded-full bg-muted/50 overflow-visible">
                              <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${achievedClamped}%`, background: "linear-gradient(90deg, #2563eb, #06b6d4)" }} />
                              {planned > 0 && (
                                <div className="absolute top-1/2 -translate-y-1/2 w-1 h-6 rounded-sm" style={{ left: `${plannedClamped}%`, marginLeft: "-2px", background: "#d97706" }} />
                              )}
                            </div>
                            <div className="flex justify-between mt-0.5">
                              <span className="text-[9px] text-muted-foreground">0%</span>
                              <span className="text-[9px] text-muted-foreground">100%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProjectFormDialog project={editingProject} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

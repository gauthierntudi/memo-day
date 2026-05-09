import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PhotoGrid } from "@/components/photo-grid";
import { PlannedActivitiesTab } from "@/components/planned-activities-tab";
import { PlannedLabourTab } from "@/components/planned-labour-tab";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  Cloud,
  Users,
  Hammer,
  ShieldAlert,
  Lock,
  Sparkles,
  Wrench,
  Package,
  ClipboardList,
  Save,
  Send,
  Plus,
  Trash2,
  ArrowLeft,
  AlertTriangle,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Project, DailyReport, User, WorkActivity, LabourEntry, SubcontractorEntry, SafetyIncident, SecurityIncident, EquipmentEntry, MaterialEntry, InventoryItem, ActivityLogEntry } from "@shared/schema";
import { TRADES, LABOUR_TRADES, WEATHER_CONDITIONS, EQUIPMENT_TYPES, EQUIPMENT_STATUS, INCIDENT_TYPES, SEVERITY_LEVELS, SECURITY_INCIDENT_TYPES, CLEANING_STATUS, MATERIAL_UNITS, ACTIVITY_STATUS, INVENTORY_STATUS } from "@shared/schema";

const emptyActivity: WorkActivity = { trade: "", description: "", location: "", percentComplete: 0, status: "In Progress" };
const emptyLabour: LabourEntry = { trade: "", count: 0, hours: 8 };
const emptySub: SubcontractorEntry = { company: "", specialty: "", workersCount: 0, workDescription: "" };
const emptySafety: SafetyIncident = { type: "", severity: "Low", description: "", actionTaken: "", reportedBy: "", photos: [] };
const emptySecurity: SecurityIncident = { type: "", description: "", actionTaken: "", reportedBy: "" };
const emptyEquipment: EquipmentEntry = { name: "", type: "", status: "Operational", hoursUsed: 0, operator: "" };
const emptyMaterialIn: MaterialEntry = { name: "", unit: "", quantity: 0, supplier: "", deliveryNote: "" };
const emptyMaterialUsed: MaterialEntry = { name: "", unit: "", quantity: 0, supplier: "", deliveryNote: "" };
const emptyInventory: InventoryItem = { name: "", unit: "", opening: 0, received: 0, used: 0, closing: 0, status: "Adequate" };

export default function DailyReportForm() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isEdit = params.id && params.id !== "new";
  const { user } = useAuth();
  const { hasPermission, projectIds: allowedProjectIds, hasAllProjects } = usePermissions();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: allUsers } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: existing } = useQuery<DailyReport>({
    queryKey: ["/api/daily-reports", params.id],
    enabled: !!isEdit,
  });

  const [projectId, setProjectId] = useState<number>(0);
  const [reportNumber, setReportNumber] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [preparedBy, setPreparedBy] = useState("");
  const [shiftStart, setShiftStart] = useState("07:00");
  const [shiftEnd, setShiftEnd] = useState("17:00");
  const [isWorkingDay, setIsWorkingDay] = useState(true);
  const [weatherCondition, setWeatherCondition] = useState("Sunny");
  const [temperature, setTemperature] = useState("30");
  const [windSpeed, setWindSpeed] = useState("");
  const [weatherImpact, setWeatherImpact] = useState("");
  const [activities, setActivities] = useState<WorkActivity[]>([{ ...emptyActivity }]);
  const [labourForce, setLabourForce] = useState<LabourEntry[]>([{ ...emptyLabour }]);
  const [plannedLabourActualTotal, setPlannedLabourActualTotal] = useState(0);
  const [subcontractors, setSubcontractors] = useState<SubcontractorEntry[]>([]);
  const [safetyIncidents, setSafetyIncidents] = useState<SafetyIncident[]>([]);
  const [securityIncidents, setSecurityIncidents] = useState<SecurityIncident[]>([]);
  const [cleaningStatus, setCleaningStatus] = useState("Satisfactory");
  const [cleaningNotes, setCleaningNotes] = useState("");
  const [equipment, setEquipment] = useState<EquipmentEntry[]>([{ ...emptyEquipment }]);
  const [materialsIn, setMaterialsIn] = useState<MaterialEntry[]>([]);
  const [materialsUsed, setMaterialsUsed] = useState<MaterialEntry[]>([]);
  const [inventoryStatus, setInventoryStatus] = useState<InventoryItem[]>([]);
  const [reportPhotos, setReportPhotos] = useState<string[]>([]);
  const [comments, setComments] = useState("");

  const projectUsers = (allUsers || []).filter(u => {
    if (!u.isActive) return false;
    if (!projectId) return true;
    const pIds = u.projectIds as number[] | null;
    if (!pIds) return false;
    return pIds.includes(-1) || pIds.includes(projectId);
  });

  useEffect(() => {
    if (existing) {
      setProjectId(existing.projectId);
      setReportNumber(existing.reportNumber);
      setReportDate(existing.reportDate);
      setPreparedBy(existing.preparedBy);
      setShiftStart(existing.shiftStart);
      setShiftEnd(existing.shiftEnd);
      setIsWorkingDay(existing.isWorkingDay);
      setWeatherCondition(existing.weatherCondition);
      setTemperature(existing.temperature);
      setWindSpeed(existing.windSpeed || "");
      setWeatherImpact(existing.weatherImpact || "");
      setActivities(existing.workActivities as WorkActivity[]);
      setLabourForce(existing.labourForce as LabourEntry[]);
      setSubcontractors(existing.subcontractors as SubcontractorEntry[]);
      setSafetyIncidents(existing.safetyIncidents as SafetyIncident[]);
      setSecurityIncidents(existing.securityIncidents as SecurityIncident[]);
      setCleaningStatus(existing.cleaningStatus);
      setCleaningNotes(existing.cleaningNotes || "");
      setEquipment(existing.equipment as EquipmentEntry[]);
      setMaterialsIn(existing.materialsIn as MaterialEntry[]);
      setMaterialsUsed(existing.materialsUsed as MaterialEntry[]);
      setInventoryStatus(existing.inventoryStatus as InventoryItem[]);

      setReportPhotos((existing.photos as string[]) || []);
      setComments(existing.comments || "");
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async (status: string) => {
      const payload = {
        reportNumber,
        projectId,
        reportDate,
        preparedBy,
        shiftStart,
        shiftEnd,
        isWorkingDay,
        weatherCondition,
        temperature,
        windSpeed: windSpeed || null,
        weatherImpact: weatherImpact || null,
        workActivities: activities,
        labourForce,
        subcontractors,
        safetyIncidents,
        securityIncidents,
        cleaningStatus,
        cleaningNotes: cleaningNotes || null,
        equipment,
        materialsIn,
        materialsUsed,
        inventoryStatus,
        overallProgress: 0,
        photos: reportPhotos,
        comments: comments || null,
        status,
      };

      if (isEdit) {
        const res = await apiRequest("PATCH", `/api/daily-reports/${params.id}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/daily-reports", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-reports"] });
      toast({ title: `Report ${isEdit ? "updated" : "created"} successfully` });
      navigate("/daily-reports");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const invalidateReport = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/daily-reports"] });
    queryClient.invalidateQueries({ queryKey: ["/api/daily-reports", params.id] });
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/daily-reports/${params.id}/submit`);
      return res.json();
    },
    onSuccess: () => {
      invalidateReport();
      toast({ title: "Report submitted for approval" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/daily-reports/${params.id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      invalidateReport();
      toast({ title: "Report approved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await apiRequest("POST", `/api/daily-reports/${params.id}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      invalidateReport();
      setRejectDialogOpen(false);
      setRejectionReason("");
      toast({ title: "Report rejected" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const reportStatus = existing?.status || "draft";
  const isDraft = reportStatus === "draft";
  const isSubmitted = reportStatus === "submitted";
  const isApproved = reportStatus === "approved";
  const isRejected = reportStatus === "rejected";
  const canCreate = hasPermission("create_daily_report");
  const canEditSave = hasPermission("edit_save_daily_report");
  const canSubmit = hasPermission("submit_daily_report");
  const canApproveReject = hasPermission("approve_reject_daily_report");
  const canEdit = (isEdit ? canEditSave : canCreate) && (!isEdit || isDraft || isRejected);
  const canApprove = canApproveReject && isSubmitted;

  function updateArrayItem<T>(arr: T[], index: number, field: keyof T, value: any): T[] {
    const next = [...arr];
    next[index] = { ...next[index], [field]: value };
    return next;
  }

  return (
    <div className="p-6 space-y-6" data-testid="daily-report-form">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/daily-reports")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{isEdit ? "Edit" : "New"} Daily Report</h1>
          <p className="text-sm text-muted-foreground">Fill in all sections of the construction daily report</p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {canEdit && (
            <>
              <Button variant="outline" onClick={() => saveMutation.mutate("draft")} disabled={saveMutation.isPending} data-testid="button-save-draft">
                <Save className="mr-2 h-4 w-4" /> Save Draft
              </Button>
              {isEdit && (isDraft || isRejected) && canSubmit && (
                <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} data-testid="button-submit-report">
                  <Send className="mr-2 h-4 w-4" /> Submit for Approval
                </Button>
              )}
              {!isEdit && (
                <Button onClick={() => saveMutation.mutate("draft")} disabled={saveMutation.isPending} data-testid="button-submit-report">
                  <Save className="mr-2 h-4 w-4" /> Submit Report
                </Button>
              )}
            </>
          )}
          {canApprove && (
            <>
              <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending} data-testid="button-approve-report">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
              </Button>
              <Button variant="destructive" onClick={() => setRejectDialogOpen(true)} data-testid="button-reject-report">
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
                  <Badge variant={isApproved ? "default" : isSubmitted ? "secondary" : isRejected ? "destructive" : "outline"} data-testid="badge-report-status">
                    {reportStatus.charAt(0).toUpperCase() + reportStatus.slice(1)}
                  </Badge>
                  {existing.submittedBy && (
                    <span className="text-sm text-muted-foreground">Submitted by: <strong>{existing.submittedBy}</strong></span>
                  )}
                  {existing.approvedBy && (
                    <span className="text-sm text-muted-foreground">Approved by: <strong>{existing.approvedBy}</strong></span>
                  )}
                </div>
                {isRejected && existing.rejectionReason && (
                  <p className="text-sm text-red-600 mt-1" data-testid="text-rejection-reason">Rejection reason: {existing.rejectionReason}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="general" className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto">
            <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
            <TabsTrigger value="weather" data-testid="tab-weather">Weather</TabsTrigger>
            <TabsTrigger value="planned-activities" data-testid="tab-planned-activities">Planned Activities</TabsTrigger>
            <TabsTrigger value="activities" data-testid="tab-activities">Additional Activities</TabsTrigger>
            <TabsTrigger value="planned-labour" data-testid="tab-planned-labour">Planned Labour</TabsTrigger>
            <TabsTrigger value="labour" data-testid="tab-labour">Additional Labour</TabsTrigger>
            <TabsTrigger value="subcontractors" data-testid="tab-subcontractors">Subcontractors</TabsTrigger>
            <TabsTrigger value="safety" data-testid="tab-safety">Safety</TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
            <TabsTrigger value="housekeeping" data-testid="tab-housekeeping">Housekeeping</TabsTrigger>
            <TabsTrigger value="equipment" data-testid="tab-equipment">Equipment</TabsTrigger>
            <TabsTrigger value="materials" data-testid="tab-materials">Materials</TabsTrigger>
            <TabsTrigger value="inventory" data-testid="tab-inventory">Inventory</TabsTrigger>
          </TabsList>
        </ScrollArea>

        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" /> General Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={String(projectId)} onValueChange={v => setProjectId(Number(v))}>
                    <SelectTrigger data-testid="select-project"><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                      {projects?.filter(p => hasAllProjects || allowedProjectIds.includes(p.id)).sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Report Number</Label>
                  <Input value={reportNumber} onChange={e => setReportNumber(e.target.value)} placeholder="DCR-001" data-testid="input-report-number" />
                </div>
                <div className="space-y-2">
                  <Label>Report Date</Label>
                  <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} data-testid="input-report-date" />
                </div>
                <div className="space-y-2">
                  <Label>Prepared By</Label>
                  <Select value={preparedBy} onValueChange={setPreparedBy}>
                    <SelectTrigger data-testid="select-prepared-by"><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      {[...projectUsers].sort((a, b) => a.name.localeCompare(b.name)).map(u => <SelectItem key={u.id} value={u.name}>{u.name} ({u.orgRole})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Shift Start</Label>
                  <Input type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)} data-testid="input-shift-start" />
                </div>
                <div className="space-y-2">
                  <Label>Shift End</Label>
                  <Input type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} data-testid="input-shift-end" />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Switch checked={isWorkingDay} onCheckedChange={setIsWorkingDay} data-testid="switch-working-day" />
                <Label>Working Day</Label>
                {!isWorkingDay && <Badge variant="secondary">Non-working day</Badge>}
              </div>
            </CardContent>
          </Card>

          {isEdit && (() => {
            const logs = (existing?.activityLog as ActivityLogEntry[]) || [];
            if (logs.length === 0) return null;
            return (
              <Card data-testid="card-activity-log">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Activity Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {[...logs].reverse().map((entry, i) => {
                      const dt = new Date(entry.timestamp);
                      const dateStr = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                      const timeStr = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                      const actionColor = entry.action === "Approved" ? "text-green-600 dark:text-green-400"
                        : entry.action === "Rejected" ? "text-red-600 dark:text-red-400"
                        : entry.action === "Submitted" ? "text-blue-600 dark:text-blue-400"
                        : "text-muted-foreground";
                      return (
                        <div key={i} className="flex items-start gap-3 text-sm border-b last:border-0 pb-2 last:pb-0" data-testid={`log-entry-${i}`}>
                          <div className="shrink-0 text-xs text-muted-foreground w-28">
                            <div>{dateStr}</div>
                            <div>{timeStr}</div>
                          </div>
                          <div className="flex-1">
                            <span className={`font-medium ${actionColor}`}>{entry.action}</span>
                            <span className="text-muted-foreground"> by </span>
                            <span className="font-medium">{entry.userName}</span>
                            {entry.details && (
                              <p className="text-xs text-muted-foreground mt-0.5">{entry.details}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>

        <TabsContent value="weather" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Cloud className="h-4 w-4" /> Weather Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select value={weatherCondition} onValueChange={setWeatherCondition}>
                    <SelectTrigger data-testid="select-weather"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WEATHER_CONDITIONS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Temperature (C)</Label>
                  <Input value={temperature} onChange={e => setTemperature(e.target.value)} placeholder="e.g. 28-35" data-testid="input-temperature" />
                </div>
                <div className="space-y-2">
                  <Label>Wind Speed (km/h)</Label>
                  <Input value={windSpeed} onChange={e => setWindSpeed(e.target.value)} placeholder="e.g. 15" data-testid="input-wind" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Weather Impact on Work</Label>
                <Textarea value={weatherImpact} onChange={e => setWeatherImpact(e.target.value)} placeholder="Describe any impact of weather on work progress..." data-testid="input-weather-impact" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planned-activities" className="space-y-4 mt-4">
          <PlannedActivitiesTab projectId={projectId} reportDate={reportDate} />
        </TabsContent>

        <TabsContent value="activities" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2"><Hammer className="h-4 w-4" /> Work Activities</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setActivities(a => [...a, { ...emptyActivity }])} data-testid="button-add-activity">
                <Plus className="mr-1 h-3 w-3" /> Add Activity
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {activities.map((act, i) => (
                <div key={i} className="p-4 rounded-md bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Activity {i + 1}</span>
                    {activities.length > 1 && (
                      <Button size="icon" variant="ghost" onClick={() => setActivities(a => a.filter((_, idx) => idx !== i))} data-testid={`button-remove-activity-${i}`}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Trade</Label>
                      <Select value={act.trade} onValueChange={v => setActivities(a => updateArrayItem(a, i, "trade", v))}>
                        <SelectTrigger data-testid={`select-activity-trade-${i}`}><SelectValue placeholder="Select trade" /></SelectTrigger>
                        <SelectContent>{TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Status</Label>
                      <Select value={act.status} onValueChange={v => setActivities(a => updateArrayItem(a, i, "status", v))}>
                        <SelectTrigger data-testid={`select-activity-status-${i}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{ACTIVITY_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Location</Label>
                      <Input value={act.location} onChange={e => setActivities(a => updateArrayItem(a, i, "location", e.target.value))} placeholder="Zone / Area" data-testid={`input-activity-location-${i}`} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">% Complete</Label>
                      <div className="flex items-center gap-2">
                        <Slider value={[act.percentComplete]} onValueChange={v => setActivities(a => updateArrayItem(a, i, "percentComplete", v[0]))} max={100} step={5} className="flex-1" />
                        <span className="text-xs w-8 text-right">{act.percentComplete}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Work Description</Label>
                    <Textarea value={act.description} onChange={e => setActivities(a => updateArrayItem(a, i, "description", e.target.value))} placeholder="Describe work done..." className="min-h-[60px]" data-testid={`input-activity-desc-${i}`} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planned-labour" forceMount className="space-y-4 mt-4 data-[state=inactive]:hidden">
          <PlannedLabourTab projectId={projectId} reportDate={reportDate} onActualTotalChange={setPlannedLabourActualTotal} />
        </TabsContent>

        <TabsContent value="labour" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Labour Force</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setLabourForce(l => [...l, { ...emptyLabour }])} data-testid="button-add-labour">
                <Plus className="mr-1 h-3 w-3" /> Add Trade
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="hidden md:grid grid-cols-[1fr_100px_100px_40px] gap-3 text-xs font-medium text-muted-foreground px-1">
                  <span>Trade</span><span>Workers</span><span>Hours</span><span></span>
                </div>
                {labourForce.map((l, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_100px_100px_40px] gap-3 items-end p-3 md:p-1 rounded-md bg-muted/30 md:bg-transparent">
                    <div className="space-y-1 md:space-y-0">
                      <Label className="text-xs md:hidden">Trade</Label>
                      <Select value={l.trade} onValueChange={v => setLabourForce(a => updateArrayItem(a, i, "trade", v))}>
                        <SelectTrigger data-testid={`select-labour-trade-${i}`}><SelectValue placeholder="Select trade" /></SelectTrigger>
                        <SelectContent>{LABOUR_TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 md:space-y-0">
                      <Label className="text-xs md:hidden">Workers</Label>
                      <Input type="number" min={0} value={l.count} onChange={e => setLabourForce(a => updateArrayItem(a, i, "count", Number(e.target.value)))} data-testid={`input-labour-count-${i}`} />
                    </div>
                    <div className="space-y-1 md:space-y-0">
                      <Label className="text-xs md:hidden">Hours</Label>
                      <Input type="number" min={0} max={24} step={0.5} value={l.hours} onChange={e => setLabourForce(a => updateArrayItem(a, i, "hours", Number(e.target.value)))} data-testid={`input-labour-hours-${i}`} />
                    </div>
                    {labourForce.length > 1 && (
                      <Button size="icon" variant="ghost" onClick={() => setLabourForce(a => a.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Separator />
                <div className="space-y-1 px-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Additional Labour:</span>
                    <span data-testid="text-additional-labour-total">{labourForce.reduce((s, l) => s + (l.count || 0), 0)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Planned Labour (Actual):</span>
                    <span data-testid="text-planned-labour-actual-total">{plannedLabourActualTotal}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Total Labour:</span>
                    <span data-testid="text-total-labour">{labourForce.reduce((s, l) => s + (l.count || 0), 0) + plannedLabourActualTotal}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subcontractors" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> Subcontractors</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setSubcontractors(s => [...s, { ...emptySub }])} data-testid="button-add-sub">
                <Plus className="mr-1 h-3 w-3" /> Add Subcontractor
              </Button>
            </CardHeader>
            <CardContent>
              {subcontractors.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No subcontractors added. Click "Add Subcontractor" to add one.
                </div>
              ) : (
                <div className="space-y-4">
                  {subcontractors.map((s, i) => (
                    <div key={i} className="p-4 rounded-md bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">Subcontractor {i + 1}</span>
                        <Button size="icon" variant="ghost" onClick={() => setSubcontractors(a => a.filter((_, idx) => idx !== i))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Company Name</Label>
                          <Input value={s.company} onChange={e => setSubcontractors(a => updateArrayItem(a, i, "company", e.target.value))} data-testid={`input-sub-company-${i}`} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Trade</Label>
                          <Select value={s.specialty} onValueChange={v => setSubcontractors(a => updateArrayItem(a, i, "specialty", v))}>
                            <SelectTrigger data-testid={`select-sub-specialty-${i}`}><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Workers</Label>
                          <Input type="number" min={0} value={s.workersCount} onChange={e => setSubcontractors(a => updateArrayItem(a, i, "workersCount", Number(e.target.value)))} data-testid={`input-sub-workers-${i}`} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Work Description</Label>
                        <Textarea value={s.workDescription} onChange={e => setSubcontractors(a => updateArrayItem(a, i, "workDescription", e.target.value))} className="min-h-[50px]" data-testid={`input-sub-work-${i}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="safety" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Safety Incidents</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setSafetyIncidents(s => [...s, { ...emptySafety }])} data-testid="button-add-safety">
                <Plus className="mr-1 h-3 w-3" /> Add Incident
              </Button>
            </CardHeader>
            <CardContent>
              {safetyIncidents.length === 0 ? (
                <div className="text-center py-8">
                  <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No safety incidents reported</p>
                  <Badge variant="secondary" className="mt-2">All Clear</Badge>
                </div>
              ) : (
                <div className="space-y-4">
                  {safetyIncidents.map((inc, i) => (
                    <div key={i} className="p-4 rounded-md bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3" /> Incident {i + 1}
                        </span>
                        <Button size="icon" variant="ghost" onClick={() => setSafetyIncidents(a => a.filter((_, idx) => idx !== i))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Type</Label>
                          <Select value={inc.type} onValueChange={v => setSafetyIncidents(a => updateArrayItem(a, i, "type", v))}>
                            <SelectTrigger data-testid={`select-safety-type-${i}`}><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>{INCIDENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Severity</Label>
                          <Select value={inc.severity} onValueChange={v => setSafetyIncidents(a => updateArrayItem(a, i, "severity", v))}>
                            <SelectTrigger data-testid={`select-safety-severity-${i}`}><SelectValue /></SelectTrigger>
                            <SelectContent>{SEVERITY_LEVELS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Reported By</Label>
                          <Select value={inc.reportedBy} onValueChange={v => setSafetyIncidents(a => updateArrayItem(a, i, "reportedBy", v))}>
                            <SelectTrigger data-testid={`select-safety-reported-${i}`}><SelectValue placeholder="Select user" /></SelectTrigger>
                            <SelectContent>{[...projectUsers].sort((a, b) => a.name.localeCompare(b.name)).map(u => <SelectItem key={u.id} value={u.name}>{u.name} ({u.orgRole})</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Textarea value={inc.description} onChange={e => setSafetyIncidents(a => updateArrayItem(a, i, "description", e.target.value))} className="min-h-[50px]" data-testid={`input-safety-desc-${i}`} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Action Taken</Label>
                        <Textarea value={inc.actionTaken} onChange={e => setSafetyIncidents(a => updateArrayItem(a, i, "actionTaken", e.target.value))} className="min-h-[50px]" data-testid={`input-safety-action-${i}`} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs flex items-center gap-1"><Camera className="h-3 w-3" /> Photos</Label>
                        <PhotoGrid
                          photos={inc.photos || []}
                          onChange={(newPhotos) => {
                            const updated = [...safetyIncidents];
                            updated[i] = { ...updated[i], photos: newPhotos };
                            setSafetyIncidents(updated);
                          }}
                          maxPhotos={20}
                          defaultVisible={3}
                          canEdit={true}
                          thumbWidth={80}
                          thumbHeight={80}
                          icon="camera"
                          uploadLabel="Add"
                          testIdPrefix={`safety-photo-${i}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> Security & Theft Incidents</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setSecurityIncidents(s => [...s, { ...emptySecurity }])} data-testid="button-add-security">
                <Plus className="mr-1 h-3 w-3" /> Add Incident
              </Button>
            </CardHeader>
            <CardContent>
              {securityIncidents.length === 0 ? (
                <div className="text-center py-8">
                  <Lock className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No security incidents reported</p>
                  <Badge variant="secondary" className="mt-2">All Secure</Badge>
                </div>
              ) : (
                <div className="space-y-4">
                  {securityIncidents.map((inc, i) => (
                    <div key={i} className="p-4 rounded-md bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">Incident {i + 1}</span>
                        <Button size="icon" variant="ghost" onClick={() => setSecurityIncidents(a => a.filter((_, idx) => idx !== i))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Type</Label>
                          <Select value={inc.type} onValueChange={v => setSecurityIncidents(a => updateArrayItem(a, i, "type", v))}>
                            <SelectTrigger data-testid={`select-security-type-${i}`}><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>{SECURITY_INCIDENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Reported By</Label>
                          <Select value={inc.reportedBy} onValueChange={v => setSecurityIncidents(a => updateArrayItem(a, i, "reportedBy", v))}>
                            <SelectTrigger data-testid={`select-security-reported-${i}`}><SelectValue placeholder="Select user" /></SelectTrigger>
                            <SelectContent>{[...projectUsers].sort((a, b) => a.name.localeCompare(b.name)).map(u => <SelectItem key={u.id} value={u.name}>{u.name} ({u.orgRole})</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Textarea value={inc.description} onChange={e => setSecurityIncidents(a => updateArrayItem(a, i, "description", e.target.value))} className="min-h-[50px]" data-testid={`input-security-desc-${i}`} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Action Taken</Label>
                        <Textarea value={inc.actionTaken} onChange={e => setSecurityIncidents(a => updateArrayItem(a, i, "actionTaken", e.target.value))} className="min-h-[50px]" data-testid={`input-security-action-${i}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="housekeeping" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> Site Housekeeping & Cleaning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cleaning Status</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {CLEANING_STATUS.map(s => (
                    <div
                      key={s}
                      onClick={() => setCleaningStatus(s)}
                      className={`p-3 rounded-md border text-center cursor-pointer transition-colors text-sm ${
                        cleaningStatus === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/30 border-transparent"
                      }`}
                      data-testid={`option-cleaning-${s.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={cleaningNotes} onChange={e => setCleaningNotes(e.target.value)} placeholder="Any cleaning or housekeeping remarks..." data-testid="input-cleaning-notes" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4" /> Equipment on Site</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setEquipment(e => [...e, { ...emptyEquipment }])} data-testid="button-add-equipment">
                <Plus className="mr-1 h-3 w-3" /> Add Equipment
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {equipment.map((eq, i) => (
                  <div key={i} className="p-4 rounded-md bg-muted/30 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Equipment {i + 1}</span>
                      {equipment.length > 1 && (
                        <Button size="icon" variant="ghost" onClick={() => setEquipment(a => a.filter((_, idx) => idx !== i))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Equipment Type</Label>
                        <Select value={eq.type} onValueChange={v => setEquipment(a => updateArrayItem(a, i, "type", v))}>
                          <SelectTrigger data-testid={`select-equip-type-${i}`}><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>{EQUIPMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Name / ID</Label>
                        <Input value={eq.name} onChange={e => setEquipment(a => updateArrayItem(a, i, "name", e.target.value))} placeholder="e.g. CAT 320" data-testid={`input-equip-name-${i}`} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Status</Label>
                        <Select value={eq.status} onValueChange={v => setEquipment(a => updateArrayItem(a, i, "status", v))}>
                          <SelectTrigger data-testid={`select-equip-status-${i}`}><SelectValue /></SelectTrigger>
                          <SelectContent>{EQUIPMENT_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Hours Used</Label>
                        <Input type="number" min={0} step={0.5} value={eq.hoursUsed} onChange={e => setEquipment(a => updateArrayItem(a, i, "hoursUsed", Number(e.target.value)))} data-testid={`input-equip-hours-${i}`} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Operator</Label>
                        <Input value={eq.operator} onChange={e => setEquipment(a => updateArrayItem(a, i, "operator", e.target.value))} data-testid={`input-equip-operator-${i}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> Materials Received</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setMaterialsIn(m => [...m, { ...emptyMaterialIn }])} data-testid="button-add-material-in">
                <Plus className="mr-1 h-3 w-3" /> Add Material
              </Button>
            </CardHeader>
            <CardContent>
              {materialsIn.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">No materials received today</div>
              ) : (
                <div className="space-y-3">
                  {materialsIn.map((m, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_120px_100px_1fr_40px] gap-3 items-end p-3 rounded-md bg-muted/30">
                      <div className="space-y-1">
                        <Label className="text-xs">Material</Label>
                        <Input value={m.name} onChange={e => setMaterialsIn(a => updateArrayItem(a, i, "name", e.target.value))} placeholder="Material name" data-testid={`input-mat-in-name-${i}`} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Unit</Label>
                        <Select value={m.unit} onValueChange={v => setMaterialsIn(a => updateArrayItem(a, i, "unit", v))}>
                          <SelectTrigger data-testid={`select-mat-in-unit-${i}`}><SelectValue placeholder="Unit" /></SelectTrigger>
                          <SelectContent>{MATERIAL_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input type="number" min={0} value={m.quantity} onChange={e => setMaterialsIn(a => updateArrayItem(a, i, "quantity", Number(e.target.value)))} data-testid={`input-mat-in-qty-${i}`} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Supplier</Label>
                        <Input value={m.supplier} onChange={e => setMaterialsIn(a => updateArrayItem(a, i, "supplier", e.target.value))} data-testid={`input-mat-in-supplier-${i}`} />
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => setMaterialsIn(a => a.filter((_, idx) => idx !== i))}>
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
              <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> Materials Used</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setMaterialsUsed(m => [...m, { ...emptyMaterialUsed }])} data-testid="button-add-material-used">
                <Plus className="mr-1 h-3 w-3" /> Add Material
              </Button>
            </CardHeader>
            <CardContent>
              {materialsUsed.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">No materials used today</div>
              ) : (
                <div className="space-y-3">
                  {materialsUsed.map((m, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_120px_100px_1fr_40px] gap-3 items-end p-3 rounded-md bg-muted/30">
                      <div className="space-y-1">
                        <Label className="text-xs">Material</Label>
                        <Input value={m.name} onChange={e => setMaterialsUsed(a => updateArrayItem(a, i, "name", e.target.value))} placeholder="Material name" data-testid={`input-mat-used-name-${i}`} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Unit</Label>
                        <Select value={m.unit} onValueChange={v => setMaterialsUsed(a => updateArrayItem(a, i, "unit", v))}>
                          <SelectTrigger data-testid={`select-mat-used-unit-${i}`}><SelectValue placeholder="Unit" /></SelectTrigger>
                          <SelectContent>{MATERIAL_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input type="number" min={0} value={m.quantity} onChange={e => setMaterialsUsed(a => updateArrayItem(a, i, "quantity", Number(e.target.value)))} data-testid={`input-mat-used-qty-${i}`} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Used For</Label>
                        <Input value={m.supplier} onChange={e => setMaterialsUsed(a => updateArrayItem(a, i, "supplier", e.target.value))} placeholder="Activity / Location" data-testid={`input-mat-used-for-${i}`} />
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => setMaterialsUsed(a => a.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> Inventory Status</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setInventoryStatus(iv => [...iv, { ...emptyInventory }])} data-testid="button-add-inventory">
                <Plus className="mr-1 h-3 w-3" /> Add Item
              </Button>
            </CardHeader>
            <CardContent>
              {inventoryStatus.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">No inventory items tracked</div>
              ) : (
                <div className="space-y-4">
                  {inventoryStatus.map((item, i) => (
                    <div key={i} className="p-4 rounded-md bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">Item {i + 1}</span>
                        <Button size="icon" variant="ghost" onClick={() => setInventoryStatus(a => a.filter((_, idx) => idx !== i))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Material</Label>
                          <Input value={item.name} onChange={e => setInventoryStatus(a => updateArrayItem(a, i, "name", e.target.value))} data-testid={`input-inv-name-${i}`} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Unit</Label>
                          <Select value={item.unit} onValueChange={v => setInventoryStatus(a => updateArrayItem(a, i, "unit", v))}>
                            <SelectTrigger data-testid={`select-inv-unit-${i}`}><SelectValue placeholder="Unit" /></SelectTrigger>
                            <SelectContent>{MATERIAL_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Status</Label>
                          <Select value={item.status} onValueChange={v => setInventoryStatus(a => updateArrayItem(a, i, "status", v))}>
                            <SelectTrigger data-testid={`select-inv-status-${i}`}><SelectValue /></SelectTrigger>
                            <SelectContent>{INVENTORY_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Opening</Label>
                          <Input type="number" min={0} value={item.opening} onChange={e => setInventoryStatus(a => updateArrayItem(a, i, "opening", Number(e.target.value)))} data-testid={`input-inv-opening-${i}`} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Received</Label>
                          <Input type="number" min={0} value={item.received} onChange={e => setInventoryStatus(a => updateArrayItem(a, i, "received", Number(e.target.value)))} data-testid={`input-inv-received-${i}`} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Used</Label>
                          <Input type="number" min={0} value={item.used} onChange={e => setInventoryStatus(a => updateArrayItem(a, i, "used", Number(e.target.value)))} data-testid={`input-inv-used-${i}`} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Closing Balance:</span>
                        <span className="font-medium">{item.opening + item.received - item.used} {item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" /> Report Photos
            <span className="text-xs text-muted-foreground font-normal">({reportPhotos.length}/20)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoGrid
            photos={reportPhotos}
            onChange={canEdit ? setReportPhotos : undefined}
            maxPhotos={20}
            defaultVisible={3}
            canEdit={canEdit}
            thumbWidth={112}
            thumbHeight={80}
            icon="camera"
            uploadLabel="Add Photo"
            testIdPrefix="report-photo"
          />
          {reportPhotos.length === 0 && !canEdit && (
            <p className="text-sm text-muted-foreground">No photos attached</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Additional Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder="Any additional observations, upcoming work, or concerns..."
            className="min-h-[80px]"
            data-testid="input-comments"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => navigate("/daily-reports")} data-testid="button-cancel">
          Cancel
        </Button>
        {canEdit && (
          <>
            <Button variant="outline" onClick={() => saveMutation.mutate("draft")} disabled={saveMutation.isPending} data-testid="button-save-draft-bottom">
              <Save className="mr-2 h-4 w-4" /> Save as Draft
            </Button>
            {isEdit && (isDraft || isRejected) && canSubmit && (
              <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} data-testid="button-submit-bottom">
                <Send className="mr-2 h-4 w-4" /> Submit for Approval
              </Button>
            )}
          </>
        )}
        {canApprove && (
          <>
            <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending} data-testid="button-approve-bottom">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
            </Button>
            <Button variant="destructive" onClick={() => setRejectDialogOpen(true)} data-testid="button-reject-bottom">
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </Button>
          </>
        )}
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent data-testid="dialog-reject-report">
          <DialogHeader>
            <DialogTitle>Reject Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Reason for rejection</Label>
            <Textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Provide the reason for rejecting this report..."
              className="min-h-[100px]"
              data-testid="input-rejection-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} data-testid="button-cancel-reject">
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => rejectMutation.mutate(rejectionReason)} disabled={rejectMutation.isPending} data-testid="button-confirm-reject">
              Reject Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

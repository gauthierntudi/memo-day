import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarRange,
  ListChecks,
  BarChart3,
  FileText,
  Building2,
  PieChart,
  Settings,
  LogOut,
  KeyRound,
  Activity,
  ScrollText,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { SUPER_ADMIN_EMAIL } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, permission: "view_dashboard" },
  { title: "Daily Reports", url: "/daily-reports", icon: ClipboardList, permission: "view_daily_report" },
  { title: "Weekly Plan", url: "/weekly-plans", icon: CalendarRange, permission: "view_weekly_plan" },
  { title: "Planned Activities", url: "/planned-activities", icon: ListChecks, permission: "view_weekly_plan" },
  { title: "Weekly Report", url: "/weekly-report", icon: BarChart3, permission: "view_weekly_report" },
  { title: "Executive Summary", url: "/executive-summary", icon: FileText, permission: "view_executive_summary" },
];

const managementItems = [
  { title: "Projects", url: "/projects", icon: Building2, permission: "view_projects" },
  { title: "Projects Steering", url: "/projects-steering", icon: Activity, permission: "view_projects_steering" },
  { title: "Projects Overview", url: "/projects-overview", icon: PieChart, permission: "view_projects_overview" },
  { title: "Settings", url: "/settings", icon: Settings, permissions: ["view_users", "view_role_privileges"] },
];

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await apiRequest("POST", "/api/auth/set-password", { currentPassword, newPassword });
      toast({ title: "Password updated successfully" });
      onOpenChange(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const msg = err.message?.replace(/^\d+:\s*/, "").replace(/[{}"]/g, "").replace(/message:/, "").trim();
      setError(msg || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input id="current-password" data-testid="input-current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input id="new-password" data-testid="input-new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Confirm New Password</Label>
            <Input id="confirm-new-password" data-testid="input-confirm-new-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} data-testid="button-save-password">
              {saving ? "Saving..." : "Update Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { hasPermission } = usePermissions();
  const [showChangePassword, setShowChangePassword] = useState(false);

  const visibleMainItems = mainItems.filter(item => !item.permission || hasPermission(item.permission));
  const visibleMgmtItems = managementItems.filter(item => {
    if ("permissions" in item && item.permissions) {
      return item.permissions.some(p => hasPermission(p));
    }
    return !item.permission || hasPermission(item.permission);
  });

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">MEM - DAY ON SITE</h2>
            <p className="text-xs text-muted-foreground">Construction Reports</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {visibleMainItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Main</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleMainItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={location === item.url || (item.url !== "/" && location.startsWith(item.url))}
                    >
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {visibleMgmtItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleMgmtItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={location === item.url || location.startsWith(item.url)}
                    >
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {user?.email === SUPER_ADMIN_EMAIL && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    data-active={location === "/event-log"}
                  >
                    <Link href="/event-log" data-testid="link-event-log">
                      <ScrollText className="h-4 w-4" />
                      <span>Event Log</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-3">
        {user && (
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" onClick={() => setShowChangePassword(true)} title="Change password" data-testid="button-change-password">
                <KeyRound className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={logout} title="Log out" className="shrink-0" data-testid="button-logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground text-center">
          MEM - DAY ON SITE v1.0
        </p>
      </SidebarFooter>
      <ChangePasswordDialog open={showChangePassword} onOpenChange={setShowChangePassword} />
    </Sidebar>
  );
}

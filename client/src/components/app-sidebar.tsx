import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarRange,
  BarChart3,
  FileText,
  Building2,
  Settings,
  LogOut,
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
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, permission: "view_dashboard" },
  { title: "Daily Reports", url: "/daily-reports", icon: ClipboardList, permission: "view_daily_report" },
  { title: "Weekly Plan", url: "/weekly-plans", icon: CalendarRange, permission: "view_weekly_plan" },
  { title: "Weekly Report", url: "/weekly-report", icon: BarChart3, permission: "view_weekly_report" },
  { title: "Executive Summary", url: "/executive-summary", icon: FileText, permission: "view_executive_summary" },
];

const managementItems = [
  { title: "Projects", url: "/projects", icon: Building2, permission: "view_projects" },
  { title: "Settings", url: "/settings", icon: Settings, permissions: ["view_users", "view_role_privileges"] },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { hasPermission } = usePermissions();

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
            <h2 className="text-sm font-semibold tracking-tight">DAY ON SITE</h2>
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
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-3">
        {user && (
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="shrink-0" data-testid="button-logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground text-center">
          DAY ON SITE v1.0
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}

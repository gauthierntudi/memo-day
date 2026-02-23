import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus,
  Users,
  Settings,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Shield,
  UserCheck,
  UserX,
  Lock,
  Crown,
  Key,
} from "lucide-react";
import type { User } from "@shared/schema";
import { ORG_ROLES, PERMISSIONS, PERMISSION_LABELS, SUPER_ADMIN_EMAIL } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function UserFormDialog({ user, open, onOpenChange }: { user?: User; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const isEditing = !!user;
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [orgRole, setOrgRole] = useState(user?.orgRole || "");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User added", description: "The user has been added to the list." });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/users/${user!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User updated", description: "User details have been saved." });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !orgRole) {
      toast({ title: "Missing fields", description: "Name, email, and organization role are required.", variant: "destructive" });
      return;
    }
    const data = { name: name.trim(), email: email.trim(), phone: phone.trim() || null, orgRole };
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-user-form">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit User" : "Add New User"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update user details below." : "Add a new authorized user to the system."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="user-name">Full Name *</Label>
            <Input id="user-name" data-testid="input-user-name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter full name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">Email Address *</Label>
            <Input
              id="user-email"
              data-testid="input-user-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@company.com"
              disabled={isSuperAdmin}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-phone">Phone Number</Label>
            <Input id="user-phone" data-testid="input-user-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+971 50 000 0000" />
          </div>
          <div className="space-y-2">
            <Label>Organization Role *</Label>
            <Select value={orgRole} onValueChange={setOrgRole}>
              <SelectTrigger data-testid="select-org-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ORG_ROLES.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" data-testid="button-cancel-user">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isPending} data-testid="button-save-user">
            {isPending ? "Saving..." : isEditing ? "Save Changes" : "Add User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SetPasswordDialog({ userId, userName, open, onOpenChange }: { userId: string; userName: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async (pwd: string) => {
      const res = await apiRequest("POST", `/api/users/${userId}/set-password`, { password: pwd });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password set", description: `Password has been set for ${userName}.` });
      setPassword("");
      setConfirmPassword("");
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!password || password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    mutation.mutate(password);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-set-password">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Set Password</DialogTitle>
          <DialogDescription>Set a login password for {userName}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              data-testid="input-new-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              data-testid="input-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={mutation.isPending} data-testid="button-save-password">
            {mutation.isPending ? "Saving..." : "Set Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PrivilegesPanel() {
  const { toast } = useToast();
  const { data: privileges, isLoading } = useQuery<Record<string, string[]>>({
    queryKey: ["/api/role-privileges"],
  });

  const [localPrivs, setLocalPrivs] = useState<Record<string, string[]>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (privileges) {
      setLocalPrivs(privileges);
      setHasChanges(false);
    }
  }, [privileges]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string[]>) => {
      const res = await apiRequest("PUT", "/api/role-privileges", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-privileges"] });
      setHasChanges(false);
      toast({ title: "Privileges saved successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const togglePermission = (role: string, permission: string) => {
    setLocalPrivs(prev => {
      const current = prev[role] || [];
      const updated = current.includes(permission)
        ? current.filter(p => p !== permission)
        : [...current, permission];
      return { ...prev, [role]: updated };
    });
    setHasChanges(true);
  };

  const toggleAllForRole = (role: string) => {
    setLocalPrivs(prev => {
      const current = prev[role] || [];
      const allChecked = PERMISSIONS.every(p => current.includes(p));
      return { ...prev, [role]: allChecked ? [] : [...PERMISSIONS] };
    });
    setHasChanges(true);
  };

  const toggleAllForPermission = (permission: string) => {
    setLocalPrivs(prev => {
      const allChecked = ORG_ROLES.every(role => (prev[role] || []).includes(permission));
      const updated = { ...prev };
      for (const role of ORG_ROLES) {
        const current = updated[role] || [];
        if (allChecked) {
          updated[role] = current.filter(p => p !== permission);
        } else if (!current.includes(permission)) {
          updated[role] = [...current, permission];
        }
      }
      return updated;
    });
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" /> Role Privileges
          </h2>
          <p className="text-sm text-muted-foreground">Define what each organization role can access and do in the system.</p>
        </div>
        <Button
          onClick={() => saveMutation.mutate(localPrivs)}
          disabled={!hasChanges || saveMutation.isPending}
          data-testid="button-save-privileges"
        >
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="overflow-x-auto -mx-6 px-6">
        <Card className="min-w-fit">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 min-w-[160px] font-semibold border-r">
                    Organization Role
                  </TableHead>
                  {PERMISSIONS.map(perm => (
                    <TableHead key={perm} className="text-center px-1 w-[80px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] leading-tight whitespace-nowrap">{PERMISSION_LABELS[perm]}</span>
                        <Checkbox
                          checked={ORG_ROLES.every(role => (localPrivs[role] || []).includes(perm))}
                          onCheckedChange={() => toggleAllForPermission(perm)}
                          data-testid={`checkbox-all-${perm}`}
                        />
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ORG_ROLES.map(role => {
                  const rolePerms = localPrivs[role] || [];
                  const allChecked = PERMISSIONS.every(p => rolePerms.includes(p));
                  return (
                    <TableRow key={role} data-testid={`row-role-${role}`}>
                      <TableCell className="sticky left-0 bg-card z-10 font-medium border-r">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allChecked}
                            onCheckedChange={() => toggleAllForRole(role)}
                            data-testid={`checkbox-all-role-${role}`}
                          />
                          <span className="text-xs whitespace-nowrap">{role}</span>
                        </div>
                      </TableCell>
                      {PERMISSIONS.map(perm => (
                        <TableCell key={perm} className="text-center px-1">
                          <Checkbox
                            checked={rolePerms.includes(perm)}
                            onCheckedChange={() => togglePermission(role, perm)}
                            data-testid={`checkbox-${role}-${perm}`}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const [passwordUser, setPasswordUser] = useState<{ id: string; name: string } | null>(null);

  const { data: users, isLoading } = useQuery<User[]>({ queryKey: ["/api/users"] });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/users/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User removed", description: "The user has been removed from the list." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openAddDialog = () => {
    setEditingUser(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const activeCount = users?.filter(u => u.isActive).length || 0;
  const totalCount = users?.length || 0;


  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-settings">
          <Settings className="h-6 w-6" /> Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage users, access control, and role privileges.
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users"><Users className="h-4 w-4 mr-2" /> Users</TabsTrigger>
          <TabsTrigger value="privileges" data-testid="tab-privileges"><Shield className="h-4 w-4 mr-2" /> Privileges</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={openAddDialog} data-testid="button-add-user">
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-users">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-active-users">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
              <UserX className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-inactive-users">{totalCount - activeCount}</p>
              <p className="text-xs text-muted-foreground">Inactive Users</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">User List</CardTitle>
        </CardHeader>
        <CardContent>
          {!users || users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground">No users added yet</p>
              <Button variant="outline" className="mt-4" onClick={openAddDialog} data-testid="button-add-first-user">
                <Plus className="h-4 w-4 mr-2" /> Add First User
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {users.map(user => {
                const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
                return (
                  <div key={user.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0" data-testid={`row-user-${user.id}`}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium" data-testid={`text-user-name-${user.id}`}>{user.name}</span>
                        {isSuperAdmin && (
                          <Badge variant="default" className="text-xs bg-amber-500 hover:bg-amber-500">
                            <Crown className="h-3 w-3 mr-1" /> Super Admin
                          </Badge>
                        )}
                        {!user.isActive && (
                          <Badge variant="destructive" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {user.email}</span>
                        {user.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {user.phone}</span>}
                        <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {user.orgRole}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPasswordUser({ id: user.id, name: user.name })}
                        title="Set password"
                        data-testid={`button-set-password-${user.id}`}
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      {!isSuperAdmin && (
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`toggle-${user.id}`} className="text-xs text-muted-foreground sr-only">Active</Label>
                          <Switch
                            id={`toggle-${user.id}`}
                            checked={user.isActive}
                            onCheckedChange={(checked) => toggleMutation.mutate({ id: user.id, isActive: checked })}
                            data-testid={`switch-active-${user.id}`}
                          />
                        </div>
                      )}
                      {isSuperAdmin && (
                        <div className="flex items-center gap-2 opacity-50" title="Super admin is always active">
                          <Switch checked={true} disabled />
                        </div>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)} data-testid={`button-edit-user-${user.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!isSuperAdmin ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" data-testid={`button-delete-user-${user.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {user.name} from the user list? They will no longer be able to log in or sign up.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(user.id)} data-testid={`button-confirm-delete-${user.id}`}>
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button variant="ghost" size="icon" disabled className="opacity-30" title="Super admin cannot be removed">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="privileges">
          <PrivilegesPanel />
        </TabsContent>
      </Tabs>

      <UserFormDialog user={editingUser} open={dialogOpen} onOpenChange={setDialogOpen} />
      {passwordUser && (
        <SetPasswordDialog
          userId={passwordUser.id}
          userName={passwordUser.name}
          open={!!passwordUser}
          onOpenChange={(open) => { if (!open) setPasswordUser(null); }}
        />
      )}
    </div>
  );
}

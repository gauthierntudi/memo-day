import { useState } from "react";
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
  DialogTrigger,
  DialogFooter,
  DialogClose,
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
} from "lucide-react";
import type { User } from "@shared/schema";
import { APP_ROLES, ORG_ROLES } from "@shared/schema";

function UserFormDialog({ user, open, onOpenChange }: { user?: User; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const isEditing = !!user;

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [orgRole, setOrgRole] = useState(user?.orgRole || "");
  const [appRole, setAppRole] = useState(user?.appRole || "user");

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
    const data = { name: name.trim(), email: email.trim(), phone: phone.trim() || null, orgRole, appRole };
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
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="user-name">Full Name *</Label>
            <Input id="user-name" data-testid="input-user-name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter full name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">Email Address *</Label>
            <Input id="user-email" data-testid="input-user-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" />
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
          <div className="space-y-2">
            <Label>App Role *</Label>
            <Select value={appRole} onValueChange={setAppRole}>
              <SelectTrigger data-testid="select-app-role">
                <SelectValue placeholder="Select app role" />
              </SelectTrigger>
              <SelectContent>
                {APP_ROLES.map(r => (
                  <SelectItem key={r} value={r}>
                    <span className="capitalize">{r}</span>
                  </SelectItem>
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

export default function SettingsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);

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

  const appRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "default";
      case "user": return "secondary";
      case "viewer": return "outline";
      default: return "secondary";
    }
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-settings">
            <Settings className="h-6 w-6" /> Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage users and access control. Only emails on this list can log in or sign up.
          </p>
        </div>
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
              {users.map(user => (
                <div key={user.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0" data-testid={`row-user-${user.id}`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium" data-testid={`text-user-name-${user.id}`}>{user.name}</span>
                      <Badge variant={appRoleBadgeVariant(user.appRole)} className="capitalize text-xs" data-testid={`badge-app-role-${user.id}`}>
                        {user.appRole}
                      </Badge>
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
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`toggle-${user.id}`} className="text-xs text-muted-foreground sr-only">Active</Label>
                      <Switch
                        id={`toggle-${user.id}`}
                        checked={user.isActive}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: user.id, isActive: checked })}
                        data-testid={`switch-active-${user.id}`}
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)} data-testid={`button-edit-user-${user.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UserFormDialog user={editingUser} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

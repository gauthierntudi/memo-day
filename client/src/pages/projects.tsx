import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Building2 } from "lucide-react";
import type { Project } from "@shared/schema";

export default function Projects() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    location: "",
    client: "",
    contractor: "",
    status: "active",
  });

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setOpen(false);
      setForm({ name: "", code: "", location: "", client: "", contractor: "", status: "active" });
      toast({ title: "Project created successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-project">
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required data-testid="input-project-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Project Code</Label>
                <Input id="code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required placeholder="e.g. PRJ-001" data-testid="input-project-code" />
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
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger data-testid="select-project-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-project">
                {createMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
                  <Badge variant={project.status === "active" ? "default" : "secondary"} className="text-xs shrink-0">
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
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
                    <span className="text-muted-foreground">Contractor:</span>
                    <span className="font-medium">{project.contractor}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

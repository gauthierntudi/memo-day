import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CalendarRange, Eye } from "lucide-react";
import type { WeeklyPlan, Project } from "@shared/schema";

export default function WeeklyPlans() {
  const { data: plans, isLoading } = useQuery<WeeklyPlan[]>({
    queryKey: ["/api/weekly-plans"],
  });
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  const sorted = [...(plans || [])].reverse();

  return (
    <div className="p-6 space-y-6" data-testid="weekly-plans-page">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Weekly Plans</h1>
          <p className="text-sm text-muted-foreground">{plans?.length || 0} plans total</p>
        </div>
        <Link href="/weekly-plans/new">
          <Button data-testid="button-new-weekly-plan">
            <Plus className="mr-2 h-4 w-4" /> New Weekly Plan
          </Button>
        </Link>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarRange className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground mb-2">No weekly plans created yet</p>
            <Link href="/weekly-plans/new">
              <Button variant="outline" size="sm" className="mt-2">Create first plan</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map(plan => {
            const project = projects?.find(p => p.id === plan.projectId);
            const activities = plan.plannedActivities as any[];
            const labour = plan.plannedLabour as any[];
            const totalPlannedWorkers = labour?.reduce((s: number, l: any) => s + (l.plannedCount || 0), 0) || 0;

            return (
              <Link key={plan.id} href={`/weekly-plans/${plan.id}`}>
                <Card className="hover-elevate cursor-pointer" data-testid={`card-plan-${plan.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold">Week {plan.weekNumber}</span>
                          <Badge variant={plan.status === "approved" ? "default" : "secondary"} className="text-xs">{plan.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{project?.name || "—"}</p>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span>{plan.weekStartDate} - {plan.weekEndDate}</span>
                          <span>{activities?.length || 0} activities</span>
                          <span>{totalPlannedWorkers} workers planned</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

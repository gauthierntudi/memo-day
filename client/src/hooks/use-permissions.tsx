import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import type { PERMISSIONS } from "@shared/schema";

type Permission = (typeof PERMISSIONS)[number];

export function usePermissions() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<{ permissions: string[]; projectIds: number[] }>({
    queryKey: ["/api/my-permissions"],
    enabled: !!user,
  });

  const permissions = data?.permissions || [];
  const projectIds = data?.projectIds || [];

  const hasPermission = (perm: Permission | string): boolean => {
    return permissions.includes(perm);
  };

  const canAccessProject = (projectId: number): boolean => {
    if (projectIds.includes(-1)) return true;
    return projectIds.includes(projectId);
  };

  const hasAllProjects = projectIds.includes(-1);

  return { permissions, projectIds, hasPermission, canAccessProject, hasAllProjects, isLoading };
}

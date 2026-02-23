import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import type { PERMISSIONS } from "@shared/schema";

type Permission = (typeof PERMISSIONS)[number];

export function usePermissions() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<{ permissions: string[] }>({
    queryKey: ["/api/my-permissions"],
    enabled: !!user,
  });

  const permissions = data?.permissions || [];

  const hasPermission = (perm: Permission | string): boolean => {
    return permissions.includes(perm);
  };

  return { permissions, hasPermission, isLoading };
}

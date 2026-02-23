import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  appRole: string;
  orgRole: string;
}

interface RegisterData {
  name: string;
  email: string;
  phone?: string;
  password: string;
  orgRole: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  loginError: string | null;
  isLoggingIn: boolean;
  registerError: string | null;
  isRegistering: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function parseErrorMessage(error: Error): string {
  return error.message.replace(/^\d+:\s*/, "").replace(/^"?(.*?)"?$/, "$1").replace(/[{}"]/g, "").replace(/message:/, "").trim();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      queryClient.invalidateQueries();
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      queryClient.invalidateQueries();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const register = async (data: RegisterData) => {
    await registerMutation.mutateAsync(data);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const loginError = loginMutation.error ? parseErrorMessage(loginMutation.error) : null;
  const registerError = registerMutation.error ? parseErrorMessage(registerMutation.error) : null;

  return (
    <AuthContext.Provider value={{
      user: user ?? null,
      isLoading,
      login,
      logout,
      register,
      loginError,
      isLoggingIn: loginMutation.isPending,
      registerError,
      isRegistering: registerMutation.isPending,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

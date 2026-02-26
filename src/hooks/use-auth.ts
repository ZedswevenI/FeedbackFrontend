import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type LoginInput = z.infer<typeof api.auth.login.input>;

const TOKEN_KEY = 'feedback_token';
const SESSIONS_KEY = 'feedback_sessions';
const CURRENT_SESSION_KEY = 'feedback_current_session';

interface SessionData {
  token: string;
  username: string;
  role: string;
  batch?: string;
}

function getAllSessions(): Record<string, SessionData> {
  const data = localStorage.getItem(SESSIONS_KEY);
  return data ? JSON.parse(data) : {};
}

function saveSession(username: string, sessionData: SessionData) {
  const sessions = getAllSessions();
  sessions[username] = sessionData;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  localStorage.setItem(CURRENT_SESSION_KEY, username);
}

function getCurrentSessionUsername(): string | null {
  return localStorage.getItem(CURRENT_SESSION_KEY);
}

export function getToken(): string | null {
  const currentUser = getCurrentSessionUsername();
  if (!currentUser) return null;
  
  const sessions = getAllSessions();
  return sessions[currentUser]?.token || null;
}

function setToken(token: string, username: string, role: string, batch?: string) {
  saveSession(username, { token, username, role, batch });
}

function clearToken() {
  const currentUser = getCurrentSessionUsername();
  if (currentUser) {
    const sessions = getAllSessions();
    delete sessions[currentUser];
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }
  localStorage.removeItem(CURRENT_SESSION_KEY);
}

export function useAuth() {
  
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const token = getToken();
      if (!token) {
        return null;
      }
      
      try {
        const res = await fetch(buildUrl(api.auth.user.path), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (res.status === 401) {
          const cachedUser = queryClient.getQueryData(["auth-user"]);
          if (cachedUser) {
            return cachedUser;
          }
          clearToken();
          return null;
        }
        if (!res.ok) throw new Error("Failed to fetch user");
        const userData = api.auth.user.responses[200].parse(await res.json());
        return userData;
      } catch (error) {
        const cachedUser = queryClient.getQueryData(["auth-user"]);
        if (cachedUser) {
          return cachedUser;
        }
        throw error;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginInput) => {
      const res = await fetch(buildUrl(api.auth.login.path), {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Invalid username or password");
        }
        throw new Error("Login failed");
      }
      const jsonData = await res.json();
      return api.auth.login.responses[200].parse(jsonData);
    },
    onSuccess: (data) => {
      setToken(data.token, data.username, data.role, data.batch ?? undefined);
      const user = { username: data.username, role: data.role, batch: data.batch };
      queryClient.setQueryData(["auth-user"], user);
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
      toast({
        title: "Welcome back",
        description: `Logged in as ${user.username}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const token = getToken();
      const res = await fetch(buildUrl(api.auth.logout.path), {
        method: api.auth.logout.method,
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      clearToken();
      queryClient.setQueryData(["auth-user"], null);
      navigate("/login");
      toast({
        title: "Logged out",
        description: "See you next time",
      });
    },
  });

  return {
    user,
    isLoading,
    isError,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}

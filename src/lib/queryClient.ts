import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getApiBaseUrl } from "./api";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Check for auto-refreshed token
  const newToken = res.headers.get('X-New-Token');
  if (newToken) {
    const currentToken = localStorage.getItem('token');
    if (currentToken) {
      localStorage.setItem('token', newToken);
    }
  }

  // Handle token expiration
  if (res.status === 401) {
    const contentType = res.headers.get('Content-Type');
    if (contentType?.includes('application/json')) {
      const errorData = await res.json();
      
      if (errorData.code === 'TOKEN_EXPIRED') {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const refreshRes = await fetch(`${getApiBaseUrl()}/api/auth/refresh-token`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              credentials: 'include'
            });
            
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              if (refreshData.success && refreshData.data?.token) {
                localStorage.setItem('token', refreshData.data.token);
                // Retry original request
                return apiRequest(method, url, data);
              }
            }
          } catch (e) {
            console.error('Token refresh failed:', e);
          }
        }
        
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Token expired');
      }
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    // Check for auto-refreshed token
    const newToken = res.headers.get('X-New-Token');
    if (newToken) {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        localStorage.setItem('token', newToken);
      }
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

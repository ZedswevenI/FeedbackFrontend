import { useAuth, getToken } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface User {
  username: string;
  role: string;
  batch?: string;
}

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  allowedRoles?: string[];
}

export function ProtectedRoute({ component: Component, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const typedUser = user as User | null;
  const [, navigate] = useLocation();
  const token = getToken();

  useEffect(() => {
    if (!isLoading && !user && !token) {
      navigate('/login');
    } else if (typedUser && allowedRoles && !allowedRoles.includes(typedUser.role)) {
      if (typedUser.role === 'STUDENT') {
        navigate('/student');
      } else {
        navigate('/admin');
      }
    }
  }, [user, typedUser, isLoading, token, allowedRoles, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !token) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (typedUser && allowedRoles && !allowedRoles.includes(typedUser.role)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return <Component />;
}

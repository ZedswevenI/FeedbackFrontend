import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { api } from "@shared/routes";
import { GraduationCap, Lock, User } from "lucide-react";
import { useLocation } from "wouter";

const formSchema = api.auth.login.input;

export default function Login() {
  const { login, isLoggingIn, user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    login(data);
  };

  useEffect(() => {
    if (user && !isLoading && typeof user === 'object' && 'role' in user) {
      const targetPath = (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') ? '/admin' : '/student';
      navigate(targetPath);
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background z-0" />
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-blue-400/10 rounded-full blur-3xl" />

      <Card className="w-full max-w-md shadow-2xl border-border/50 bg-card/80 backdrop-blur-xl relative z-10">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-2">
            <img src="/z7i-logo-1.png" alt="Z7i Logo" className="h-16 w-16 object-contain" />
          </div>
          <CardTitle className="text-3xl font-display font-bold text-foreground">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-base">
            Feedback Management System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Enter your ID" className="pl-9 h-11" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input type="password" placeholder="Enter your password" className="pl-9 h-11" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium shadow-lg hover:shadow-primary/25 transition-all" 
                disabled={isLoggingIn}
              >
                {isLoggingIn ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-center border-t pt-4 pb-6">
          <p className="text-xs text-muted-foreground text-center">
            For support, contact the System Administrator.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

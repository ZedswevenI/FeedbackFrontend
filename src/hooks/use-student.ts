import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getToken } from "@/hooks/use-auth";

type SubmitFeedbackInput = z.infer<typeof api.student.submit.input>;

export function useActiveFeedback() {
  return useQuery({
    queryKey: [api.student.activeFeedback.path],
    queryFn: async () => {
      const token = getToken();
      const res = await fetch(buildUrl(api.student.activeFeedback.path), {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch feedback list");
      return api.student.activeFeedback.responses[200].parse(await res.json());
    },
  });
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Remove automatic navigation - let components handle it

  return useMutation({
    mutationFn: async (data: SubmitFeedbackInput) => {
      const token = getToken();
      const res = await fetch(buildUrl(api.student.submit.path), {
        method: api.student.submit.method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.student.submit.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to submit feedback");
      }
      return api.student.submit.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.student.activeFeedback.path] });
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your valuable feedback.",
      });
      // Let components handle navigation
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

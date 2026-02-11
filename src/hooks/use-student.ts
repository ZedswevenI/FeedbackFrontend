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

  return useMutation({
    mutationFn: async (data: SubmitFeedbackInput) => {
      const token = getToken();
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      try {
        const res = await fetch(buildUrl(api.student.submit.path), {
          method: api.student.submit.method,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(data),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!res.ok) {
          if (res.status === 400) {
            const error = api.student.submit.responses[400].parse(await res.json());
            throw new Error(error.message);
          }
          if (res.status === 409) {
            throw new Error('Feedback already submitted');
          }
          throw new Error("Failed to submit feedback");
        }
        const result = api.student.submit.responses[200].parse(await res.json());
        if (result.status === 'already_completed') {
          throw new Error('Feedback already submitted');
        }
        return result;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please try again');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.student.activeFeedback.path] });
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your valuable feedback.",
      });
    },
    onError: (error: Error) => {
      if (error.message.includes('already submitted')) {
        toast({
          title: "Already Submitted",
          description: "Your feedback has already been recorded.",
          variant: "default",
        });
      } else {
        toast({
          title: "Submission Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });
}

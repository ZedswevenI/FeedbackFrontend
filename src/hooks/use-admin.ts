import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/hooks/use-auth";

type CreateScheduleInput = z.infer<typeof api.admin.schedule.input>;

export function useAdminMetadata() {
  return useQuery({
    queryKey: [api.admin.metadata.path],
    queryFn: async () => {
      const token = getToken();
      const res = await fetch(buildUrl(api.admin.metadata.path), {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch metadata");
      return api.admin.metadata.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateScheduleInput) => {
      const token = getToken();
      const res = await fetch(buildUrl(api.admin.schedule.path), {
        method: api.admin.schedule.method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.admin.schedule.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create schedule");
      }
      return api.admin.schedule.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.metadata.path] });
      queryClient.invalidateQueries({ queryKey: [api.admin.schedules.path] });
      toast({
        title: "Schedule Created",
        description: "Feedback session has been scheduled successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useAnalytics(staffId: number, filters?: { batchId?: string; subjectId?: string }) {
  const path = buildUrl(api.admin.analytics.path, { staffId });
  const queryParams = new URLSearchParams();
  if (filters?.batchId && filters.batchId !== 'all') queryParams.append("batchId", filters.batchId);
  if (filters?.subjectId && filters.subjectId !== 'all') queryParams.append("subjectId", filters.subjectId);

  const url = `${path}?${queryParams.toString()}`;

  return useQuery({
    queryKey: [api.admin.analytics.path, staffId, filters],
    queryFn: async () => {
      if (!staffId) return null;
      const token = getToken();
      const res = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return api.admin.analytics.responses[200].parse(await res.json());
    },
    enabled: !!staffId,
  });
}

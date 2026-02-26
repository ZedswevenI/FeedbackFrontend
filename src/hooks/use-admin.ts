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

export function useAnalytics(staffId: number | string, filters?: { batchIds?: string[]; phases?: string[]; subjectIds?: string[]; templateId?: string; fromDate?: string; toDate?: string }, options?: { enabled?: boolean }) {
  const actualStaffId = staffId === "all" ? 0 : Number(staffId);
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const path = `${baseUrl}/api/feedback/admin/analytics/${actualStaffId}`;
  
  const queryParams = new URLSearchParams();
  if (filters?.batchIds && filters.batchIds.length > 0) {
    filters.batchIds.forEach(id => queryParams.append("batchIds", id));
  }
  if (filters?.phases && filters.phases.length > 0) {
    filters.phases.forEach(p => queryParams.append("phases", p));
  }
  if (filters?.subjectIds && filters.subjectIds.length > 0) {
    filters.subjectIds.forEach(id => queryParams.append("subjectIds", id));
  }
  if (filters?.templateId && filters.templateId !== 'all') {
    queryParams.append("templateId", filters.templateId);
  }
  if (filters?.fromDate) queryParams.append("fromDate", filters.fromDate);
  if (filters?.toDate) queryParams.append("toDate", filters.toDate);

  const url = queryParams.toString() ? `${path}?${queryParams.toString()}` : path;

  return useQuery({
    queryKey: ['analytics', actualStaffId, filters?.batchIds, filters?.phases, filters?.subjectIds, filters?.templateId, filters?.fromDate, filters?.toDate],
    queryFn: async () => {
      if (!staffId || staffId === "") return [];
      
      const token = getToken();
      const res = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      
      if (!res.ok) {
        console.error('Analytics fetch failed:', res.status, res.statusText);
        throw new Error(`Failed to fetch analytics: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Analytics data received:', data);
      return data || [];
    },
    enabled: options?.enabled !== false && !!staffId && staffId !== "",
  });
}

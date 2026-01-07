import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { getToken } from "@/hooks/use-auth";

export function useSchedules() {
  return useQuery({
    queryKey: [api.admin.schedules.path],
    queryFn: async () => {
      const token = getToken();
      const res = await fetch(buildUrl(api.admin.schedules.path), {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch schedules");
      return api.admin.schedules.responses[200].parse(await res.json());
    },
  });
}

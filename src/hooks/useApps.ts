import { useQuery } from "@tanstack/react-query";
import { appsApi, type App, type AppsQueryParams, type PaginatedResponse } from "@/lib/api";

export const useApps = (params?: AppsQueryParams) => {
  return useQuery({
    queryKey: ["apps", params],
    queryFn: () => appsApi.getAll(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useApp = (id: number) => {
  return useQuery({
    queryKey: ["app", id],
    queryFn: () => appsApi.getById(id),
    enabled: !!id,
  });
};

export const useFeaturedApps = () => {
  return useQuery({
    queryKey: ["apps", "featured"],
    queryFn: () => appsApi.getAll({ featured: true }),
    staleTime: 1000 * 60 * 5,
  });
};

export const usePaginatedApps = (params: AppsQueryParams) => {
  return useQuery({
    queryKey: ["apps", "paginated", params],
    queryFn: () => appsApi.getAll(params),
    staleTime: 1000 * 60 * 5,
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });
};

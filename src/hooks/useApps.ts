import { useQuery } from "@tanstack/react-query";
import { productsApi, type Product, type ProductsQueryParams, type PaginatedResponse } from "@/lib/api";

export const useApps = (params?: ProductsQueryParams) => {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => productsApi.getAll(params),
    staleTime: 1000 * 60 * 5,
  });
};

export const useApp = (id: number) => {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => productsApi.getById(id),
    enabled: !!id,
  });
};

export const useFeaturedApps = () => {
  return useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => productsApi.getAll({ featured: true }),
    staleTime: 1000 * 60 * 5,
  });
};

export const usePaginatedApps = (params: ProductsQueryParams) => {
  return useQuery({
    queryKey: ["products", "paginated", params],
    queryFn: () => productsApi.getAll(params),
    staleTime: 1000 * 60 * 5,
    placeholderData: (previousData) => previousData,
  });
};

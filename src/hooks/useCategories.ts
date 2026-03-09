import { useQuery } from "@tanstack/react-query";
import { categoriesApi, type Category } from "@/lib/api";

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const response = await categoriesApi.getAll();
      // Handle various response shapes from the API
      if (Array.isArray(response)) return response;
      if (response && Array.isArray((response as any).categories)) return (response as any).categories;
      if (response && typeof response === 'object' && 'data' in (response as any)) {
        const data = (response as any).data;
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.categories)) return data.categories;
      }
      return [];
    },
    select: (data: any): Category[] => {
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.categories)) return data.categories;
      return [];
    },
    staleTime: 1000 * 60 * 10,
  });
};

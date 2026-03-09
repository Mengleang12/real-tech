import { useQuery } from "@tanstack/react-query";
import { categoriesApi, type Category } from "@/lib/api";

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const response = await categoriesApi.getAll();
      // Handle various response shapes from the API
      if (Array.isArray(response)) return response;
      if (response && Array.isArray(response.categories)) return response.categories;
      if (response && typeof response === 'object' && 'data' in response) {
        const data = (response as any).data;
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.categories)) return data.categories;
      }
      return [];
    },
    staleTime: 1000 * 60 * 10,
  });
};

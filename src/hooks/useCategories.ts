import { useQuery } from "@tanstack/react-query";
import { categoriesApi, type Category } from "@/lib/api";

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await categoriesApi.getAll();
      return Array.isArray(response?.categories) ? response.categories : Array.isArray(response) ? response : [];
    },
    staleTime: 1000 * 60 * 10,
  });
};

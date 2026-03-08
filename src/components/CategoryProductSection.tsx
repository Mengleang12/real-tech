import { useMemo } from "react";
import { ProductCard } from "./ProductCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePaginatedApps } from "@/hooks/useApps";
import { useOrders } from "@/hooks/useOrders";
import { Skeleton } from "@/components/ui/skeleton";
import type { Category } from "@/lib/api";

interface CategoryProductSectionProps {
  category: Category;
  searchQuery?: string;
  limit?: number;
  showEmpty?: boolean;
}

const SectionSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="rounded-2xl border border-border/40 overflow-hidden bg-card">
        <Skeleton className="w-full aspect-[4/3]" />
        <div className="p-3.5 space-y-2.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

export const CategoryProductSection = ({ category, searchQuery = "", limit = 10 }: CategoryProductSectionProps) => {
  const { language } = useLanguage();

  const { data, isLoading } = usePaginatedApps({
    category_id: category.id,
    search: searchQuery || undefined,
    page: 1,
    limit,
  });

  const { data: orders } = useOrders();

  const purchasedIds = useMemo(() => {
    if (!orders) return new Set<number>();
    return new Set(
      orders.filter(o => o.status === 'paid').map(o => o.product_id)
    );
  }, [orders]);

  const products = data?.data || [];
  const total = data?.pagination?.total || 0;

  // Don't render empty categories
  if (!isLoading && products.length === 0) {
    return null;
  }

  const displayName = language === 'km' && category.name_km ? category.name_km : category.name;

  return (
    <section id={`category-${category.slug}`} className="mb-10 scroll-mt-20">
      <div className="flex items-center gap-2.5 mb-6">
        {category.icon_url && (
          <img src={category.icon_url} alt="" className="w-6 h-6 rounded object-contain" />
        )}
        <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
        {total > 0 && (
          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {total}
          </span>
        )}
      </div>

      {isLoading ? (
        <SectionSkeleton />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} app={product} purchased={purchasedIds.has(product.id)} />
          ))}
        </div>
      )}
    </section>
  );
};

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AppCard } from "./AppCard";
import { useTranslations } from "@/contexts/LanguageContext";
import { usePaginatedApps } from "@/hooks/useApps";
import { useOrders } from "@/hooks/useOrders";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AppFilters, type FilterOptions } from "./AppFilters";

interface AppGridProps {
  title?: string;
  showViewAll?: boolean;
  searchQuery?: string;
  itemsPerPage?: number;
  showFilters?: boolean;
}

const AppGridSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="rounded-2xl border border-border/40 overflow-hidden bg-card">
        <Skeleton className="w-full aspect-[4/3]" />
        <div className="p-3.5 space-y-2.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-12 text-muted-foreground">
    <p>{message}</p>
  </div>
);

export const AppGrid = ({ 
  title, 
  showViewAll = true, 
  searchQuery = "", 
  itemsPerPage = 10, 
  showFilters = true 
}: AppGridProps) => {
  const t = useTranslations();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterOptions>({});
  
  // Get page from URL params, default to 1
  const currentPage = parseInt(searchParams.get('appPage') || '1', 10);
  
  const setCurrentPage = useCallback((page: number | ((prev: number) => number)) => {
    const newPage = typeof page === 'function' ? page(currentPage) : page;
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (newPage === 1) {
        newParams.delete('appPage');
      } else {
        newParams.set('appPage', String(newPage));
      }
      return newParams;
    });
  }, [currentPage, setSearchParams]);
  
  const { data, isLoading, error, isFetching } = usePaginatedApps({
    search: searchQuery || undefined,
    page: currentPage,
    limit: itemsPerPage,
    popular: filters.popular || undefined,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    freeOnly: filters.freeOnly || undefined,
  });

  // Get user's purchased orders
  const { data: orders } = useOrders();
  
  // Create a Set of purchased app IDs for quick lookup
  const purchasedAppIds = useMemo(() => {
    if (!orders) return new Set<number>();
    return new Set(
      orders
        .filter(order => order.status === 'paid')
        .map(order => order.product_id)
    );
  }, [orders]);

  // Reset to page 1 when search or filters change (but not on initial mount)
  const prevSearchRef = useRef(searchQuery);
  const prevFiltersRef = useRef(filters);
  useEffect(() => {
    if (prevSearchRef.current !== searchQuery || prevFiltersRef.current !== filters) {
      prevSearchRef.current = searchQuery;
      prevFiltersRef.current = filters;
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    }
  }, [searchQuery, filters]);

  const apps = data?.data || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.total_pages || 1;
  const total = pagination?.total || 0;

  const displayTitle = title || t.programs;

  // Hide section if searching and no results
  if (searchQuery && total === 0 && !isLoading) {
    return null;
  }

  return (
    <section className="mb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-bold text-foreground">{displayTitle}</h2>
          {total > 0 && (
            <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {showFilters && (
            <AppFilters filters={filters} onFiltersChange={setFilters} />
          )}
          {showViewAll && !searchQuery && (
            <a href="#" className="section-link">{t.viewAll}</a>
          )}
        </div>
      </div>

      {isLoading && !data ? (
        <AppGridSkeleton />
      ) : error ? (
        <EmptyState message="Failed to load apps. Please try again." />
      ) : apps.length > 0 ? (
        <div className={isFetching ? "opacity-70 transition-opacity" : ""}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {apps.map((app) => (
              <AppCard key={app.id} app={app} purchased={purchasedAppIds.has(app.id)} />
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isFetching}
                className="h-9 w-9 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  const showPage = page === 1 || page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1);
                  const showEllipsis = page === currentPage - 2 || page === currentPage + 2;
                  
                  if (showEllipsis && totalPages > 5) {
                    return <span key={page} className="px-1 text-muted-foreground">...</span>;
                  }
                  
                  if (!showPage && totalPages > 5) return null;
                  
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      disabled={isFetching}
                      className="h-9 w-9 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || isFetching}
                className="h-9 w-9 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState message="No programs available yet." />
      )}
    </section>
  );
};

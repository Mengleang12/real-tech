import { useState, useCallback } from "react";

import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { HeroSlider } from "@/components/HeroSlider";
import { PopularApps } from "@/components/PopularApps";
import { CategoryProductSection } from "@/components/CategoryProductSection";
import { CategoryChips } from "@/components/CategoryChips";
import { PageTransition } from "@/components/PageTransition";
import { FloatingCartButton } from "@/components/FloatingCartButton";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { useCategories } from "@/hooks/useCategories";
import { Skeleton } from "@/components/ui/skeleton";
import { PackageOpen } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { StoreFooter } from "@/components/StoreFooter";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { language } = useLanguage();
  const t = useTranslations();
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  // Filter only active categories, sorted by sort_order
  const activeCategories = (Array.isArray(categories) ? categories : [])
    .filter(c => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const handleCategoryChange = useCallback((slug: string) => {
    setActiveCategory(slug);
    setSidebarOpen(false);

    // If "all" view and selecting a specific category, scroll to that section
    if (slug !== "all") {
      setTimeout(() => {
        const el = document.getElementById(`category-${slug}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const renderContent = () => {
    // When searching, show all categories
    if (searchQuery) {
      return (
        <>
          {activeCategories.map(cat => (
            <CategoryProductSection key={cat.id} category={cat} searchQuery={searchQuery} />
          ))}
        </>
      );
    }

    // Specific category selected
    if (activeCategory !== "all") {
      const selectedCat = activeCategories.find(c => c.slug === activeCategory);
      if (selectedCat) {
        return <CategoryProductSection category={selectedCat} searchQuery={searchQuery} limit={20} showEmpty />;
      }
      return (
        <EmptyState
          icon={PackageOpen}
          title={language === 'km' ? 'មិនមានផលិតផលនៅឡើយ' : 'No products available yet'}
          description={language === 'km' ? 'សូមពិនិត្យមើលពេលក្រោយ' : 'Check back later for new products'}
        />
      );
    }

    // "all" — show popular + each category section
    return (
      <>
        <PopularApps />
        {categoriesLoading ? (
          <div className="space-y-10">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-6 w-40 mb-6" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="aspect-[4/3] rounded-2xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          activeCategories.map(cat => (
            <CategoryProductSection key={cat.id} category={cat} />
          ))
        )}
      </>
    );
  };

  return (
    <>
    <SEOHead url="/" />
    <div className={`min-h-screen bg-background flex ${language === 'km' ? 'font-khmer' : ''}`}>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        activeCategory={activeCategory} 
        onCategoryChange={handleCategoryChange}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 sm:px-6 lg:px-8">
          <Header 
            searchQuery={searchQuery} 
            onSearchChange={setSearchQuery}
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
            isSidebarOpen={sidebarOpen}
          />
        </div>

        <div className="px-4 sm:px-6 lg:px-8 pb-12 flex-1">
          {!searchQuery && activeCategory === "all" && <HeroSlider />}

          {/* Category Chips Bar - under slider */}
          {!searchQuery && activeCategories.length > 0 && (
            <CategoryChips
              categories={activeCategories}
              activeCategory={activeCategory}
              onCategoryChange={handleCategoryChange}
            />
          )}

          <PageTransition transitionKey={`${activeCategory}-${searchQuery}`}>
            {renderContent()}
          </PageTransition>
        </div>
      </main>

      {/* Floating Cart Button */}
      <FloatingCartButton />
    </div>
    </>
  );
};

export default Index;

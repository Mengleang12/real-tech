import { useState } from "react";

import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { HeroSlider } from "@/components/HeroSlider";
import { PopularApps } from "@/components/PopularApps";
import { CategoryProductSection } from "@/components/CategoryProductSection";
import { PageTransition } from "@/components/PageTransition";
import { FloatingCartButton } from "@/components/FloatingCartButton";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { useCategories } from "@/hooks/useCategories";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { language } = useLanguage();
  const t = useTranslations();
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  // Filter only active categories, sorted by sort_order
  const activeCategories = (categories || [])
    .filter(c => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

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
        return <CategoryProductSection category={selectedCat} searchQuery={searchQuery} limit={20} />;
      }
      return (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">{language === 'km' ? 'មិនមានផលិតផលនៅឡើយ' : 'No products available yet'}</p>
        </div>
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
        onCategoryChange={(category) => {
          setActiveCategory(category);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 pb-12">
        <Header 
          searchQuery={searchQuery} 
          onSearchChange={setSearchQuery}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />
        {!searchQuery && activeCategory === "all" && <HeroSlider />}
        <PageTransition transitionKey={`${activeCategory}-${searchQuery}`}>
          {renderContent()}
        </PageTransition>
      </main>

      {/* Floating Cart Button */}
      <FloatingCartButton />
    </div>
  );
};

export default Index;

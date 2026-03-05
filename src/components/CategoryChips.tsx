import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Category } from "@/lib/api";

interface CategoryChipsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (slug: string) => void;
}

export const CategoryChips = ({ categories, activeCategory, onCategoryChange }: CategoryChipsProps) => {
  const { language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active chip into view
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const chip = activeRef.current;
      const left = chip.offsetLeft - container.offsetLeft - 16;
      container.scrollTo({ left, behavior: "smooth" });
    }
  }, [activeCategory]);

  const allItems = [
    { slug: "all", name: language === "km" ? "ទាំងអស់" : "All", icon_url: null },
    ...categories.map(c => ({
      slug: c.slug,
      name: language === "km" && c.name_km ? c.name_km : c.name,
      icon_url: c.icon_url,
    })),
  ];

  return (
    <div className="my-4">
      <div
        ref={scrollRef}
        className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {allItems.map((item) => {
          const isActive = activeCategory === item.slug;
          return (
            <button
              key={item.slug}
              ref={isActive ? activeRef : null}
              onClick={() => onCategoryChange(item.slug)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 whitespace-nowrap",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-foreground border-border hover:border-primary/50 hover:text-primary"
              )}
            >
              {item.icon_url && (
                <img src={item.icon_url} alt="" className="w-4 h-4 rounded object-contain" />
              )}
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

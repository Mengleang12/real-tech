import { useState } from "react";
import { Filter, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

export interface FilterOptions {
  minPrice?: number;
  maxPrice?: number;
  popular?: boolean;
  freeOnly?: boolean;
}

interface AppFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
}

export const AppFilters = ({ filters, onFiltersChange }: AppFiltersProps) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState<FilterOptions>(filters);

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === "minPrice" || key === "maxPrice") return value !== undefined && value !== "";
    return value === true;
  }).length;

  const handleApply = () => {
    onFiltersChange(tempFilters);
    setIsOpen(false);
  };

  const handleClear = () => {
    const cleared: FilterOptions = {};
    setTempFilters(cleared);
    onFiltersChange(cleared);
    setIsOpen(false);
  };

  const handleRemoveFilter = (key: keyof FilterOptions) => {
    const updated = { ...filters };
    delete updated[key];
    onFiltersChange(updated);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Filter className="w-4 h-4" />
            {language === "km" ? "ត្រង" : "Filter"}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="start">
          <div className="space-y-4">
            <h4 className="font-medium text-sm">
              {language === "km" ? "ជម្រើសត្រង" : "Filter Options"}
            </h4>

            {/* Price Range */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {language === "km" ? "ចន្លោះតម្លៃ (USD)" : "Price Range (USD)"}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Min"
                  value={tempFilters.minPrice ?? ""}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      minPrice: e.target.value ? parseFloat(e.target.value) : undefined,
                      freeOnly: false,
                    })
                  }
                  className="h-8 text-sm"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Max"
                  value={tempFilters.maxPrice ?? ""}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      maxPrice: e.target.value ? parseFloat(e.target.value) : undefined,
                      freeOnly: false,
                    })
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Free Only */}
            <div className="flex items-center justify-between">
              <Label htmlFor="free-only" className="text-sm cursor-pointer">
                {language === "km" ? "ឥតគិតថ្លៃតែប៉ុណ្ណោះ" : "Free Only"}
              </Label>
              <Switch
                id="free-only"
                checked={tempFilters.freeOnly ?? false}
                onCheckedChange={(checked) =>
                  setTempFilters({
                    ...tempFilters,
                    freeOnly: checked,
                    minPrice: checked ? undefined : tempFilters.minPrice,
                    maxPrice: checked ? undefined : tempFilters.maxPrice,
                  })
                }
              />
            </div>

            {/* Popular Only */}
            <div className="flex items-center justify-between">
              <Label htmlFor="popular-only" className="text-sm cursor-pointer">
                {language === "km" ? "ពេញនិយមតែប៉ុណ្ណោះ" : "Popular Only"}
              </Label>
              <Switch
                id="popular-only"
                checked={tempFilters.popular ?? false}
                onCheckedChange={(checked) =>
                  setTempFilters({ ...tempFilters, popular: checked || undefined })
                }
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-2 border-t border-border">
              <Button variant="ghost" size="sm" onClick={handleClear}>
                {language === "km" ? "សម្អាត" : "Clear"}
              </Button>
              <Button size="sm" onClick={handleApply}>
                {language === "km" ? "អនុវត្ត" : "Apply"}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Badges */}
      {filters.freeOnly && (
        <Badge variant="secondary" className="h-7 gap-1 pr-1">
          {language === "km" ? "ឥតគិតថ្លៃ" : "Free"}
          <button
            onClick={() => handleRemoveFilter("freeOnly")}
            className="ml-1 hover:bg-muted rounded p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      )}
      {!filters.freeOnly && (filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
        <Badge variant="secondary" className="h-7 gap-1 pr-1">
          ${filters.minPrice ?? 0} - ${filters.maxPrice ?? "∞"}
          <button
            onClick={() => {
              handleRemoveFilter("minPrice");
              handleRemoveFilter("maxPrice");
            }}
            className="ml-1 hover:bg-muted rounded p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      )}
      {filters.popular && (
        <Badge variant="secondary" className="h-7 gap-1 pr-1">
          {language === "km" ? "ពេញនិយម" : "Popular"}
          <button
            onClick={() => handleRemoveFilter("popular")}
            className="ml-1 hover:bg-muted rounded p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      )}
    </div>
  );
};

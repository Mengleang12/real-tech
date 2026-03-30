import { LayoutGrid, X, ShoppingCart, CreditCard, Settings, LogIn, Package, MapPin, Phone, Send } from "lucide-react";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useCategories } from "@/hooks/useCategories";
import realtechLogo from "@/assets/realtech-logo.png";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

interface SidebarProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

export const Sidebar = ({ activeCategory, onCategoryChange, isOpen = false, onToggle }: SidebarProps) => {
  const { language } = useLanguage();
  const t = useTranslations();
  const { user } = useAuth();
  const location = useLocation();
  const { data: categories, isLoading } = useCategories();
  const [contactInfo, setContactInfo] = useState<{ support_phone?: string; telegram_url?: string }>({});

  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';
    fetch(`${API_BASE_URL}/api/admin/settings/branding`)
      .then(r => r.ok ? r.json() : {})
      .then((d: Record<string, string>) => setContactInfo({ support_phone: d.support_phone, telegram_url: d.telegram_url }))
      .catch(() => {});
  }, []);

  const rawCategories = Array.isArray(categories) ? categories : [];
  const activeCategories = rawCategories
    .filter(c => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const userMenuItems = [
    { path: "/my-purchases", label: language === "km" ? "កម្មវិធីដែលបានទិញ" : "My Purchases", icon: ShoppingCart },
    { path: "/payment-history", label: language === "km" ? "ប្រវត្តិបង់ប្រាក់" : "Payment History", icon: CreditCard },
    { path: "/profile", label: language === "km" ? "ការកំណត់គណនី" : "Profile Settings", icon: Settings },
  ];

  const isOnIndex = location.pathname === "/";

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-[220px] bg-sidebar/80 backdrop-blur-xl border-r border-sidebar-border flex flex-col transition-transform duration-200",
        "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0 lg:static lg:flex"
      )}
    >
      {/* Logo */}
      <div className="h-[70px] flex items-center justify-center px-4 border-b border-sidebar-border/60 relative">
        <div className="w-20 h-20 rounded-md overflow-hidden shrink-0">
          <img src={realtechLogo} alt="Realtech" className="w-full h-full object-contain" />
        </div>
        {onToggle && (
          <button onClick={onToggle} className="absolute right-3 lg:hidden p-1 rounded-md hover:bg-accent">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Categories */}
      <nav className="flex-1 overflow-y-auto scrollbar-macos px-2 py-3 space-y-4">
        <div className="space-y-0.5">
          <p className="px-2.5 py-1 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider select-none">
            {language === "km" ? "ប្រភេទ" : "Categories"}
          </p>
          
          {/* All Products */}
          <button
            onClick={() => onCategoryChange("all")}
            className={cn(
              "w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-all text-left",
              isOnIndex && activeCategory === "all"
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground hover:bg-accent/70 hover:text-foreground"
            )}
          >
            <LayoutGrid className="w-[16px] h-[16px] shrink-0 opacity-80" />
            <span className="flex-1 truncate">{language === "km" ? "ទាំងអស់" : "All Products"}</span>
          </button>

          {/* Dynamic categories */}
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-2.5 py-[7px]">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))
          ) : (
            activeCategories.map((cat) => {
              const isActive = isOnIndex && activeCategory === cat.slug;
              const displayName = language === "km" && cat.name_km ? cat.name_km : cat.name;
              return (
                <button
                  key={cat.id}
                  onClick={() => onCategoryChange(cat.slug)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-all text-left",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-accent/70 hover:text-foreground"
                  )}
                >
                  {cat.icon_url ? (
                    <img src={cat.icon_url} alt="" className="w-4 h-4 rounded object-contain shrink-0 opacity-80" />
                  ) : (
                    <Package className="w-[16px] h-[16px] shrink-0 opacity-80" />
                  )}
                  <span className="flex-1 truncate">{displayName}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Store Contact */}
        <div className="space-y-0.5">
          <p className="px-2.5 py-1 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider select-none">
            {language === "km" ? "ទំនាក់ទំនង" : "Contact"}
          </p>
          <button
            onClick={() => {
              const footer = document.getElementById("store-footer-contact");
              if (footer) {
                footer.scrollIntoView({ behavior: "smooth" });
                onToggle?.();
              }
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-all text-left text-sidebar-foreground hover:bg-accent/70 hover:text-foreground"
          >
            <MapPin className="w-[16px] h-[16px] shrink-0 opacity-80" />
            <span className="flex-1 truncate">{language === "km" ? "ទីតាំងហាង" : "Store Location"}</span>
          </button>
          {contactInfo.support_phone && (
            <a
              href={`tel:${contactInfo.support_phone}`}
              onClick={() => onToggle?.()}
              className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-all text-left text-sidebar-foreground hover:bg-accent/70 hover:text-foreground"
            >
              <Phone className="w-[16px] h-[16px] shrink-0 opacity-80" />
              <span className="flex-1 truncate">{contactInfo.support_phone}</span>
            </a>
          )}
          {contactInfo.telegram_url && (
            <a
              href={contactInfo.telegram_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onToggle?.()}
              className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-all text-left text-sidebar-foreground hover:bg-accent/70 hover:text-foreground"
            >
              <Send className="w-[16px] h-[16px] shrink-0 opacity-80" />
              <span className="flex-1 truncate">Telegram</span>
            </a>
          )}
        </div>

        {/* User Menu */}
        {user && (
          <div className="space-y-0.5">
            <p className="px-2.5 py-1 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider select-none">
              {language === "km" ? "គណនី" : "Account"}
            </p>
            {userMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => onToggle?.()}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-accent/70 hover:text-foreground"
                  )}
                >
                  <Icon className="w-[16px] h-[16px] shrink-0 opacity-80" />
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-sidebar-border/60">
        {!user && (
          <Link
            to="/auth"
            className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium text-sidebar-foreground hover:bg-accent/70 hover:text-foreground transition-all mb-1.5"
          >
            <LogIn className="w-4 h-4 opacity-80" />
            <span>{language === "km" ? "ចូល" : "Sign In"}</span>
          </Link>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 px-1">
          {["DMCA", "Privacy", "FAQ", "Contact"].map((link) => (
            <span
              key={link}
              className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground cursor-pointer transition-colors"
            >
              {link}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
};

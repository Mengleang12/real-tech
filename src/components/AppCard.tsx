import { Package, Heart, ShoppingCart, Zap } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/contexts/CartContext";
import { useRef } from "react";
import type { App } from "@/lib/api";

interface AppCardProps {
  app?: App;
  name?: string;
  name_km?: string;
  version?: string;
  description?: string;
  description_km?: string;
  icon?: string;
  icon_url?: string;
  iconBg?: string;
  hasUpdate?: boolean;
  size?: string;
  purchased?: boolean;
}

const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
};

export const AppCard = (props: AppCardProps) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { toggle, isWishlisted } = useWishlist();
  const { addToCart } = useCart();
  const imgRef = useRef<HTMLImageElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);

  const appId = props.app?.id;
  const name = props.app?.name || props.name || "";
  const nameKm = props.app?.name_km || props.name_km;
  const iconUrl = props.app?.icon_url || props.icon_url;
  const category = props.app?.category || "programs";

  const priceValue = props.app?.price;
  const priceNum = typeof priceValue === "string" ? parseFloat(priceValue) : priceValue || 0;
  const isPaidApp = priceNum > 0;
  const displayName = t(nameKm, name);

  const handleClick = () => {
    if (props.app) {
      navigate(`/${props.app.id}`, {
        state: { from: location.pathname + location.search },
      });
    }
  };

  return (
    <div
      className={`group relative rounded-2xl bg-card border border-border/40 overflow-hidden transition-all duration-300 ease-out hover:shadow-[0_8px_30px_-8px_hsl(var(--foreground)/0.1)] ${props.app ? "cursor-pointer" : ""}`}
      onClick={handleClick}
    >
      {/* Image */}
      <div className="relative w-full aspect-square bg-muted/30 overflow-hidden">
        {iconUrl ? (
          <img
            ref={imgRef}
            src={iconUrl}
            alt={displayName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div ref={placeholderRef} className="w-full h-full flex items-center justify-center bg-secondary">
            <Package className="w-12 h-12 text-muted-foreground/20" />
          </div>
        )}

        {/* Owned badge */}
        {props.purchased && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">
            ✓ {language === "km" ? "បានទិញ" : "Owned"}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="border-t border-border/50" />

      {/* Info */}
      <div className="p-3.5 space-y-2">
        {/* Name */}
        <h3 className="text-sm font-semibold text-foreground line-clamp-1 leading-snug">
          {displayName}
        </h3>

        {/* Price */}
        <div>
          {isPaidApp ? (
            <span className="text-base font-bold text-destructive">
              ${priceNum.toFixed(1)}
            </span>
          ) : (
            <span className="text-sm font-semibold text-primary">
              {language === "km" ? "ឥតគិតថ្លៃ" : "Free"}
            </span>
          )}
        </div>

        {/* Bottom row: buttons + heart */}
        <div className="flex items-center gap-1.5 pt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (props.app) {
                const sourceEl = imgRef.current || placeholderRef.current;
                addToCart(props.app, sourceEl);
              }
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground border border-border rounded-full px-2.5 py-1.5 hover:bg-muted active:scale-95 transition-all duration-150"
          >
            <ShoppingCart className="w-3 h-3" />
            {language === "km" ? "បន្ថែម" : "Cart"}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (props.app) {
                const sourceEl = imgRef.current || placeholderRef.current;
                addToCart(props.app, sourceEl);
                navigate("/checkout");
              }
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-destructive border border-destructive/40 rounded-full px-2.5 py-1.5 hover:bg-destructive/5 active:scale-95 transition-all duration-150"
          >
            <Zap className="w-3 h-3" />
            {language === "km" ? "ទិញ" : "Buy"}
          </button>

          <div className="flex-1" />

          {appId && (
            <button
              onClick={(e) => { e.stopPropagation(); toggle(appId); }}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors duration-150"
            >
              <Heart className={`w-3.5 h-3.5 ${isWishlisted(appId) ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

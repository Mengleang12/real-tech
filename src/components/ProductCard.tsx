import { Package, Heart, ShoppingCart, Zap, AlertTriangle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/contexts/CartContext";
import { useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { appsApi, type App } from "@/lib/api";

interface ProductCardProps {
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

export const ProductCard = (props: ProductCardProps) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { toggle, isWishlisted } = useWishlist();
  const { addToCart, isOutOfStock } = useCart();
  const queryClient = useQueryClient();
  const imgRef = useRef<HTMLImageElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);

  const appId = props.app?.id;
  const name = props.app?.name || props.name || "";
  const nameKm = props.app?.name_km || props.name_km;
  const iconUrl = props.app?.icon_url || props.icon_url;
  const category = props.app?.category || "programs";

  const activeVariants = props.app?.variants?.filter(v => v.is_active) || [];
  const defaultVariant = activeVariants.find(v => v.is_default) || activeVariants[0];
  const priceNum = defaultVariant ? (Number(defaultVariant.price_adjustment) || 0) : 0;
  const isPaidApp = priceNum > 0;
  const displayName = t(nameKm, name);

  const outOfStock = props.app ? isOutOfStock(props.app) : false;

  // Calculate stock info
  const getStockInfo = () => {
    if (!props.app) return null;
    const app = props.app;
    const totalStock = app.variants && app.variants.length > 0
      ? app.variants.filter(v => v.is_active).reduce((sum, v) => sum + v.stock_quantity, 0)
      : 0;
    const threshold = 5;
    if (totalStock <= 0) return { status: 'out' as const, label: language === 'km' ? 'អស់ស្តុក' : 'Out of stock', stock: totalStock };
    if (totalStock <= threshold) return { status: 'low' as const, label: language === 'km' ? `នៅសល់ ${totalStock}` : `${totalStock} left`, stock: totalStock };
    return { status: 'ok' as const, label: language === 'km' ? 'មានស្តុក' : 'In stock', stock: totalStock };
  };
  const stockInfo = getStockInfo();

  // Prefetch product data + JS chunk on hover
  const handlePrefetch = useCallback(() => {
    if (!props.app) return;
    // Prefetch product data
    queryClient.prefetchQuery({
      queryKey: ["app", props.app.id],
      queryFn: () => appsApi.getById(props.app!.id),
      staleTime: 1000 * 60 * 5,
    });
    // Preload ProductDetail chunk
    import("@/pages/ProductDetail");
  }, [props.app, queryClient]);

  const handleClick = () => {
    if (props.app) {
      navigate(`/${props.app.id}`, {
        state: { from: location.pathname + location.search },
      });
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!props.app) return;
    if (outOfStock) {
      toast.error(language === 'km' ? 'ផលិតផលនេះអស់ស្តុក' : 'This product is out of stock');
      return;
    }
    const sourceEl = imgRef.current || placeholderRef.current;
    addToCart(props.app, sourceEl);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!props.app) return;
    if (outOfStock) {
      toast.error(language === 'km' ? 'ផលិតផលនេះអស់ស្តុក' : 'This product is out of stock');
      return;
    }
    const sourceEl = imgRef.current || placeholderRef.current;
    addToCart(props.app, sourceEl);
    navigate("/checkout");
  };

  return (
    <article
      className={`group relative rounded-2xl bg-card border border-border/40 overflow-hidden transition-all duration-300 ease-out hover:shadow-[0_8px_30px_-8px_hsl(var(--foreground)/0.1)] ${props.app ? "cursor-pointer" : ""} ${outOfStock ? 'opacity-75' : ''}`}
      onClick={handleClick}
      onMouseEnter={handlePrefetch}
      itemScope
      itemType="https://schema.org/Product"
    >
      {/* Image */}
      <div className="relative w-full aspect-square bg-muted/30 overflow-hidden">
        {iconUrl ? (
          <img
            ref={imgRef}
            src={iconUrl}
            alt={`${displayName} - Buy at Realtech Computer`}
            itemProp="image"
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

        {/* Stock badge */}
        {stockInfo && (
          <div className={`absolute top-2.5 right-2.5 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full shadow-md ${
            stockInfo.status === 'out' 
              ? 'bg-destructive text-destructive-foreground' 
              : 'bg-amber-500 text-white'
          }`}>
            {stockInfo.status === 'low' && <AlertTriangle className="w-3 h-3" />}
            {stockInfo.label}
          </div>
        )}

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
            <span className="text-sm font-bold text-destructive bg-background/80 px-3 py-1 rounded-full">
              {language === "km" ? "អស់ស្តុក" : "Out of Stock"}
            </span>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="border-t border-border/50" />

      {/* Info */}
      <div className="p-3.5 space-y-2">
        {/* Name */}
        <h3 className="text-sm font-semibold text-foreground line-clamp-1 leading-snug" itemProp="name">
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
            onClick={handleAddToCart}
            disabled={outOfStock}
            className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold border rounded-full px-2 sm:px-2.5 py-1 sm:py-1.5 transition-all duration-150 ${
              outOfStock 
                ? 'text-muted-foreground/50 border-border/50 cursor-not-allowed' 
                : 'text-muted-foreground border-border hover:bg-muted active:scale-95'
            }`}
          >
            <ShoppingCart className="w-3 h-3" />
            <span className="hidden xs:inline">{language === "km" ? "បន្ថែម" : "Cart"}</span>
          </button>

          <button
            onClick={handleBuyNow}
            disabled={outOfStock}
            className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold rounded-full px-2 sm:px-2.5 py-1 sm:py-1.5 transition-all duration-150 ${
              outOfStock
                ? 'text-muted-foreground/50 border border-border/50 cursor-not-allowed'
                : 'text-destructive border border-destructive/40 hover:bg-destructive/5 active:scale-95'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span className="hidden xs:inline">{language === "km" ? "ទិញ" : "Buy"}</span>
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
    </article>
  );
};

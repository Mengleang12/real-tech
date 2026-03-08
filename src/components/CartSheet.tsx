import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, X, AlertTriangle } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { useNavigate } from "react-router-dom";

export const CartSheet = () => {
  const { items, isOpen, setIsOpen, removeFromCart, clearCart, totalPrice } = useCart();
  const { language } = useLanguage();
  const navigate = useNavigate();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full max-w-[360px] sm:max-w-[400px] flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="w-4 h-4" />
            {language === "km" ? "កន្ត្រក" : "Cart"} ({items.length})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-5">
            <EmptyState
              icon={ShoppingCart}
              title={language === "km" ? "កន្ត្រកទទេ" : "Your cart is empty"}
              description={language === "km" ? "បន្ថែមផលិតផល" : "Add products to your cart"}
              compact
            />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {items.map((item, i) => {
                const activeVariants = item.app.variants?.filter(v => v.is_active) || [];
                const defaultPrice = activeVariants.length > 0 ? (Number(activeVariants[0].price_adjustment) || 0) : 0;
                const finalPrice = item.selectedVariant ? Number(item.selectedVariant.price_adjustment) || 0 : defaultPrice;
                const variantLabel = item.selectedVariant 
                  ? Object.values(item.selectedVariant.combination).join(' / ')
                  : null;
                const variantStock = item.selectedVariant?.stock_quantity ?? null;
                const isLowStock = variantStock !== null && variantStock > 0 && variantStock <= 5;

                return (
                  <div
                    key={item.app.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/30 animate-fade-in"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary shrink-0">
                      {item.app.icon_url ? (
                        <img src={item.app.icon_url} alt={item.app.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary/10" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.app.name}</p>
                      {variantLabel && (
                        <p className="text-[10px] text-muted-foreground truncate">{variantLabel}</p>
                      )}
                      {isLowStock && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {variantStock} {language === 'km' ? 'នៅសល់' : 'left'}
                        </p>
                      )}
                      <p className={`text-xs font-semibold ${finalPrice > 0 ? "text-destructive" : "text-primary"}`}>
                        {finalPrice > 0 ? `$${finalPrice.toFixed(2)}` : language === "km" ? "ឥតគិតថ្លៃ" : "Free"}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.app.id)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border/50 px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{language === "km" ? "សរុប" : "Total"}</span>
                <span className="text-lg font-bold text-foreground">
                  {totalPrice > 0 ? `$${totalPrice.toFixed(2)}` : language === "km" ? "ឥតគិតថ្លៃ" : "Free"}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCart}
                  className="gap-1.5 text-xs"
                >
                  <Trash2 className="w-3 h-3" />
                  {language === "km" ? "សម្អាត" : "Clear"}
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    setIsOpen(false);
                    navigate("/checkout");
                  }}
                >
                  {language === "km" ? "ពិនិត្យការទិញ" : "Checkout"}
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

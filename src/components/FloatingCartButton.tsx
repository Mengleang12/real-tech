import { ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

export const FloatingCartButton = () => {
  const { totalItems, setIsOpen } = useCart();

  const handleClick = () => {
    setIsOpen(true);
  };

  return (
    <button
      id="cart-icon-target"
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
      style={{ boxShadow: "0 8px 24px -4px hsl(var(--primary) / 0.4)" }}
    >
      <ShoppingCart className="w-5 h-5" />
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center text-[11px] font-bold bg-destructive text-destructive-foreground rounded-full px-1.5 animate-scale-in">
          {totalItems}
        </span>
      )}
    </button>
  );
};

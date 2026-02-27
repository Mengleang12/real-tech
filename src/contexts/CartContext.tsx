import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import type { App, ProductVariant } from "@/lib/api";

export interface CartItem {
  app: App;
  quantity: number;
  selectedVariant?: ProductVariant | null;
}

interface FlyingItem {
  id: string;
  iconUrl: string;
  startRect: DOMRect;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addToCart: (app: App, sourceElement?: HTMLElement | null, variant?: ProductVariant | null) => void;
  removeFromCart: (appId: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  flyingItems: FlyingItem[];
  getEffectiveStock: (app: App, variant?: ProductVariant | null) => number;
  isOutOfStock: (app: App) => boolean;
}

const CartContext = createContext<CartContextType>({
  items: [],
  isOpen: false,
  setIsOpen: () => {},
  addToCart: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
  totalItems: 0,
  totalPrice: 0,
  flyingItems: [],
  getEffectiveStock: () => 0,
  isOutOfStock: () => false,
});

const CART_STORAGE_KEY = "cart-items";

const loadCartFromStorage = (): CartItem[] => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/** Calculate total available stock for a product (variant-level or product-level) */
const calcTotalStock = (app: App): number => {
  if (app.variants && app.variants.length > 0) {
    return app.variants.filter(v => v.is_active).reduce((sum, v) => sum + v.stock_quantity, 0);
  }
  return app.stock_quantity ?? 0;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(loadCartFromStorage);
  const [isOpen, setIsOpen] = useState(false);
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const getEffectiveStock = useCallback((app: App, variant?: ProductVariant | null): number => {
    if (variant) return variant.stock_quantity;
    return calcTotalStock(app);
  }, []);

  const isOutOfStock = useCallback((app: App): boolean => {
    return calcTotalStock(app) <= 0;
  }, []);

  const addToCart = useCallback((app: App, sourceElement?: HTMLElement | null, variant?: ProductVariant | null) => {
    // Trigger fly animation
    if (sourceElement) {
      const rect = sourceElement.getBoundingClientRect();
      const flyId = `fly-${app.id}-${Date.now()}`;
      setFlyingItems((prev) => [
        ...prev,
        { id: flyId, iconUrl: app.icon_url || "", startRect: rect },
      ]);
      setTimeout(() => {
        setFlyingItems((prev) => prev.filter((f) => f.id !== flyId));
      }, 700);
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.app.id === app.id);
      if (existing) return prev; // already in cart
      return [...prev, { app, quantity: 1, selectedVariant: variant || null }];
    });
  }, []);

  const removeFromCart = useCallback((appId: number) => {
    setItems((prev) => prev.filter((i) => i.app.id !== appId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.length;
  const totalPrice = items.reduce((sum, i) => {
    const basePrice = typeof i.app.price === "string" ? parseFloat(i.app.price) : i.app.price || 0;
    const activeVariants = i.app.variants?.filter(v => v.is_active) || [];
    const defaultPrice = activeVariants.length > 0 ? (Number(activeVariants[0].price_adjustment) || 0) : basePrice;
    const finalPrice = i.selectedVariant ? Number(i.selectedVariant.price_adjustment) || 0 : defaultPrice;
    return sum + finalPrice;
  }, 0);

  return (
    <CartContext.Provider
      value={{ items, isOpen, setIsOpen, addToCart, removeFromCart, clearCart, totalItems, totalPrice, flyingItems, getEffectiveStock, isOutOfStock }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

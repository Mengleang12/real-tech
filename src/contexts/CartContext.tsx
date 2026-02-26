import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import type { App } from "@/lib/api";

export interface CartItem {
  app: App;
  quantity: number;
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
  addToCart: (app: App, sourceElement?: HTMLElement | null) => void;
  removeFromCart: (appId: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  flyingItems: FlyingItem[];
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

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(loadCartFromStorage);
  const [isOpen, setIsOpen] = useState(false);
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = useCallback((app: App, sourceElement?: HTMLElement | null) => {
    // Trigger fly animation
    if (sourceElement) {
      const rect = sourceElement.getBoundingClientRect();
      const flyId = `fly-${app.id}-${Date.now()}`;
      setFlyingItems((prev) => [
        ...prev,
        { id: flyId, iconUrl: app.icon_url || "", startRect: rect },
      ]);
      // Remove after animation
      setTimeout(() => {
        setFlyingItems((prev) => prev.filter((f) => f.id !== flyId));
      }, 700);
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.app.id === app.id);
      if (existing) return prev; // already in cart
      return [...prev, { app, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((appId: number) => {
    setItems((prev) => prev.filter((i) => i.app.id !== appId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.length;
  const totalPrice = items.reduce((sum, i) => {
    const p = typeof i.app.price === "string" ? parseFloat(i.app.price) : i.app.price || 0;
    return sum + p;
  }, 0);

  return (
    <CartContext.Provider
      value={{ items, isOpen, setIsOpen, addToCart, removeFromCart, clearCart, totalItems, totalPrice, flyingItems }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

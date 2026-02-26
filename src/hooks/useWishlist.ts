import { useState, useEffect, useCallback } from 'react';

const WISHLIST_KEY = 'macsofy_wishlist';

export function useWishlist() {
  const [wishlist, setWishlist] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  const toggle = useCallback((appId: number) => {
    setWishlist(prev => 
      prev.includes(appId) 
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    );
  }, []);

  const isWishlisted = useCallback((appId: number) => wishlist.includes(appId), [wishlist]);

  const count = wishlist.length;

  return { wishlist, toggle, isWishlisted, count };
}

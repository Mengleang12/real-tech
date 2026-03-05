import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { FlyToCartAnimation } from "@/components/FlyToCartAnimation";
import { CartSheet } from "@/components/CartSheet";
import { MaintenancePage } from "@/components/MaintenancePage";
import Index from "./pages/Index";

// Lazy load non-critical pages
const Admin = lazy(() => import("./pages/Admin"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Auth = lazy(() => import("./pages/Auth"));
const MyPurchases = lazy(() => import("./pages/MyPurchases"));
const PaymentHistory = lazy(() => import("./pages/PaymentHistory"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Install = lazy(() => import("./pages/Install"));

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

function hexToHsl(hex: string): string {
  let r = 0, g = 0, b = 0;
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  r = parseInt(hex.substring(0, 2), 16) / 255;
  g = parseInt(hex.substring(2, 4), 16) / 255;
  b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAdminOrModerator, loading: authLoading } = useAuth();
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string }>({ enabled: false, message: '' });
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/settings/maintenance`)
      .then(res => res.ok ? res.json() : { maintenance_mode: false })
      .then(data => {
        setMaintenance({ enabled: !!data.maintenance_mode, message: data.maintenance_message || '' });
        // Apply saved primary color globally
        if (data.primary_color && /^#[0-9a-fA-F]{3,6}$/.test(data.primary_color)) {
          const hsl = hexToHsl(data.primary_color);
          document.documentElement.style.setProperty('--primary', hsl);
          document.documentElement.style.setProperty('--ring', hsl);
        }
      })
      .catch(() => setMaintenance({ enabled: false, message: '' }))
      .finally(() => setCheckingMaintenance(false));
  }, []);

  // Wait for both auth and maintenance check
  if (authLoading || checkingMaintenance) return null;

  // Show maintenance page to non-admin users, but allow /auth and /admin access
  if (maintenance.enabled && !isAdminOrModerator) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<MaintenancePage message={maintenance.message} />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/my-purchases" element={<MyPurchases />} />
      <Route path="/payment-history" element={<PaymentHistory />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/wishlist" element={<Wishlist />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/install" element={<Install />} />
      <Route path="/:id" element={<ProductDetail />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppRoutes />
                <CartSheet />
              </BrowserRouter>
              <FlyToCartAnimation />
            </TooltipProvider>
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

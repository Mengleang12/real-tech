import { useState, useEffect } from "react";
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
import Admin from "./pages/Admin";
import ProductDetail from "./pages/ProductDetail";
import Auth from "./pages/Auth";
import MyPurchases from "./pages/MyPurchases";
import PaymentHistory from "./pages/PaymentHistory";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Wishlist from "./pages/Wishlist";
import Checkout from "./pages/Checkout";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

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

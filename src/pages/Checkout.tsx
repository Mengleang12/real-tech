import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { PaymentDialog } from "@/components/PaymentDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart, Trash2, X, Package, CreditCard, AlertTriangle } from "lucide-react";
import DeliveryInfoForm, { type DeliveryInfo } from "@/components/DeliveryInfoForm";
import GuestCheckoutDialog from "@/components/GuestCheckoutDialog";
import { toast } from "sonner";

const Checkout = () => {
  const { items, removeFromCart, clearCart, totalPrice } = useCart();
  const { language } = useLanguage();
  const { user, signUp, signIn } = useAuth();
  const navigate = useNavigate();

  // Payment state – we pay for items one-by-one via the existing PaymentDialog
  const [payingIndex, setPayingIndex] = useState<number | null>(null);
  const [paidIds, setPaidIds] = useState<Set<number>>(new Set());
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({ phone: "", address: "" });
  const [showCheckoutChoice, setShowCheckoutChoice] = useState(false);

  const paidItems = items.filter((i) => paidIds.has(i.app.id));
  const unpaidItems = items.filter((i) => !paidIds.has(i.app.id));
  const freeItems = unpaidItems.filter((i) => {
    const activeVariants = i.app.variants?.filter(v => v.is_active) || [];
    const p = i.selectedVariant ? Number(i.selectedVariant.price_adjustment) || 0 : (activeVariants.length > 0 ? Number(activeVariants[0].price_adjustment) || 0 : 0);
    return p <= 0;
  });
  const paidRequired = unpaidItems.filter((i) => {
    const activeVariants = i.app.variants?.filter(v => v.is_active) || [];
    const p = i.selectedVariant ? Number(i.selectedVariant.price_adjustment) || 0 : (activeVariants.length > 0 ? Number(activeVariants[0].price_adjustment) || 0 : 0);
    return p > 0;
  });

  const getPrice = (item: typeof items[0]) => {
    const activeVariants = item.app.variants?.filter(v => v.is_active) || [];
    return item.selectedVariant ? Number(item.selectedVariant.price_adjustment) || 0 : (activeVariants.length > 0 ? Number(activeVariants[0].price_adjustment) || 0 : 0);
  };

  const currentPayingItem = payingIndex !== null ? paidRequired[payingIndex] : null;

  const validateDelivery = () => {
    if (!deliveryInfo.phone.trim() || !deliveryInfo.address.trim()) {
      toast.error(language === "km" ? "សូមបំពេញលេខទូរសព្ទ និងអាសយដ្ឋាន" : "Please fill in phone number and address");
      return false;
    }
    if (!/^0[1-9][0-9]{7,8}$/.test(deliveryInfo.phone)) {
      toast.error(language === "km" ? "លេខទូរសព្ទមិនត្រឹមត្រូវ" : "Invalid phone number");
      return false;
    }
    return true;
  };

  const handlePayAll = () => {
    if (!validateDelivery()) return;
    if (!user) {
      // Show account vs guest choice
      setShowCheckoutChoice(true);
      return;
    }
    // User is logged in, proceed directly
    if (paidRequired.length > 0) {
      setPayingIndex(0);
    }
  };

  const handleCheckoutWithAccount = () => {
    setShowCheckoutChoice(false);
    navigate("/auth", { state: { returnTo: "/checkout" } });
  };

  const handleCheckoutAsGuest = async () => {
    setShowCheckoutChoice(false);
    try {
      const guestNum = Math.floor(100000 + Math.random() * 900000);
      const guestEmail = `guest${guestNum}@guest.local`;
      const guestPassword = `Guest@${guestNum}${Date.now()}`;
      const guestName = `Guest${guestNum}`;

      const { error } = await signUp(guestEmail, guestPassword, guestName);
      if (error) {
        toast.error(language === "km" ? "មិនអាចបង្កើតគណនីភ្ញៀវបានទេ" : "Failed to create guest account");
        return;
      }

      // Auto sign in
      const { error: loginError } = await signIn(guestEmail, guestPassword);
      if (loginError) {
        toast.error(language === "km" ? "មិនអាចចូលគណនីភ្ញៀវបានទេ" : "Failed to sign in as guest");
        return;
      }

      toast.success(language === "km" ? `បានបង្កើតគណនីភ្ញៀវ: ${guestName}` : `Guest account created: ${guestName}`);

      if (paidRequired.length > 0) {
        setPayingIndex(0);
      }
    } catch {
      toast.error(language === "km" ? "កំហុសក្នុងការបង្កើតគណនីភ្ញៀវ" : "Error creating guest account");
    }
  };

  const handlePaymentSuccess = () => {
    if (currentPayingItem) {
      setPaidIds((prev) => new Set(prev).add(currentPayingItem.app.id));
    }
    // Move to next unpaid item
    if (payingIndex !== null && payingIndex < paidRequired.length - 1) {
      setTimeout(() => setPayingIndex(payingIndex + 1), 500);
    } else {
      setPayingIndex(null);
    }
  };

  const allDone = paidRequired.length === 0 || paidRequired.every((i) => paidIds.has(i.app.id));

  const handleFinish = () => {
    // Remove paid items from cart
    paidIds.forEach((id) => removeFromCart(id));
    freeItems.forEach((i) => removeFromCart(i.app.id));
    setPaidIds(new Set());
    navigate("/my-purchases");
  };

  return (
    <div className={`min-h-screen bg-background ${language === "km" ? "font-khmer" : ""}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-foreground" />
            <h1 className="text-base font-semibold text-foreground">
              {language === "km" ? "ពិនិត្យការទិញ" : "Checkout"}
            </h1>
          </div>
          <span className="text-xs text-muted-foreground ml-auto">
            {items.length} {language === "km" ? "ធាតុ" : items.length === 1 ? "item" : "items"}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Empty state */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {language === "km" ? "កន្ត្រកទទេ" : "Your cart is empty"}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "km" ? "បន្ថែមកម្មវិធីដើម្បីចាប់ផ្ដើម" : "Add some apps to get started"}
              </p>
            </div>
            <Link to="/">
              <Button size="sm" className="text-xs gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                {language === "km" ? "រកមើលកម្មវិធី" : "Browse Apps"}
              </Button>
            </Link>
          </div>
        )}

        {/* Cart items */}
        {items.length > 0 && (
          <>
            <div className="space-y-2">
              {items.map((item, i) => {
                const price = getPrice(item);
                const isPaid = paidIds.has(item.app.id);
                const variantLabel = item.selectedVariant
                  ? Object.values(item.selectedVariant.combination).join(' / ')
                  : null;
                const variantStock = item.selectedVariant?.stock_quantity ?? null;
                const isLowStock = variantStock !== null && variantStock > 0 && variantStock <= 5;
                return (
                  <div
                    key={item.app.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 animate-fade-in ${
                      isPaid
                        ? "bg-primary/5 border-primary/20"
                        : "bg-card border-border/40 hover:shadow-sm"
                    }`}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted/30 shrink-0">
                      {item.app.icon_url ? (
                        <img
                          src={item.app.icon_url}
                          alt={item.app.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-secondary">
                          <Package className="w-6 h-6 text-muted-foreground/20" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {language === "km" && item.app.name_km ? item.app.name_km : item.app.name}
                      </p>
                      {variantLabel && (
                        <p className="text-[10px] text-muted-foreground truncate">{variantLabel}</p>
                      )}
                      <p className="text-xs text-muted-foreground truncate">
                        {item.app.category || "Product"}
                      </p>
                      {isLowStock && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5 mt-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {variantStock} {language === 'km' ? 'នៅសល់' : 'left'}
                        </p>
                      )}
                      {isPaid && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary mt-0.5">
                          ✓ {language === "km" ? "បានបង់ប្រាក់" : "Paid"}
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      {price > 0 ? (
                        <span className="text-sm font-bold text-destructive">${price.toFixed(2)}</span>
                      ) : (
                        <span className="text-xs font-semibold text-primary">
                          {language === "km" ? "ឥតគិតថ្លៃ" : "Free"}
                        </span>
                      )}
                    </div>

                    {/* Remove */}
                    {!isPaid && (
                      <button
                        onClick={() => removeFromCart(item.app.id)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Delivery Info */}
            <DeliveryInfoForm value={deliveryInfo} onChange={setDeliveryInfo} />

            {/* Summary */}
            <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {language === "km" ? "កម្មវិធីសរុប" : "Total items"}
                </span>
                <span className="text-sm font-medium text-foreground">{items.length}</span>
              </div>
              {freeItems.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {language === "km" ? "ឥតគិតថ្លៃ" : "Free items"}
                  </span>
                  <span className="text-sm font-medium text-primary">{freeItems.length}</span>
                </div>
              )}
              <div className="border-t border-border/50 pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  {language === "km" ? "សរុបត្រូវបង់" : "Total"}
                </span>
                <span className="text-lg font-bold text-foreground">
                  {totalPrice > 0 ? `$${totalPrice.toFixed(2)}` : language === "km" ? "ឥតគិតថ្លៃ" : "Free"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearCart}
                className="gap-1.5 text-xs"
              >
                <Trash2 className="w-3 h-3" />
                {language === "km" ? "សម្អាតកន្ត្រក" : "Clear Cart"}
              </Button>

              {allDone ? (
                <Button size="sm" className="flex-1 text-xs gap-1.5" onClick={handleFinish}>
                  {language === "km" ? "មើលការទិញរបស់ខ្ញុំ" : "View My Purchases"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="flex-1 text-xs gap-1.5"
                  onClick={handlePayAll}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {paidRequired.length > 0
                    ? language === "km"
                      ? `បង់ប្រាក់ ($${paidRequired.reduce((s, i) => s + getPrice(i), 0).toFixed(2)})`
                      : `Pay $${paidRequired.reduce((s, i) => s + getPrice(i), 0).toFixed(2)}`
                    : language === "km"
                    ? "ទាញយកទាំងអស់"
                    : "Get All Free"}
                </Button>
              )}
            </div>
          </>
        )}
      </main>

      {/* Payment Dialog for current item */}
      {currentPayingItem && (
        <PaymentDialog
          open={payingIndex !== null}
          onOpenChange={(open) => {
            if (!open) setPayingIndex(null);
          }}
          appId={currentPayingItem.app.id}
          appName={currentPayingItem.app.name}
          price={getPrice(currentPayingItem)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Guest vs Account choice */}
      <GuestCheckoutDialog
        open={showCheckoutChoice}
        onOpenChange={setShowCheckoutChoice}
        onSelectAccount={handleCheckoutWithAccount}
        onSelectGuest={handleCheckoutAsGuest}
      />
    </div>
  );
};

export default Checkout;

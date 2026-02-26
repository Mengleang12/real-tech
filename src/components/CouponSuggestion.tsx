import { useState, useEffect } from 'react';
import { Tag, ChevronDown, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { couponsApi, type ApplicableCoupon } from '@/lib/api';

interface CouponSuggestionProps {
  price: number;
  onSelectCoupon: (coupon: ApplicableCoupon | null) => void;
  selectedCoupon: ApplicableCoupon | null;
}

export const CouponSuggestion = ({ price, onSelectCoupon, selectedCoupon }: CouponSuggestionProps) => {
  const { user, token } = useAuth();
  const { language } = useLanguage();
  const [coupons, setCoupons] = useState<ApplicableCoupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user && token && price > 0) {
      loadApplicableCoupons();
    }
  }, [user, token, price]);

  const loadApplicableCoupons = async () => {
    setLoading(true);
    try {
      const data = await couponsApi.getApplicable(price);
      setCoupons(data.coupons || []);
      // Auto-open if user has coupons
      if (data.coupons?.length > 0) {
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Failed to load coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !token || price <= 0 || loading) return null;
  if (coupons.length === 0) return null;

  const formatDiscount = (coupon: ApplicableCoupon) => {
    if (coupon.coupon.discount_type === 'fixed') {
      return `$${parseFloat(String(coupon.coupon.discount_value)).toFixed(2)}`;
    }
    return `${coupon.coupon.discount_value}%`;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {language === 'km' 
              ? `អ្នកមានគូប៉ុង ${coupons.length}` 
              : `You have ${coupons.length} coupon${coupons.length > 1 ? 's' : ''}`
            }
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-2 space-y-2">
        {coupons.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectCoupon(selectedCoupon?.id === item.id ? null : item)}
            className={`w-full p-3 rounded-lg border transition-all text-left ${
              selectedCoupon?.id === item.id
                ? 'bg-primary/10 border-primary ring-2 ring-primary/30'
                : 'bg-muted/50 border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="w-4 h-4 text-primary" />
                  <Badge variant="secondary" className="font-mono text-xs">
                    {item.coupon.code}
                  </Badge>
                  <Badge variant="default" className="text-xs">
                    {formatDiscount(item)}
                    {language === 'km' ? ' បញ្ចុះ' : ' OFF'}
                  </Badge>
                </div>
                <p className="font-medium text-sm">{item.coupon.name}</p>
                {item.coupon.min_price > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {language === 'km' 
                      ? `តម្លៃអប្បបរមា: $${parseFloat(String(item.coupon.min_price)).toFixed(2)}`
                      : `Min. purchase: $${parseFloat(String(item.coupon.min_price)).toFixed(2)}`
                    }
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">
                    {language === 'km' ? 'សន្សំ' : 'Save'}
                  </div>
                  <div className="font-bold text-green-600 dark:text-green-400">
                    ${item.discount_amount.toFixed(2)}
                  </div>
                </div>
                {selectedCoupon?.id === item.id && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
        
        {selectedCoupon && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {language === 'km' ? 'តម្លៃដើម:' : 'Original:'}
              </span>
              <span className="line-through">${price.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {language === 'km' ? 'បញ្ចុះ:' : 'Discount:'}
              </span>
              <span className="text-green-600 dark:text-green-400">
                -${selectedCoupon.discount_amount.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between font-bold mt-1 pt-1 border-t border-green-500/30">
              <span>{language === 'km' ? 'សរុប:' : 'Total:'}</span>
              <span className="text-lg">${(price - selectedCoupon.discount_amount).toFixed(2)}</span>
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

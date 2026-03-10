import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle, X, Download, PartyPopper, Save, Tag, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateOrder, generateKHQR, verifyPayment, confirmPaymentManual } from '@/hooks/useOrders';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { useQueryClient } from '@tanstack/react-query';
import { couponsApi, type ApplicableCoupon } from '@/lib/api';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appId: number;
  appName: string;
  price: number;
  downloadUrl?: string;
  coupon?: ApplicableCoupon | null;
  onPaymentSuccess: () => void;
}

const KHQRLogo = () => (
  <img src="https://realtechcomputer.com/images/khqr-icon.svg" alt="KHQR" className="h-4" />
);

const DollarSymbol = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="w-7 h-7 bg-gray-800 rounded-full flex items-center justify-center shadow-md border-2 border-white">
      <span className="text-white text-xs font-bold">$</span>
    </div>
  </div>
);

const COUNTDOWN_SECONDS = 3 * 60;

export const PaymentDialog = ({
  open,
  onOpenChange,
  appId,
  appName,
  price,
  downloadUrl,
  coupon,
  onPaymentSuccess,
}: PaymentDialogProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const createOrder = useCreateOrder();
  const queryClient = useQueryClient();
  const qrRef = useRef<HTMLDivElement>(null);
  
  const priceNum = typeof price === 'string' ? parseFloat(price) : (price || 0);
  const discountAmount = coupon?.discount_amount || 0;
  const finalPrice = Math.max(0, priceNum - discountAmount);
  
  const [status, setStatus] = useState<'loading' | 'ready' | 'scanned' | 'verifying' | 'success' | 'error'>('loading');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [md5, setMd5] = useState<string>('');
  const [qrString, setQrString] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(COUNTDOWN_SECONDS);
  const [showCloseWarning, setShowCloseWarning] = useState(false);

  useEffect(() => {
    if (open && user) {
      initializePayment();
      setCountdown(COUNTDOWN_SECONDS);
    }
    return () => {
      setStatus('loading');
      setQrDataUrl('');
      setOrderId('');
      setMd5('');
      setCountdown(COUNTDOWN_SECONDS);
    };
  }, [open, user]);

  useEffect(() => {
    if (status !== 'ready' && status !== 'scanned') return;
    if (countdown <= 0) { setStatus('error'); return; }
    const timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [status, countdown]);

  useEffect(() => {
    if ((status === 'ready' || status === 'scanned') && orderId && md5) {
      const interval = setInterval(async () => {
        try {
          const result = await verifyPayment(orderId, md5);
          if (result.status === 'paid' || result.status === 'approved') {
            setStatus('success');
            clearInterval(interval);
            queryClient.invalidateQueries({ queryKey: ['purchased', appId] });
            toast.success(language === 'km' ? 'ការបង់ប្រាក់បានជោគជ័យ!' : 'Payment successful!');
            onPaymentSuccess();
          } else if (result.status === 'scanned' && status !== 'scanned') {
            setStatus('scanned');
          }
        } catch (err) {
          console.error('Verification error:', err);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [status, orderId, md5, appId, language]);

  const initializePayment = async () => {
    try {
      setStatus('loading');
      const order = await createOrder.mutateAsync({ appId, appName, amount: finalPrice });
      setOrderId(order.id);
      if (coupon) {
        try { await couponsApi.apply(coupon.id, order.id, priceNum); } catch (err) { console.error('Failed to apply coupon:', err); }
      }
      const qrData = await generateKHQR(order.id, finalPrice);
      setMd5(qrData.md5);
      setQrString(qrData.qr_string);
      const qrUrl = await QRCode.toDataURL(qrData.qr_string, { width: 160, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
      setQrDataUrl(qrUrl);
      setStatus('ready');
    } catch (err) {
      console.error('Payment init error:', err);
      setStatus('error');
      toast.error(language === 'km' ? 'មានបញ្ហាក្នុងការបង្កើត QR Code' : 'Failed to generate QR code');
    }
  };

  useEffect(() => {
    if (!qrString || status !== 'ready') return;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    const abaUrl = `abamobilebank://ababank.com?type=payway&qrcode=${encodeURIComponent(qrString)}`;
    if (isMobile) {
      const t = setTimeout(() => {
        try { toast.message(language === 'km' ? 'កំពុងផ្ដល់ទៅ ABA Mobile...' : 'Opening ABA Mobile...'); window.location.href = abaUrl; } catch (err) {}
      }, 400);
      return () => clearTimeout(t);
    }
  }, [qrString, status, language]);

  const handleSaveQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `KHQR-${appName}-${finalPrice.toFixed(2)}USD.png`;
    link.href = qrDataUrl;
    link.click();
    toast.success(language === 'km' ? 'QR Code បានរក្សាទុក!' : 'QR Code saved!');
  };

  const fmt = (n: number) => n.toFixed(2);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (status === 'ready' || status === 'scanned')) { setShowCloseWarning(true); return; }
    onOpenChange(nextOpen);
  };

  const handleConfirmClose = () => { setShowCloseWarning(false); onOpenChange(false); };

  const countdownUrgent = countdown <= 60;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[300px] p-0 overflow-hidden gap-0 rounded-2xl [&>button]:hidden">
          {/* Header */}
          <DialogHeader className="flex flex-row items-center justify-between px-3 py-2.5 border-b border-border/50">
            <DialogTitle className="text-[13px] font-semibold">
              {language === 'km' ? 'ការ​បង់​ប្រាក់' : 'Payment'}
            </DialogTitle>
            <button
              onClick={() => handleOpenChange(false)}
              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="sr-only">Close</span>
            </button>
          </DialogHeader>
          
          {/* Loading */}
          {status === 'loading' && (
            <div className="py-10 flex flex-col items-center gap-2.5">
              <Loader2 className="w-6 h-6 animate-spin text-[#E21A1A]" />
              <p className="text-xs text-muted-foreground">
                {language === 'km' ? 'កំពុង​បង្កើត QR Code...' : 'Generating QR Code...'}
              </p>
            </div>
          )}

          {/* Ready — QR visible */}
          {status === 'ready' && (
            <div className="flex flex-col">
              {/* KHQR Card */}
              <div ref={qrRef} className="bg-white rounded-xl overflow-hidden mx-3 mt-3 border border-gray-100 shadow-sm">
                {/* Red banner */}
                <div className="bg-[#E21A1A] py-1.5 flex justify-center">
                  <KHQRLogo />
                </div>
                
                {/* Info */}
                <div className="px-3 py-2">
                  <p className="text-gray-700 text-xs font-medium truncate">{appName}</p>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    {coupon && discountAmount > 0 && (
                      <span className="text-sm text-gray-400 line-through">{fmt(priceNum)}</span>
                    )}
                    <span className="text-xl font-bold text-gray-900">{fmt(finalPrice)}</span>
                    <span className="text-gray-500 text-[11px] font-medium">USD</span>
                  </div>
                  {coupon && (
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-green-600">
                      <Tag className="w-2.5 h-2.5" />
                      <span>{coupon.coupon.code} (-${discountAmount.toFixed(2)})</span>
                    </div>
                  )}
                </div>

                <div className="mx-3"><div className="border-t border-dashed border-gray-200" /></div>

                {/* QR */}
                <div className="p-3 flex flex-col items-center gap-2">
                  <div className="relative">
                    {qrDataUrl && <img src={qrDataUrl} alt="KHQR Code" className="w-36 h-36" />}
                    <DollarSymbol />
                  </div>
                  <img src="https://realtechcomputer.com/images/payment_icons.png" alt="Payment icons" className="w-full max-w-[200px] object-contain opacity-80" />
                </div>
              </div>

              {/* Status bar */}
              <div className="flex items-center justify-center gap-1.5 mt-2.5 px-3">
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">
                  {language === 'km' ? 'កំពុងផ្ទៀងផ្ទាត់' : 'Verifying'}
                </span>
                <span className={`text-xs font-mono font-bold ${countdownUrgent ? 'text-[#E21A1A] animate-pulse' : 'text-muted-foreground'}`}>
                  {formatCountdown(countdown)}
                </span>
              </div>
              <p className="text-muted-foreground text-[10px] text-center mt-0.5 px-3">
                {language === 'km' 
                  ? 'ស្កេនជាមួយកម្មវិធីធនាគារដែលគាំទ្របាគង'
                  : 'Scan with any Bakong-supported banking app'
                }
              </p>

              {/* Save button */}
              <div className="p-3 pt-2">
                <Button variant="outline" size="sm" onClick={handleSaveQR} className="w-full gap-1.5 h-8 text-xs">
                  <Save className="w-3.5 h-3.5" />
                  {language === 'km' ? 'រក្សាទុក QR' : 'Save QR'}
                </Button>
              </div>
            </div>
          )}

          {/* Scanned */}
          {status === 'scanned' && (
            <div className="py-8 px-4 flex flex-col items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
              <p className="text-xs font-semibold text-blue-600">
                {language === 'km' ? 'QR បានស្កេន!' : 'QR Scanned!'}
              </p>
              <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                {language === 'km' 
                  ? 'សូមបញ្ជាក់ការទូទាត់នៅក្នុងកម្មវិធីធនាគាររបស់អ្នក'
                  : 'Confirm the payment in your banking app'
                }
              </p>
              <span className={`text-xs font-mono font-bold ${countdownUrgent ? 'text-[#E21A1A] animate-pulse' : 'text-muted-foreground'}`}>
                {formatCountdown(countdown)}
              </span>
            </div>
          )}

          {/* Verifying */}
          {status === 'verifying' && (
            <div className="py-10 flex flex-col items-center gap-2.5">
              <Loader2 className="w-6 h-6 animate-spin text-[#E21A1A]" />
              <p className="text-xs text-muted-foreground">
                {language === 'km' ? 'ការ​ផ្ទៀងផ្ទាត់​ការ​បង់ប្រាក់...' : 'Verifying payment...'}
              </p>
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="py-6 px-4 flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-green-500" />
                </div>
                <PartyPopper className="w-5 h-5 text-yellow-500 absolute -top-1 -right-1 animate-bounce" />
              </div>
              
              <div className="text-center space-y-0.5">
                <p className="text-sm font-bold text-green-500">
                  {language === 'km' ? 'ការបង់ប្រាក់បានជោគជ័យ!' : 'Payment Successful!'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {language === 'km' 
                    ? `អរគុណសម្រាប់ការទិញ ${appName}!`
                    : `Thank you for purchasing ${appName}!`
                  }
                </p>
              </div>

              <div className="w-full space-y-1.5 mt-1">
                {downloadUrl && (
                  <Button 
                    className="w-full gap-1.5 bg-[#E21A1A] hover:bg-[#C41515] h-8 text-xs" 
                    size="sm"
                    onClick={() => window.open(downloadUrl, '_blank')}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {language === 'km' ? 'ទាញយកឥឡូវ' : 'Download Now'}
                  </Button>
                )}
                <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => onOpenChange(false)}>
                  {language === 'km' ? 'បិទ' : 'Close'}
                </Button>
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="py-8 px-4 flex flex-col items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <X className="w-5 h-5 text-[#E21A1A]" />
              </div>
              <p className="text-xs font-semibold text-[#E21A1A]">
                {language === 'km' ? 'ការ​បង់​ប្រាក់​បាន​បរាជ័យ!' : 'Payment Failed'}
              </p>
              <Button onClick={initializePayment} size="sm" className="bg-[#E21A1A] hover:bg-[#C41515] h-8 text-xs">
                {language === 'km' ? 'ព្យាយាម​ម្តង​ទៀត' : 'Try Again'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Close Warning */}
      <AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <AlertDialogContent className="max-w-[280px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              {language === 'km' ? 'បិទការទូទាត់?' : 'Cancel Payment?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {language === 'km'
                ? 'ប្រសិនបើអ្នកបិទ ការផ្ទៀងផ្ទាត់ការទូទាត់នឹងឈប់។'
                : 'Payment verification will stop if you close this.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-8 text-xs">
              {language === 'km' ? 'បន្ត' : 'Keep Paying'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose} className="bg-destructive hover:bg-destructive/90 h-8 text-xs">
              {language === 'km' ? 'បិទ' : 'Close'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders, Order, verifyPayment } from "@/hooks/useOrders";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  CreditCard, ArrowLeft,
  Calendar, DollarSign, CheckCircle, Clock, XCircle,
  Hash, FileText, Receipt, RefreshCw, Loader2, MessageCircle, AlertTriangle
} from "lucide-react";


const statusConfig: Record<string, { dotClass: string; label: string; labelKm: string }> = {
  paid:    { dotClass: "bg-green-500",           label: "Paid",    labelKm: "បានបង់ប្រាក់" },
  pending: { dotClass: "bg-amber-400",           label: "Pending", labelKm: "រង់ចាំ" },
  failed:  { dotClass: "bg-destructive",         label: "Failed",  labelKm: "បរាជ័យ" },
  expired: { dotClass: "bg-muted-foreground/40", label: "Expired", labelKm: "ផុតកំណត់" },
};

interface PaymentCardProps {
  order: Order;
  language: string;
  onVerify?: (order: Order) => void;
  isVerifying?: boolean;
}

const PaymentCard = ({ order, language, onVerify, isVerifying }: PaymentCardProps) => {
  const status = statusConfig[order.status] || statusConfig.pending;
  const amount = typeof order.amount === 'string' ? parseFloat(order.amount) : order.amount;

  return (
    <div className="border border-border rounded-md bg-card">
      {/* Top row */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass} flex-shrink-0`} />
          <span className="text-sm font-medium">{order.product_name}</span>
          <span className="text-xs text-muted-foreground">
            · {language === 'km' ? status.labelKm : status.label}
          </span>
        </div>
        <span className="text-sm font-semibold tabular-nums">${amount.toFixed(2)}</span>
      </div>

      {/* Details grid */}
      <div className="px-4 py-3 space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Hash className="w-3 h-3" />
            {language === 'km' ? 'លេខបញ្ជា' : 'Order ID'}
          </span>
          <span className="font-mono text-foreground">{order.id.slice(0, 12)}…</span>
        </div>

        {order.bakong_transaction_id && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Receipt className="w-3 h-3" />
              {language === 'km' ? 'លេខប្រតិបត្តិការ' : 'Transaction ID'}
            </span>
            <span className="font-mono text-foreground">{order.bakong_transaction_id}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {language === 'km' ? 'កាលបរិច្ឆេទ' : 'Created'}
          </span>
          <span className="text-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
        </div>

        {order.paid_at && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3" />
              {language === 'km' ? 'បានបង់នៅ' : 'Paid at'}
            </span>
            <span className="text-foreground">{new Date(order.paid_at).toLocaleDateString()}</span>
          </div>
        )}

        {order.expires_at && order.status === 'pending' && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {language === 'km' ? 'ផុតកំណត់' : 'Expires'}
            </span>
            <span className="text-foreground">{new Date(order.expires_at).toLocaleString()}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <DollarSign className="w-3 h-3" />
            {language === 'km' ? 'រូបិយប័ណ្ណ' : 'Currency'}
          </span>
          <span className="text-foreground">{order.currency}</span>
        </div>
      </div>

      {/* Footer action */}
      {order.status === 'paid' && (
        <div className="px-4 py-2.5 border-t border-border">
          <Link to={`/${order.product_id}`}>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <FileText className="w-3.5 h-3.5" />
              {language === 'km' ? 'មើលកម្មវិធី' : 'View App'}
            </button>
          </Link>
        </div>
      )}
      {order.status === 'pending' && order.payment_md5 && onVerify && (
        <div className="px-4 py-2.5 border-t border-border">
          <button
            onClick={() => onVerify(order)}
            disabled={isVerifying}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {language === 'km' ? 'ផ្ទៀងផ្ទាត់ការបង់ប្រាក់' : 'Verify Payment'}
          </button>
        </div>
      )}
    </div>
  );
};

type StatusFilter = 'all' | 'pending' | 'paid' | 'failed' | 'expired';

const filterTabs: { value: StatusFilter; label: string; labelKm: string }[] = [
  { value: 'pending', label: 'Pending',  labelKm: 'រង់ចាំ' },
  { value: 'all',     label: 'All',      labelKm: 'ទាំងអស់' },
  { value: 'paid',    label: 'Paid',     labelKm: 'បានបង់ប្រាក់' },
  { value: 'failed',  label: 'Failed',   labelKm: 'បរាជ័យ' },
  { value: 'expired', label: 'Expired',  labelKm: 'ផុតកំណត់' },
];

const PaymentHistory = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, signOut } = useAuth();
  const { data: orders, isLoading, error } = useOrders();
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const queryClient = useQueryClient();
  const verifiedRef = useRef(false);

  // Guide user to verify pending orders on first visit
  const guidedRef = useRef(false);
  useEffect(() => {
    if (!orders || guidedRef.current) return;
    const pendingCount_ = orders.filter(o => o.status === 'pending').length;
    if (pendingCount_ > 0) {
      guidedRef.current = true;
      toast.info(
        language === 'km'
          ? `អ្នកមានការបញ្ជាទិញ ${pendingCount_} កំពុងរង់ចាំ។ សូមចុច "ផ្ទៀងផ្ទាត់ការបង់ប្រាក់" ដើម្បីពិនិត្យស្ថានភាព។`
          : `You have ${pendingCount_} pending order(s). Tap "Verify Payment" on each to check the status.`,
        { duration: 6000 }
      );
    }
  }, [orders, language]);

  // Auto-verify pending orders on page load
  useEffect(() => {
    if (!orders || verifiedRef.current) return;
    
    const pendingWithMd5 = orders.filter(o => o.status === 'pending' && o.payment_md5);
    if (pendingWithMd5.length === 0) return;
    
    verifiedRef.current = true;
    
    const verifyPending = async () => {
      let anyUpdated = false;
      
      for (const order of pendingWithMd5) {
        try {
          const result = await verifyPayment(order.id, order.payment_md5!);
          if (result.status === 'paid' || result.status === 'approved') {
            anyUpdated = true;
          }
        } catch (err) {
          console.error(`Auto-verify failed for order ${order.id}:`, err);
        }
      }
      
      if (anyUpdated) {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        toast.success(language === 'km' ? 'ការបង់ប្រាក់ខ្លះត្រូវបានផ្ទៀងផ្ទាត់ជោគជ័យ!' : 'Some payments were verified successfully!');
      }
    };
    
    verifyPending();
  }, [orders, language, queryClient]);

  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const handleManualVerify = async (order: Order) => {
    if (!order.payment_md5) return;
    setVerifyingId(order.id);
    try {
      const result = await verifyPayment(order.id, order.payment_md5);
      if (result.status === 'paid' || result.status === 'approved') {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['purchased', order.product_id] });
        toast.success(language === 'km' ? 'ការបង់ប្រាក់បានផ្ទៀងផ្ទាត់ជោគជ័យ!' : 'Payment verified successfully!');
      } else {
        toast.info(language === 'km' ? `ស្ថានភាព: ${result.status}` : `Status: ${result.status}`);
      }
    } catch (err) {
      toast.error(language === 'km' ? 'មានបញ្ហាក្នុងការផ្ទៀងផ្ទាត់' : 'Verification failed');
    } finally {
      setVerifyingId(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-xs">
          <CreditCard className="w-10 h-10 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="text-lg font-semibold mb-1">{language === 'km' ? 'សូមចូលគណនី' : 'Sign in required'}</h1>
          <p className="text-sm text-muted-foreground mb-4">
            {language === 'km' ? 'អ្នកត្រូវចូលគណនីដើម្បីមើលប្រវត្តិបង់ប្រាក់' : 'You need to sign in to view payment history'}
          </p>
          <Link to="/auth"><Button size="sm">{language === 'km' ? 'ចូលគណនី' : 'Sign In'}</Button></Link>
        </div>
      </div>
    );
  }

  const totalPaid = orders?.filter(o => o.status === 'paid').reduce((sum, o) => {
    const amount = typeof o.amount === 'string' ? parseFloat(o.amount) : o.amount;
    return sum + amount;
  }, 0) || 0;
  const paidCount   = orders?.filter(o => o.status === 'paid').length || 0;
  const pendingCount = orders?.filter(o => o.status === 'pending').length || 0;

  const filteredOrders = orders
    ?.filter(o => filter === 'all' || o.status === filter)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());


  return (
    <div className="min-h-screen bg-background">
      {/* Notion-style top bar */}
      <header className="sticky top-0 z-40 glass px-4 sm:px-8 py-2.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-sm hover:bg-accent"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {language === 'km' ? 'ត្រឡប់' : 'Back'}
            </button>
            <span className="text-muted-foreground/40 text-sm">/</span>
            <span className="text-sm font-medium text-foreground">
              {language === 'km' ? 'ប្រវត្តិបង់ប្រាក់' : 'Payment History'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-xs text-muted-foreground hidden sm:block">{user.email}</span>
            <Button variant="outline" size="sm" onClick={signOut} className="h-7 text-xs">
              {language === 'km' ? 'ចេញ' : 'Sign Out'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-10">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">
            {language === 'km' ? 'ប្រវត្តិបង់ប្រាក់' : 'Payment History'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'km' ? 'មើលប្រតិបត្តិការបង់ប្រាក់ទាំងអស់របស់អ្នក' : 'View all your payment transactions'}
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {filterTabs.map(tab => {
            const count = tab.value === 'all' 
              ? orders?.length || 0
              : orders?.filter(o => o.status === tab.value).length || 0;
            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === tab.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {language === 'km' ? tab.labelKm : tab.label}
                {count > 0 && <span className="ml-1.5 opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Summary — Notion-style property row */}
        {!isLoading && orders && orders.length > 0 && (
          <div className="border border-border rounded-md bg-card mb-6 divide-y divide-border">
            <div className="px-4 py-2.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5" />
                {language === 'km' ? 'សរុបបានបង់' : 'Total Paid'}
              </span>
              <span className="font-semibold tabular-nums">${totalPaid.toFixed(2)}</span>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" />
                {language === 'km' ? 'ប្រតិបត្តិការបានបញ្ចប់' : 'Completed'}
              </span>
              <span className="font-medium">{paidCount}</span>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                {language === 'km' ? 'រង់ចាំ' : 'Pending'}
              </span>
              <span className="font-medium">{pendingCount}</span>
            </div>
          </div>
        )}

        {/* Alert for pending orders — contact support */}
        {!isLoading && pendingCount > 0 && (
          <div className="flex items-start gap-3 border border-amber-200 dark:border-amber-500/20 rounded-md bg-amber-50/80 dark:bg-amber-500/5 p-4 mb-6">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {language === 'km'
                  ? 'បានបង់ប្រាក់រួចហើយ តែនៅតែ Pending មែនទេ?'
                  : 'Already paid but still showing Pending?'}
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-1">
                {language === 'km'
                  ? 'សូមចុចប៊ូតុង "ផ្ទៀងផ្ទាត់ការបង់ប្រាក់" នៅលើការបញ្ជាទិញរបស់អ្នកជាមុនសិន។ បើនៅតែ Pending សូមទាក់ទងមកយើងតាម Facebook Page។'
                  : 'First, try clicking "Verify Payment" on your order below. If it still shows Pending, contact us via our Facebook Page.'}
              </p>
              <a
                href="https://www.facebook.com/realtechcomputer"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {language === 'km' ? 'ទាក់ទង Facebook Page' : 'Contact Facebook Page'}
              </a>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-border rounded-md bg-card p-4 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <XCircle className="w-8 h-8 text-destructive mx-auto mb-3 opacity-70" />
            <h2 className="text-sm font-medium mb-3">{language === 'km' ? 'មានបញ្ហាក្នុងការផ្ទុកទិន្នន័យ' : 'Failed to load payment history'}</h2>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
              {language === 'km' ? 'ព្យាយាមម្ដងទៀត' : 'Try Again'}
            </Button>
          </div>
        ) : !filteredOrders || filteredOrders.length === 0 ? (
          <div className="text-center py-16 border border-border rounded-md bg-card">
            <CreditCard className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <h2 className="text-sm font-medium mb-1">
              {filter === 'all'
                ? (language === 'km' ? 'គ្មានប្រវត្តិបង់ប្រាក់ទេ' : 'No transactions yet')
                : (language === 'km' ? `គ្មានការបង់ប្រាក់ ${filterTabs.find(t => t.value === filter)?.labelKm}` : `No ${filter} orders`)
              }
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              {filter !== 'all' 
                ? (language === 'km' ? 'សាកល្បងជ្រើសរើសតម្រងផ្សេង' : 'Try selecting a different filter')
                : (language === 'km' ? 'អ្នកមិនទាន់បានធ្វើប្រតិបត្តិការទេ' : "You haven't made any transactions yet")
              }
            </p>
            {filter === 'all' && <Link to="/"><Button size="sm" variant="outline">{language === 'km' ? 'រុករកកម្មវិធី' : 'Browse Apps'}</Button></Link>}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOrders.map((order) => (
              <PaymentCard key={order.id} order={order} language={language} onVerify={handleManualVerify} isVerifying={verifyingId === order.id} />
            ))}
          </div>
        )}
      </main>

    </div>
  );
};

export default PaymentHistory;

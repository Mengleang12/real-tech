import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders, Order } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getWarrantyStatus, getWarrantyBadgeVariant } from "@/lib/warranty-utils";
import {
  Package, ShoppingBag, ArrowLeft,
  Calendar, DollarSign, CheckCircle, Clock, XCircle,
  ExternalLink, Shield
} from "lucide-react";

const statusConfig: Record<string, { icon: typeof CheckCircle; dotClass: string; label: string; labelKm: string }> = {
  paid:    { icon: CheckCircle, dotClass: "bg-green-500",          label: "Paid",    labelKm: "បានបង់ប្រាក់" },
  pending: { icon: Clock,       dotClass: "bg-amber-400",          label: "Pending", labelKm: "រង់ចាំ" },
  failed:  { icon: XCircle,     dotClass: "bg-destructive",        label: "Failed",  labelKm: "បរាជ័យ" },
  expired: { icon: XCircle,     dotClass: "bg-muted-foreground/50",label: "Expired", labelKm: "ផុតកំណត់" },
};

interface PurchasedAppCardProps {
  order: Order;
  language: string;
}

const PurchasedAppCard = ({ order, language }: PurchasedAppCardProps) => {
  const status = statusConfig[order.status] || statusConfig.pending;

  return (
    <div className="border border-border rounded-md bg-card overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          {/* App icon */}
          {order.product_icon_url ? (
            <img 
              src={order.product_icon_url} 
              alt={order.product_name}
              className="w-9 h-9 rounded-md border border-border flex-shrink-0 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`w-9 h-9 rounded-md bg-muted border border-border flex items-center justify-center flex-shrink-0 ${order.product_icon_url ? 'hidden' : ''}`}>
            <Package className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">{order.product_name}</span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass} flex-shrink-0`} />
                {language === 'km' ? status.labelKm : status.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                ${(typeof order.amount === 'string' ? parseFloat(order.amount) : order.amount).toFixed(2)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(order.paid_at || order.created_at).toLocaleDateString()}
              </span>
            </div>
            {/* Warranty Status */}
            {order.warranty_period && (() => {
              const ws = getWarrantyStatus(order.warranty_period, order.created_at);
              return (
                <div className="flex items-center gap-1.5 mt-1">
                  <Shield className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{order.warranty_period}</span>
                  {ws && (
                    <Badge variant={getWarrantyBadgeVariant(ws)} className="text-[10px] px-1.5 py-0">
                      {ws.label}
                    </Badge>
                  )}
                </div>
              );
            })()}
          </div>

          <Link to={`/${order.product_id}`}>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-1">
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

const MyPurchases = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, signOut } = useAuth();
  const { data: orders, isLoading, error } = useOrders();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-xs">
          <ShoppingBag className="w-10 h-10 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="text-lg font-semibold mb-1">{language === 'km' ? 'សូមចូលគណនី' : 'Sign in required'}</h1>
          <p className="text-sm text-muted-foreground mb-4">
            {language === 'km' ? 'អ្នកត្រូវចូលគណនីដើម្បីមើលការទិញ' : 'You need to sign in to view your purchases'}
          </p>
          <Link to="/auth"><Button size="sm">{language === 'km' ? 'ចូលគណនី' : 'Sign In'}</Button></Link>
        </div>
      </div>
    );
  }

  const paidOrders = orders?.filter(order => order.status === 'paid') || [];

  return (
    <>
    <SEOHead title="My Purchases" noindex />
    <div className="min-h-screen bg-background">
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
              {language === 'km' ? 'កម្មវិធីដែលបានទិញ' : 'My Purchases'}
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
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">
            {language === 'km' ? 'កម្មវិធីដែលបានទិញ' : 'My Purchases'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'km' ? 'មើលកម្មវិធីដែលអ្នកបានទិញ' : 'View your purchased apps'}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-border rounded-md bg-card p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <XCircle className="w-8 h-8 text-destructive mx-auto mb-3 opacity-70" />
            <h2 className="text-sm font-medium mb-3">{language === 'km' ? 'មានបញ្ហាក្នុងការផ្ទុកទិន្នន័យ' : 'Failed to load purchases'}</h2>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
              {language === 'km' ? 'ព្យាយាមម្ដងទៀត' : 'Try Again'}
            </Button>
          </div>
        ) : paidOrders.length === 0 ? (
          <div className="border border-border/40 rounded-2xl bg-card">
            <EmptyState
              icon={Package}
              title={language === 'km' ? 'គ្មានការទិញទេ' : 'No purchases yet'}
              description={language === 'km' ? 'អ្នកមិនទាន់បានទិញកម្មវិធីណាមួយទេ' : "You haven't purchased any apps yet"}
              action={<Link to="/"><Button size="sm" variant="outline">{language === 'km' ? 'រុករកកម្មវិធី' : 'Browse Apps'}</Button></Link>}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {paidOrders.map((order) => (
              <PurchasedAppCard key={order.id} order={order} language={language} />
            ))}
          </div>
        )}
      </main>
    </div>
    </>
  );
};

export default MyPurchases;

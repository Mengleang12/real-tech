import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { quotationsApi, type Quotation } from "@/lib/api";
import { format } from "date-fns";
import { Loader2, FileText, CheckCircle, Clock, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const QuotationView = () => {
  const { number } = useParams<{ number: string }>();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [branding, setBranding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!number) return;
    quotationsApi.publicView(number)
      .then(res => {
        setQuotation(res.quotation);
        setBranding(res.branding);
      })
      .catch(() => setError('Quotation not found'))
      .finally(() => setLoading(false));
  }, [number]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h1 className="text-xl font-semibold">Quotation Not Found</h1>
        <p className="text-sm text-muted-foreground mt-1">This quotation may have been removed or the link is invalid.</p>
      </div>
    );
  }

  const isExpired = quotation.valid_until && new Date(quotation.valid_until) < new Date();
  const primaryColor = branding?.primary_color || '#2563eb';

  const overallDisc = quotation.discount_type === 'percent'
    ? Number(quotation.subtotal) * (Number(quotation.discount_amount) / 100)
    : Number(quotation.discount_amount || 0);

  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border" style={{ background: `${primaryColor}08` }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {branding?.site_logo_url && <img src={branding.site_logo_url} alt="" className="h-10" />}
              <div>
                <h1 className="font-bold text-lg">{branding?.site_name || 'Realtech Computer'}</h1>
                {branding?.site_tagline && <p className="text-xs text-muted-foreground">{branding.site_tagline}</p>}
              </div>
            </div>
            <div className="text-right">
              <Badge style={{ background: primaryColor, color: 'white' }} className="mb-1">QUOTATION</Badge>
              <p className="font-semibold">{quotation.quotation_number}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(quotation.created_at), 'dd MMM yyyy')}</p>
              {quotation.valid_until && (
                <p className={`text-xs mt-0.5 ${isExpired ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  {isExpired ? 'Expired' : `Valid until ${format(new Date(quotation.valid_until), 'dd MMM yyyy')}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Customer */}
        {quotation.customer_name && (
          <div className="px-6 py-3 border-b border-border bg-muted/20">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Prepared for</p>
            <p className="font-semibold text-sm">{quotation.customer_name}</p>
            {quotation.customer_phone && <p className="text-xs text-muted-foreground">{quotation.customer_phone}</p>}
            {quotation.customer_email && <p className="text-xs text-muted-foreground">{quotation.customer_email}</p>}
          </div>
        )}

        {/* Items */}
        <div className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left pb-2">Product</th>
                <th className="text-center pb-2">Qty</th>
                <th className="text-right pb-2">Price</th>
                <th className="text-right pb-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items.map((item, idx) => (
                <tr key={idx} className="border-t border-border/50">
                  <td className="py-2.5">
                    <p className="font-medium">{item.product_name}</p>
                    {item.variant_label && <p className="text-xs text-muted-foreground">{item.variant_label}</p>}
                  </td>
                  <td className="text-center py-2.5">{item.quantity}</td>
                  <td className="text-right py-2.5">${Number(item.unit_price).toFixed(2)}</td>
                  <td className="text-right py-2.5 font-semibold">${Number(item.line_total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t border-border mt-3 pt-3 space-y-1 text-right text-sm">
            <p>Subtotal: <strong>${Number(quotation.subtotal).toFixed(2)}</strong></p>
            {overallDisc > 0 && <p className="text-destructive">Discount: -${overallDisc.toFixed(2)}</p>}
            <p className="text-xl font-bold" style={{ color: primaryColor }}>${Number(quotation.total).toFixed(2)}</p>
          </div>
        </div>

        {/* Notes & Terms */}
        {(quotation.notes || quotation.terms) && (
          <div className="px-6 pb-6 space-y-2">
            {quotation.notes && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-xs">
                <strong>Notes:</strong> {quotation.notes}
              </div>
            )}
            {quotation.terms && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-xs">
                <strong>Terms:</strong> {quotation.terms}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 text-center">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            {branding?.support_phone && <span>{branding.support_phone}</span>}
            {branding?.support_email && <span>{branding.support_email}</span>}
          </div>
          <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuotationView;

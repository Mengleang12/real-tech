import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminUsersApi, type AdminOrder, type OrderAttachment, type OrderPayment } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Pencil, Image, CreditCard, Loader2, Trash2, Upload, Plus,
  DollarSign, FileText, X, Calendar, User, Package, CheckCircle,
  Clock, AlertTriangle, Ban, Eye, Printer, Copy
} from "lucide-react";

interface InvoiceEditDialogProps {
  order: AdminOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: typeof CheckCircle; color: string }> = {
  paid:    { variant: "default",     label: "Paid",    icon: CheckCircle,  color: "text-emerald-600 dark:text-emerald-400" },
  pending: { variant: "secondary",   label: "Pending", icon: Clock,        color: "text-amber-600 dark:text-amber-400" },
  failed:  { variant: "destructive", label: "Failed",  icon: Ban,          color: "text-destructive" },
  expired: { variant: "outline",     label: "Expired", icon: AlertTriangle, color: "text-muted-foreground" },
};

export const InvoiceEditDialog = ({ order, open, onOpenChange }: InvoiceEditDialogProps) => {
  const queryClient = useQueryClient();

  // Fetch full order detail with attachments/payments
  const { data: detailData } = useQuery({
    queryKey: ["order-detail", order?.id],
    queryFn: () => adminUsersApi.getOrderDetail(order!.id),
    enabled: !!order && open,
  });

  const fullOrder = detailData?.order || order;

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Invoice #{order.id.slice(0, 8).toUpperCase()}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant={statusConfig[order.status]?.variant || "secondary"} className="text-xs">
                {statusConfig[order.status]?.label || order.status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-1.5 text-xs"><Eye className="w-3.5 h-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="details" className="gap-1.5 text-xs"><FileText className="w-3.5 h-3.5" /> Edit</TabsTrigger>
            <TabsTrigger value="attachments" className="gap-1.5 text-xs"><Image className="w-3.5 h-3.5" /> Files</TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5 text-xs"><CreditCard className="w-3.5 h-3.5" /> Payments</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><OverviewTab order={fullOrder || order} /></TabsContent>
          <TabsContent value="details"><DetailsTab order={fullOrder || order} onClose={() => onOpenChange(false)} /></TabsContent>
          <TabsContent value="attachments"><AttachmentsTab order={fullOrder || order} /></TabsContent>
          <TabsContent value="payments"><PaymentsTab order={fullOrder || order} /></TabsContent>
        </Tabs>

        {/* Bottom actions */}
        <Separator />
        <BottomActions order={order} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
};

// ─── Overview Tab ─────────────────────────────────────────────────────────────
const OverviewTab = ({ order }: { order: AdminOrder }) => {
  const amount = typeof order.amount === "string" ? parseFloat(order.amount as string) : order.amount;
  const originalPrice = order.original_price ? parseFloat(order.original_price) : amount;
  const itemDiscount = order.item_discount ? parseFloat(order.item_discount) : 0;
  const saleDiscount = order.sale_discount ? parseFloat(order.sale_discount) : 0;
  const hasDiscount = itemDiscount > 0 || saleDiscount > 0;
  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const copyId = () => {
    navigator.clipboard.writeText(order.id);
    toast.success("Invoice ID copied");
  };

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div className={`flex items-center gap-3 rounded-lg p-3 ${
        order.status === 'paid' ? 'bg-emerald-500/10' :
        order.status === 'pending' ? 'bg-amber-500/10' :
        order.status === 'failed' ? 'bg-destructive/10' : 'bg-muted/50'
      }`}>
        <StatusIcon className={`w-5 h-5 ${status.color}`} />
        <div className="flex-1">
          <p className={`font-semibold text-sm ${status.color}`}>{status.label}</p>
          <p className="text-xs text-muted-foreground">
            {order.status === 'paid' && order.paid_at ? `Paid on ${new Date(order.paid_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` :
             order.status === 'pending' ? 'Awaiting payment' :
             order.status === 'failed' ? 'Payment failed' : 'Invoice expired'}
          </p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      {/* Invoice ID */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono">ID: {order.id}</span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={copyId}><Copy className="w-3 h-3" /></Button>
      </div>

      {/* Customer & Product Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</span>
            </div>
            <p className="font-medium text-sm">{order.user?.full_name || "Walk-in Customer"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{order.user?.email || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</span>
            </div>
            <p className="font-medium text-sm truncate">{order.product_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Product #{order.product_id}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Breakdown */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pricing</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Original Price</span>
            <span className="tabular-nums">${originalPrice.toFixed(2)}</span>
          </div>
          {itemDiscount > 0 && (
            <div className="flex justify-between text-sm text-destructive">
              <span>Item Discount ({order.item_discount_type === 'percent' ? `${itemDiscount}%` : `$${itemDiscount.toFixed(2)}`})</span>
              <span className="tabular-nums">-${(itemDiscount > 0 ? (order.item_discount_type === 'percent' ? originalPrice * itemDiscount / 100 : itemDiscount) : 0).toFixed(2)}</span>
            </div>
          )}
          {saleDiscount > 0 && (
            <div className="flex justify-between text-sm text-destructive">
              <span>Sale Discount ({order.sale_discount_type === 'percent' ? `${saleDiscount}%` : `$${saleDiscount.toFixed(2)}`})</span>
              <span className="tabular-nums">-${saleDiscount.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span className="tabular-nums">${amount.toFixed(2)} {order.currency}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment & Transaction Info */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Currency</p>
          <p className="font-medium">{order.currency}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Created</p>
          <p className="font-medium">{order.created_at ? new Date(order.created_at).toLocaleString() : "—"}</p>
        </div>
        {order.bakong_transaction_id && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground mb-1">Transaction ID</p>
            <p className="font-mono text-xs break-all bg-muted/50 rounded px-2 py-1">{order.bakong_transaction_id}</p>
          </div>
        )}
        {order.paid_at && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Paid At</p>
            <p className="font-medium">{new Date(order.paid_at).toLocaleString()}</p>
          </div>
        )}
        {order.expires_at && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Expires At</p>
            <p className="font-medium">{new Date(order.expires_at).toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="rounded-lg border-l-2 border-primary bg-muted/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
          <p className="text-sm">{order.notes}</p>
        </div>
      )}

      {/* Attachments & Payments Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Attachments</p>
          <p className="text-lg font-bold">{order.attachments?.length || 0}</p>
        </div>
        <div className="border border-border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Payments</p>
          <p className="text-lg font-bold">{order.payments?.length || 0}</p>
        </div>
      </div>
    </div>
  );
};

// ─── Details Tab ──────────────────────────────────────────────────────────────
const DetailsTab = ({ order, onClose }: { order: AdminOrder; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(order.notes || "");
  const [status, setStatus] = useState(order.status);
  const [amount, setAmount] = useState(String(order.amount));
  const [originalPrice, setOriginalPrice] = useState(order.original_price || String(order.amount));
  const [itemDiscount, setItemDiscount] = useState(order.item_discount || "0");
  const [itemDiscountType, setItemDiscountType] = useState(order.item_discount_type || "amount");
  const [saleDiscount, setSaleDiscount] = useState(order.sale_discount || "0");
  const [saleDiscountType, setSaleDiscountType] = useState(order.sale_discount_type || "amount");
  const [txnId, setTxnId] = useState(order.bakong_transaction_id || "");

  // Reset when order changes
  useEffect(() => {
    setNotes(order.notes || "");
    setStatus(order.status);
    setAmount(String(order.amount));
    setOriginalPrice(order.original_price || String(order.amount));
    setItemDiscount(order.item_discount || "0");
    setItemDiscountType(order.item_discount_type || "amount");
    setSaleDiscount(order.sale_discount || "0");
    setSaleDiscountType(order.sale_discount_type || "amount");
    setTxnId(order.bakong_transaction_id || "");
  }, [order]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<AdminOrder>) => adminUsersApi.updateOrder(order.id, data),
    onSuccess: () => {
      toast.success("Invoice updated");
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sales-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["order-detail", order.id] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update"),
  });

  const handleSave = () => {
    updateMutation.mutate({
      notes: notes || undefined,
      status,
      amount: parseFloat(amount) as any,
      original_price: originalPrice as any,
      item_discount: itemDiscount as any,
      item_discount_type: itemDiscountType as any,
      sale_discount: saleDiscount as any,
      sale_discount_type: saleDiscountType as any,
      bakong_transaction_id: txnId || undefined,
    });
  };

  // Quick status buttons
  const quickStatusUpdate = (newStatus: AdminOrder["status"]) => {
    updateMutation.mutate({ status: newStatus });
  };

  return (
    <div className="space-y-4">
      {/* Quick Status Actions */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          {order.status !== 'paid' && (
            <Button variant="outline" size="sm" className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" onClick={() => quickStatusUpdate('paid')} disabled={updateMutation.isPending}>
              <CheckCircle className="w-3.5 h-3.5" /> Mark as Paid
            </Button>
          )}
          {order.status !== 'pending' && (
            <Button variant="outline" size="sm" className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-500/10" onClick={() => quickStatusUpdate('pending')} disabled={updateMutation.isPending}>
              <Clock className="w-3.5 h-3.5" /> Set Pending
            </Button>
          )}
          {order.status !== 'failed' && (
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => quickStatusUpdate('failed')} disabled={updateMutation.isPending}>
              <Ban className="w-3.5 h-3.5" /> Mark Failed
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Product Info (read-only) */}
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{order.product_name}</p>
            <p className="text-xs text-muted-foreground">Product #{order.product_id} • Customer: {order.user?.full_name || "Walk-in"}</p>
          </div>
        </div>
      </div>

      {/* Editable Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <Select value={status} onValueChange={(v) => setStatus(v as AdminOrder["status"])}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Amount ($)</label>
          <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1.5" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Original Price ($)</label>
          <Input type="number" step="0.01" min="0" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Transaction ID</label>
          <Input value={txnId} onChange={(e) => setTxnId(e.target.value)} className="mt-1.5" placeholder="Optional" />
        </div>
      </div>

      <Separator />
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Discounts</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Item Discount</label>
          <div className="flex gap-2 mt-1.5">
            <Input type="number" step="0.01" min="0" value={itemDiscount} onChange={(e) => setItemDiscount(e.target.value)} />
            <Select value={itemDiscountType} onValueChange={setItemDiscountType}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">$</SelectItem>
                <SelectItem value="percent">%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Sale Discount</label>
          <div className="flex gap-2 mt-1.5">
            <Input type="number" step="0.01" min="0" value={saleDiscount} onChange={(e) => setSaleDiscount(e.target.value)} />
            <Select value={saleDiscountType} onValueChange={setSaleDiscountType}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">$</SelectItem>
                <SelectItem value="percent">%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <label className="text-xs font-medium text-muted-foreground">Notes</label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1.5" placeholder="Add notes to this invoice..." />
      </div>

      <Button className="w-full gap-2" onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
        Save Changes
      </Button>
    </div>
  );
};

// ─── Attachments Tab ──────────────────────────────────────────────────────────
const AttachmentsTab = ({ order }: { order: AdminOrder }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["order-detail", order.id],
    queryFn: () => adminUsersApi.getOrderDetail(order.id),
  });

  const attachments = data?.order?.attachments || order.attachments || [];

  const uploadMutation = useMutation({
    mutationFn: (file: File) => adminUsersApi.uploadAttachment(order.id, file),
    onSuccess: () => {
      toast.success("Image attached");
      queryClient.invalidateQueries({ queryKey: ["order-detail", order.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Upload failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: number) => adminUsersApi.deleteAttachment(order.id, attachmentId),
    onSuccess: () => {
      toast.success("Attachment removed");
      queryClient.invalidateQueries({ queryKey: ["order-detail", order.id] });
    },
    onError: () => toast.error("Failed to remove"),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{attachments.length} attachment(s)</p>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Upload
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileSelect} />
      </div>

      {attachments.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg">
          <Image className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No attachments yet</p>
          <p className="text-xs text-muted-foreground mt-1">Upload receipt photos or documents</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {attachments.map((att) => (
            <div key={att.id} className="relative group border border-border rounded-lg overflow-hidden">
              {att.file_type === 'image' ? (
                <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                  <img src={att.file_url} alt={att.file_name} className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity" />
                </a>
              ) : (
                <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="w-full h-32 bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </a>
              )}
              <div className="p-2">
                <p className="text-xs font-medium truncate">{att.file_name}</p>
                <p className="text-[10px] text-muted-foreground">{att.file_size ? `${(att.file_size / 1024).toFixed(1)} KB` : ""}</p>
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteMutation.mutate(att.id)}
                disabled={deleteMutation.isPending}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Payments Tab ─────────────────────────────────────────────────────────────
const PaymentsTab = ({ order }: { order: AdminOrder }) => {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payRef, setPayRef] = useState("");
  const [payNote, setPayNote] = useState("");

  const { data } = useQuery({
    queryKey: ["order-detail", order.id],
    queryFn: () => adminUsersApi.getOrderDetail(order.id),
  });

  const payments = data?.order?.payments || order.payments || [];
  const totalPaid = payments.reduce((s, p) => s + (typeof p.amount === "string" ? parseFloat(p.amount) : p.amount), 0);
  const orderAmount = typeof order.amount === "string" ? parseFloat(order.amount as string) : order.amount;
  const remaining = orderAmount - totalPaid;

  const addMutation = useMutation({
    mutationFn: (data: { amount: number; method: string; reference?: string; note?: string }) =>
      adminUsersApi.addPayment(order.id, data),
    onSuccess: () => {
      toast.success("Payment recorded");
      queryClient.invalidateQueries({ queryKey: ["order-detail", order.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sales-dashboard"] });
      setShowAdd(false);
      setPayAmount("");
      setPayRef("");
      setPayNote("");
    },
    onError: (e: Error) => toast.error(e.message || "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (paymentId: number) => adminUsersApi.deletePayment(order.id, paymentId),
    onSuccess: () => {
      toast.success("Payment removed");
      queryClient.invalidateQueries({ queryKey: ["order-detail", order.id] });
    },
    onError: () => toast.error("Failed to remove"),
  });

  const handleAdd = () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    addMutation.mutate({
      amount: amt,
      method: payMethod,
      reference: payRef || undefined,
      note: payNote || undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
          <p className="text-lg font-bold">${orderAmount.toFixed(2)}</p>
        </div>
        <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Paid</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${totalPaid.toFixed(2)}</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${remaining > 0 ? "bg-destructive/10" : "bg-emerald-500/10"}`}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Remaining</p>
          <p className={`text-lg font-bold ${remaining > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
            ${remaining.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Payment List */}
      {payments.length > 0 && (
        <div className="space-y-2">
          {payments.map((p) => {
            const pAmt = typeof p.amount === "string" ? parseFloat(p.amount) : p.amount;
            return (
              <div key={p.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{p.method}</Badge>
                    <span className="font-semibold tabular-nums">${pAmt.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {p.reference && <span className="text-xs text-muted-foreground font-mono">{p.reference}</span>}
                    <span className="text-xs text-muted-foreground">{new Date(p.paid_at).toLocaleDateString()}</span>
                  </div>
                  {p.note && <p className="text-xs text-muted-foreground mt-1">{p.note}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={() => deleteMutation.mutate(p.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Payment */}
      {!showAdd ? (
        <Button variant="outline" className="w-full gap-2" onClick={() => { setShowAdd(true); setPayAmount(remaining > 0 ? remaining.toFixed(2) : ""); }}>
          <Plus className="w-4 h-4" /> Add Payment
        </Button>
      ) : (
        <div className="border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Amount ($)</label>
              <Input type="number" step="0.01" min="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="mt-1" placeholder={remaining > 0 ? remaining.toFixed(2) : "0.00"} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Method</label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="khqr">KHQR</SelectItem>
                  <SelectItem value="aba">ABA</SelectItem>
                  <SelectItem value="wing">Wing</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Reference (optional)</label>
            <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} className="mt-1" placeholder="Transaction ID..." />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
            <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} className="mt-1" placeholder="Payment note..." />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 gap-2" onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              Record Payment
            </Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Bottom Actions ───────────────────────────────────────────────────────────
const BottomActions = ({ order, onClose }: { order: AdminOrder; onClose: () => void }) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => adminUsersApi.deleteOrder(order.id),
    onSuccess: () => {
      toast.success("Invoice deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sales-dashboard"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });

  const handlePrint = () => {
    const amount = typeof order.amount === "string" ? parseFloat(order.amount as string) : order.amount;
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;width:0;height:0;border:none;left:-9999px";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open();
    const originalPrice = order.original_price ? parseFloat(order.original_price) : amount;
    const itemDiscount = order.item_discount ? parseFloat(order.item_discount) : 0;
    const saleDiscountVal = order.sale_discount ? parseFloat(order.sale_discount) : 0;
    const itemDiscountLabel = order.item_discount_type === 'percent' ? `${itemDiscount}%` : `$${itemDiscount.toFixed(2)}`;
    const saleDiscountLabel = order.sale_discount_type === 'percent' ? `${saleDiscountVal}%` : `$${saleDiscountVal.toFixed(2)}`;

    doc.write(`<!DOCTYPE html><html><head><title>Invoice #${order.id.slice(0, 8).toUpperCase()}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Inter',system-ui,sans-serif;max-width:760px;margin:0 auto;padding:48px 40px;color:#111827;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:32px;border-bottom:1px solid #e5e7eb}
        .brand{display:flex;align-items:center;gap:14px}
        .brand-icon{width:44px;height:44px;background:linear-gradient(135deg,#2563eb,#1d4ed8);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:700}
        .brand-name{font-size:20px;font-weight:700;color:#111827}
        .brand-sub{font-size:12px;color:#6b7280;margin-top:2px}
        .meta{text-align:right}
        .invoice-badge{display:inline-flex;background:#eff6ff;color:#2563eb;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;padding:6px 14px;border-radius:6px}
        .invoice-number{font-size:22px;font-weight:700;margin-top:8px;font-variant-numeric:tabular-nums}
        .invoice-date{font-size:13px;color:#6b7280;margin-top:4px}
        .details-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin:32px 0}
        .detail-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#9ca3af;margin-bottom:10px}
        .detail-name{font-size:15px;font-weight:600}
        .detail-sub{font-size:13px;color:#6b7280;margin-top:3px}
        .status-badge{display:inline-flex;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600}
        .status-paid{background:#dcfce7;color:#166534}
        .status-pending{background:#fef9c3;color:#854d0e}
        .status-failed{background:#fee2e2;color:#991b1b}
        .status-expired{background:#f3f4f6;color:#6b7280}
        .table-wrap{background:#f9fafb;border-radius:12px;padding:4px;margin:32px 0}
        table{width:100%;border-collapse:collapse}
        thead th{text-align:left;padding:14px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:1px solid #e5e7eb}
        thead th:last-child{text-align:right}
        tbody td{padding:16px;font-size:14px;color:#374151;border-bottom:1px solid #f3f4f6}
        tbody td:last-child{text-align:right;font-variant-numeric:tabular-nums}
        .summary-section{display:flex;justify-content:flex-end}
        .summary-table{width:280px}
        .summary-row{display:flex;justify-content:space-between;padding:8px 16px;font-size:13px;color:#6b7280}
        .summary-row.discount{color:#dc2626}
        .summary-row.total{background:#111827;color:#fff;border-radius:8px;padding:14px 16px;font-size:16px;font-weight:700;margin-top:4px}
        .divider{height:1px;background:#e5e7eb;margin:40px 0 24px}
        .footer{text-align:center;padding:24px 0}
        .footer-thanks{font-size:15px;font-weight:600;margin-bottom:4px}
        .footer-brand{font-size:12px;color:#9ca3af;margin-top:8px}
        .footer-brand a{color:#2563eb;text-decoration:none}
        @media print{body{padding:24px 20px}}
      </style></head><body>
      <div class="header">
        <div class="brand"><div class="brand-icon">RC</div><div><div class="brand-name">Realtech Computer</div><div class="brand-sub">Software & Digital Products</div></div></div>
        <div class="meta"><div class="invoice-badge">Invoice</div><div class="invoice-number">#${order.id.slice(0, 8).toUpperCase()}</div>
        <div class="invoice-date">${order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</div></div>
      </div>
      <div class="details-grid">
        <div><div class="detail-label">Bill To</div><div class="detail-name">${order.user?.full_name || "Walk-in Customer"}</div><div class="detail-sub">${order.user?.email || "—"}</div></div>
        <div><div class="detail-label">Payment Info</div><div style="margin-bottom:6px"><span class="status-badge status-${order.status}">● ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></div>
        ${order.bakong_transaction_id ? `<div class="detail-sub">Txn: ${order.bakong_transaction_id}</div>` : ""}
        ${order.paid_at ? `<div class="detail-sub">Paid: ${new Date(order.paid_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>` : ""}</div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Description</th><th>Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody><tr><td style="font-weight:500">${order.product_name}</td><td>1</td><td style="text-align:right">$${originalPrice.toFixed(2)}</td><td style="text-align:right;font-weight:600">$${originalPrice.toFixed(2)}</td></tr></tbody>
      </table></div>
      <div class="summary-section"><div class="summary-table">
        <div class="summary-row"><span>Subtotal</span><span>$${originalPrice.toFixed(2)}</span></div>
        ${itemDiscount > 0 ? `<div class="summary-row discount"><span>Item Discount (${itemDiscountLabel})</span><span>-$${(originalPrice - amount + saleDiscountVal).toFixed(2)}</span></div>` : ''}
        ${saleDiscountVal > 0 ? `<div class="summary-row discount"><span>Sale Discount (${saleDiscountLabel})</span><span>-$${saleDiscountVal.toFixed(2)}</span></div>` : ''}
        <div class="summary-row total"><span>Grand Total</span><span>$${amount.toFixed(2)} ${order.currency}</span></div>
      </div></div>
      ${order.notes ? `<div style="margin-top:24px;padding:16px 20px;background:#f9fafb;border-radius:10px;border-left:3px solid #2563eb"><div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#9ca3af;margin-bottom:6px">Note</div><div style="font-size:13px;color:#374151;line-height:1.6">${order.notes}</div></div>` : ''}
      <div class="divider"></div>
      <div class="footer"><div class="footer-thanks">Thank you for your purchase!</div><div class="footer-brand">Realtech Computer — <a href="https://realtechcomputer.com">realtechcomputer.com</a></div></div>
      </body></html>`);
    doc.close();
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove invoice #{order.id.slice(0, 8).toUpperCase()} and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
          <Printer className="w-3.5 h-3.5" /> Print
        </Button>
      </div>
    </div>
  );
};

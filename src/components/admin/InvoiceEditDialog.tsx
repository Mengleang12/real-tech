import { useState, useRef } from "react";
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
import { toast } from "sonner";
import {
  Pencil, Image, CreditCard, Loader2, Trash2, Upload, Plus,
  DollarSign, FileText, X, Calendar
} from "lucide-react";

interface InvoiceEditDialogProps {
  order: AdminOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InvoiceEditDialog = ({ order, open, onOpenChange }: InvoiceEditDialogProps) => {
  const queryClient = useQueryClient();

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Edit Invoice #{order.id.slice(0, 8).toUpperCase()}
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="gap-1.5 text-xs"><FileText className="w-3.5 h-3.5" /> Details</TabsTrigger>
            <TabsTrigger value="attachments" className="gap-1.5 text-xs"><Image className="w-3.5 h-3.5" /> Attachments</TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5 text-xs"><CreditCard className="w-3.5 h-3.5" /> Payments</TabsTrigger>
          </TabsList>
          <TabsContent value="details"><DetailsTab order={order} onClose={() => onOpenChange(false)} /></TabsContent>
          <TabsContent value="attachments"><AttachmentsTab order={order} /></TabsContent>
          <TabsContent value="payments"><PaymentsTab order={order} /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
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

  const updateMutation = useMutation({
    mutationFn: (data: Partial<AdminOrder>) => adminUsersApi.updateOrder(order.id, data),
    onSuccess: () => {
      toast.success("Invoice updated");
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sales-dashboard"] });
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

  return (
    <div className="space-y-4">
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
                <img src={att.file_url} alt={att.file_name} className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 bg-muted flex items-center justify-center">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
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
        <Button variant="outline" className="w-full gap-2" onClick={() => setShowAdd(true)}>
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

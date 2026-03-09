import { useState, useRef, useEffect } from "react";
import { Bell, AlertTriangle, PackageCheck, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { salesApi, analyticsApi } from "@/lib/api";
import { format, subDays } from "date-fns";

export const AdminNotificationBell = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const today = new Date();
  const fromStr = format(subDays(today, 29), "yyyy-MM-dd");
  const toStr = format(today, "yyyy-MM-dd");

  const { data: stockData } = useQuery({
    queryKey: ["admin-stock-alerts"],
    queryFn: () => salesApi.getStockOverview({ limit: 50 }),
  });

  const { data: analyticsData } = useQuery({
    queryKey: ["admin-analytics", fromStr, toStr],
    queryFn: () => analyticsApi.getDashboard(30, fromStr, toStr),
  });

  const lowStockProducts = (stockData?.products || []).filter((p: any) => {
    const total = p.total_variant_stock ?? p.stock_quantity ?? 0;
    return total > 0 && total <= (p.low_stock_threshold || 5);
  });

  const outOfStockProducts = (stockData?.products || []).filter(
    (p: any) => (p.total_variant_stock ?? p.stock_quantity ?? 0) === 0
  );

  const unpaidOrders = (analyticsData?.recent_orders || []).filter(
    (o: any) => o.status === "pending"
  );

  const totalAlerts = lowStockProducts.length + outOfStockProducts.length + unpaidOrders.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <Bell className="w-4 h-4" />
        {totalAlerts > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {totalAlerts > 9 ? "9+" : totalAlerts}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1.5 w-80 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50 animate-fade-in"
        >
          <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Admin Alerts</h3>
            {totalAlerts > 0 && (
              <span className="text-[10px] bg-destructive/10 text-destructive font-medium px-2 py-0.5 rounded-full">
                {totalAlerts} issue{totalAlerts !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {totalAlerts === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No alerts — everything looks good!</p>
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                {/* Out of Stock */}
                {outOfStockProducts.map((p: any) => (
                  <div key={`oos-${p.id}`} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
                    <PackageCheck className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-[11px] text-destructive font-medium">Out of Stock</p>
                    </div>
                  </div>
                ))}

                {/* Low Stock */}
                {lowStockProducts.map((p: any) => (
                  <div key={`low-${p.id}`} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        {p.total_variant_stock ?? p.stock_quantity ?? 0} remaining
                      </p>
                    </div>
                  </div>
                ))}

                {/* Unpaid Orders */}
                {unpaidOrders.map((o: any) => {
                  const amt = typeof o.amount === "string" ? parseFloat(o.amount) : o.amount;
                  return (
                    <div key={`unpaid-${o.id}`} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-foreground truncate">
                          {o.product_name} — {o.customer?.full_name || "Customer"}
                        </p>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          Unpaid · ${amt?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

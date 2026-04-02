import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth } from "date-fns";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Package,
  Calendar, ArrowUpDown, ArrowUp, ArrowDown, ShoppingCart, Repeat, Wallet
} from "lucide-react";
import { ProfitAnalysis } from "./ProfitAnalysis";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { reportsApi } from "@/lib/api";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from "recharts";

const fmt = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Date Range Picker ────────────────────────────────────────────────────────
const DateRangePicker = ({ from, to, onChange }: {
  from: string; to: string;
  onChange: (from: string, to: string) => void;
}) => {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(new Date(from));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date(to));

  const handlePreset = (months: number) => {
    const newFrom = format(startOfMonth(subMonths(new Date(), months - 1)), "yyyy-MM-dd");
    const newTo = format(new Date(), "yyyy-MM-dd");
    setDateFrom(new Date(newFrom));
    setDateTo(new Date(newTo));
    onChange(newFrom, newTo);
  };

  const handleToday = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    setDateFrom(new Date(today));
    setDateTo(new Date(today));
    onChange(today, today);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleToday}>
          Today
        </Button>
        {[1, 3, 6, 12].map(m => (
          <Button key={m} variant="outline" size="sm" className="h-8 text-xs" onClick={() => handlePreset(m)}>
            {m}M
          </Button>
        ))}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5" />
            {dateFrom ? format(dateFrom, "MMM dd") : "From"} — {dateTo ? format(dateTo, "MMM dd") : "To"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex">
            <div>
              <p className="text-xs font-medium text-muted-foreground px-3 pt-3">From</p>
              <CalendarComponent
                mode="single" selected={dateFrom}
                onSelect={(d) => { setDateFrom(d); if (d && dateTo) onChange(format(d, "yyyy-MM-dd"), format(dateTo, "yyyy-MM-dd")); }}
                className={cn("p-3 pointer-events-auto")}
              />
            </div>
            <div className="border-l border-border">
              <p className="text-xs font-medium text-muted-foreground px-3 pt-3">To</p>
              <CalendarComponent
                mode="single" selected={dateTo}
                onSelect={(d) => { setDateTo(d); if (dateFrom && d) onChange(format(dateFrom, "yyyy-MM-dd"), format(d, "yyyy-MM-dd")); }}
                className={cn("p-3 pointer-events-auto")}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ─── Product Sales Tab ────────────────────────────────────────────────────────
const ProductSalesTab = ({ from, to }: { from: string; to: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["report-product-sales", from, to],
    queryFn: () => reportsApi.productSales(from, to),
  });

  type SortField = "product_name" | "total_quantity" | "total_revenue" | "avg_price";
  const [sortBy, setSortBy] = useState<SortField>("total_revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());

  const summary = data?.summary || [];
  const monthly = (data?.monthly || []) as { product_id: number; product_name: string; month: string; quantity: number; revenue: number }[];

  const sorted = [...summary].sort((a: any, b: any) => {
    const va = a[sortBy] ?? 0;
    const vb = b[sortBy] ?? 0;
    return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("desc"); }
  };

  const toggleExpand = (productId: number) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  // Chart data: aggregate by month
  const chartData = monthly.reduce<Record<string, { month: string; quantity: number; revenue: number }>>((acc, item) => {
    if (!acc[item.month]) acc[item.month] = { month: item.month, quantity: 0, revenue: 0 };
    acc[item.month].quantity += item.quantity;
    acc[item.month].revenue += Number(item.revenue);
    return acc;
  }, {});
  const chartArray = Object.values(chartData).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="space-y-6">
      {/* Chart */}
      {chartArray.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-4">Sales by Month</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartArray}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="qty" orientation="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="rev" orientation="right" tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v: number, name: string) => name === "revenue" ? fmt(v) : v} />
                <Legend />
                <Bar yAxisId="qty" dataKey="quantity" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Quantity" />
                <Bar yAxisId="rev" dataKey="revenue" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Revenue" opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-2 py-3 w-8"></th>
                {([
                  ["product_name", "Product"],
                  ["total_quantity", "Qty Sold"],
                  ["total_revenue", "Revenue"],
                  ["avg_price", "Avg Price"],
                ] as [SortField, string][]).map(([field, label]) => (
                  <th key={field} className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => toggleSort(field)}>
                    <div className="flex items-center gap-1.5">{label}<SortIcon field={field} /></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border"><td colSpan={5} className="px-4 py-3"><div className="h-8 bg-muted animate-pulse rounded" /></td></tr>
              )) : sorted.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No sales data for this period</td></tr>
              ) : sorted.map((p: any) => {
                const hasVariants = p.variants && p.variants.length > 0;
                const isExpanded = expandedProducts.has(p.product_id);
                return (
                  <Fragment key={p.product_id}>
                    <tr className={cn("border-b border-border hover:bg-muted/30 transition-colors", hasVariants && "cursor-pointer")} onClick={() => hasVariants && toggleExpand(p.product_id)}>
                      <td className="px-2 py-3 w-8 text-center">
                        {hasVariants && (
                          <ArrowDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform inline-block", isExpanded ? "rotate-0" : "-rotate-90")} />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.icon_url ? (
                            <img src={p.icon_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-muted-foreground" /></div>
                          )}
                          <span className="font-medium truncate max-w-[200px]">{p.product_name}</span>
                          {hasVariants && (
                            <Badge variant="outline" className="text-[10px] shrink-0">{p.variants.length} variants</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums font-semibold">{p.total_quantity}</td>
                      <td className="px-4 py-3 tabular-nums font-semibold">{fmt(p.total_revenue)}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{fmt(p.avg_price)}</td>
                    </tr>
                    {hasVariants && isExpanded && p.variants.map((v: any) => (
                      <tr key={`${p.product_id}-${v.variant_id}`} className="border-b border-border bg-muted/20">
                        <td className="px-2 py-2"></td>
                        <td className="px-4 py-2 pl-16">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                            <span className="text-muted-foreground text-xs">{v.variant_label}</span>
                            {v.sku && <span className="text-[10px] text-muted-foreground/60">({v.sku})</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2 tabular-nums text-xs">{v.total_quantity}</td>
                        <td className="px-4 py-2 tabular-nums text-xs">{fmt(v.total_revenue)}</td>
                        <td className="px-4 py-2 tabular-nums text-xs text-muted-foreground">{fmt(v.avg_price)}</td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─── Revenue Trend Tab ────────────────────────────────────────────────────────
const RevenueTrendTab = ({ from, to }: { from: string; to: string }) => {
  const [groupBy, setGroupBy] = useState("monthly");

  const { data, isLoading } = useQuery({
    queryKey: ["report-revenue-trend", from, to, groupBy],
    queryFn: () => reportsApi.revenueTrend(from, to, groupBy),
  });

  const trend = data?.trend || [];
  const totals = data?.totals || { total_orders: 0, total_revenue: 0, avg_order_value: 0 };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Total Revenue</p>
          <p className="text-xl font-bold mt-1">{fmt(totals.total_revenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Total Orders</p>
          <p className="text-xl font-bold mt-1">{totals.total_orders}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Avg Order</p>
          <p className="text-xl font-bold mt-1">{fmt(totals.avg_order_value)}</p>
        </CardContent></Card>
      </div>

      {/* Group By Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Group by:</span>
        <Select value={groupBy} onValueChange={setGroupBy}>
          <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Chart */}
      <Card>
        <CardContent className="p-4">
          {isLoading ? <Skeleton className="h-[300px] w-full" /> : trend.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="rev" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number, name: string) => name === "Revenue" ? fmt(v) : v} />
                <Legend />
                <Line yAxisId="rev" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Revenue" />
                <Line yAxisId="orders" type="monotone" dataKey="orders" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Profit by Period Tab ─────────────────────────────────────────────────────
const ProfitByPeriodTab = ({ from, to }: { from: string; to: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["report-profit-period", from, to],
    queryFn: () => reportsApi.profitByPeriod(from, to),
  });

  const products = data?.products || [];
  const summary = data?.summary || { total_revenue: 0, total_cost: 0, total_profit: 0, overall_margin: 0 };

  const COLORS = [
    "hsl(var(--primary))", "hsl(var(--destructive))", "hsl(142, 76%, 36%)",
    "hsl(38, 92%, 50%)", "hsl(262, 83%, 58%)", "hsl(199, 89%, 48%)",
  ];

  const pieData = products.slice(0, 6).map(p => ({
    name: p.product_name.length > 15 ? p.product_name.slice(0, 15) + "…" : p.product_name,
    value: Math.max(0, p.profit),
  }));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Revenue</p>
          <p className="text-xl font-bold mt-1">{fmt(summary.total_revenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">COGS</p>
          <p className="text-xl font-bold mt-1">{fmt(summary.total_cost)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Net Profit</p>
          <p className={cn("text-xl font-bold mt-1", summary.total_profit >= 0 ? "text-emerald-600" : "text-destructive")}>
            {fmt(summary.total_profit)}
          </p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Margin</p>
          <p className={cn("text-xl font-bold mt-1", summary.overall_margin >= 0 ? "text-emerald-600" : "text-destructive")}>
            {summary.overall_margin}%
          </p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        {pieData.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2">Profit Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sold</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Revenue</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">COGS</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Profit</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Margin</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b"><td colSpan={6} className="px-4 py-3"><div className="h-8 bg-muted animate-pulse rounded" /></td></tr>
                )) : products.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No profit data</td></tr>
                ) : products.map(p => (
                  <tr key={p.product_id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.icon_url ? <img src={p.icon_url} alt="" className="w-7 h-7 rounded object-cover shrink-0" /> :
                          <div className="w-7 h-7 rounded bg-muted flex items-center justify-center shrink-0"><Package className="w-3.5 h-3.5 text-muted-foreground" /></div>}
                        <span className="font-medium truncate max-w-[150px]">{p.product_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{p.total_sold}</td>
                    <td className="px-4 py-3 tabular-nums">{fmt(p.total_revenue)}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{fmt(p.cost_of_goods)}</td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className={cn("font-semibold", p.profit >= 0 ? "text-emerald-600" : "text-destructive")}>
                        {p.profit >= 0 ? "+" : ""}{fmt(p.profit)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.margin >= 20 ? "default" : p.margin >= 0 ? "secondary" : "destructive"} className="text-xs tabular-nums">
                        {p.margin >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {p.margin}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── Customer Report Tab ──────────────────────────────────────────────────────
const CustomerReportTab = ({ from, to }: { from: string; to: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["report-customers", from, to],
    queryFn: () => reportsApi.customerReport(from, to),
  });

  const customers = data?.customers || [];
  const stats = data?.stats || { total_customers: 0, repeat_customers: 0, repeat_rate: 0 };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase">Total Customers</p>
          </div>
          <p className="text-xl font-bold">{stats.total_customers}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Repeat className="w-4 h-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase">Repeat Customers</p>
          </div>
          <p className="text-xl font-bold">{stats.repeat_customers}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase">Repeat Rate</p>
          </div>
          <p className="text-xl font-bold">{stats.repeat_rate}%</p>
        </CardContent></Card>
      </div>

      {/* Customer Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Orders</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total Spent</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Avg Order</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Products</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Purchase</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b"><td colSpan={6} className="px-4 py-3"><div className="h-8 bg-muted animate-pulse rounded" /></td></tr>
              )) : customers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No customer data</td></tr>
              ) : customers.map(c => (
                <tr key={c.user_id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{c.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums font-semibold">{c.total_orders}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold">{fmt(c.total_spent)}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{fmt(c.avg_order_value)}</td>
                  <td className="px-4 py-3 tabular-nums">{c.unique_products}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.last_purchase ? (() => {
                      const d = new Date(c.last_purchase.replace(/-/g, '/'));
                      return isNaN(d.getTime()) ? "—" : format(d, "MMM dd, yyyy");
                    })() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─── Main SalesReport ─────────────────────────────────────────────────────────
export const SalesReport = () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const handleDateChange = (newFrom: string, newTo: string) => {
    setFrom(newFrom);
    setTo(newTo);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Sales Reports</h2>
          <p className="text-sm text-muted-foreground">Comprehensive sales analysis and insights</p>
        </div>
        <DateRangePicker from={from} to={to} onChange={handleDateChange} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profit-analysis" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-10">
          <TabsTrigger value="profit-analysis" className="text-xs sm:text-sm gap-1.5">
            <Wallet className="w-3.5 h-3.5 hidden sm:block" /> Profit Analysis
          </TabsTrigger>
          <TabsTrigger value="products" className="text-xs sm:text-sm gap-1.5">
            <Package className="w-3.5 h-3.5 hidden sm:block" /> Products
          </TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs sm:text-sm gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 hidden sm:block" /> Revenue
          </TabsTrigger>
          <TabsTrigger value="customers" className="text-xs sm:text-sm gap-1.5">
            <Users className="w-3.5 h-3.5 hidden sm:block" /> Customers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profit-analysis"><ProfitAnalysis /></TabsContent>
        <TabsContent value="products"><ProductSalesTab from={from} to={to} /></TabsContent>
        <TabsContent value="revenue"><RevenueTrendTab from={from} to={to} /></TabsContent>
        <TabsContent value="customers"><CustomerReportTab from={from} to={to} /></TabsContent>
      </Tabs>
    </div>
  );
};

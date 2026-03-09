import { useState } from "react";
import { 
  TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, 
  CalendarIcon, ArrowUpRight, ArrowDownRight, X, Package,
  AlertTriangle, PackageCheck, Activity, Bell, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi, salesApi } from "@/lib/api";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import { type DateRange } from "react-day-picker";

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  subtitle?: string;
  loading?: boolean;
}

const KPICard = ({ title, value, icon: Icon, iconBg, iconColor, subtitle, loading }: KPICardProps) => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-5">
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ) : (
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold mt-1.5 truncate">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ml-3", iconBg)}>
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  paid: 'hsl(var(--chart-2))', pending: '#f59e0b', failed: '#ef4444', expired: '#94a3b8',
};

const QUICK_RANGES = [
  { label: "Today", days: 1 },
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs py-0.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold">
            {typeof entry.value === 'number' && entry.name?.toLowerCase().includes('revenue')
              ? `$${entry.value.toFixed(2)}`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const fmt = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Main Component ───────────────────────────────────────────────────────────
export const AnalyticsDashboard = () => {
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(today, 29),
    to: today,
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  const fromStr = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const toStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : fromStr;

  const isDefault =
    dateRange.from && dateRange.to &&
    format(dateRange.from, "yyyy-MM-dd") === format(subDays(today, 29), "yyyy-MM-dd") &&
    format(dateRange.to, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");

  // Fetch both analytics and sales data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ["admin-analytics", fromStr, toStr],
    queryFn: () => analyticsApi.getDashboard(30, fromStr, toStr),
    enabled: !!fromStr && !!toStr,
  });

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["admin-sales-dashboard", fromStr, toStr],
    queryFn: () => salesApi.getDashboard(undefined, fromStr, toStr),
    enabled: !!fromStr && !!toStr,
  });

  const isLoading = analyticsLoading || salesLoading;
  const salesStats = salesData?.stats;
  const analyticsStats = analyticsData?.stats;
  const topProducts = salesData?.top_products || [];
  const recentSales = salesData?.recent_sales || [];

  // Chart data from sales API (has revenue + orders per date)
  const chartData = (salesData?.revenue_by_date || analyticsData?.revenue_by_date || []).map((d: any) => ({
    date: d.date,
    orders: d.orders || 0,
    revenue: typeof d.revenue === 'string' ? parseFloat(d.revenue) : (d.revenue || 0),
  }));

  const ordersByStatus = analyticsData?.orders_by_status?.map(s => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count,
    color: STATUS_COLORS[s.status] || '#94a3b8',
  })) || [];

  const applyQuickRange = (days: number) => {
    const to = new Date();
    const from = days === 1 ? to : subDays(to, days - 1);
    setDateRange({ from, to });
    setCalendarOpen(false);
  };

  const displayLabel = () => {
    if (!dateRange.from) return "Pick a date range";
    if (isDefault) return "Last 30 days";
    if (!dateRange.to || format(dateRange.from, "yyyy-MM-dd") === format(dateRange.to, "yyyy-MM-dd")) {
      return format(dateRange.from, "MMM d, yyyy");
    }
    return `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d, yyyy")}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Business performance at a glance</p>
        </div>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "gap-2 justify-start text-left font-normal min-w-[200px]",
                isDefault && "border-primary/50 text-primary"
              )}
            >
              <CalendarIcon className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{displayLabel()}</span>
              {!isDefault && dateRange.from && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); setDateRange({ from: subDays(today, 29), to: today }); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setDateRange({ from: subDays(today, 29), to: today }); } }}
                  className="ml-1 rounded p-0.5 hover:bg-muted"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="flex flex-col sm:flex-row">
              <div className="p-3 border-b sm:border-b-0 sm:border-r border-border flex flex-row sm:flex-col gap-1 flex-wrap">
                <p className="text-xs font-medium text-muted-foreground mb-1 w-full hidden sm:block">Quick select</p>
                {QUICK_RANGES.map(({ label, days }) => (
                  <Button key={label} variant="ghost" size="sm" className="justify-start text-xs h-8 px-3" onClick={() => applyQuickRange(days)}>
                    {label}
                  </Button>
                ))}
              </div>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => { if (range) setDateRange(range); }}
                disabled={(date) => date > today}
                numberOfMonths={1}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </div>
            <div className="border-t border-border p-3 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {dateRange.from && dateRange.to && format(dateRange.from, "yyyy-MM-dd") !== format(dateRange.to, "yyyy-MM-dd")
                  ? `${Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24) + 1)} days selected`
                  : "Single day selected"}
              </p>
              <Button size="sm" onClick={() => setCalendarOpen(false)}>Apply</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* KPI Stats Row 1 - Primary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Total Revenue"
          value={fmt(salesStats?.total_revenue || 0)}
          icon={DollarSign}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-600 dark:text-emerald-400"
          subtitle="All paid sales"
          loading={isLoading}
        />
        <KPICard
          title="Paid Orders"
          value={salesStats?.paid_orders?.toString() || "0"}
          icon={ShoppingCart}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          subtitle="Completed"
          loading={isLoading}
        />
        <KPICard
          title="Avg Order Value"
          value={fmt(salesStats?.avg_order_value || 0)}
          icon={TrendingUp}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-600 dark:text-blue-400"
          subtitle="Per transaction"
          loading={isLoading}
        />
        <KPICard
          title="Total Users"
          value={analyticsStats?.total_users?.toLocaleString() || "0"}
          icon={Users}
          iconBg="bg-violet-500/10"
          iconColor="text-violet-600 dark:text-violet-400"
          subtitle="Registered accounts"
          loading={isLoading}
        />
      </div>

      {/* KPI Stats Row 2 - Secondary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Pending Orders"
          value={salesStats?.pending_orders?.toString() || "0"}
          icon={Activity}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600 dark:text-amber-400"
          subtitle="Awaiting payment"
          loading={isLoading}
        />
        <KPICard
          title="Stock Value"
          value={fmt(salesStats?.total_stock_value || 0)}
          icon={Package}
          iconBg="bg-cyan-500/10"
          iconColor="text-cyan-600 dark:text-cyan-400"
          subtitle="Inventory worth"
          loading={isLoading}
        />
        <KPICard
          title="Low Stock"
          value={salesStats?.low_stock_count?.toString() || "0"}
          icon={AlertTriangle}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600 dark:text-amber-400"
          subtitle="Needs restock"
          loading={isLoading}
        />
        <KPICard
          title="Out of Stock"
          value={salesStats?.out_of_stock_count?.toString() || "0"}
          icon={PackageCheck}
          iconBg="bg-destructive/10"
          iconColor="text-destructive"
          subtitle="Unavailable"
          loading={isLoading}
        />
      </div>

      {/* Revenue + Orders Combined Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Revenue & Orders Trend</CardTitle>
            <Badge variant="secondary" className="text-xs">USD</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            {isLoading ? (
              <div className="h-full bg-muted animate-pulse rounded-lg" />
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="revenue" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{value}</span>} />
                  <Area yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--chart-2))" strokeWidth={2.5} fill="url(#revenueGradient)" />
                  <Area yAxisId="orders" type="monotone" dataKey="orders" name="Orders" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#ordersGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row: Top Products + Orders by Status + Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Products Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-semibold">Top Products</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {isLoading ? (
                <div className="space-y-3">
                  {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : topProducts.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No sales data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                    <YAxis type="category" dataKey="product_name" width={90} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders by Status Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {isLoading ? (
                <div className="h-full bg-muted animate-pulse rounded-lg" />
              ) : ordersByStatus.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ordersByStatus} cx="50%" cy="42%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {ordersByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{value}</span>} />
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-semibold">Recent Sales</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : recentSales.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">No recent sales</div>
              ) : (
                recentSales.slice(0, 8).map((sale: any) => {
                  const amt = typeof sale.amount === "string" ? parseFloat(sale.amount) : sale.amount;
                  return (
                    <div key={sale.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{sale.product_name || sale.app_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(sale as any).user?.full_name || (sale as any).user?.email || "Customer"}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-sm font-semibold tabular-nums">${amt?.toFixed(2) || "0.00"}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          sale.status === "paid" ? "bg-emerald-500/15 text-emerald-600" :
                          sale.status === "pending" ? "bg-amber-500/15 text-amber-600" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {sale.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

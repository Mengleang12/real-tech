import { useState } from "react";
import { 
  TrendingUp, Users, ShoppingCart, DollarSign, 
  CalendarIcon, ArrowUpRight, ArrowDownRight, Activity, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import { type DateRange } from "react-day-picker";

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  subtitle?: string;
}

const StatCard = ({ title, value, change, icon: Icon, trend, subtitle }: StatCardProps) => (
  <Card className="overflow-hidden">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold mt-1.5 truncate">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
              trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : "text-muted-foreground"
            }`}>
              {trend === "up" ? <ArrowUpRight className="w-3.5 h-3.5" /> : 
               trend === "down" ? <ArrowDownRight className="w-3.5 h-3.5" /> : null}
              <span>{change > 0 ? "+" : ""}{change}% vs last period</span>
            </div>
          )}
        </div>
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 ml-3">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// ─── Constants ────────────────────────────────────────────────────────────────
const CHART_COLORS = [
  'hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
];

const STATUS_COLORS: Record<string, string> = {
  paid: '#10b981', pending: '#f59e0b', failed: '#ef4444', expired: '#94a3b8',
};

const QUICK_RANGES = [
  { label: "Today", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "1 year", days: 365 },
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-md p-3 text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">
            {typeof entry.value === 'number' && entry.name?.toLowerCase().includes('revenue')
              ? `$${entry.value.toFixed(2)}`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const AnalyticsDashboard = () => {
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: today,
    to: today,
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Format for display
  const fromStr = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const toStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : fromStr;

  const isToday =
    dateRange.from && dateRange.to &&
    format(dateRange.from, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") &&
    format(dateRange.to, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics", fromStr, toStr],
    queryFn: () => analyticsApi.getDashboard(30, fromStr, toStr),
    enabled: !!fromStr && !!toStr,
  });

  const stats = data?.stats;
  const revenueChartData = data?.revenue_by_date || [];
  const ordersByStatus = data?.orders_by_status?.map(s => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count,
    color: STATUS_COLORS[s.status] || '#94a3b8',
  })) || [];

  const downloadsData = revenueChartData.map((d: any) => ({
    date: d.date,
    orders: d.orders || 0,
    revenue: typeof d.revenue === 'string' ? parseFloat(d.revenue) : (d.revenue || 0),
  }));

  const applyQuickRange = (days: number) => {
    const to = new Date();
    const from = days === 1 ? to : subDays(to, days - 1);
    setDateRange({ from, to });
    setCalendarOpen(false);
  };

  // Display label for the trigger button
  const displayLabel = () => {
    if (!dateRange.from) return "Pick a date range";
    if (isToday) return "Today";
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
          <h2 className="text-xl font-bold">Overview</h2>
          <p className="text-sm text-muted-foreground">App store performance at a glance</p>
        </div>

        {/* Date Range Picker */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "gap-2 justify-start text-left font-normal min-w-[200px]",
                isToday && "border-primary/50 text-primary"
              )}
            >
              <CalendarIcon className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{displayLabel()}</span>
              {!isToday && dateRange.from && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); setDateRange({ from: today, to: today }); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setDateRange({ from: today, to: today }); } }}
                  className="ml-1 rounded p-0.5 hover:bg-muted"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="flex flex-col sm:flex-row">
              {/* Quick ranges */}
              <div className="p-3 border-b sm:border-b-0 sm:border-r border-border flex flex-row sm:flex-col gap-1 flex-wrap">
                <p className="text-xs font-medium text-muted-foreground mb-1 w-full hidden sm:block">Quick select</p>
                {QUICK_RANGES.map(({ label, days }) => (
                  <Button
                    key={label}
                    variant="ghost"
                    size="sm"
                    className="justify-start text-xs h-8 px-3"
                    onClick={() => applyQuickRange(days)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {/* Calendar */}
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  if (range) setDateRange(range);
                }}
                disabled={(date) => date > today}
                numberOfMonths={1}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </div>
            {/* Footer */}
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><div className="h-20 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard title="Total Users" value={stats?.total_users?.toLocaleString() ?? "0"} icon={Users} change={12} trend="up" subtitle="Registered accounts" />
            <StatCard title="Conversion" value={`${stats?.conversion_rate?.toFixed(1) ?? "0"}%`} icon={TrendingUp} change={-2} trend="down" subtitle="Orders / Users" />
          </>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Revenue Over Time</CardTitle>
              <Badge variant="secondary" className="text-xs">USD</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              {isLoading ? (
                <div className="h-full bg-muted animate-pulse rounded-lg" />
              ) : downloadsData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={downloadsData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: 'hsl(var(--primary))' }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              {isLoading ? (
                <div className="h-full bg-muted animate-pulse rounded-lg" />
              ) : ordersByStatus.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ordersByStatus} cx="50%" cy="45%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value">
                      {ordersByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
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
      </div>

      {/* Orders Volume Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Orders Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[220px]">
            {isLoading ? (
              <div className="h-full bg-muted animate-pulse rounded-lg" />
            ) : downloadsData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={downloadsData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="orders" name="Orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

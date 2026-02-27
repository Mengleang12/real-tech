import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, TrendingUp, TrendingDown, DollarSign, Package, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { analyticsApi } from "@/lib/api";

interface ProfitProduct {
  product_id: number;
  product_name: string;
  icon_url?: string;
  current_price: number;
  stock_quantity: number;
  total_purchase_cost: number;
  total_purchase_qty: number;
  avg_cost_per_unit: number;
  total_expenses: number;
  total_revenue: number;
  total_sold: number;
  avg_sale_price: number;
  profit: number;
  margin: number;
}

interface ProfitSummary {
  total_cost: number;
  total_revenue: number;
  total_profit: number;
  overall_margin: number;
  product_count: number;
}

type SortField = "product_name" | "total_purchase_cost" | "total_revenue" | "profit" | "margin" | "total_sold";

export const ProfitAnalysis = () => {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("profit");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data, isLoading } = useQuery({
    queryKey: ["profit-analysis", search, sortBy, sortDir],
    queryFn: () => analyticsApi.profitAnalysis(search, sortBy, sortDir),
  });

  const products: ProfitProduct[] = data?.products || [];
  const summary: ProfitSummary = data?.summary || { total_cost: 0, total_revenue: 0, total_profit: 0, overall_margin: 0, product_count: 0 };

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const fmt = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Profit Analysis</h2>
        <p className="text-sm text-muted-foreground">Purchase cost vs sale revenue per product</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Cost</p>
            <p className="text-xl font-bold mt-1">{fmt(summary.total_cost)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Purchase + expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Revenue</p>
            <p className="text-xl font-bold mt-1">{fmt(summary.total_revenue)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Paid sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Profit</p>
            <p className={`text-xl font-bold mt-1 ${summary.total_profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              {fmt(summary.total_profit)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Revenue − Cost</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overall Margin</p>
            <p className={`text-xl font-bold mt-1 ${summary.overall_margin >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              {summary.overall_margin}%
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{summary.product_count} products</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {([
                  ["product_name", "Product"],
                  ["total_purchase_cost", "Purchase Cost"],
                  ["total_revenue", "Revenue"],
                  ["profit", "Profit"],
                  ["margin", "Margin"],
                  ["total_sold", "Sold"],
                ] as [SortField, string][]).map(([field, label]) => (
                  <th
                    key={field}
                    className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                    onClick={() => toggleSort(field)}
                  >
                    <div className="flex items-center gap-1.5">
                      {label}
                      <SortIcon field={field} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={6} className="px-4 py-3"><div className="h-8 bg-muted animate-pulse rounded" /></td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map(p => (
                  <tr key={p.product_id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.icon_url ? (
                          <img src={p.icon_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[200px]">{p.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Avg cost: {fmt(p.avg_cost_per_unit)} · Price: {fmt(p.current_price)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <div>
                        <span>{fmt(p.total_purchase_cost)}</span>
                        {p.total_expenses > 0 && (
                          <p className="text-xs text-muted-foreground">incl. {fmt(p.total_expenses)} expenses</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{fmt(p.total_revenue)}</td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className={`font-semibold ${p.profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                        {p.profit >= 0 ? "+" : ""}{fmt(p.profit)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.margin >= 20 ? "default" : p.margin >= 0 ? "secondary" : "destructive"} className="text-xs tabular-nums">
                        {p.margin >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {p.margin}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {p.total_sold} / {p.total_purchase_qty} purchased
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

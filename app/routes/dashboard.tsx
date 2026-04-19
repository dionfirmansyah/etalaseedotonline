import { useMemo, useState, useCallback } from "react";
import { Link } from "react-router";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Store,
  Plus,
  ExternalLink,
  MapPin,
  TrendingUp,
  ShoppingBag,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Crown,
  AlertCircle,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type TransactionStatus = "pending" | "paid" | "cancelled";

type Transaction = {
  id: string;
  total: number;
  status: TransactionStatus;
  created_at: string;
};

type Subscription = {
  id: string;
  isPaid: boolean;
  end_date?: string;
  plan?: { name: string; price: number };
};

type TenantInfo = {
  logo?: string;
  location?: string;
};

type Tenant = {
  id: string;
  name: string;
  subdomain: string;
  description?: string;
  createdAt: string;
  isActive?: boolean;
  info?: TenantInfo;
  subscription?: Subscription;
  transactions?: Transaction[];
  products?: { id: string }[];
};

// ─── Chart Config ─────────────────────────────────────────────────────────────

const chartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--primary))" },
  paid: { label: "Paid", color: "hsl(var(--primary))" },
  pending: { label: "Pending", color: "hsl(var(--chart-2))" },
  cancelled: { label: "Cancelled", color: "hsl(var(--chart-3))" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDaysUntilExpiry(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Build last-7-days revenue data from all transactions across all tenants
function buildRevenueData(tenants: Tenant[]) {
  const days: { date: string; label: string; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString().split("T")[0],
      label: d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }),
      revenue: 0,
    });
  }

  for (const tenant of tenants) {
    for (const tx of tenant.transactions ?? []) {
      if (tx.status !== "paid") continue;
      const txDate = new Date(tx.created_at).toISOString().split("T")[0];
      const day = days.find((d) => d.date === txDate);
      if (day) day.revenue += tx.total;
    }
  }

  return days;
}

// Build status breakdown for donut chart
function buildStatusData(tenants: Tenant[]) {
  const counts = { paid: 0, pending: 0, cancelled: 0 };
  for (const tenant of tenants) {
    for (const tx of tenant.transactions ?? []) {
      if (tx.status in counts) counts[tx.status as TransactionStatus]++;
    }
  }
  return [
    { name: "paid", label: "Paid", value: counts.paid, color: "hsl(var(--primary))" },
    { name: "pending", label: "Pending", value: counts.pending, color: "hsl(var(--chart-2))" },
    { name: "cancelled", label: "Cancelled", value: counts.cancelled, color: "hsl(var(--chart-3))" },
  ].filter((d) => d.value > 0);
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Tenant Card ──────────────────────────────────────────────────────────────

function TenantCard({
  tenant,
  onToggleActive,
}: {
  tenant: Tenant;
  onToggleActive: (tenant: Tenant) => void;
}) {
  const sub = tenant.subscription;
  const planName = sub?.plan?.name ?? "Tanpa Plan";
  const isActive = tenant.isActive ?? true;
  const productCount = tenant.products?.length ?? 0;
  const paidTxCount =
    tenant.transactions?.filter((t) => t.status === "paid").length ?? 0;
  const totalRevenue =
    tenant.transactions
      ?.filter((t) => t.status === "paid")
      .reduce((acc, t) => acc + t.total, 0) ?? 0;

  const daysLeft =
    sub?.end_date ? getDaysUntilExpiry(sub.end_date) : null;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  return (
    <Card
      className={`border transition-colors ${
        isActive ? "border-border" : "border-border opacity-60"
      }`}
    >
      <CardContent className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Avatar / Logo */}
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-border flex items-center justify-center shrink-0 overflow-hidden">
            {tenant.info?.logo ? (
              <img
                src={tenant.info.logo}
                alt={tenant.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-semibold text-primary">
                {getInitials(tenant.name)}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground truncate">
                {tenant.name}
              </p>
              {/* Plan badge */}
              <Badge
                variant={planName === "Premium" ? "default" : "secondary"}
                className="text-[10px] px-1.5 py-0 h-4 shrink-0"
              >
                {planName === "Premium" && (
                  <Crown className="w-2.5 h-2.5 mr-0.5" />
                )}
                {planName}
              </Badge>
            </div>
            <p className="text-xs text-primary truncate mt-0.5">
              {tenant.subdomain}.etalasee.online
            </p>
            {tenant.info?.location && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                <p className="text-[10px] text-muted-foreground truncate">
                  {tenant.info.location}
                </p>
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Switch
              checked={isActive}
              onCheckedChange={() => onToggleActive(tenant)}
              aria-label="Toggle toko aktif"
            />
            <span className="text-[10px] text-muted-foreground">
              {isActive ? "Aktif" : "Nonaktif"}
            </span>
          </div>
        </div>

        {/* Subscription warning */}
        {(isExpiringSoon || isExpired) && (
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
              isExpired
                ? "bg-destructive/10 border border-destructive/30 text-destructive"
                : "bg-amber-500/10 border border-amber-500/30 text-amber-600"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {isExpired
              ? "Langganan telah berakhir. Perpanjang sekarang."
              : `Langganan berakhir ${daysLeft} hari lagi.`}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 bg-muted/50 rounded-lg p-3">
          <div className="text-center">
            <p className="text-xs font-semibold text-foreground">{productCount}</p>
            <p className="text-[10px] text-muted-foreground">Produk</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-xs font-semibold text-foreground">{paidTxCount}</p>
            <p className="text-[10px] text-muted-foreground">Transaksi</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-foreground truncate">
              {formatRupiah(totalRevenue)}
            </p>
            <p className="text-[10px] text-muted-foreground">Revenue</p>
          </div>
        </div>

        {/* Subscription expiry */}
        {sub?.end_date && !isExpired && !isExpiringSoon && (
          <p className="text-[10px] text-muted-foreground">
            Aktif hingga {formatDate(sub.end_date)}
          </p>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            asChild
          >
            <a
              href={`https://${tenant.subdomain}.etalasee.online/admin/dashboard`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <LayoutDashboard className="w-3.5 h-3.5 mr-1.5 text-primary" />
              <span className="text-primary">Dashboard</span>
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            asChild
          >
            <a
              href={`https://${tenant.subdomain}.etalasee.online`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-primary" />
              <span className="text-primary">Lihat Toko</span>
            </a>
          </Button>
          <Button variant="outline" size="sm" className="px-2.5" asChild>
            <a
              href={`https://${tenant.subdomain}.etalasee.online/admin/settings`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Settings className="w-3.5 h-3.5 text-muted-foreground" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Revenue Chart ────────────────────────────────────────────────────────────

function RevenueChart({ tenants }: { tenants: Tenant[] }) {
  const data = useMemo(() => buildRevenueData(tenants), [tenants]);
  const totalRevenue = data.reduce((acc, d) => acc + d.revenue, 0);

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-foreground">
              Revenue 7 Hari Terakhir
            </CardTitle>
            <CardDescription className="text-xs">
              Agregat semua toko
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-primary">
              {formatRupiah(totalRevenue)}
            </p>
            <p className="text-[10px] text-muted-foreground">Total periode</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) =>
                v >= 1000000
                  ? `${(v / 1000000).toFixed(1)}jt`
                  : v >= 1000
                  ? `${(v / 1000).toFixed(0)}rb`
                  : `${v}`
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatRupiah(Number(value))}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#revenueGrad)"
              dot={{ fill: "hsl(var(--primary))", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// ─── Status Chart ─────────────────────────────────────────────────────────────

function StatusChart({ tenants }: { tenants: Tenant[] }) {
  const data = useMemo(() => buildStatusData(tenants), [tenants]);
  const total = data.reduce((acc, d) => acc + d.value, 0);

  if (total === 0) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-foreground">
            Status Transaksi
          </CardTitle>
          <CardDescription className="text-xs">
            Breakdown semua toko
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground">
          Status Transaksi
        </CardTitle>
        <CardDescription className="text-xs">
          Breakdown semua toko · {total} total
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={3}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [`${value} transaksi`, name]}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoading: authLoading } = db.useAuth();

  // Fetch all tenants owned by user with related data
  const { data, isLoading } = db.useQuery(
    user
      ? {
          tenants: {
            $: { where: { "owner.id": user.id } },
            info: { $: { fields: ["logo", "location"] } },
            subscription: {
              plan: { $: { fields: ["name", "price"] } },
            },
            products: { $: { fields: ["id"] } },
            transactions: {
              $: { fields: ["id", "total", "status", "created_at"] },
            },
          },
        }
      : null
  );

  const tenants = (data?.tenants ?? []) as Tenant[];

  // Aggregated stats across all tenants
  const stats = useMemo(() => {
    const allTx = tenants.flatMap((t) => t.transactions ?? []);
    const paidTx = allTx.filter((t) => t.status === "paid");
    const pendingTx = allTx.filter((t) => t.status === "pending");
    const totalRevenue = paidTx.reduce((acc, t) => acc + t.total, 0);
    const totalProducts = tenants.reduce(
      (acc, t) => acc + (t.products?.length ?? 0),
      0
    );

    return {
      totalRevenue,
      totalStores: tenants.length,
      activeStores: tenants.filter((t) => t.isActive !== false).length,
      totalTransactions: allTx.length,
      pendingCount: pendingTx.length,
      totalProducts,
    };
  }, [tenants]);

  // Toggle active state
  const [confirmTenant, setConfirmTenant] = useState<Tenant | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleActive = useCallback((tenant: Tenant) => {
    setConfirmTenant(tenant);
  }, []);

  const handleConfirmToggle = useCallback(async () => {
    if (!confirmTenant) return;
    setIsToggling(true);
    try {
      await db.transact([
        db.tx.tenants[confirmTenant.id].update({
          is_active: !(confirmTenant.isActive ?? true),		
        }),
      ]);
      toast.success(
        confirmTenant.isActive !== false
          ? `Toko "${confirmTenant.name}" dinonaktifkan`
          : `Toko "${confirmTenant.name}" diaktifkan`
      );
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengubah status toko");
    } finally {
      setIsToggling(false);
      setConfirmTenant(null);
    }
  }, [confirmTenant]);

  // Sign out
  const handleSignOut = useCallback(async () => {
    try {
      await db.auth.signOut();
      window.location.href = "/";
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <Store className="w-10 h-10 text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">
            Kamu belum login.
          </p>
          <Button asChild>
            <Link to="/login">
              <span className="text-primary-foreground">Masuk</span>
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Store className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold text-primary">
              Etalasee
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-medium text-primary">
                  {user.email?.[0]?.toUpperCase() ?? "U"}
                </span>
              </div>
              <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                {user.email}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline text-xs">Keluar</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Page title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Kelola semua toko UMKM kamu
            </p>
          </div>
          <Button size="sm" asChild>
            <Link to="/register">
              <Plus className="w-4 h-4 mr-1.5 text-primary-foreground" />
              <span className="text-primary-foreground">Buat Toko</span>
            </Link>
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Revenue"
            value={formatRupiah(stats.totalRevenue)}
            sub="Semua toko"
            icon={TrendingUp}
          />
          <StatCard
            title="Toko Aktif"
            value={`${stats.activeStores}/${stats.totalStores}`}
            sub="Dari total toko"
            icon={Store}
          />
          <StatCard
            title="Total Produk"
            value={`${stats.totalProducts}`}
            sub="Semua toko"
            icon={ShoppingBag}
          />
          <StatCard
            title="Transaksi"
            value={`${stats.totalTransactions}`}
            sub={
              stats.pendingCount > 0
                ? `${stats.pendingCount} pending`
                : "Semua toko"
            }
            icon={CreditCard}
          />
        </div>

        {/* Charts */}
        {tenants.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RevenueChart tenants={tenants} />
            <StatusChart tenants={tenants} />
          </div>
        )}

        {/* Tenant list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">
              Toko Kamu
              <Badge variant="secondary" className="ml-2 text-xs font-normal">
                {tenants.length}
              </Badge>
            </h2>
          </div>

          {tenants.length === 0 ? (
            // Empty state
            <Card className="border-dashed border-border">
              <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Store className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Belum ada toko
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Buat toko pertamamu dan mulai tampil profesional di dunia
                    digital.
                  </p>
                </div>
                <Button size="sm" asChild>
                  <Link to="/register">
                    <Plus className="w-4 h-4 mr-1.5 text-primary-foreground" />
                    <span className="text-primary-foreground">
                      Buat Toko Pertama
                    </span>
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tenants.map((tenant) => (
                <TenantCard
                  key={tenant.id}
                  tenant={tenant}
                  onToggleActive={handleToggleActive}
                />
              ))}

              {/* Add store card */}
              <Card className="border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer group">
                <CardContent className="h-full min-h-[200px] flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors flex items-center justify-center">
                    <Plus className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      Tambah Toko Baru
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Buka toko baru di Etalasee
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/register">
                      <span className="text-primary text-xs">Buat Toko</span>
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Toggle active confirm dialog */}
      <AlertDialog
        open={!!confirmTenant}
        onOpenChange={(open) => !open && setConfirmTenant(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmTenant?.isActive !== false
                ? "Nonaktifkan toko?"
                : "Aktifkan toko?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTenant?.isActive !== false
                ? `Toko "${confirmTenant?.name}" tidak akan bisa diakses oleh pelanggan. Kamu bisa mengaktifkannya kembali kapan saja.`
                : `Toko "${confirmTenant?.name}" akan kembali bisa diakses oleh pelanggan.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isToggling}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmToggle}
              disabled={isToggling}
              className={
                confirmTenant?.isActive !== false
                  ? "bg-destructive hover:bg-destructive/90"
                  : ""
              }
            >
              {isToggling ? (
                <Spinner className="size-4 text-primary-foreground" />
              ) : confirmTenant?.isActive !== false ? (
                "Nonaktifkan"
              ) : (
                "Aktifkan"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, AlertCircle, Clock, Wallet, Plus, Briefcase, UserPlus, Users, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { AppTopbar } from "@/components/app/app-topbar";
import { StatusPill } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/lib/business";
import { getDashboardStats } from "@/lib/api.functions";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Billables" },
      { name: "description", content: "Law firm billing dashboard with matters, time, and invoices." },
    ],
  }),
  component: DashboardPage,
});

function fmt(n: number, cur = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n || 0);
}
function fmtCompact(n: number, cur = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur, notation: "compact", maximumFractionDigits: 1 }).format(n || 0);
}
function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleString("en-US", { month: "short", year: "2-digit" });
}

const STATUS_COLORS: Record<string, string> = {
  paid: "#22c55e", sent: "#0066FF", overdue: "#ef4444", draft: "#94a3b8", void: "#64748b",
};
const PIE_COLORS = ["#0066FF", "#22c55e", "#c9a84c", "#ef4444", "#8b5cf6", "#06b6d4", "#f59e0b"];

function DashboardPage() {
  const { current, loading, error, refetch } = useBusiness();
  const fn = useServerFn(getDashboardStats);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", current?.id],
    queryFn: () => fn({ data: { businessId: current!.id } }),
    enabled: !!current?.id,
  });

  // ---- Workspace load states (no more infinite "Loading workspace…") ----
  if (loading) {
    return <><AppTopbar title="Dashboard" /><div className="p-8 text-sm text-muted-foreground">Loading workspace…</div></>;
  }
  if (error) {
    return (
      <>
        <AppTopbar title="Dashboard" />
        <div className="p-8 max-w-md mx-auto text-center space-y-4">
          <AlertCircle className="size-8 mx-auto text-destructive" />
          <div>
            <h2 className="text-base font-medium">Couldn't load your workspace</h2>
            <p className="text-sm text-muted-foreground mt-1">{error.message || "Please check your connection and try again."}</p>
          </div>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </>
    );
  }
  if (!current) {
    return (
      <>
        <AppTopbar title="Dashboard" />
        <div className="p-8 max-w-md mx-auto text-center space-y-4">
          <Briefcase className="size-8 mx-auto text-muted-foreground" />
          <div>
            <h2 className="text-base font-medium">No workspace yet</h2>
            <p className="text-sm text-muted-foreground mt-1">Your firm workspace hasn't been set up. Try signing out and back in.</p>
          </div>
        </div>
      </>
    );
  }

  const cur = current.default_currency;
  const statusData = (data?.statusBreakdown ?? []).filter((s) => s.amount > 0);
  const clientData = (data?.revenueByClient ?? []).slice(0, 6);
  const monthly = data?.monthly ?? [];

  return (
    <>
      <AppTopbar title="Dashboard" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h2 className="font-display text-[23px] font-semibold tracking-tight">Welcome back to {current.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">A snapshot of your firm's billing, matters, and unbilled work.</p>
        </div>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <QA to="/invoices" icon={Plus} label="New invoice" />
          <QA to="/time" icon={Clock} label="Log time" />
          <QA to="/matters" icon={Briefcase} label="New matter" />
          <QA to="/clients" icon={UserPlus} label="Add client" />
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Kpi label="ARR (run-rate)" value={fmtCompact(data?.arr ?? 0, cur)} icon={TrendingUp} loading={isLoading} tone="primary"
            delta={data?.arrDeltaPct != null ? `${data.arrDeltaPct > 0 ? "+" : ""}${data.arrDeltaPct}% vs prior 90d` : undefined}
            deltaUp={(data?.arrDeltaPct ?? 0) >= 0} />
          <Kpi label="Revenue (collected)" value={fmtCompact(data?.revenue ?? 0, cur)} icon={Wallet} loading={isLoading} />
          <Kpi label="Outstanding A/R" value={fmtCompact(data?.outstanding ?? 0, cur)} icon={FileText} loading={isLoading} />
          <Kpi label="Overdue" value={String(data?.overdueCount ?? 0)} icon={AlertCircle} loading={isLoading} tone="destructive" />
          <Kpi label="Unbilled time" value={fmtCompact(data?.unbilledTime ?? 0, cur)} icon={Clock} loading={isLoading} />
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Billings by month" subtitle="Billed vs. collected">
            {monthly.length === 0 ? <ChartEmpty /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthly} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => fmtCompact(Number(v), cur)} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip formatter={(v: number) => fmt(Number(v), cur)} labelFormatter={monthLabel} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="billed" name="Billed" fill="#0066FF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Revenue by client" subtitle="Collected, YTD">
            {clientData.length === 0 ? <ChartEmpty /> : (
              <div className="relative">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={clientData} dataKey="amount" nameKey="client" cx="50%" cy="50%" outerRadius={90} innerRadius={56} paddingAngle={2}>
                      {clientData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(Number(v), cur)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-x-0 top-[92px] flex flex-col items-center pointer-events-none">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Total</span>
                  <span className="font-display text-lg font-semibold tabular-nums">{fmtCompact(clientData.reduce((s, c) => s + c.amount, 0), cur)}</span>
                </div>
              </div>
            )}
          </ChartCard>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium">Recent invoices</h2>
              <Link to="/invoices" className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground">View all</Link>
            </div>
            <div className="bg-card ring-1 ring-border rounded-xl overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-surface border-b border-border">
                  <tr>
                    <th className="px-6 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Invoice</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Issued</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.recentInvoices ?? []).map((inv: { number: string; status: string; total: number; issue_date: string; clients?: { name?: string } | null }) => (
                    <tr key={inv.number} className="hover:bg-surface/50">
                      <td className="px-6 py-4 font-mono text-xs">{inv.number}</td>
                      <td className="px-6 py-4 text-muted-foreground">{inv.clients?.name ?? "—"}</td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">{inv.issue_date}</td>
                      <td className="px-6 py-4 font-medium tabular-nums">{fmt(Number(inv.total), cur)}</td>
                      <td className="px-6 py-4"><StatusPill status={statusLabel(inv.status)} /></td>
                    </tr>
                  ))}
                  {(!data?.recentInvoices || data.recentInvoices.length === 0) && (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">No invoices yet. <Link className="text-primary hover:underline" to="/invoices">Create your first.</Link></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-6">
            <ChartCard title="Invoice status" subtitle="By value" compact>
              {statusData.length === 0 ? <ChartEmpty /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusData} dataKey="amount" nameKey="status" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2}>
                      {statusData.map((s) => <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? "#94a3b8"} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, n: string) => [fmt(Number(v), cur), String(n)]} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, textTransform: "capitalize" }} />
                    <Legend wrapperStyle={{ fontSize: 11, textTransform: "capitalize" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
            <div className="bg-card ring-1 ring-border rounded-xl p-6 space-y-4">
              <h3 className="font-display text-sm font-semibold">Firm snapshot</h3>
              <Row label="Active clients"><Users className="size-3.5 text-muted-foreground" />{data?.clientCount ?? 0}</Row>
              <Row label="Open matters"><Briefcase className="size-3.5 text-muted-foreground" />{data?.openMatters ?? 0}</Row>
              <Row label="Overdue invoices"><AlertCircle className="size-3.5 text-destructive" />{data?.overdueCount ?? 0}</Row>
              <div className="pt-2 border-t border-border">
                <Gauge value={data?.collectionRate ?? 0} label="Collection rate" />
              </div>
            </div>
          </aside>
        </section>
      </div>
    </>
  );
}

function statusLabel(s: string): "Paid" | "Pending" | "Overdue" | "Draft" {
  if (s === "paid") return "Paid";
  if (s === "overdue") return "Overdue";
  if (s === "sent") return "Pending";
  return "Draft";
}

function ChartCard({ title, subtitle, children, compact }: { title: string; subtitle?: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <div className={"bg-card ring-1 ring-border rounded-xl " + (compact ? "p-5" : "p-6")}>
      <div className="mb-4">
        <h3 className="font-display text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-[10.5px] text-muted-foreground uppercase tracking-[0.12em] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// Semicircular collection-rate gauge.
function Gauge({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const data = [{ name: "filled", value: pct }, { name: "track", value: 100 - pct }];
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full" style={{ height: 92 }}>
        <ResponsiveContainer width="100%" height={150}>
          <PieChart>
            <Pie data={data} dataKey="value" startAngle={180} endAngle={0} cx="50%" cy="100%" innerRadius={52} outerRadius={72} stroke="none">
              <Cell fill="var(--primary)" />
              <Cell fill="var(--surface)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className="font-display text-2xl font-semibold tabular-nums">{pct}%</span>
        </div>
      </div>
      <span className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
    </div>
  );
}

function ChartEmpty() {
  return <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No data yet.</div>;
}

function Kpi({ label, value, icon: Icon, loading, tone, delta, deltaUp = true }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; loading?: boolean; tone?: "destructive" | "primary"; delta?: string; deltaUp?: boolean }) {
  return (
    <div className={"bg-card ring-1 rounded-xl p-[18px] space-y-3 min-w-0 " + (tone === "primary" ? "ring-primary/40" : "ring-border")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] text-muted-foreground font-semibold uppercase tracking-[0.12em]">{label}</p>
        <Icon className={"size-4 shrink-0 " + (tone === "primary" ? "text-primary" : "text-muted-foreground")} />
      </div>
      <h3 className={"font-display text-[26px] leading-none font-semibold tracking-tight tabular-nums truncate " + (tone === "destructive" ? "text-destructive" : tone === "primary" ? "text-primary" : "")}>
        {loading ? "—" : value}
      </h3>
      {delta && (
        <p className={"text-[11px] font-medium flex items-center gap-1 " + (deltaUp ? "text-success" : "text-destructive")}>
          {deltaUp ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}{delta}
        </p>
      )}
    </div>
  );
}

function QA({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link to={to} className="group flex items-center gap-3 p-4 rounded-xl bg-card ring-1 ring-border hover:ring-primary/40 hover:bg-surface transition-all">
      <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="size-4" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 font-medium tabular-nums">{children}</span>
    </div>
  );
}

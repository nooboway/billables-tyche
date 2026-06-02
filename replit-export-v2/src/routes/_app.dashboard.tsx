import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, AlertCircle, Clock, Wallet, Plus, Briefcase, UserPlus, Users } from "lucide-react";
import { AppTopbar } from "@/components/app/app-topbar";
import { StatusPill } from "@/components/app/status-pill";
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

function DashboardPage() {
  const { current } = useBusiness();
  const fn = useServerFn(getDashboardStats);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", current?.id],
    queryFn: () => fn({ data: { businessId: current!.id } }),
    enabled: !!current?.id,
  });

  if (!current) return <><AppTopbar title="Dashboard" /><div className="p-8 text-sm text-muted-foreground">Loading workspace…</div></>;
  const cur = current.default_currency;

  return (
    <>
      <AppTopbar title="Dashboard" />
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Welcome back to {current.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">Snapshot of your firm's billing and matters.</p>
        </div>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <QA to="/invoices" icon={Plus} label="New invoice" />
          <QA to="/time" icon={Clock} label="Log time" />
          <QA to="/matters" icon={Briefcase} label="New matter" />
          <QA to="/clients" icon={UserPlus} label="Add client" />
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Kpi label="Revenue (paid)" value={fmt(data?.revenue ?? 0, cur)} icon={Wallet} loading={isLoading} />
          <Kpi label="Outstanding" value={fmt(data?.outstanding ?? 0, cur)} icon={FileText} loading={isLoading} />
          <Kpi label="Overdue invoices" value={String(data?.overdueCount ?? 0)} icon={AlertCircle} loading={isLoading} tone="destructive" />
          <Kpi label="Unbilled time" value={fmt(data?.unbilledTime ?? 0, cur)} icon={Clock} loading={isLoading} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium">Recent invoices</h2>
              <Link to="/invoices" className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground">View all</Link>
            </div>
            <div className="bg-card ring-1 ring-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
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
            <div className="bg-card ring-1 ring-border rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-medium">Firm snapshot</h3>
              <Row label="Active clients"><Users className="size-3.5 text-muted-foreground" />{data?.clientCount ?? 0}</Row>
              <Row label="Open matters"><Briefcase className="size-3.5 text-muted-foreground" />{data?.openMatters ?? 0}</Row>
              <Row label="Overdue invoices"><AlertCircle className="size-3.5 text-destructive" />{data?.overdueCount ?? 0}</Row>
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

function Kpi({ label, value, icon: Icon, loading, tone }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; loading?: boolean; tone?: "destructive" }) {
  return (
    <div className="bg-card ring-1 ring-border rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{label}</p>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <h3 className={"text-2xl font-semibold tracking-tight " + (tone === "destructive" ? "text-destructive" : "")}>
        {loading ? "—" : value}
      </h3>
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

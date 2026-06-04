import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode, type ComponentType } from "react";
import { FileText, AlertCircle, Clock, Wallet, Briefcase, Users, TrendingUp, ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Sector, AreaChart, Area,
} from "recharts";
import { AppTopbar } from "@/components/app/app-topbar";
import { StatusPill } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/lib/business";
import { getDashboardStats } from "@/lib/api.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Billables" },
      { name: "description", content: "Law firm billing dashboard with matters, time, and invoices." },
    ],
  }),
  component: DashboardPage,
});

// ── formatting ──
function useCurrency(cur: string) {
  return {
    fmt: (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n || 0),
    fmtCompact: (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur, notation: "compact", maximumFractionDigits: 1 }).format(n || 0),
  };
}
function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleString("en-US", { month: "short", year: "2-digit" });
}
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}
function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setM(true)); return () => cancelAnimationFrame(r); }, []);
  return m;
}

const STATUS_COLORS: Record<string, string> = {
  paid: "var(--success)", sent: "var(--info)", overdue: "var(--destructive)", draft: "#94a3b8", void: "#64748b",
};
const CLIENT_COLORS = ["var(--primary)", "var(--success)", "var(--info)", "#c9a84c", "#8b5cf6", "#06b6d4"];

function DashboardPage() {
  const { current, loading, error, refetch } = useBusiness();
  const fn = useServerFn(getDashboardStats);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", current?.id],
    queryFn: () => fn({ data: { businessId: current!.id } }),
    enabled: !!current?.id,
  });
  const reduced = useReducedMotion();

  if (loading) return <><AppTopbar title="Dashboard" /><div className="p-8 text-sm text-muted-foreground">Loading workspace…</div></>;
  if (error) return (
    <>
      <AppTopbar title="Dashboard" />
      <div className="p-8 max-w-md mx-auto text-center space-y-4">
        <AlertCircle className="size-8 mx-auto text-destructive" />
        <div><h2 className="text-base font-medium">Couldn't load your workspace</h2>
          <p className="text-sm text-muted-foreground mt-1">{error.message || "Please check your connection and try again."}</p></div>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    </>
  );
  if (!current) return (
    <>
      <AppTopbar title="Dashboard" />
      <div className="p-8 max-w-md mx-auto text-center space-y-4">
        <Briefcase className="size-8 mx-auto text-muted-foreground" />
        <div><h2 className="text-base font-medium">No workspace yet</h2>
          <p className="text-sm text-muted-foreground mt-1">Your firm workspace hasn't been set up. Try signing out and back in.</p></div>
      </div>
    </>
  );

  const cur = current.default_currency;
  const { fmt, fmtCompact } = useCurrency(cur);
  const statusData = (data?.statusBreakdown ?? []).filter((s) => s.amount > 0);
  const clientData = (data?.revenueByClient ?? []).slice(0, 5);
  // cumulative collected line
  let run = 0;
  const monthly = (data?.monthly ?? []).map((m) => ({ ...m, cum: (run += Number(m.collected || 0)) }));
  const anim = !reduced;

  return (
    <>
      <AppTopbar title="Dashboard" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-[22px] leading-tight font-semibold tracking-tight">Welcome back to {current.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">A snapshot of your firm's billing, matters, and unbilled work.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <Button asChild size="sm" variant="outline"><Link to="/time">Log time</Link></Button>
            <Button asChild size="sm"><Link to="/invoices">New invoice</Link></Button>
          </div>
        </div>

        {/* ── Hero + 4 KPIs ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Hero */}
          <CardNav to="/invoices" search={{ status: "paid" }} className="lg:col-span-1 p-5 ring-primary/40 hover:ring-primary/60 flex flex-col justify-between min-h-[150px]" ariaLabel="View paid invoices">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow">Revenue collected · YTD</p>
                <p className="font-display text-[34px] leading-none font-semibold tracking-tight tabular-nums text-primary mt-2">{isLoading ? "—" : fmtCompact(data?.revenue ?? 0)}</p>
              </div>
              <HoverArrow />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 h-[22px] rounded-full bg-success/10 text-success border border-success/20">
                <ArrowUp className="size-3" />{data?.collectionRate ?? 0}% collected
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">{fmt(data?.revenue ?? 0)}</span>
            </div>
            {monthly.length > 0 && (
              <div className="h-[40px] -mx-1 -mb-1 mt-1 pointer-events-none">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthly} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs><linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient></defs>
                    <Area type="monotone" dataKey="cum" stroke="var(--primary)" strokeWidth={2} fill="url(#heroGrad)" isAnimationActive={anim} animationDuration={700} animationEasing="ease-out" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardNav>

          {/* 4 KPIs */}
          <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi to="/invoices" search={{ status: "outstanding" }} label="Outstanding A/R" value={fmtCompact(data?.outstanding ?? 0)} icon={FileText} loading={isLoading} ariaLabel="View sent and overdue invoices" />
            <Kpi to="/invoices" search={{ status: "overdue" }} label="Overdue" value={String(data?.overdueCount ?? 0)} icon={AlertCircle} loading={isLoading} tone="destructive" ariaLabel="View overdue invoices" />
            <Kpi to="/time" search={{ filter: "unbilled" }} label="Unbilled time" value={fmtCompact(data?.unbilledTime ?? 0)} icon={Clock} loading={isLoading} ariaLabel="View unbilled time entries" />
            <Kpi to="/reports" label="ARR (run-rate)" value={fmtCompact(data?.arr ?? 0)} icon={TrendingUp} loading={isLoading} tone="primary"
              delta={data?.arrDeltaPct != null ? `${data.arrDeltaPct > 0 ? "+" : ""}${data.arrDeltaPct}% vs prior 90d` : undefined}
              deltaUp={(data?.arrDeltaPct ?? 0) >= 0} ariaLabel="Open reports" />
          </div>
        </section>

        {/* ── Chart row ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Billings by month" subtitle="Billed · collected · cumulative" to="/reports">
            {monthly.length === 0 ? <ChartEmpty /> : (
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={monthly} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => fmtCompact(Number(v))} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={64} />
                  <Tooltip cursor={{ fill: "var(--surface)", opacity: 0.5 }} content={<MoneyTooltip cur={cur} labelFmt={monthLabel} />} />
                  <Bar dataKey="billed" name="Billed" fill="var(--info)" radius={[4, 4, 0, 0]} maxBarSize={34} isAnimationActive={anim} animationDuration={600} animationEasing="ease-out" animationBegin={0} />
                  <Bar dataKey="collected" name="Collected" fill="var(--success)" radius={[4, 4, 0, 0]} maxBarSize={34} isAnimationActive={anim} animationDuration={600} animationEasing="ease-out" animationBegin={120} />
                  <Line type="monotone" dataKey="cum" name="Cumulative" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} isAnimationActive={anim} animationDuration={900} animationEasing="ease-out" animationBegin={300} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Invoice status" subtitle="By value" to="/invoices">
            {statusData.length === 0 ? <ChartEmpty /> : <InteractiveDonut data={statusData} cur={cur} anim={anim} />}
          </ChartCard>
        </section>

        {/* ── Summary row ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <CardNav to="/invoices" className="p-0 overflow-hidden" ariaLabel="View all invoices">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <h3 className="font-display text-sm font-semibold">Recent invoices</h3>
                <HoverArrow inline />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-surface border-b border-border">
                    <tr>{["Invoice", "Client", "Issued", "Amount", "Status"].map((h, i) => (
                      <th key={h} className={cn("px-5 py-2.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wider", i === 3 && "text-right")}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(data?.recentInvoices ?? []).map((inv: { number: string; status: string; total: number; issue_date: string; clients?: { name?: string } | null }) => (
                      <tr key={inv.number} className="hover:bg-surface/50 transition-colors">
                        <td className="px-5 py-2.5 font-mono text-xs">{inv.number}</td>
                        <td className="px-5 py-2.5 text-muted-foreground">{inv.clients?.name ?? "—"}</td>
                        <td className="px-5 py-2.5 text-muted-foreground text-xs font-mono">{inv.issue_date}</td>
                        <td className="px-5 py-2.5 font-medium tabular-nums text-right">{fmt(Number(inv.total))}</td>
                        <td className="px-5 py-2.5"><StatusPill status={statusLabel(inv.status)} /></td>
                      </tr>
                    ))}
                    {(!data?.recentInvoices || data.recentInvoices.length === 0) && (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">No invoices yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardNav>
          </div>

          <div className="space-y-4">
            <ChartCard title="Top clients" subtitle="By revenue" to="/clients">
              {clientData.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No revenue yet.</div> : (
                <TopClientBars data={clientData} cur={cur} anim={anim} />
              )}
            </ChartCard>
            <CardNav to="/clients" className="p-5 space-y-3" ariaLabel="View firm snapshot">
              <div className="flex items-center justify-between"><h3 className="font-display text-sm font-semibold">Firm snapshot</h3><HoverArrow inline /></div>
              <Row label="Active clients"><Users className="size-3.5 text-muted-foreground" />{data?.clientCount ?? 0}</Row>
              <Row label="Open matters"><Briefcase className="size-3.5 text-muted-foreground" />{data?.openMatters ?? 0}</Row>
              <Row label="Overdue invoices"><AlertCircle className="size-3.5 text-destructive" />{data?.overdueCount ?? 0}</Row>
            </CardNav>
          </div>
        </section>
      </div>
    </>
  );
}

// ── Interactive donut ──
function InteractiveDonut({ data, cur, anim }: { data: { status: string; amount: number; count: number }[]; cur: string; anim: boolean }) {
  const { fmt, fmtCompact } = useCurrency(cur);
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.amount, 0);
  const shown = active != null ? data[active] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <div className="relative" style={{ width: 200, height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data} dataKey="amount" nameKey="status" cx="50%" cy="50%" innerRadius={58} outerRadius={82} paddingAngle={2}
              isAnimationActive={anim} animationDuration={800} animationEasing="ease-out"
              activeIndex={active ?? undefined}
              activeShape={(p: Record<string, unknown>) => <Sector {...(p as object)} outerRadius={(p.outerRadius as number) + 8} />}
              onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)}
            >
              {data.map((s, i) => <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? "#94a3b8"} opacity={active == null || active === i ? 1 : 0.35} style={{ transition: "opacity 150ms" }} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground capitalize">{shown ? shown.status : "Total"}</span>
          <span className="font-display text-lg font-semibold tabular-nums">{fmtCompact(shown ? shown.amount : total)}</span>
        </div>
      </div>
      {/* cross-highlighting legend */}
      <ul className="flex-1 w-full space-y-1.5">
        {data.map((s, i) => (
          <li key={s.status}
            onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
            className={cn("flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-xs cursor-default transition-colors", active === i ? "bg-surface" : active != null ? "opacity-50" : "")}>
            <span className="flex items-center gap-2 capitalize min-w-0">
              <span className="size-2.5 rounded-sm shrink-0" style={{ background: STATUS_COLORS[s.status] ?? "#94a3b8" }} />
              <span className="truncate">{s.status}</span>
            </span>
            <span className="tabular-nums font-medium shrink-0">{fmt(s.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Animated top-client bars (CSS, precise stagger) ──
function TopClientBars({ data, cur, anim }: { data: { client: string; amount: number }[]; cur: string; anim: boolean }) {
  const { fmt } = useCurrency(cur);
  const mounted = useMounted();
  const max = Math.max(...data.map((d) => d.amount), 1);
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const pct = (d.amount / max) * 100;
        const w = anim ? (mounted ? pct : 0) : pct;
        return (
          <div key={d.client} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="space-y-1 cursor-default">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate max-w-[60%] text-muted-foreground">{d.client}</span>
              <span className={cn("tabular-nums font-medium transition-colors", hover === i ? "text-primary" : "")}>{fmt(d.amount)}</span>
            </div>
            <div className="h-2 rounded-full bg-surface overflow-hidden">
              <div className="h-full rounded-full" style={{
                width: `${w}%`, background: CLIENT_COLORS[i % CLIENT_COLORS.length],
                opacity: hover == null || hover === i ? 1 : 0.45,
                transition: anim ? `width 600ms ease-out ${i * 80}ms, opacity 150ms` : "opacity 150ms",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Premium themed tooltip ──
function MoneyTooltip({ active, payload, label, cur, labelFmt }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; cur: string; labelFmt?: (s: string) => string }) {
  if (!active || !payload?.length) return null;
  const f = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n || 0);
  return (
    <div className="rounded-lg border border-border bg-card shadow-[0_2px_6px_rgba(0,0,0,.06),0_18px_40px_-18px_rgba(0,0,0,.35)] px-3 py-2 text-xs">
      <p className="font-medium mb-1">{labelFmt && label ? labelFmt(label) : label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 tabular-nums">
          <span className="size-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-medium">{f(Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}

function statusLabel(s: string): "Paid" | "Pending" | "Overdue" | "Draft" {
  if (s === "paid") return "Paid";
  if (s === "overdue") return "Overdue";
  if (s === "sent") return "Pending";
  return "Draft";
}

// ── Reusable: hover arrow ──
function HoverArrow({ inline }: { inline?: boolean }) {
  return (
    <ArrowRight className={cn("size-4 text-muted-foreground card-arrow", inline && "")} aria-hidden />
  );
}

// ── Reusable: whole-card navigation (keyboard accessible) ──
function CardNav({ to, search, className, children, ariaLabel }: { to: string; search?: Record<string, string>; className?: string; children: ReactNode; ariaLabel?: string }) {
  return (
    <Link to={to} search={search as never} aria-label={ariaLabel}
      className={cn("group block bg-card ring-1 ring-border rounded-xl card-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40", className)}>
      {children}
    </Link>
  );
}

// ── KPI card (deep-links with carried filter) ──
function Kpi({ to, search, label, value, icon: Icon, loading, tone, delta, deltaUp = true, ariaLabel }: {
  to: string; search?: Record<string, string>; label: string; value: string; icon: ComponentType<{ className?: string }>;
  loading?: boolean; tone?: "destructive" | "primary"; delta?: string; deltaUp?: boolean; ariaLabel?: string;
}) {
  return (
    <Link to={to} search={search as never} aria-label={ariaLabel}
      className={cn(
        "group block bg-card ring-1 rounded-xl p-[18px] space-y-2.5 card-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        tone === "primary" ? "ring-primary/40 hover:ring-primary/60" : tone === "destructive" ? "ring-destructive/30 hover:ring-destructive/50" : "ring-border hover:ring-primary/40"
      )}>
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow">{label}</p>
        <span className="relative shrink-0">
          <Icon className={cn("size-4 group-hover:opacity-0 transition-opacity", tone === "primary" ? "text-primary" : tone === "destructive" ? "text-destructive" : "text-muted-foreground")} />
          <ArrowRight className="size-4 absolute inset-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 text-primary" aria-hidden />
        </span>
      </div>
      <h3 className={cn("font-display text-xl xl:text-[22px] leading-none font-semibold tracking-tight tabular-nums truncate", tone === "destructive" ? "text-destructive" : tone === "primary" ? "text-primary" : "")}>
        {loading ? "—" : value}
      </h3>
      {delta ? (
        <p className={cn("text-[11px] font-medium flex items-center gap-1", deltaUp ? "text-success" : "text-destructive")}>
          {deltaUp ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}{delta}
        </p>
      ) : <p className="text-[11px] text-muted-foreground">View details</p>}
    </Link>
  );
}

// ── Chart card with header link + hover arrow ──
function ChartCard({ title, subtitle, children, to }: { title: string; subtitle?: string; children: ReactNode; to?: string }) {
  const Header = (
    <div className="group flex items-center justify-between mb-4">
      <div>
        <h3 className="font-display text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-[10.5px] text-muted-foreground uppercase tracking-[0.12em] mt-0.5">{subtitle}</p>}
      </div>
      {to && <HoverArrow inline />}
    </div>
  );
  return (
    <div className="bg-card ring-1 ring-border rounded-xl p-5 card-interactive">
      {to ? <Link to={to} aria-label={`Open ${title}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md">{Header}</Link> : Header}
      {children}
    </div>
  );
}

function ChartEmpty() { return <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No data yet.</div>; }

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 font-medium tabular-nums">{children}</span>
    </div>
  );
}

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileText } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { AppTopbar } from "@/components/app/app-topbar";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/lib/business";
import { getReports } from "@/lib/api.functions";
import { toCSV, downloadCSV } from "@/lib/csv";
import { downloadReportPdf } from "@/lib/report-pdf";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — Billables" }] }),
  component: ReportsPage,
});

type Tab = "wip" | "outstanding" | "overdue" | "collections";
const tabs: { id: Tab; label: string; help: string }[] = [
  { id: "wip", label: "WIP", help: "Unbilled billable time by matter" },
  { id: "outstanding", label: "Outstanding A/R", help: "Sent & overdue invoices" },
  { id: "overdue", label: "Overdue", help: "Past due date" },
  { id: "collections", label: "Collections", help: "Paid invoices by month" },
];

function fmt(n: number, c = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(Number(n) || 0);
}
function fmtCompact(n: number, c = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c, notation: "compact", maximumFractionDigits: 1 }).format(Number(n) || 0);
}
function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleString("en-US", { month: "short", year: "2-digit" });
}

function ReportsPage() {
  const { current } = useBusiness();
  const fn = useServerFn(getReports);
  const { data } = useQuery({
    queryKey: ["reports", current?.id],
    queryFn: () => fn({ data: { businessId: current!.id } }),
    enabled: !!current?.id,
  });
  const [tab, setTab] = useState<Tab>("wip");
  const cur = current?.default_currency ?? "USD";

  if (!current) return <><AppTopbar title="Reports" /><div className="p-8 text-sm text-muted-foreground">Loading…</div></>;

  const exportCsv = () => {
    if (!data) return;
    let rows: Array<Record<string, unknown>> = [];
    if (tab === "wip") rows = data.wip.map((r) => ({ Matter: r.matter_name, Client: r.client, Entries: r.entries, Hours: r.hours.toFixed(2), Amount: r.amount.toFixed(2) }));
    if (tab === "outstanding" || tab === "overdue") {
      const src = tab === "outstanding" ? data.outstanding : data.overdue;
      rows = src.map((r) => ({ Invoice: r.number, Client: (r.clients as { name?: string } | null)?.name ?? "", Issued: r.issue_date, Due: r.due_date ?? "", "Days overdue": r.days_overdue, Status: r.status, Total: Number(r.total).toFixed(2) }));
    }
    if (tab === "collections") rows = data.collections.map((r) => ({ Month: r.month, Collected: r.total.toFixed(2) }));
    downloadCSV(`${tab}-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows));
  };

  const exportPdf = () => {
    if (!data) return;
    if (tab === "wip") {
      downloadReportPdf({
        business: current,
        title: "Work in Progress",
        columns: [
          { key: "matter", label: "Matter", width: 220 },
          { key: "client", label: "Client", width: 140 },
          { key: "entries", label: "Entries", width: 60, align: "right" },
          { key: "hours", label: "Hours", width: 60, align: "right" },
          { key: "amount", label: "Amount", width: 80, align: "right" },
        ],
        rows: data.wip.map((r) => ({ matter: r.matter_name, client: r.client, entries: r.entries, hours: r.hours.toFixed(2), amount: fmt(r.amount, cur) })),
        totalLabel: "Total WIP",
        totalValue: fmt(data.totals.wip, cur),
      });
    } else if (tab === "collections") {
      downloadReportPdf({
        business: current, title: "Collections",
        columns: [
          { key: "month", label: "Month", width: 200 },
          { key: "amount", label: "Collected", width: 200, align: "right" },
        ],
        rows: data.collections.map((r) => ({ month: r.month, amount: fmt(r.total, cur) })),
        totalLabel: "Total collected", totalValue: fmt(data.totals.collected, cur),
      });
    } else {
      const src = tab === "outstanding" ? data.outstanding : data.overdue;
      downloadReportPdf({
        business: current, title: tab === "outstanding" ? "Outstanding Receivables" : "Overdue Invoices",
        columns: [
          { key: "number", label: "Invoice", width: 90 },
          { key: "client", label: "Client", width: 160 },
          { key: "issue", label: "Issued", width: 80 },
          { key: "due", label: "Due", width: 80 },
          { key: "days", label: "Days OD", width: 60, align: "right" },
          { key: "total", label: "Total", width: 80, align: "right" },
        ],
        rows: src.map((r) => ({
          number: r.number,
          client: (r.clients as { name?: string } | null)?.name ?? "—",
          issue: r.issue_date, due: r.due_date ?? "—",
          days: r.days_overdue, total: fmt(Number(r.total), cur),
        })),
        totalLabel: "Total outstanding",
        totalValue: fmt(tab === "outstanding" ? data.totals.outstanding : data.totals.overdue, cur),
      });
    }
  };

  return (
    <>
      <AppTopbar title="Reports" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI label="WIP (unbilled)" value={fmtCompact(data?.totals.wip ?? 0, cur)} active={tab === "wip"} onClick={() => setTab("wip")} />
          <KPI label="Outstanding A/R" value={fmtCompact(data?.totals.outstanding ?? 0, cur)} active={tab === "outstanding"} onClick={() => setTab("outstanding")} />
          <KPI label="Overdue" value={fmtCompact(data?.totals.overdue ?? 0, cur)} active={tab === "overdue"} onClick={() => setTab("overdue")} tone="destructive" />
          <KPI label="Collected (YTD)" value={fmtCompact(data?.totals.collected ?? 0, cur)} active={tab === "collections"} onClick={() => setTab("collections")} />
        </div>

        {/* Aging */}
        {data && (
          <div className="bg-card ring-1 ring-border rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold mb-3">A/R Aging</h3>
            <div className="grid grid-cols-5 gap-3 text-xs">
              <Aging label="Current" v={fmt(data.aging.current, cur)} />
              <Aging label="1–30" v={fmt(data.aging.d1_30, cur)} />
              <Aging label="31–60" v={fmt(data.aging.d31_60, cur)} />
              <Aging label="61–90" v={fmt(data.aging.d61_90, cur)} />
              <Aging label="90+" v={fmt(data.aging.d90_plus, cur)} tone="destructive" />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-surface ring-1 ring-border rounded-lg p-1">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={cn("px-3 py-1.5 text-xs font-medium rounded-md", tab === t.id ? "bg-card text-foreground ring-1 ring-border" : "text-muted-foreground hover:text-foreground")}>{t.label}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5"><Download className="size-3.5" />CSV</Button>
            <Button variant="outline" size="sm" onClick={exportPdf} className="gap-1.5"><FileText className="size-3.5" />PDF</Button>
          </div>
        </div>

        <div className="bg-card ring-1 ring-border rounded-xl overflow-hidden">
          {tab === "wip" && (
            <Table headers={["Matter", "Client", "Entries", "Hours", "Amount"]}>
              {(data?.wip ?? []).map((r) => (
                <tr key={r.matter_id} className="hover:bg-surface/50">
                  <Td>{r.matter_name}</Td><Td muted>{r.client}</Td>
                  <Td num>{r.entries}</Td><Td num>{r.hours.toFixed(2)}</Td><Td num strong>{fmt(r.amount, cur)}</Td>
                </tr>
              ))}
              {(data?.wip ?? []).length === 0 && <Empty cols={5} label="No unbilled time." />}
            </Table>
          )}
          {(tab === "outstanding" || tab === "overdue") && (
            <Table headers={["Invoice", "Client", "Issued", "Due", "Days OD", "Status", "Total"]}>
              {(tab === "outstanding" ? data?.outstanding : data?.overdue ?? [])?.map((r) => (
                <tr key={r.id} className="hover:bg-surface/50">
                  <Td mono>{r.number}</Td>
                  <Td muted>{(r.clients as { name?: string } | null)?.name ?? "—"}</Td>
                  <Td muted>{r.issue_date}</Td>
                  <Td muted>{r.due_date ?? "—"}</Td>
                  <Td num className={r.days_overdue > 0 ? "text-destructive font-medium" : ""}>{r.days_overdue}</Td>
                  <Td muted>{r.status}</Td>
                  <Td num strong>{fmt(Number(r.total), cur)}</Td>
                </tr>
              ))}
              {((tab === "outstanding" ? data?.outstanding : data?.overdue) ?? []).length === 0 && <Empty cols={7} label="Nothing here. 🎉" />}
            </Table>
          )}
          {tab === "collections" && (
            <>
              {(data?.collections ?? []).length > 0 && (
                <div className="p-5 border-b border-border">
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={data!.collections} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => fmtCompact(Number(v), cur)} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={70} />
                      <Tooltip formatter={(v: number) => fmt(Number(v), cur)} labelFormatter={monthLabel} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="total" name="Collected" stroke="var(--primary)" strokeWidth={2} fill="url(#collGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              <Table headers={["Month", "Collected"]}>
                {(data?.collections ?? []).map((r) => (
                  <tr key={r.month} className="hover:bg-surface/50">
                    <Td>{r.month}</Td><Td num strong>{fmt(r.total, cur)}</Td>
                  </tr>
                ))}
                {(data?.collections ?? []).length === 0 && <Empty cols={2} label="No collections yet." />}
              </Table>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function KPI({ label, value, active, onClick, tone }: { label: string; value: string; active?: boolean; onClick: () => void; tone?: "destructive" }) {
  return (
    <button onClick={onClick} className={cn("text-left bg-card ring-1 rounded-xl p-[18px] hover:bg-surface transition", active ? "ring-[1.5px] ring-primary" : "ring-border")}>
      <p className="text-[10.5px] text-muted-foreground font-semibold uppercase tracking-[0.12em]">{label}</p>
      <h3 className={cn("font-display text-xl xl:text-[22px] leading-none font-semibold mt-3 tabular-nums truncate", tone === "destructive" && "text-destructive")}>{value}</h3>
    </button>
  );
}
function Aging({ label, v, tone }: { label: string; v: string; tone?: "destructive" }) {
  return (
    <div className="bg-surface ring-1 ring-border rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-semibold mt-1 tabular-nums", tone === "destructive" && "text-destructive")}>{v}</p>
    </div>
  );
}
function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
    <table className="w-full min-w-[640px] text-left text-sm">
      <thead className="bg-surface border-b border-border">
        <tr>{headers.map((h) => <th key={h} className="px-5 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-border">{children}</tbody>
    </table>
    </div>
  );
}
function Td({ children, muted, num, strong, mono, className }: { children: React.ReactNode; muted?: boolean; num?: boolean; strong?: boolean; mono?: boolean; className?: string }) {
  return <td className={cn("px-5 py-3", muted && "text-muted-foreground", num && "tabular-nums text-right", strong && "font-medium", mono && "font-mono text-xs", className)}>{children}</td>;
}
function Empty({ cols, label }: { cols: number; label: string }) {
  return <tr><td colSpan={cols} className="px-5 py-12 text-center text-sm text-muted-foreground">{label}</td></tr>;
}
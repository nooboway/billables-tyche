import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Plus, Search, FileText, Trash2, List, LayoutGrid } from "lucide-react";
import { AppTopbar } from "@/components/app/app-topbar";
import { StatusPill } from "@/components/app/status-pill";
import { useBusiness } from "@/lib/business";
import { listInvoices, listClients, listMatters, listTimeEntries, createInvoice, deleteInvoice, updateInvoiceStatus } from "@/lib/api.functions";
import { downloadInvoicePdf, type InvoiceLike } from "@/lib/invoice-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/invoices")({
  head: () => ({ meta: [{ title: "Invoices — Billables" }] }),
  validateSearch: (s: Record<string, unknown>): { status?: string } => ({
    status: typeof s.status === "string" ? s.status : undefined,
  }),
  component: InvoicesPage,
});

type Invoice = InvoiceLike & { id: string };
type TE = { id: string; entry_date: string; minutes: number; rate: number; description: string | null; matter_id: string; matters?: { name: string; client_id: string } | null };

const filters = ["All", "outstanding", "draft", "sent", "overdue", "paid"] as const;
type Filter = (typeof filters)[number];
function filterFromSearch(status?: string): Filter {
  const s = (status ?? "").toLowerCase();
  return (filters as readonly string[]).includes(s) ? (s as Filter) : "All";
}

function statusLabel(s: string): "Paid" | "Pending" | "Overdue" | "Draft" {
  if (s === "paid") return "Paid";
  if (s === "overdue") return "Overdue";
  if (s === "sent") return "Pending";
  return "Draft";
}

function InvoicesPage() {
  const { current } = useBusiness();
  const listFn = useServerFn(listInvoices);
  const clFn = useServerFn(listClients);
  const mtFn = useServerFn(listMatters);
  const teFn = useServerFn(listTimeEntries);
  const createFn = useServerFn(createInvoice);
  const delFn = useServerFn(deleteInvoice);
  const statusFn = useServerFn(updateInvoiceStatus);
  const qc = useQueryClient();
  const { status: statusParam } = Route.useSearch();
  const [filter, setFilter] = useState<Filter>(() => filterFromSearch(statusParam));
  useEffect(() => { setFilter(filterFromSearch(statusParam)); }, [statusParam]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState<"table" | "cards">("cards");
  useEffect(() => {
    const s = typeof window !== "undefined" ? localStorage.getItem("billables.invoices.layout") : null;
    if (s === "table" || s === "cards") setLayout(s);
  }, []);
  const setLayoutPersist = (l: "table" | "cards") => { setLayout(l); if (typeof window !== "undefined") localStorage.setItem("billables.invoices.layout", l); };
  const today = new Date().toISOString().slice(0, 10);
  const dueDefault = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [form, setForm] = useState<{ client_id: string; matter_id: string; issue_date: string; due_date: string; tax: string; notes: string; selectedTE: Set<string>; manual: { description: string; quantity: string; rate: string }[] }>({
    client_id: "", matter_id: "", issue_date: today, due_date: dueDefault, tax: "0", notes: "", selectedTE: new Set(), manual: [],
  });

  const { data: rows = [] } = useQuery<Invoice[]>({
    queryKey: ["invoices", current?.id],
    queryFn: () => listFn({ data: { businessId: current!.id } }) as Promise<Invoice[]>,
    enabled: !!current?.id,
  });
  const { data: clients = [] } = useQuery<{ id: string; name: string; company: string | null }[]>({
    queryKey: ["clients", current?.id],
    queryFn: () => clFn({ data: { businessId: current!.id } }) as never,
    enabled: !!current?.id,
  });
  const { data: matters = [] } = useQuery<{ id: string; name: string; client_id: string; default_rate: number | null }[]>({
    queryKey: ["matters", current?.id],
    queryFn: () => mtFn({ data: { businessId: current!.id } }) as never,
    enabled: !!current?.id,
  });
  const { data: unbilled = [] } = useQuery<TE[]>({
    queryKey: ["time", current?.id, "unbilled"],
    queryFn: () => teFn({ data: { businessId: current!.id, unbilledOnly: true } }) as Promise<TE[]>,
    enabled: !!current?.id && open,
  });

  const filteredTE = useMemo(() => {
    if (!form.client_id) return [];
    const clientMatterIds = matters.filter((m) => m.client_id === form.client_id).map((m) => m.id);
    return unbilled.filter((t) => clientMatterIds.includes(t.matter_id));
  }, [unbilled, matters, form.client_id]);

  const create = useMutation({
    mutationFn: async () => {
      const teItems = filteredTE
        .filter((t) => form.selectedTE.has(t.id))
        .map((t) => ({
          description: `${t.matters?.name ?? ""}: ${t.description ?? "Legal services"} (${(t.minutes / 60).toFixed(2)}h)`,
          quantity: t.minutes / 60,
          rate: Number(t.rate),
          time_entry_id: t.id,
          kind: "time",
        }));
      const manualItems = form.manual.filter((m) => m.description).map((m) => ({
        description: m.description,
        quantity: Number(m.quantity) || 1,
        rate: Number(m.rate) || 0,
        kind: "service",
      }));
      const items = [...teItems, ...manualItems];
      if (items.length === 0) throw new Error("Add at least one line item");
      return createFn({ data: {
        business_id: current!.id,
        client_id: form.client_id,
        matter_id: form.matter_id || null,
        issue_date: form.issue_date,
        due_date: form.due_date || null,
        tax: Number(form.tax) || 0,
        notes: form.notes || null,
        items,
        status: "sent",
      } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["time"] });
      setOpen(false);
      setForm({ client_id: "", matter_id: "", issue_date: today, due_date: dueDefault, tax: "0", notes: "", selectedTE: new Set(), manual: [] });
      toast.success("Invoice created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); toast.success("Invoice deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => statusFn({ data: { id, status: "paid" } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); toast.success("Marked paid"); },
  });

  const visible = useMemo(() => rows.filter((i) => {
    const fOk = filter === "All" ? true
      : filter === "outstanding" ? (i.status === "sent" || i.status === "overdue")
      : i.status === filter;
    const qOk = !q || (i.number + (i.clients?.name ?? "")).toLowerCase().includes(q.toLowerCase());
    return fOk && qOk;
  }), [rows, filter, q]);

  const cur = current?.default_currency ?? "USD";
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n);

  const clientMatters = matters.filter((m) => m.client_id === form.client_id);

  // Live total for the create dialog (selected time + manual lines + tax)
  const dialogTotal = useMemo(() => {
    const timeSum = filteredTE.filter((t) => form.selectedTE.has(t.id)).reduce((s, t) => s + (t.minutes / 60) * Number(t.rate), 0);
    const manualSum = form.manual.reduce((s, m) => s + (Number(m.quantity) || 0) * (Number(m.rate) || 0), 0);
    return timeSum + manualSum + (Number(form.tax) || 0);
  }, [filteredTE, form.selectedTE, form.manual, form.tax]);

  return (
    <>
      <AppTopbar title="Invoices" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg ring-1 ring-border bg-card overflow-x-auto">
            {filters.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn("px-3 h-8 text-xs font-medium rounded-md whitespace-nowrap capitalize", filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{f}</button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full h-9 pl-9 pr-3 rounded-lg ring-1 ring-border bg-card text-sm focus:ring-primary outline-none" />
          </div>
          <div className="flex items-center rounded-lg ring-1 ring-border p-0.5 bg-card">
            <button onClick={() => setLayoutPersist("table")} className={cn("size-7 grid place-items-center rounded-md", layout === "table" ? "bg-surface text-foreground ring-1 ring-border" : "text-muted-foreground")} aria-label="Table view"><List className="size-3.5" /></button>
            <button onClick={() => setLayoutPersist("cards")} className={cn("size-7 grid place-items-center rounded-md", layout === "cards" ? "bg-surface text-foreground ring-1 ring-border" : "text-muted-foreground")} aria-label="Cards view"><LayoutGrid className="size-3.5" /></button>
          </div>
          <Button onClick={() => setOpen(true)} disabled={clients.length === 0} className="gap-1.5"><Plus className="size-4" />New invoice</Button>
        </div>

        {visible.length === 0 ? (
          <div className="bg-card ring-1 ring-border rounded-xl px-5 py-16 text-center text-sm text-muted-foreground"><FileText className="size-7 mx-auto mb-3 opacity-50" />No invoices.</div>
        ) : layout === "table" ? (
          <div className="bg-card ring-1 ring-border rounded-xl overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-surface border-b border-border">
                <tr><Th>Invoice</Th><Th>Client</Th><Th className="hidden md:table-cell">Matter</Th><Th>Issued</Th><Th>Due</Th><Th className="text-right">Amount</Th><Th>Status</Th><Th /></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface/50 group">
                    <td className="px-5 py-[13px] font-mono text-xs">{inv.number}</td>
                    <td className="px-5 py-[13px]">{inv.clients?.name ?? "—"}</td>
                    <td className="px-5 py-[13px] text-muted-foreground hidden md:table-cell">{inv.matters?.name ?? "—"}</td>
                    <td className="px-5 py-[13px] text-muted-foreground text-xs font-mono">{inv.issue_date}</td>
                    <td className="px-5 py-[13px] text-muted-foreground text-xs font-mono">{inv.due_date ?? "—"}</td>
                    <td className="px-5 py-[13px] text-right font-medium tabular-nums">{fmt(Number(inv.total))}</td>
                    <td className="px-5 py-[13px]"><StatusPill status={statusLabel(inv.status)} /></td>
                    <td className="px-5 py-[13px] text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => downloadInvoicePdf(inv, current!)} title="Download PDF" className="inline-flex items-center gap-1 text-xs font-medium px-2 h-7 rounded-md ring-1 ring-border bg-card hover:bg-surface"><Download className="size-3.5" />PDF</button>
                        {inv.status !== "paid" && <button onClick={() => markPaid.mutate(inv.id)} className="text-xs font-medium px-2 h-7 rounded-md ring-1 ring-border bg-card hover:bg-surface" title="Mark paid">Paid</button>}
                        <button onClick={() => remove.mutate(inv.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-[18px]" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {visible.map((inv) => (
              <div key={inv.id} className="bg-card ring-1 ring-border rounded-xl p-5 space-y-4 hover:ring-primary/30 transition">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs">{inv.number}</span>
                  <StatusPill status={statusLabel(inv.status)} />
                </div>
                <div className="text-sm">
                  <div className="font-medium truncate">{inv.clients?.name ?? "—"}</div>
                  <div className="text-muted-foreground text-xs truncate">{inv.matters?.name ?? "General"}</div>
                </div>
                <div className="border-t border-border pt-3 flex items-end justify-between">
                  <div>
                    <p className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">Due {inv.due_date ?? "—"}</p>
                    <p className="font-display text-xl font-bold tabular-nums mt-0.5">{fmt(Number(inv.total))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {inv.status !== "paid" && <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => markPaid.mutate(inv.id)}>Mark paid</Button>}
                  <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => downloadInvoicePdf(inv, current!)}><Download className="size-3.5" />PDF</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="font-display">New invoice</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Client *</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v, matter_id: "", selectedTE: new Set() })}>
                  <SelectTrigger><SelectValue placeholder="Choose client" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Matter</Label>
                <Select value={form.matter_id} onValueChange={(v) => setForm({ ...form, matter_id: v })} disabled={!form.client_id}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{clientMatters.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Issue date</Label><Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
              <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>

            {filteredTE.length > 0 && (
              <div>
                <Label className="mb-2 block">Unbilled time entries</Label>
                <div className="border border-border rounded-md divide-y divide-border max-h-48 overflow-y-auto">
                  {filteredTE.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 p-2 text-xs hover:bg-surface cursor-pointer">
                      <Checkbox checked={form.selectedTE.has(t.id)} onCheckedChange={(c) => {
                        const next = new Set(form.selectedTE);
                        if (c) next.add(t.id); else next.delete(t.id);
                        setForm({ ...form, selectedTE: next });
                      }} />
                      <span className="flex-1">
                        <span className="font-medium">{t.matters?.name}</span> · {t.description ?? "Legal services"}
                      </span>
                      <span className="tabular-nums text-muted-foreground">{(t.minutes / 60).toFixed(2)}h × {fmt(Number(t.rate))}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Additional line items</Label>
                <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, manual: [...form.manual, { description: "", quantity: "1", rate: "0" }] })}>+ Add line</Button>
              </div>
              {form.manual.map((m, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                  <Input className="col-span-7" placeholder="Description" value={m.description} onChange={(e) => { const x = [...form.manual]; x[i] = { ...x[i], description: e.target.value }; setForm({ ...form, manual: x }); }} />
                  <Input className="col-span-2" type="number" placeholder="Qty" value={m.quantity} onChange={(e) => { const x = [...form.manual]; x[i] = { ...x[i], quantity: e.target.value }; setForm({ ...form, manual: x }); }} />
                  <Input className="col-span-3" type="number" placeholder="Rate" value={m.rate} onChange={(e) => { const x = [...form.manual]; x[i] = { ...x[i], rate: e.target.value }; setForm({ ...form, manual: x }); }} />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tax</Label><Input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter className="items-center sm:justify-between gap-3">
            <div className="text-left">
              <span className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">Total</span>
              <span className="ml-2 font-display text-lg font-bold tabular-nums">{fmt(dialogTotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button disabled={!form.client_id || create.isPending} onClick={() => create.mutate()}>{create.isPending ? "Creating…" : "Create & send"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("px-5 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider", className)}>{children}</th>;
}

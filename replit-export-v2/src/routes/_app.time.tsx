import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Clock, Trash2, Play, Square } from "lucide-react";
import { AppTopbar } from "@/components/app/app-topbar";
import { useBusiness } from "@/lib/business";
import { useAuth } from "@/lib/auth";
import { useTimer, formatHMS } from "@/lib/timer";
import { listTimeEntries, listMatters, upsertTimeEntry, deleteTimeEntry } from "@/lib/api.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/time")({
  head: () => ({ meta: [{ title: "Time tracking — Billables" }] }),
  validateSearch: (s: Record<string, unknown>): { filter?: string } => ({
    filter: s.filter === "unbilled" ? "unbilled" : undefined,
  }),
  component: TimePage,
});

type TE = { id: string; entry_date: string; minutes: number; rate: number; description: string | null; billable: boolean; invoice_id: string | null; matter_id: string; matters?: { name: string; clients?: { name: string } | null } | null };
type Matter = { id: string; name: string; default_rate: number | null; clients?: { name: string } | null };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "—";
}

function TimePage() {
  const { current } = useBusiness();
  const { user } = useAuth();
  const byName = (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "You";
  const timer = useTimer();
  const listFn = useServerFn(listTimeEntries);
  const mFn = useServerFn(listMatters);
  const upFn = useServerFn(upsertTimeEntry);
  const delFn = useServerFn(deleteTimeEntry);
  const qc = useQueryClient();
  const { filter: timeFilter } = Route.useSearch();
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ matter_id: "", entry_date: today, hours: "1.0", description: "", billable: true, rate: "350" });
  const [pickMatter, setPickMatter] = useState("");

  const { data: entries = [] } = useQuery<TE[]>({
    queryKey: ["time", current?.id],
    queryFn: () => listFn({ data: { businessId: current!.id } }) as Promise<TE[]>,
    enabled: !!current?.id,
  });
  const { data: matters = [] } = useQuery<Matter[]>({
    queryKey: ["matters", current?.id],
    queryFn: () => mFn({ data: { businessId: current!.id } }) as never,
    enabled: !!current?.id,
  });

  const upsert = useMutation({
    mutationFn: (v: typeof form) => upFn({ data: {
      business_id: current!.id, matter_id: v.matter_id, entry_date: v.entry_date,
      minutes: Math.round(parseFloat(v.hours) * 60), rate: Number(v.rate) || 0,
      description: v.description || null, billable: v.billable,
    } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["time"] }); setOpen(false); toast.success("Time entry saved"); setForm({ matter_id: "", entry_date: today, hours: "1.0", description: "", billable: true, rate: "350" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["time"] }); toast.success("Deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const cur = current?.default_currency ?? "USD";
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
  const unbilled = entries.filter((e) => e.billable && !e.invoice_id).reduce((s, e) => s + (e.minutes / 60) * Number(e.rate), 0);
  const totalHours = entries.reduce((s, e) => s + e.minutes, 0) / 60;
  const shownEntries = timeFilter === "unbilled" ? entries.filter((e) => e.billable && !e.invoice_id) : entries;

  return (
    <>
      <AppTopbar title="Time tracking" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Unbilled value" value={fmt(unbilled)} />
          <StatCard label="Hours logged" value={`${totalHours.toFixed(1)}h`} />

          {/* Active timer — shares state with the topbar widget */}
          <div className="bg-card ring-1 ring-primary/40 rounded-xl p-[18px] space-y-3">
            <p className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground font-semibold flex items-center gap-1.5">
              {timer.running && <span className="size-1.5 rounded-full bg-primary animate-pulse" />}Active timer
            </p>
            <p className="font-display text-[22px] font-bold tabular-nums leading-none">{formatHMS(timer.elapsedSec)}</p>
            {timer.running ? (
              <>
                <Input value={timer.desc} onChange={(e) => timer.setDesc(e.target.value)} placeholder="What are you working on?" className="h-8 text-xs" />
                <Button size="sm" className="w-full gap-1.5" onClick={() => timer.stop()}><Square className="size-3 fill-current" />Stop &amp; log</Button>
              </>
            ) : (
              <>
                <Select value={pickMatter} onValueChange={setPickMatter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select a matter" /></SelectTrigger>
                  <SelectContent>{matters.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="sm" className="w-full gap-1.5" disabled={!pickMatter} onClick={() => timer.start(pickMatter)}><Play className="size-3 fill-current" />Start</Button>
              </>
            )}
          </div>
        </section>

        <div className="flex items-center justify-between gap-3">
          <div>
            {timeFilter === "unbilled" && (
              <Link to="/time" search={{}} className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20">
                <span className="size-1.5 rounded-full bg-current" />Unbilled only ✕
              </Link>
            )}
          </div>
          <Button onClick={() => setOpen(true)} disabled={matters.length === 0} className="gap-1.5"><Plus className="size-4" />Log time manually</Button>
        </div>
        {matters.length === 0 && <p className="text-xs text-muted-foreground">Create a matter first.</p>}

        <div className="bg-card ring-1 ring-border rounded-xl overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface border-b border-border">
              <tr><Th>Date</Th><Th>Matter</Th><Th>Description</Th><Th>By</Th><Th right>Hours</Th><Th right>Amount</Th><Th>Status</Th><Th /></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shownEntries.map((e) => (
                <tr key={e.id} className="hover:bg-surface/50 group">
                  <td className="px-5 py-[13px] text-xs text-muted-foreground font-mono">{e.entry_date}</td>
                  <td className="px-5 py-[13px]">
                    <div>{e.matters?.name ?? "—"}</div>
                    <div className="text-[11px] text-muted-foreground">{e.matters?.clients?.name ?? ""}</div>
                  </td>
                  <td className="px-5 py-[13px] text-muted-foreground max-w-[260px] truncate">{e.description ?? "—"}</td>
                  <td className="px-5 py-[13px]">
                    <span className="size-6 rounded-full bg-primary/10 text-primary text-[10px] font-semibold grid place-items-center" title={byName}>{initials(byName)}</span>
                  </td>
                  <td className="px-5 py-[13px] text-right tabular-nums">{(e.minutes / 60).toFixed(2)}</td>
                  <td className="px-5 py-[13px] text-right tabular-nums font-medium">{fmt((e.minutes / 60) * Number(e.rate))}</td>
                  <td className="px-5 py-[13px]">
                    <span className={cn("inline-flex items-center gap-1.5 px-2 h-[22px] rounded-full text-[11px] font-semibold border",
                      e.invoice_id ? "bg-primary/10 text-primary border-primary/20" :
                      e.billable ? "bg-warning/10 text-warning border-warning/30" :
                      "bg-surface text-muted-foreground border-border")}>
                      <span className="size-1.5 rounded-full bg-current" />
                      {e.invoice_id ? "Invoiced" : e.billable ? "Unbilled" : "Non-billable"}
                    </span>
                  </td>
                  <td className="px-5 py-[13px] text-right">
                    <button onClick={() => remove.mutate(e.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-3.5" /></button>
                  </td>
                </tr>
              ))}
              {shownEntries.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-muted-foreground"><Clock className="size-6 mx-auto mb-2 opacity-50" />{timeFilter === "unbilled" ? "No unbilled time entries." : "No time logged yet."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Log time manually</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Matter *</Label>
              <Select value={form.matter_id} onValueChange={(v) => {
                const m = matters.find((x) => x.id === v);
                setForm({ ...form, matter_id: v, rate: m?.default_rate ? String(m.default_rate) : form.rate });
              }}>
                <SelectTrigger><SelectValue placeholder="Choose matter" /></SelectTrigger>
                <SelectContent>{matters.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}{m.clients?.name ? ` — ${m.clients.name}` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></div>
              <div><Label>Hours</Label><Input type="number" step="0.25" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} /></div>
              <div><Label>Rate</Label><Input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></div>
            </div>
            <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Drafted motion for summary judgment" /></div>
            <div className="flex items-center gap-3"><Switch checked={form.billable} onCheckedChange={(v) => setForm({ ...form, billable: v })} /><Label>Billable</Label></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.matter_id || upsert.isPending} onClick={() => upsert.mutate(form)}>{upsert.isPending ? "Saving…" : "Save entry"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card ring-1 ring-border rounded-xl p-[18px]">
      <p className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">{label}</p>
      <p className="font-display text-2xl font-semibold mt-2 tabular-nums">{value}</p>
    </div>
  );
}
function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return <th className={cn("px-5 py-[11px] font-medium text-muted-foreground text-[11px] uppercase tracking-wider", right && "text-right")}>{children}</th>;
}

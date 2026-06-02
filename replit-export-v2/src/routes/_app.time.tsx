import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Clock, Trash2, Play, Square } from "lucide-react";
import { AppTopbar } from "@/components/app/app-topbar";
import { useBusiness } from "@/lib/business";
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
  component: TimePage,
});

type TE = { id: string; entry_date: string; minutes: number; rate: number; description: string | null; billable: boolean; invoice_id: string | null; matter_id: string; matters?: { name: string; clients?: { name: string } | null } | null };
type Matter = { id: string; name: string; default_rate: number | null; clients?: { name: string } | null };

function TimePage() {
  const { current } = useBusiness();
  const listFn = useServerFn(listTimeEntries);
  const mFn = useServerFn(listMatters);
  const upFn = useServerFn(upsertTimeEntry);
  const delFn = useServerFn(deleteTimeEntry);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ matter_id: "", entry_date: today, hours: "1.0", description: "", billable: true, rate: "350" });

  // Timer
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (timerStart === null) return;
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [timerStart]);
  const elapsedMin = timerStart ? Math.floor((Date.now() - timerStart) / 60000) : 0;

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
      business_id: current!.id,
      matter_id: v.matter_id,
      entry_date: v.entry_date,
      minutes: Math.round(parseFloat(v.hours) * 60),
      rate: Number(v.rate) || 0,
      description: v.description || null,
      billable: v.billable,
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
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n);
  const unbilled = entries.filter((e) => e.billable && !e.invoice_id).reduce((s, e) => s + (e.minutes / 60) * Number(e.rate), 0);
  const totalHours = entries.reduce((s, e) => s + e.minutes, 0) / 60;

  return (
    <>
      <AppTopbar title="Time tracking" />
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card ring-1 ring-border rounded-xl p-5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Unbilled value</p>
            <p className="text-2xl font-semibold mt-1 tabular-nums">{fmt(unbilled)}</p>
          </div>
          <div className="bg-card ring-1 ring-border rounded-xl p-5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Total hours logged</p>
            <p className="text-2xl font-semibold mt-1 tabular-nums">{totalHours.toFixed(1)}h</p>
          </div>
          <div className="bg-card ring-1 ring-border rounded-xl p-5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Active timer</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-semibold tabular-nums">
                {timerStart ? `${Math.floor(elapsedMin / 60)}:${String(elapsedMin % 60).padStart(2, "0")}` : "—"}
              </p>
              {timerStart === null ? (
                <Button size="sm" onClick={() => setTimerStart(Date.now())}><Play className="size-3.5" /></Button>
              ) : (
                <Button size="sm" variant="destructive" onClick={() => {
                  setForm({ ...form, hours: (elapsedMin / 60).toFixed(2) });
                  setTimerStart(null); setTick(0);
                  setOpen(true);
                }}><Square className="size-3.5" /></Button>
              )}
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end">
          <Button onClick={() => setOpen(true)} disabled={matters.length === 0} className="gap-1.5"><Plus className="size-4" />Log time</Button>
        </div>
        {matters.length === 0 && <p className="text-xs text-muted-foreground">Create a matter first.</p>}

        <div className="bg-card ring-1 ring-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface border-b border-border">
              <tr><Th>Date</Th><Th>Matter</Th><Th>Description</Th><Th>Hours</Th><Th>Rate</Th><Th>Amount</Th><Th>Status</Th><Th /></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-surface/50 group">
                  <td className="px-5 py-3 text-xs text-muted-foreground">{e.entry_date}</td>
                  <td className="px-5 py-3">
                    <div>{e.matters?.name ?? "—"}</div>
                    <div className="text-[11px] text-muted-foreground">{e.matters?.clients?.name ?? ""}</div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{e.description ?? "—"}</td>
                  <td className="px-5 py-3 tabular-nums">{(e.minutes / 60).toFixed(2)}</td>
                  <td className="px-5 py-3 tabular-nums text-muted-foreground">{fmt(Number(e.rate))}</td>
                  <td className="px-5 py-3 tabular-nums font-medium">{fmt((e.minutes / 60) * Number(e.rate))}</td>
                  <td className="px-5 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border",
                      e.invoice_id ? "bg-primary/10 text-primary border-primary/20" :
                      e.billable ? "bg-warning/10 text-warning border-warning/30" :
                      "bg-surface text-muted-foreground border-border")}>
                      {e.invoice_id ? "Invoiced" : e.billable ? "Unbilled" : "Non-billable"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => remove.mutate(e.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-3.5" /></button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-muted-foreground"><Clock className="size-6 mx-auto mb-2 opacity-50" />No time logged yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log time</DialogTitle></DialogHeader>
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
            <Button disabled={!form.matter_id || upsert.isPending} onClick={() => upsert.mutate(form)}>{upsert.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-5 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">{children}</th>;
}

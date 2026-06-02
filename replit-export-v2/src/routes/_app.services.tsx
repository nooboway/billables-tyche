import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Tags } from "lucide-react";
import { AppTopbar } from "@/components/app/app-topbar";
import { useBusiness } from "@/lib/business";
import { listServices, upsertService, deleteService } from "@/lib/api.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/services")({
  head: () => ({ meta: [{ title: "Services & Rates — Billables" }] }),
  component: ServicesPage,
});

type Service = { id: string; name: string; kind: string; rate: number; unit: string | null; description: string | null; active: boolean };

function ServicesPage() {
  const { current } = useBusiness();
  const listFn = useServerFn(listServices);
  const upFn = useServerFn(upsertService);
  const delFn = useServerFn(deleteService);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", kind: "hourly" as "hourly"|"flat"|"expense", rate: "350", unit: "hour", description: "", active: true });

  const { data: rows = [] } = useQuery<Service[]>({
    queryKey: ["services", current?.id],
    queryFn: () => listFn({ data: { businessId: current!.id } }) as Promise<Service[]>,
    enabled: !!current?.id,
  });

  const upsert = useMutation({
    mutationFn: (v: typeof form) => upFn({ data: { business_id: current!.id, ...v, rate: Number(v.rate) || 0 } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services"] }); setOpen(false); toast.success("Saved"); setForm({ name: "", kind: "hourly", rate: "350", unit: "hour", description: "", active: true }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });

  const cur = current?.default_currency ?? "USD";
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n);

  return (
    <>
      <AppTopbar title="Services & rates" />
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Standard rates and flat-fee services available when invoicing.</p>
          <Button onClick={() => setOpen(true)} className="gap-1.5"><Plus className="size-4" />Add service</Button>
        </div>
        <div className="bg-card ring-1 ring-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface border-b border-border">
              <tr><Th>Name</Th><Th>Type</Th><Th>Rate</Th><Th>Unit</Th><Th /></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-surface/50 group">
                  <td className="px-5 py-4"><div className="font-medium">{s.name}</div>{s.description && <div className="text-[11px] text-muted-foreground">{s.description}</div>}</td>
                  <td className="px-5 py-4 capitalize text-muted-foreground">{s.kind}</td>
                  <td className="px-5 py-4 tabular-nums font-medium">{fmt(Number(s.rate))}</td>
                  <td className="px-5 py-4 text-muted-foreground">{s.unit ?? "—"}</td>
                  <td className="px-5 py-4 text-right"><button onClick={() => remove.mutate(s.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-3.5" /></button></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground"><Tags className="size-6 mx-auto mb-2 opacity-50" />No services yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add service</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Senior partner rate" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as typeof form.kind })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="flat">Flat fee</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Rate</Label><Input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></div>
              <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="hour" /></div>
            </div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.name.trim() || upsert.isPending} onClick={() => upsert.mutate(form)}>{upsert.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-5 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">{children}</th>;
}

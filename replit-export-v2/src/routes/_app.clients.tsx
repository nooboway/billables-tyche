import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, Mail, Users, DollarSign, AlertCircle, Trash2 } from "lucide-react";
import { AppTopbar } from "@/components/app/app-topbar";
import { useBusiness } from "@/lib/business";
import { listClients, upsertClient, deleteClient } from "@/lib/api.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/clients")({
  head: () => ({ meta: [{ title: "Clients — Billables" }] }),
  component: ClientsPage,
});

type ClientRow = {
  id: string; name: string; company: string | null; email: string | null;
  status: string; ltv: number; outstanding: number; invoice_count: number;
};

function fmt(n: number, cur = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n || 0);
}

function ClientsPage() {
  const { current } = useBusiness();
  const fn = useServerFn(listClients);
  const upFn = useServerFn(upsertClient);
  const delFn = useServerFn(deleteClient);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", address: "", status: "active" as "active"|"prospect"|"inactive", notes: "" });

  const { data: rows = [] } = useQuery<ClientRow[]>({
    queryKey: ["clients", current?.id],
    queryFn: () => fn({ data: { businessId: current!.id } }) as Promise<ClientRow[]>,
    enabled: !!current?.id,
  });

  const upsert = useMutation({
    mutationFn: (v: typeof form) => upFn({ data: { business_id: current!.id, ...v } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); setOpen(false); setForm({ name: "", company: "", email: "", phone: "", address: "", status: "active", notes: "" }); toast.success("Client saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); toast.success("Client removed"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(
    () => rows.filter((c) => !q || (c.name + (c.company ?? "") + (c.email ?? "")).toLowerCase().includes(q.toLowerCase())),
    [rows, q]
  );

  const cur = current?.default_currency ?? "USD";
  const totalLtv = rows.reduce((s, c) => s + c.ltv, 0);
  const totalOutstanding = rows.reduce((s, c) => s + c.outstanding, 0);
  const active = rows.filter((c) => c.status === "active").length;

  return (
    <>
      <AppTopbar title="Clients" />
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Mini label="Total clients" value={String(rows.length)} icon={Users} />
          <Mini label="Active" value={String(active)} icon={Users} accent="primary" />
          <Mini label="Lifetime value" value={fmt(totalLtv, cur)} icon={DollarSign} accent="primary" />
          <Mini label="Outstanding" value={fmt(totalOutstanding, cur)} icon={AlertCircle} accent="warning" />
        </section>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients…" className="w-full h-9 pl-9 pr-3 rounded-lg ring-1 ring-border bg-card text-sm placeholder:text-muted-foreground focus:ring-primary outline-none" />
          </div>
          <Button onClick={() => setOpen(true)} className="gap-1.5"><Plus className="size-4" />Add client</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-card ring-1 ring-border rounded-xl p-5 hover:ring-primary/30 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                    {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.company || "—"}</p>
                  </div>
                </div>
                <button onClick={() => remove.mutate(c.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1" title="Delete"><Trash2 className="size-3.5" /></button>
              </div>
              {c.email && (
                <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5">
                  <Mail className="size-3" /> {c.email}
                </a>
              )}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border">
                <Stat label="LTV" value={fmt(c.ltv, cur)} />
                <Stat label="Owed" value={fmt(c.outstanding, cur)} tone={c.outstanding > 0 ? "warning" : undefined} />
                <Stat label="Invoices" value={String(c.invoice_count)} />
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-sm text-muted-foreground">
              No clients yet. Click "Add client" to get started.
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
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

function Mini({ label, value, icon: Icon, accent }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; accent?: "primary" | "warning" }) {
  const cls = accent === "primary" ? "text-primary bg-primary/10" : accent === "warning" ? "text-warning bg-warning/10" : "text-muted-foreground bg-surface";
  return (
    <div className="bg-card ring-1 ring-border rounded-xl p-4 flex items-center gap-3">
      <div className={cn("size-9 rounded-lg flex items-center justify-center", cls)}><Icon className="size-4" /></div>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{label}</p>
        <p className="text-base font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{label}</p>
      <p className={cn("text-xs font-medium tabular-nums mt-0.5", tone === "warning" ? "text-warning" : "text-foreground")}>{value}</p>
    </div>
  );
}

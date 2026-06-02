import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, Briefcase, Trash2 } from "lucide-react";
import { AppTopbar } from "@/components/app/app-topbar";
import { useBusiness } from "@/lib/business";
import { listMatters, listClients, upsertMatter, deleteMatter } from "@/lib/api.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/matters")({
  head: () => ({ meta: [{ title: "Matters — Billables" }] }),
  component: MattersPage,
});

const practiceAreas = ["Corporate", "Litigation", "Real Estate", "Family", "Criminal", "IP", "Tax", "Employment", "Immigration", "Other"];

type Matter = {
  id: string; name: string; matter_number: string | null; practice_area: string | null;
  status: string; default_rate: number | null; client_id: string;
  clients: { name: string; company: string | null } | null;
};

function MattersPage() {
  const { current } = useBusiness();
  const listFn = useServerFn(listMatters);
  const clFn = useServerFn(listClients);
  const upFn = useServerFn(upsertMatter);
  const delFn = useServerFn(deleteMatter);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", matter_number: "", practice_area: "Corporate", client_id: "", default_rate: "350", description: "", status: "open" as const });

  const { data: matters = [] } = useQuery<Matter[]>({
    queryKey: ["matters", current?.id],
    queryFn: () => listFn({ data: { businessId: current!.id } }) as Promise<Matter[]>,
    enabled: !!current?.id,
  });
  const { data: clients = [] } = useQuery<{ id: string; name: string; company: string | null }[]>({
    queryKey: ["clients", current?.id],
    queryFn: () => clFn({ data: { businessId: current!.id } }) as never,
    enabled: !!current?.id,
  });

  const upsert = useMutation({
    mutationFn: (v: typeof form) => upFn({ data: {
      business_id: current!.id,
      client_id: v.client_id,
      name: v.name,
      matter_number: v.matter_number || null,
      practice_area: v.practice_area,
      status: v.status,
      default_rate: Number(v.default_rate) || 0,
      description: v.description || null,
    } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["matters"] }); setOpen(false); toast.success("Matter created"); setForm({ name: "", matter_number: "", practice_area: "Corporate", client_id: "", default_rate: "350", description: "", status: "open" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["matters"] }); toast.success("Matter deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(
    () => matters.filter((m) => !q || (m.name + (m.matter_number ?? "") + (m.clients?.name ?? "")).toLowerCase().includes(q.toLowerCase())),
    [matters, q]
  );

  return (
    <>
      <AppTopbar title="Matters" />
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search matters…" className="w-full h-9 pl-9 pr-3 rounded-lg ring-1 ring-border bg-card text-sm focus:ring-primary outline-none" />
          </div>
          <Button onClick={() => setOpen(true)} disabled={clients.length === 0} className="gap-1.5"><Plus className="size-4" />New matter</Button>
        </div>
        {clients.length === 0 && <p className="text-xs text-muted-foreground">Add a client first to open a matter.</p>}

        <div className="bg-card ring-1 ring-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface border-b border-border">
              <tr>
                <Th>Matter</Th><Th>Client</Th><Th>Practice area</Th><Th>Rate</Th><Th>Status</Th><Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-surface/50 group">
                  <td className="px-5 py-4">
                    <div className="font-medium">{m.name}</div>
                    {m.matter_number && <div className="text-[11px] text-muted-foreground font-mono">{m.matter_number}</div>}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{m.clients?.name ?? "—"}</td>
                  <td className="px-5 py-4 text-muted-foreground">{m.practice_area ?? "—"}</td>
                  <td className="px-5 py-4 tabular-nums">{m.default_rate ? `$${Number(m.default_rate).toFixed(0)}/hr` : "—"}</td>
                  <td className="px-5 py-4">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border",
                      m.status === "open" && "bg-primary/10 text-primary border-primary/20",
                      m.status === "closed" && "bg-surface text-muted-foreground border-border",
                      m.status === "on_hold" && "bg-warning/10 text-warning border-warning/30",
                    )}>{m.status.replace("_", " ")}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => remove.mutate(m.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-3.5" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground"><Briefcase className="size-6 mx-auto mb-2 opacity-50" />No matters yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New matter</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Matter name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Acme Corp v. Smith" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Matter # </Label><Input value={form.matter_number} onChange={(e) => setForm({ ...form, matter_number: e.target.value })} placeholder="2025-001" /></div>
              <div><Label>Default rate ($/hr)</Label><Input type="number" value={form.default_rate} onChange={(e) => setForm({ ...form, default_rate: e.target.value })} /></div>
            </div>
            <div>
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Practice area</Label>
              <Select value={form.practice_area} onValueChange={(v) => setForm({ ...form, practice_area: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{practiceAreas.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.name.trim() || !form.client_id || upsert.isPending} onClick={() => upsert.mutate(form)}>
              {upsert.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-5 py-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">{children}</th>;
}

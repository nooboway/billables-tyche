import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, Briefcase, Trash2, List, LayoutGrid } from "lucide-react";
import { AppTopbar } from "@/components/app/app-topbar";
import { useBusiness } from "@/lib/business";
import { useAuth } from "@/lib/auth";
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

// Practice-area pill tone per handoff.
function areaTone(area: string | null): string {
  switch ((area ?? "").toLowerCase()) {
    case "litigation": case "criminal": return "bg-destructive/10 text-destructive border-destructive/20";
    case "corporate": case "tax": return "bg-info/10 text-info border-info/20";
    case "ip": return "bg-primary/10 text-primary border-primary/20";
    case "real estate": case "estate": return "bg-warning/10 text-warning border-warning/30";
    default: return "bg-surface text-muted-foreground border-border";
  }
}
function statusTone(status: string): string {
  if (status === "open") return "bg-primary/10 text-primary border-primary/20";
  if (status === "on_hold") return "bg-warning/10 text-warning border-warning/30";
  return "bg-surface text-muted-foreground border-border";
}
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "—";
}

function MattersPage() {
  const { current } = useBusiness();
  const { user } = useAuth();
  const leadName = (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "Lead";
  const cur = current?.default_currency ?? "USD";
  const fmtRate = (r: number | null) => r ? `${new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(Number(r))}/hr` : "—";

  const listFn = useServerFn(listMatters);
  const clFn = useServerFn(listClients);
  const upFn = useServerFn(upsertMatter);
  const delFn = useServerFn(deleteMatter);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState<"table" | "cards">("cards");
  const [form, setForm] = useState({ name: "", matter_number: "", practice_area: "Corporate", client_id: "", default_rate: "350", description: "", status: "open" as const });

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("billables.matters.layout") : null;
    if (saved === "table" || saved === "cards") setLayout(saved);
  }, []);
  const setLayoutPersist = (l: "table" | "cards") => { setLayout(l); if (typeof window !== "undefined") localStorage.setItem("billables.matters.layout", l); };

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
      business_id: current!.id, client_id: v.client_id, name: v.name,
      matter_number: v.matter_number || null, practice_area: v.practice_area,
      status: v.status, default_rate: Number(v.default_rate) || 0, description: v.description || null,
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
          <div className="flex items-center rounded-lg ring-1 ring-border p-0.5 bg-card">
            <button onClick={() => setLayoutPersist("table")} className={cn("size-7 grid place-items-center rounded-md", layout === "table" ? "bg-surface text-foreground ring-1 ring-border" : "text-muted-foreground")} aria-label="Table view"><List className="size-3.5" /></button>
            <button onClick={() => setLayoutPersist("cards")} className={cn("size-7 grid place-items-center rounded-md", layout === "cards" ? "bg-surface text-foreground ring-1 ring-border" : "text-muted-foreground")} aria-label="Cards view"><LayoutGrid className="size-3.5" /></button>
          </div>
          <Button onClick={() => setOpen(true)} disabled={clients.length === 0} className="gap-1.5"><Plus className="size-4" />New matter</Button>
        </div>
        {clients.length === 0 && <p className="text-xs text-muted-foreground">Add a client first to open a matter.</p>}

        {filtered.length === 0 ? (
          <div className="bg-card ring-1 ring-border rounded-xl px-5 py-16 text-center text-sm text-muted-foreground">
            <Briefcase className="size-7 mx-auto mb-3 opacity-50" />No matters yet.
          </div>
        ) : layout === "table" ? (
          <div className="bg-card ring-1 ring-border rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-border">
                <tr><Th>Matter</Th><Th>Client</Th><Th>Practice area</Th><Th>Lead</Th><Th right>Rate</Th><Th>Status</Th><Th /></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-surface/50 group">
                    <td className="px-5 py-[13px]">
                      <div className="font-medium">{m.name}</div>
                      {m.matter_number && <div className="text-[11px] text-muted-foreground font-mono">{m.matter_number}</div>}
                    </td>
                    <td className="px-5 py-[13px] text-muted-foreground">{m.clients?.name ?? "—"}</td>
                    <td className="px-5 py-[13px]"><Pill className={areaTone(m.practice_area)}>{m.practice_area ?? "—"}</Pill></td>
                    <td className="px-5 py-[13px]"><Lead name={leadName} /></td>
                    <td className="px-5 py-[13px] text-right tabular-nums font-mono text-xs">{fmtRate(m.default_rate)}</td>
                    <td className="px-5 py-[13px]"><Pill className={statusTone(m.status)} dot>{m.status.replace("_", " ")}</Pill></td>
                    <td className="px-5 py-[13px] text-right">
                      <button onClick={() => remove.mutate(m.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-[18px]" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {filtered.map((m) => (
              <div key={m.id} className="group bg-card ring-1 ring-border rounded-xl p-5 space-y-4 hover:ring-primary/30 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{m.name}</h3>
                    {m.matter_number && <p className="text-[11px] text-muted-foreground font-mono">{m.matter_number}</p>}
                  </div>
                  <button onClick={() => remove.mutate(m.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 shrink-0"><Trash2 className="size-3.5" /></button>
                </div>
                <Pill className={areaTone(m.practice_area)}>{m.practice_area ?? "—"}</Pill>
                <div className="border-t border-border pt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">{m.clients?.name ?? "—"}</span>
                  <span className="tabular-nums font-mono text-xs">{fmtRate(m.default_rate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Lead name={leadName} />
                  <Pill className={statusTone(m.status)} dot>{m.status.replace("_", " ")}</Pill>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">New matter</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Matter name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Acme Corp v. Smith" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Matter #</Label><Input className="font-mono" value={form.matter_number} onChange={(e) => setForm({ ...form, matter_number: e.target.value })} placeholder="2025-001" /></div>
              <div><Label>Default rate ({cur}/hr)</Label><Input type="number" value={form.default_rate} onChange={(e) => setForm({ ...form, default_rate: e.target.value })} /></div>
            </div>
            <div>
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose client" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</SelectItem>)}</SelectContent>
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
              {upsert.isPending ? "Creating…" : "Create matter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return <th className={cn("px-5 py-[11px] font-medium text-muted-foreground text-[11px] uppercase tracking-wider", right && "text-right")}>{children}</th>;
}
function Pill({ children, className, dot }: { children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 h-[22px] rounded-full text-[11px] font-semibold border capitalize", className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}{children}
    </span>
  );
}
function Lead({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="size-6 rounded-full bg-primary/10 text-primary text-[10px] font-semibold grid place-items-center">{initials(name)}</span>
      <span className="text-xs text-muted-foreground truncate max-w-[120px]">{name}</span>
    </span>
  );
}

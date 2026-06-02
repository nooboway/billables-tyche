import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppTopbar } from "@/components/app/app-topbar";
import { useBusiness } from "@/lib/business";
import { updateBusiness } from "@/lib/api.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Billables" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { current, refetch } = useBusiness();
  const upFn = useServerFn(updateBusiness);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", tagline: "", invoice_prefix: "INV", payment_terms: "Net 30", footer_note: "",
    address_lines: "", default_currency: "USD", primaryColor: "#1e3a5f", accentColor: "#c9a84c",
  });
  useEffect(() => {
    if (!current) return;
    setForm({
      name: current.name,
      tagline: current.tagline ?? "",
      invoice_prefix: current.invoice_prefix,
      payment_terms: current.payment_terms,
      footer_note: current.footer_note ?? "",
      address_lines: (current.address_lines ?? []).join("\n"),
      default_currency: current.default_currency,
      primaryColor: current.brand?.primaryColor ?? "#1e3a5f",
      accentColor: current.brand?.accentColor ?? "#c9a84c",
    });
  }, [current]);

  const save = useMutation({
    mutationFn: () => upFn({ data: {
      id: current!.id,
      name: form.name,
      tagline: form.tagline || undefined,
      invoice_prefix: form.invoice_prefix,
      payment_terms: form.payment_terms,
      footer_note: form.footer_note || undefined,
      address_lines: form.address_lines.split("\n").map((l) => l.trim()).filter(Boolean),
      default_currency: form.default_currency,
      brand: { primaryColor: form.primaryColor, accentColor: form.accentColor },
    } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["businesses"] }); refetch(); toast.success("Saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!current) return <><AppTopbar title="Settings" /><div className="p-8 text-sm text-muted-foreground">Loading…</div></>;

  return (
    <>
      <AppTopbar title="Settings" />
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Workspace & branding</h2>
          <p className="text-sm text-muted-foreground">These details appear on every invoice PDF.</p>
        </div>
        <div className="bg-card ring-1 ring-border rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Firm name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Tagline</Label><Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="e.g. Trusted counsel for builders" /></div>
            <div><Label>Invoice prefix</Label><Input value={form.invoice_prefix} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })} /></div>
            <div><Label>Payment terms</Label><Input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} /></div>
            <div><Label>Currency</Label><Input value={form.default_currency} onChange={(e) => setForm({ ...form, default_currency: e.target.value })} /></div>
          </div>
          <div><Label>Address (one line per row)</Label><Textarea rows={3} value={form.address_lines} onChange={(e) => setForm({ ...form, address_lines: e.target.value })} /></div>
          <div><Label>Footer note</Label><Textarea rows={2} value={form.footer_note} onChange={(e) => setForm({ ...form, footer_note: e.target.value })} placeholder="Thank you for your business." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Primary color</Label><Input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="h-10" /></div>
            <div><Label>Accent color</Label><Input type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} className="h-10" /></div>
          </div>
          <div className="flex justify-end"><Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button></div>
        </div>
      </div>
    </>
  );
}

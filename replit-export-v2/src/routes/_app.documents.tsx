import { useState, useMemo, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Upload, FolderOpen, Trash2, Download, Share2, FileText, Clock, X } from "lucide-react";
import { AppTopbar } from "@/components/app/app-topbar";
import { useBusiness } from "@/lib/business";
import {
  listDocuments, createDocument, addDocumentVersion, deleteDocument,
  getDocumentSignedUrl, listMatters, listFirmMembers,
  listDocumentShares, createDocumentShare, revokeDocumentShare,
} from "@/lib/api.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/documents")({
  head: () => ({ meta: [{ title: "Documents — Billables" }] }),
  component: DocumentsPage,
});

type DocRow = {
  id: string; name: string; description: string | null; category: string | null;
  current_version: number; matter_id: string; business_id: string; updated_at: string;
  matters: { name: string; matter_number: string | null; clients: { name: string } | null } | null;
  document_versions: { id: string; version: number; file_name: string; file_size: number | null; mime_type: string | null; created_at: string; uploaded_by: string; notes: string | null; storage_path: string }[];
};

function fmtSize(n: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function DocumentsPage() {
  const { current } = useBusiness();
  const listFn = useServerFn(listDocuments);
  const matterFn = useServerFn(listMatters);
  const createFn = useServerFn(createDocument);
  const addVerFn = useServerFn(addDocumentVersion);
  const delFn = useServerFn(deleteDocument);
  const qc = useQueryClient();

  const [matterFilter, setMatterFilter] = useState<string>("all");
  const [openNew, setOpenNew] = useState(false);
  const [openShare, setOpenShare] = useState<DocRow | null>(null);
  const [openVersions, setOpenVersions] = useState<DocRow | null>(null);
  const [form, setForm] = useState({ name: "", description: "", category: "Contract", matter_id: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);

  const { data: matters = [] } = useQuery<{ id: string; name: string; matter_number: string | null; clients: { name: string } | null }[]>({
    queryKey: ["matters", current?.id],
    queryFn: () => matterFn({ data: { businessId: current!.id } }) as never,
    enabled: !!current?.id,
  });

  const { data: docs = [] } = useQuery<DocRow[]>({
    queryKey: ["documents", current?.id, matterFilter],
    queryFn: () => listFn({ data: { businessId: current!.id, matterId: matterFilter === "all" ? undefined : matterFilter } }) as Promise<DocRow[]>,
    enabled: !!current?.id,
  });

  const grouped = useMemo(() => {
    const m = new Map<string, { matter: string; client: string; items: DocRow[] }>();
    for (const d of docs) {
      const key = d.matter_id;
      const mn = d.matters?.name ?? "Unassigned";
      const cn_ = d.matters?.clients?.name ?? "—";
      const cur = m.get(key) ?? { matter: mn, client: cn_, items: [] };
      cur.items.push(d);
      m.set(key, cur);
    }
    return Array.from(m.entries());
  }, [docs]);

  const create = useMutation({
    mutationFn: async () => {
      if (!stagedFile) throw new Error("Select a file to upload");
      // 1. Create document row
      const doc = await createFn({ data: {
        business_id: current!.id, matter_id: form.matter_id,
        name: form.name, description: form.description || null, category: form.category || null,
      } }) as { id: string; business_id: string };
      // 2. Upload to storage at {business}/{matter}/{document}/v1-{filename}
      const path = `${current!.id}/${form.matter_id}/${doc.id}/v1-${stagedFile.name}`;
      const { error: upErr } = await supabase.storage.from("matter-documents").upload(path, stagedFile, { upsert: false });
      if (upErr) throw new Error(upErr.message);
      // 3. Record version
      await addVerFn({ data: {
        document_id: doc.id, business_id: current!.id,
        storage_path: path, file_name: stagedFile.name,
        file_size: stagedFile.size, mime_type: stagedFile.type || "application/octet-stream",
      } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      setOpenNew(false); setStagedFile(null);
      setForm({ name: "", description: "", category: "Contract", matter_id: "" });
      toast.success("Document uploaded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadVersion = useMutation({
    mutationFn: async ({ doc, file, notes }: { doc: DocRow; file: File; notes?: string }) => {
      const nextV = doc.current_version + 1;
      const path = `${current!.id}/${doc.matter_id}/${doc.id}/v${nextV}-${file.name}`;
      const { error } = await supabase.storage.from("matter-documents").upload(path, file, { upsert: false });
      if (error) throw new Error(error.message);
      await addVerFn({ data: {
        document_id: doc.id, business_id: current!.id,
        storage_path: path, file_name: file.name,
        file_size: file.size, mime_type: file.type || "application/octet-stream",
        notes: notes || null,
      } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); toast.success("New version uploaded"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); toast.success("Document deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const signFn = useServerFn(getDocumentSignedUrl);
  const downloadVersion = async (path: string) => {
    try {
      const { url } = await signFn({ data: { path, expiresIn: 120 } }) as { url: string };
      window.open(url, "_blank");
    } catch (e) { toast.error((e as Error).message); }
  };

  if (!current) return <><AppTopbar title="Documents" /><div className="p-8 text-sm text-muted-foreground">Loading…</div></>;

  return (
    <>
      <AppTopbar title="Document Vault" />
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Select value={matterFilter} onValueChange={setMatterFilter}>
            <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All matters</SelectItem>
              {matters.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} {m.matter_number ? `(${m.matter_number})` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <Button onClick={() => setOpenNew(true)} disabled={matters.length === 0} className="gap-1.5">
            <Plus className="size-4" />Upload document
          </Button>
        </div>
        {matters.length === 0 && <p className="text-xs text-muted-foreground">Open a matter first to start uploading documents.</p>}

        {grouped.length === 0 && (
          <div className="bg-card ring-1 ring-border rounded-xl p-12 text-center text-sm text-muted-foreground">
            <FolderOpen className="size-8 mx-auto mb-3 opacity-50" />
            No documents yet. Upload contracts, pleadings, exhibits, and correspondence to keep your matter file organized.
          </div>
        )}

        {grouped.map(([key, group]) => (
          <section key={key} className="space-y-2">
            <header className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold tracking-tight">{group.matter}</h2>
              <span className="text-xs text-muted-foreground">· {group.client}</span>
              <span className="text-xs text-muted-foreground">· {group.items.length} doc{group.items.length === 1 ? "" : "s"}</span>
            </header>
            <div className="bg-card ring-1 ring-border rounded-xl divide-y divide-border">
              {group.items.map((d) => {
                const latest = d.document_versions?.sort((a, b) => b.version - a.version)[0];
                return (
                  <div key={d.id} className="p-4 flex items-center gap-4 group">
                    <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileText className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{d.name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-muted-foreground">v{d.current_version}</span>
                        {d.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{d.category}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {latest ? `${latest.file_name} · ${fmtSize(latest.file_size)}` : "No file"}
                      </p>
                    </div>
                    <button onClick={() => setOpenVersions(d)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <Clock className="size-3" />{d.document_versions?.length ?? 0} version{(d.document_versions?.length ?? 0) === 1 ? "" : "s"}
                    </button>
                    {latest && (
                      <Button variant="ghost" size="sm" onClick={() => downloadVersion(latest.storage_path)}>
                        <Download className="size-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setOpenShare(d)}>
                      <Share2 className="size-4" />
                    </Button>
                    <button onClick={() => remove.mutate(d.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* New document dialog */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Matter *</Label>
              <Select value={form.matter_id} onValueChange={(v) => setForm({ ...form, matter_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose matter" /></SelectTrigger>
                <SelectContent>{matters.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Document name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Master Services Agreement" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Contract", "Pleading", "Exhibit", "Correspondence", "Memo", "Filing", "Other"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>File *</Label>
                <Input ref={fileInputRef} type="file" onChange={(e) => setStagedFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenNew(false)}>Cancel</Button>
            <Button disabled={!form.name || !form.matter_id || !stagedFile || create.isPending} onClick={() => create.mutate()}>
              <Upload className="size-3.5" />{create.isPending ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Versions dialog */}
      {openVersions && (
        <VersionsDialog
          doc={openVersions}
          onClose={() => setOpenVersions(null)}
          onDownload={downloadVersion}
          onUpload={(file, notes) => uploadVersion.mutate({ doc: openVersions, file, notes })}
          uploading={uploadVersion.isPending}
        />
      )}

      {/* Share dialog */}
      {openShare && <ShareDialog doc={openShare} onClose={() => setOpenShare(null)} />}
    </>
  );
}

function VersionsDialog({ doc, onClose, onDownload, onUpload, uploading }: {
  doc: DocRow; onClose: () => void;
  onDownload: (path: string) => void;
  onUpload: (file: File, notes?: string) => void;
  uploading: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const versions = [...(doc.document_versions ?? [])].sort((a, b) => b.version - a.version);
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{doc.name} — version history</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg ring-1 ring-border divide-y divide-border max-h-72 overflow-y-auto">
            {versions.map((v) => (
              <div key={v.id} className="p-3 flex items-center gap-3 text-sm">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface border border-border">v{v.version}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{v.file_name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()} · {fmtSize(v.file_size)}</p>
                  {v.notes && <p className="text-xs text-muted-foreground italic mt-1">{v.notes}</p>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => onDownload((v as unknown as { storage_path: string }).storage_path)}><Download className="size-4" /></Button>
              </div>
            ))}
            {!versions.length && <p className="p-6 text-center text-sm text-muted-foreground">No versions yet.</p>}
          </div>
          <div className="border-t border-border pt-4 space-y-2">
            <Label>Upload new version</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Input placeholder="Version notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Button size="sm" disabled={!file || uploading} onClick={() => { if (file) { onUpload(file, notes); setFile(null); setNotes(""); } }}>
              <Upload className="size-3.5" />{uploading ? "Uploading…" : `Upload as v${doc.current_version + 1}`}
            </Button>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShareDialog({ doc, onClose }: { doc: DocRow; onClose: () => void }) {
  const { current } = useBusiness();
  const listShFn = useServerFn(listDocumentShares);
  const createShFn = useServerFn(createDocumentShare);
  const revokeFn = useServerFn(revokeDocumentShare);
  const memFn = useServerFn(listFirmMembers);
  const qc = useQueryClient();

  const { data: shares = [] } = useQuery({
    queryKey: ["doc-shares", doc.id],
    queryFn: () => listShFn({ data: { documentId: doc.id } }),
  });
  const { data: members = [] } = useQuery({
    queryKey: ["firm-members", current?.id],
    queryFn: () => memFn({ data: { businessId: current!.id } }),
    enabled: !!current?.id,
  });

  const [target, setTarget] = useState<string>("any");
  const [hours, setHours] = useState<string>("72");

  const make = useMutation({
    mutationFn: () => createShFn({ data: {
      document_id: doc.id, business_id: current!.id,
      shared_with: target === "any" ? null : target,
      expires_in_hours: Number(hours) || 72,
    } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["doc-shares", doc.id] }); toast.success("Share link created"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["doc-shares", doc.id] }); },
  });

  const shareUrl = (token: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/documents?share=${token}`;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Share within firm — {doc.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 items-end">
            <div className="col-span-2">
              <Label>Share with</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any firm member with link</SelectItem>
                  {(members as { user_id: string; role: string; profile: { full_name: string | null } | null }[]).map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>{m.profile?.full_name ?? m.user_id.slice(0, 8)} ({m.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expires (hours)</Label>
              <Input type="number" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
          </div>
          <Button onClick={() => make.mutate()} disabled={make.isPending} className="gap-1.5">
            <Share2 className="size-3.5" />Create share link
          </Button>
          <div className="border-t border-border pt-3 space-y-2">
            <Label className="text-xs text-muted-foreground">Active shares</Label>
            {(shares as { id: string; token: string; expires_at: string | null; shared_with: string | null }[]).map((s) => (
              <div key={s.id} className="flex items-center gap-2 p-2 bg-surface rounded-md text-xs">
                <code className="flex-1 truncate">{shareUrl(s.token)}</code>
                <button onClick={() => { navigator.clipboard.writeText(shareUrl(s.token)); toast.success("Link copied"); }} className="text-primary hover:underline">Copy</button>
                <button onClick={() => revoke.mutate(s.id)} className="text-destructive hover:underline"><X className="size-3.5" /></button>
              </div>
            ))}
            {!(shares as unknown[]).length && <p className="text-xs text-muted-foreground italic">No active shares.</p>}
          </div>
          <p className={cn("text-[11px] text-muted-foreground")}>Share links require the recipient to be signed in to the firm. Anyone outside the firm cannot access the document.</p>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
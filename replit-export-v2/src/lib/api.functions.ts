import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

// ============== BUSINESSES ==============
export const listBusinesses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: members, error: mErr } = await supabase
      .from("business_members")
      .select("business_id, role, hourly_rate")
      .eq("user_id", userId);
    if (mErr) throw new Error(mErr.message);
    if (!members || members.length === 0) return [];
    const ids = members.map((m) => m.business_id);
    const { data: businesses, error: bErr } = await supabase
      .from("businesses")
      .select("*")
      .in("id", ids);
    if (bErr) throw new Error(bErr.message);
    return (businesses ?? []).map((b) => {
      const m = members.find((x) => x.business_id === b.id);
      return { ...b, role: m?.role ?? "associate", hourly_rate: m?.hourly_rate ?? null };
    });
  });

export const updateBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    name?: string;
    tagline?: string;
    brand?: Record<string, string>;
    invoice_prefix?: string;
    payment_terms?: string;
    footer_note?: string;
    address_lines?: string[];
    default_currency?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...patch } = data;
    const { data: row, error } = await supabase
      .from("businesses").update(patch as never).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string }) => z.object({ name: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: biz, error } = await supabase
      .from("businesses")
      .insert({ name: data.name, owner_id: userId })
      .select().single();
    if (error) throw new Error(error.message);
    await supabase.from("business_members").insert({ business_id: biz.id, user_id: userId, role: "admin" });
    await supabase.from("user_roles").insert({ user_id: userId, business_id: biz.id, role: "admin" });
    return biz;
  });

// ============== CLIENTS ==============
const businessIdInput = z.object({ businessId: z.string().uuid() });

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => businessIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: clients, error } = await supabase
      .from("clients").select("*").eq("business_id", data.businessId).order("name");
    if (error) throw new Error(error.message);
    // Compute LTV + outstanding from invoices
    const { data: invoices } = await supabase
      .from("invoices").select("client_id, status, total").eq("business_id", data.businessId);
    return (clients ?? []).map((c) => {
      const mine = (invoices ?? []).filter((i) => i.client_id === c.id);
      const ltv = mine.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total), 0);
      const outstanding = mine.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + Number(i.total), 0);
      return { ...c, ltv, outstanding, invoice_count: mine.length };
    });
  });

const clientInput = z.object({
  business_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  company: z.string().max(200).optional().nullable(),
  email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  status: z.enum(["active","prospect","inactive"]).default("active"),
  notes: z.string().max(2000).optional().nullable(),
});

export const upsertClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string } & z.infer<typeof clientInput>) => {
    const { id, ...rest } = d;
    return { id, ...clientInput.parse(rest) };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...payload } = data;
    if (payload.email === "") payload.email = null;
    const q = id
      ? supabase.from("clients").update(payload).eq("id", id).select().single()
      : supabase.from("clients").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("clients").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== MATTERS ==============
export const listMatters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => businessIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: matters, error } = await supabase
      .from("matters")
      .select("*, clients(name, company)")
      .eq("business_id", data.businessId)
      .order("opened_at", { ascending: false });
    if (error) throw new Error(error.message);
    return matters ?? [];
  });

const matterInput = z.object({
  business_id: z.string().uuid(),
  client_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  matter_number: z.string().max(60).optional().nullable(),
  practice_area: z.string().max(80).optional().nullable(),
  status: z.enum(["open","closed","on_hold"]).default("open"),
  default_rate: z.number().nonnegative().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});

export const upsertMatter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string } & z.infer<typeof matterInput>) => {
    const { id, ...rest } = d;
    return { id, ...matterInput.parse(rest) };
  })
  .handler(async ({ data, context }) => {
    const { id, ...payload } = data;
    const q = id
      ? context.supabase.from("matters").update(payload).eq("id", id).select().single()
      : context.supabase.from("matters").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteMatter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("matters").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== SERVICES ==============
export const listServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => businessIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("services").select("*").eq("business_id", data.businessId).order("name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const serviceInput = z.object({
  business_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  kind: z.enum(["hourly","flat","expense"]).default("hourly"),
  rate: z.number().nonnegative(),
  unit: z.string().max(40).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  active: z.boolean().default(true),
});

export const upsertService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string } & z.infer<typeof serviceInput>) => {
    const { id, ...rest } = d;
    return { id, ...serviceInput.parse(rest) };
  })
  .handler(async ({ data, context }) => {
    const { id, ...payload } = data;
    const q = id
      ? context.supabase.from("services").update(payload).eq("id", id).select().single()
      : context.supabase.from("services").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("services").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== TIME ENTRIES ==============
export const listTimeEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; matterId?: string; unbilledOnly?: boolean }) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("time_entries")
      .select("*, matters(name, client_id, clients(name))")
      .eq("business_id", data.businessId)
      .order("entry_date", { ascending: false });
    if (data.matterId) q = q.eq("matter_id", data.matterId);
    if (data.unbilledOnly) q = q.is("invoice_id", null).eq("billable", true);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const timeInput = z.object({
  business_id: z.string().uuid(),
  matter_id: z.string().uuid(),
  entry_date: z.string(),
  minutes: z.number().int().min(0).max(24 * 60),
  rate: z.number().nonnegative(),
  description: z.string().max(1000).optional().nullable(),
  billable: z.boolean().default(true),
});

export const upsertTimeEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string } & z.infer<typeof timeInput>) => {
    const { id, ...rest } = d;
    return { id, ...timeInput.parse(rest) };
  })
  .handler(async ({ data, context }) => {
    const { id, ...payload } = data;
    const q = id
      ? context.supabase.from("time_entries").update(payload).eq("id", id).select().single()
      : context.supabase.from("time_entries").insert({ ...payload, user_id: context.userId }).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteTimeEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("time_entries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== INVOICES ==============
export const listInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => businessIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // Auto-mark overdue (best effort)
    await supabase
      .from("invoices")
      .update({ status: "overdue" })
      .eq("business_id", data.businessId)
      .eq("status", "sent")
      .lt("due_date", new Date().toISOString().slice(0, 10));
    const { data: rows, error } = await supabase
      .from("invoices")
      .select("*, clients(name, company, email, address), matters(name, matter_number)")
      .eq("business_id", data.businessId)
      .order("issue_date", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getInvoice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: inv, error } = await context.supabase
      .from("invoices")
      .select("*, clients(name, company, email, address), matters(name, matter_number), invoice_items(*)")
      .eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return inv;
  });

const itemInput = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().nonnegative(),
  rate: z.number().nonnegative(),
  time_entry_id: z.string().uuid().nullable().optional(),
  service_id: z.string().uuid().nullable().optional(),
  kind: z.string().max(40).default("service"),
});

const invoiceInput = z.object({
  business_id: z.string().uuid(),
  client_id: z.string().uuid(),
  matter_id: z.string().uuid().nullable().optional(),
  issue_date: z.string(),
  due_date: z.string().nullable().optional(),
  tax: z.number().nonnegative().default(0),
  notes: z.string().max(2000).optional().nullable(),
  payment_terms: z.string().max(120).optional().nullable(),
  items: z.array(itemInput).min(1),
  status: z.enum(["draft","sent"]).default("draft"),
});

export const createInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => invoiceInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const subtotal = data.items.reduce((s, it) => s + it.quantity * it.rate, 0);
    const total = subtotal + (data.tax ?? 0);
    const { data: numData, error: numErr } = await supabase
      .rpc("next_invoice_number", { _business_id: data.business_id });
    if (numErr) throw new Error(numErr.message);
    const { data: inv, error } = await supabase
      .from("invoices")
      .insert({
        business_id: data.business_id,
        client_id: data.client_id,
        matter_id: data.matter_id ?? null,
        number: numData as unknown as string,
        issue_date: data.issue_date,
        due_date: data.due_date ?? null,
        subtotal,
        tax: data.tax ?? 0,
        total,
        notes: data.notes ?? null,
        payment_terms: data.payment_terms ?? null,
        status: data.status,
      })
      .select().single();
    if (error) throw new Error(error.message);
    const items = data.items.map((it, idx) => ({
      invoice_id: inv.id,
      business_id: data.business_id,
      kind: it.kind ?? "service",
      description: it.description,
      quantity: it.quantity,
      rate: it.rate,
      amount: it.quantity * it.rate,
      time_entry_id: it.time_entry_id ?? null,
      service_id: it.service_id ?? null,
      sort_order: idx,
    }));
    const { error: itErr } = await supabase.from("invoice_items").insert(items);
    if (itErr) throw new Error(itErr.message);
    // Mark referenced time entries as invoiced
    const teIds = data.items.map((i) => i.time_entry_id).filter((x): x is string => !!x);
    if (teIds.length) {
      await supabase.from("time_entries").update({ invoice_id: inv.id }).in("id", teIds);
    }
    return inv;
  });

export const updateInvoiceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "draft"|"sent"|"paid"|"overdue"|"void" }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("invoices").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("invoices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== DASHBOARD STATS ==============
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => businessIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: invoices }, { data: clients }, { data: matters }, { data: time }] = await Promise.all([
      supabase.from("invoices").select("status,total,issue_date,number,due_date,clients(name)").eq("business_id", data.businessId),
      supabase.from("clients").select("id").eq("business_id", data.businessId),
      supabase.from("matters").select("id,status").eq("business_id", data.businessId),
      supabase.from("time_entries").select("minutes,rate,billable,invoice_id").eq("business_id", data.businessId),
    ]);
    const inv = invoices ?? [];
    const revenue = inv.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total), 0);
    const outstanding = inv.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + Number(i.total), 0);
    const overdueCount = inv.filter((i) => i.status === "overdue").length;
    const unbilledTime = (time ?? []).filter((t) => t.billable && !t.invoice_id)
      .reduce((s, t) => s + (Number(t.minutes) / 60) * Number(t.rate), 0);

    // ---- ARR (annualised run-rate of real billings) ----
    // Aggregate every non-draft, non-void invoice billed in the trailing 12 months,
    // then annualise by the actual span of billing activity to get a true run-rate.
    const now = new Date();
    const cutoff = new Date(now); cutoff.setFullYear(now.getFullYear() - 1);
    const billed = inv.filter((i) => i.status !== "draft" && i.status !== "void" && i.issue_date && new Date(i.issue_date) >= cutoff);
    const billedTotal = billed.reduce((s, i) => s + Number(i.total), 0);
    const months = new Set(billed.map((i) => i.issue_date.slice(0, 7)));
    const activeMonths = Math.max(1, months.size);
    const mrr = billedTotal / activeMonths;          // monthly recurring run-rate
    const arr = Math.round(mrr * 12);                // annual recurring run-rate

    // ---- Invoice status breakdown (for pie chart) ----
    const statusAgg: Record<string, { count: number; amount: number }> = {};
    for (const i of inv) {
      const k = i.status;
      statusAgg[k] = statusAgg[k] ?? { count: 0, amount: 0 };
      statusAgg[k].count += 1;
      statusAgg[k].amount += Number(i.total);
    }
    const statusBreakdown = Object.entries(statusAgg).map(([status, v]) => ({ status, count: v.count, amount: v.amount }));

    // ---- Monthly billings (for bar chart) ----
    const monthlyAgg = new Map<string, { billed: number; collected: number }>();
    for (const i of inv) {
      if (i.status === "draft" || i.status === "void" || !i.issue_date) continue;
      const k = i.issue_date.slice(0, 7);
      const cur = monthlyAgg.get(k) ?? { billed: 0, collected: 0 };
      cur.billed += Number(i.total);
      if (i.status === "paid") cur.collected += Number(i.total);
      monthlyAgg.set(k, cur);
    }
    const monthly = Array.from(monthlyAgg.entries())
      .map(([month, v]) => ({ month, billed: v.billed, collected: v.collected }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // ---- Revenue by client (for pie chart) ----
    const clientAgg = new Map<string, number>();
    for (const i of inv) {
      if (i.status !== "paid") continue;
      const name = (i.clients as { name?: string } | null)?.name ?? "—";
      clientAgg.set(name, (clientAgg.get(name) ?? 0) + Number(i.total));
    }
    const revenueByClient = Array.from(clientAgg.entries())
      .map(([client, amount]) => ({ client, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      revenue, outstanding, overdueCount, arr, mrr,
      clientCount: clients?.length ?? 0,
      openMatters: (matters ?? []).filter((m) => m.status === "open").length,
      unbilledTime,
      recentInvoices: inv.slice(0, 5),
      statusBreakdown,
      monthly,
      revenueByClient,
    };
  });

// ============== DOCUMENTS ==============
export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; matterId?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("documents")
      .select("*, document_versions(id, version, file_name, file_size, mime_type, created_at, uploaded_by, notes, storage_path)")
      .eq("business_id", data.businessId)
      .order("updated_at", { ascending: false });
    if (data.matterId) q = q.eq("matter_id", data.matterId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const matterIds = Array.from(new Set((rows ?? []).map((r) => r.matter_id)));
    const { data: matters } = matterIds.length
      ? await supabase.from("matters").select("id, name, matter_number, client_id, clients(name)").in("id", matterIds)
      : { data: [] };
    const mIndex = new Map((matters ?? []).map((m) => [m.id, m]));
    return (rows ?? []).map((r) => ({ ...r, matters: mIndex.get(r.matter_id) ?? null }));
  });

export const createDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    business_id: z.string().uuid(),
    matter_id: z.string().uuid(),
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional().nullable(),
    category: z.string().max(60).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("documents")
      .insert({ ...data, created_by: context.userId, current_version: 0 })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const addDocumentVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    document_id: z.string().uuid(),
    business_id: z.string().uuid(),
    storage_path: z.string().min(1),
    file_name: z.string().min(1).max(300),
    file_size: z.number().int().nonnegative().optional(),
    mime_type: z.string().max(120).optional(),
    notes: z.string().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: doc, error: dErr } = await supabase.from("documents")
      .select("current_version").eq("id", data.document_id).single();
    if (dErr) throw new Error(dErr.message);
    const next = (doc?.current_version ?? 0) + 1;
    const { data: ver, error } = await supabase.from("document_versions").insert({
      document_id: data.document_id,
      business_id: data.business_id,
      version: next,
      storage_path: data.storage_path,
      file_name: data.file_name,
      file_size: data.file_size ?? null,
      mime_type: data.mime_type ?? null,
      notes: data.notes ?? null,
      uploaded_by: userId,
    }).select().single();
    if (error) throw new Error(error.message);
    await supabase.from("documents").update({ current_version: next, updated_at: new Date().toISOString() }).eq("id", data.document_id);
    return ver;
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    // Best-effort: remove storage objects under this document's folder
    const { data: vers } = await context.supabase.from("document_versions").select("storage_path").eq("document_id", data.id);
    const paths = (vers ?? []).map((v) => v.storage_path);
    if (paths.length) await context.supabase.storage.from("matter-documents").remove(paths);
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDocumentSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string; expiresIn?: number }) => d)
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("matter-documents")
      .createSignedUrl(data.path, data.expiresIn ?? 300);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

// ============== DOCUMENT SHARES (firm-internal) ==============
export const listDocumentShares = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { documentId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("document_shares").select("*").eq("document_id", data.documentId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createDocumentShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    document_id: z.string().uuid(),
    business_id: z.string().uuid(),
    shared_with: z.string().uuid().nullable().optional(),
    expires_in_hours: z.number().int().min(1).max(24 * 30).default(72),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const expires_at = new Date(Date.now() + data.expires_in_hours * 3600 * 1000).toISOString();
    const { data: row, error } = await context.supabase.from("document_shares").insert({
      document_id: data.document_id,
      business_id: data.business_id,
      shared_with: data.shared_with ?? null,
      expires_at,
      created_by: context.userId,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const revokeDocumentShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("document_shares").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== FIRM MEMBERS (for share targeting) ==============
export const listFirmMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => businessIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: mems, error } = await context.supabase
      .from("business_members").select("user_id, role, hourly_rate").eq("business_id", data.businessId);
    if (error) throw new Error(error.message);
    const ids = (mems ?? []).map((m) => m.user_id);
    if (!ids.length) return [];
    const { data: profs } = await context.supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
    return (mems ?? []).map((m) => ({
      ...m,
      profile: profs?.find((p) => p.id === m.user_id) ?? null,
    }));
  });

// ============== REPORTS ==============
export const getReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => businessIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const today = new Date().toISOString().slice(0, 10);
    // Mark overdue
    await supabase.from("invoices").update({ status: "overdue" })
      .eq("business_id", data.businessId).eq("status", "sent").lt("due_date", today);

    const [{ data: invoices }, { data: time }, { data: matters }] = await Promise.all([
      supabase.from("invoices").select("id, number, status, total, issue_date, due_date, client_id, matter_id, clients(name), matters(name, matter_number)").eq("business_id", data.businessId),
      supabase.from("time_entries").select("id, entry_date, minutes, rate, billable, invoice_id, matter_id, matters(name, client_id, clients(name))").eq("business_id", data.businessId),
      supabase.from("matters").select("id, name, matter_number, status, clients(name)").eq("business_id", data.businessId),
    ]);

    const inv = invoices ?? [];
    const te = time ?? [];

    // WIP: unbilled billable time grouped by matter
    const wipMap = new Map<string, { matter_id: string; matter_name: string; matter_number: string | null; client: string; hours: number; amount: number; entries: number }>();
    for (const t of te) {
      if (!t.billable || t.invoice_id) continue;
      const k = t.matter_id;
      const m = t.matters as { name?: string; clients?: { name?: string } | null } | null;
      const cur = wipMap.get(k) ?? { matter_id: k, matter_name: m?.name ?? "—", matter_number: null, client: m?.clients?.name ?? "—", hours: 0, amount: 0, entries: 0 };
      const h = Number(t.minutes) / 60;
      cur.hours += h;
      cur.amount += h * Number(t.rate);
      cur.entries += 1;
      wipMap.set(k, cur);
    }
    const wip = Array.from(wipMap.values()).sort((a, b) => b.amount - a.amount);

    // Outstanding: sent + overdue
    const outstanding = inv.filter((i) => i.status === "sent" || i.status === "overdue").map((i) => {
      const days = i.due_date ? Math.floor((Date.parse(today) - Date.parse(i.due_date)) / 86400000) : 0;
      return { ...i, days_overdue: Math.max(0, days) };
    }).sort((a, b) => b.days_overdue - a.days_overdue);

    // Overdue only
    const overdue = outstanding.filter((i) => i.status === "overdue");

    // Collections (paid invoices last 12 months by month)
    const monthly = new Map<string, number>();
    for (const i of inv) {
      if (i.status !== "paid") continue;
      const k = i.issue_date.slice(0, 7);
      monthly.set(k, (monthly.get(k) ?? 0) + Number(i.total));
    }
    const collections = Array.from(monthly.entries()).map(([month, total]) => ({ month, total })).sort((a, b) => a.month.localeCompare(b.month));

    // Aging buckets for outstanding
    const aging = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
    for (const o of outstanding) {
      const d = o.days_overdue;
      const amt = Number(o.total);
      if (d <= 0) aging.current += amt;
      else if (d <= 30) aging.d1_30 += amt;
      else if (d <= 60) aging.d31_60 += amt;
      else if (d <= 90) aging.d61_90 += amt;
      else aging.d90_plus += amt;
    }

    return {
      wip,
      outstanding,
      overdue,
      collections,
      aging,
      mattersCount: matters?.length ?? 0,
      totals: {
        wip: wip.reduce((s, r) => s + r.amount, 0),
        outstanding: outstanding.reduce((s, r) => s + Number(r.total), 0),
        overdue: overdue.reduce((s, r) => s + Number(r.total), 0),
        collected: collections.reduce((s, r) => s + r.total, 0),
      },
    };
  });

// ============== DEMO SEED (no auth) ==============
// Idempotent: the demo "Managing Partner" account is Tyche Solicitors.
// The account + realistic data already exist; this returns its credentials,
// and only seeds fallback sample data if the firm is somehow empty.
const DEMO_EMAIL = "justice@tychelaw.com";
const DEMO_PASSWORD = "0123456789";
const DEMO_FIRM = "Tyche Solicitors";

export const seedDemoAccount = createServerFn({ method: "POST" })
  .handler(async () => {
    // 1. Ensure user
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    let user = list?.users.find((u) => u.email === DEMO_EMAIL) ?? null;
    if (!user) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "Chief Olúmidé Adégoké, SAN", firm_name: DEMO_FIRM },
      });
      if (error) throw new Error(error.message);
      user = created.user;
    }
    if (!user) throw new Error("Could not create demo user");

    // 2. Find their firm (created by handle_new_user trigger) and seed if empty
    const { data: biz } = await supabaseAdmin.from("businesses").select("*").eq("owner_id", user.id).limit(1).maybeSingle();
    if (!biz) {
      return { email: DEMO_EMAIL, password: DEMO_PASSWORD };
    }
    const { data: existingClients } = await supabaseAdmin.from("clients").select("id").eq("business_id", biz.id).limit(1);
    if (existingClients && existingClients.length) {
      return { email: DEMO_EMAIL, password: DEMO_PASSWORD };
    }

    // Brand & polish firm record
    await supabaseAdmin.from("businesses").update({
      tagline: "Corporate, Litigation & IP Counsel",
      brand: { primaryColor: "#1e3a5f", accentColor: "#c9a84c" },
      address_lines: ["12 Marina Drive", "Lagos Island, Lagos", "Nigeria"],
      footer_note: "Payment within 30 days. Bank: First Atlantic | Acct: 0123456789",
      payment_terms: "Net 30",
      invoice_prefix: "WV",
    }).eq("id", biz.id);

    // Clients
    const clientsSeed = [
      { name: "Adamu Okeke", company: "Sterling Cement Plc", email: "a.okeke@sterling.ng", phone: "+234 802 555 0144" },
      { name: "Folake Adeyemi", company: "Greenleaf Agro Ltd", email: "folake@greenleafagro.com", phone: "+234 802 555 0177" },
      { name: "Chinedu Eze", company: "Helios Energy", email: "c.eze@helios.energy", phone: "+234 803 555 0102" },
      { name: "Maryam Ibrahim", company: "Northbridge Holdings", email: "m.ibrahim@northbridge.co", phone: "+234 805 555 0133" },
    ];
    const { data: clients } = await supabaseAdmin.from("clients")
      .insert(clientsSeed.map((c) => ({ ...c, business_id: biz.id, status: "active" }))).select();
    if (!clients) return { email: DEMO_EMAIL, password: DEMO_PASSWORD };

    // Matters
    const mattersSeed = [
      { client_id: clients[0].id, name: "Sterling v. Lagos Port Authority", matter_number: "WV-2026-001", practice_area: "Litigation", default_rate: 450 },
      { client_id: clients[0].id, name: "Sterling — Subsidiary Restructure", matter_number: "WV-2026-002", practice_area: "Corporate", default_rate: 500 },
      { client_id: clients[1].id, name: "Greenleaf Series A Financing", matter_number: "WV-2026-003", practice_area: "Corporate", default_rate: 525 },
      { client_id: clients[2].id, name: "Helios — PPA Negotiation", matter_number: "WV-2026-004", practice_area: "Energy", default_rate: 575 },
      { client_id: clients[3].id, name: "Northbridge IP Portfolio", matter_number: "WV-2026-005", practice_area: "IP", default_rate: 500 },
    ];
    const { data: matters } = await supabaseAdmin.from("matters")
      .insert(mattersSeed.map((m) => ({ ...m, business_id: biz.id, status: "open" }))).select();
    if (!matters) return { email: DEMO_EMAIL, password: DEMO_PASSWORD };

    // Services
    await supabaseAdmin.from("services").insert([
      { business_id: biz.id, name: "Partner hour", kind: "hourly", rate: 575 },
      { business_id: biz.id, name: "Senior associate hour", kind: "hourly", rate: 425 },
      { business_id: biz.id, name: "Paralegal hour", kind: "hourly", rate: 175 },
      { business_id: biz.id, name: "Document filing", kind: "flat", rate: 250 },
      { business_id: biz.id, name: "Court fees (passthrough)", kind: "expense", rate: 0 },
    ]);

    // Time entries (spread across last 30 days)
    const today = new Date();
    const timeRows: Array<{
      business_id: string; matter_id: string; user_id: string;
      entry_date: string; minutes: number; rate: number; billable: boolean; description: string;
    }> = [];
    for (let i = 0; i < 24; i++) {
      const d = new Date(today); d.setDate(d.getDate() - Math.floor(Math.random() * 30));
      const m = matters[i % matters.length];
      timeRows.push({
        business_id: biz.id,
        matter_id: m.id,
        user_id: user.id,
        entry_date: d.toISOString().slice(0, 10),
        minutes: [30, 45, 60, 90, 120, 180][i % 6],
        rate: Number(m.default_rate ?? 400),
        billable: true,
        description: ["Drafted motion", "Client call", "Reviewed contract", "Court appearance prep", "Research memo", "Negotiation"][i % 6],
      });
    }
    await supabaseAdmin.from("time_entries").insert(timeRows);

    // Invoices: a mix of paid, sent, overdue
    const { data: invNum1 } = await supabaseAdmin.rpc("next_invoice_number", { _business_id: biz.id });
    const { data: invNum2 } = await supabaseAdmin.rpc("next_invoice_number", { _business_id: biz.id });
    const { data: invNum3 } = await supabaseAdmin.rpc("next_invoice_number", { _business_id: biz.id });
    const { data: invNum4 } = await supabaseAdmin.rpc("next_invoice_number", { _business_id: biz.id });

    const mkInvoice = async (number: string, client_id: string, matter_id: string, total: number, status: "paid"|"sent"|"overdue", daysAgo: number) => {
      const issue = new Date(today); issue.setDate(issue.getDate() - daysAgo);
      const due = new Date(issue); due.setDate(due.getDate() + 30);
      const { data: inv } = await supabaseAdmin.from("invoices").insert({
        business_id: biz.id, client_id, matter_id, number,
        status, issue_date: issue.toISOString().slice(0, 10), due_date: due.toISOString().slice(0, 10),
        subtotal: total, tax: 0, total, payment_terms: "Net 30",
      }).select().single();
      if (inv) {
        await supabaseAdmin.from("invoice_items").insert([
          { invoice_id: inv.id, business_id: biz.id, kind: "service", description: "Legal services rendered", quantity: total / 425, rate: 425, amount: total, sort_order: 0 },
        ]);
      }
    };
    await mkInvoice(invNum1 as string, clients[0].id, matters[0].id, 12500, "paid", 50);
    await mkInvoice(invNum2 as string, clients[1].id, matters[2].id, 8400, "paid", 25);
    await mkInvoice(invNum3 as string, clients[2].id, matters[3].id, 6750, "sent", 10);
    await mkInvoice(invNum4 as string, clients[3].id, matters[4].id, 4200, "overdue", 55);

    return { email: DEMO_EMAIL, password: DEMO_PASSWORD };
  });
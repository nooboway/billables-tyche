## Foundation Build — Billables for Law Firms (PR 1 of 3)

Goal: turn the mock-data shell into a working multi-tenant app where forms persist, users log in, and the core legal-practice modules (Matters, Clients, Invoices, Time Tracking) are end-to-end functional. Expenses, Trust Accounting, and Documents land in PR 2; Reports rewire, PDF templating polish, and exports in PR 3.

---

### 1. Database schema (one migration)

All tables in `public`, all with RLS, all scoped to a `business_id` (workspace) so the existing multi-business switcher keeps working.

```text
profiles          (id=auth.users.id, full_name, avatar_url, default_business_id)
businesses       (id, owner_id, name, brand jsonb, invoice_prefix, payment_terms, footer_note)
business_members  (business_id, user_id, role, hourly_rate)         ← team + per-firm role
app_role enum     ('partner','associate','paralegal','admin')
user_roles        (user_id, business_id, role)                       ← security-definer source of truth
clients           (id, business_id, name, type, email, phone, address, status, notes)
matters           (id, business_id, client_id, name, matter_number, practice_area,
                   status, opened_at, closed_at, default_rate, description)
services          (id, business_id, name, kind['hourly'|'flat'|'expense'], rate, unit, description)
time_entries      (id, business_id, matter_id, user_id, date, minutes, rate,
                   description, billable, invoiced_id nullable)
invoices          (id, business_id, client_id, matter_id, number, issue_date, due_date,
                   status['draft'|'sent'|'paid'|'overdue'], subtotal, tax, total,
                   notes, payment_terms)
invoice_items     (id, invoice_id, kind, description, quantity, rate, amount,
                   time_entry_id nullable, service_id nullable)
```

Security-definer `has_role(user_id, business_id, role)` function. RLS pattern on every table: `business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid())`. Roles checked via `has_role` for admin-only mutations (settings, team). `GRANT SELECT/INSERT/UPDATE/DELETE ... TO authenticated` on each table. Trigger to create a profile + a starter business + owner membership on signup.

### 2. Auth

- `/login` and `/signup` routes (public) — email/password + "Continue with Google" via `lovable.auth.signInWithOAuth("google")`.
- `supabase--configure_social_auth` for Google.
- `/reset-password` page (required by Lovable rules).
- Wrap all app routes under existing `_app` layout with a `beforeLoad` gate that redirects to `/login` if no session; hydrate via `supabase.auth.getUser()`.
- Root-level `onAuthStateChange` invalidates router + query cache.
- `attachSupabaseAuth` already registered.

### 3. Business context, rewired

Replace `src/lib/business.tsx` mock store with a real one: fetch businesses where the user is a member, pick the active one (persist last choice in localStorage), expose `useBusiness()` + `useActiveBusinessId()`. The switcher UI stays the same.

### 4. Modules wired to DB (this PR)

For each: create server functions (`createServerFn` + `requireSupabaseAuth`), drive UI via `useQuery`/`useMutation`, replace the existing mock-driven routes.

- **Clients** (`/clients`) — list, search, create/edit dialog, archive. Card shows real LTV (sum of paid invoices) and outstanding balance computed from invoices.
- **Matters** (NEW, `/matters`) — list grouped by client, create dialog (client picker, practice area, default rate, matter number auto-from sequence), open/close status, detail page with related time entries + invoices.
- **Invoices** (`/invoices`) — list with real status counts, create dialog that lets you pick a matter and pull in *unbilled time entries* + add manual line items, auto-numbering using business `invoice_prefix`, status transitions (draft → sent → paid), PDF download keeps working against real data.
- **Time Tracking** (NEW, `/time`) — daily entry grid + a live timer widget in the topbar (start/stop, attached to a matter). Entries show billable status and whether they've been invoiced.
- **Services & Rates** (`/services`, replaces Products) — CRUD for hourly services, flat fees, billable expenses.

### 5. Settings (partial)

- Workspace tab → saves to `businesses` (name, brand colors, invoice prefix, payment terms, footer).
- Team tab → invites by email (stores pending invite row keyed to email; accepted on signup), edit role + hourly rate.
- Other tabs stay UI-only this round.

### 6. Out of scope this PR (clearly deferred)

Expenses persistence, Trust/IOLTA ledger, Documents vault, Reports rewire to real data, Engagement letters / e-sign, LEDES export, court calendar, conflicts check, payments integration. PR 2 covers Expenses + Trust + Documents; PR 3 covers Reports + exports + signed engagement letters.

### Technical notes

- Server functions live in `src/lib/*.functions.ts` (clients, matters, invoices, time, services, businesses). Each uses `requireSupabaseAuth`; no admin client needed for user-scoped reads.
- Loaders inside `_app` use `ensureQueryData`; components read with `useSuspenseQuery` — per Lovable's TanStack Query pattern.
- Existing routes will be edited in place; PDF generator (`src/lib/invoice-pdf.ts`) is re-used unchanged, just fed real data.
- Runtime error #418 (hydration mismatch from localStorage reads during SSR) gets fixed as part of rewiring `business.tsx`.

### Deliverable

After this PR you can: sign up → land in a fresh workspace → add a client → open a matter → log time against it → generate an invoice that pulls those time entries → download a branded PDF. Every form persists.

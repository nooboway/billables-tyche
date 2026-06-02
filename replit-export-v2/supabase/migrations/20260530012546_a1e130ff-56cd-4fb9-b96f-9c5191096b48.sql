
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('partner','associate','paralegal','admin');
CREATE TYPE public.matter_status AS ENUM ('open','closed','on_hold');
CREATE TYPE public.invoice_status AS ENUM ('draft','sent','paid','overdue','void');
CREATE TYPE public.service_kind AS ENUM ('hourly','flat','expense');
CREATE TYPE public.client_status AS ENUM ('active','prospect','inactive');

-- =========================================================
-- updated_at helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================================================
-- profiles
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  default_business_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- businesses (workspaces / firms)
-- =========================================================
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tagline TEXT,
  brand JSONB NOT NULL DEFAULT '{"primaryColor":"#1e3a5f","accentColor":"#c9a84c"}'::jsonb,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  invoice_sequence INT NOT NULL DEFAULT 1000,
  payment_terms TEXT NOT NULL DEFAULT 'Net 30',
  footer_note TEXT,
  address_lines TEXT[],
  default_currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- business_members + user_roles
-- =========================================================
CREATE TABLE public.business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'associate',
  hourly_rate NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_members TO authenticated;
GRANT ALL ON public.business_members TO service_role;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, business_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- Security-definer helpers
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_business_member(_business_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = _business_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _business_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND business_id = _business_id AND role = _role
  );
$$;

-- Policies for businesses, business_members, user_roles
CREATE POLICY "Members view their businesses" ON public.businesses
  FOR SELECT USING (public.is_business_member(id));
CREATE POLICY "Owners update business" ON public.businesses
  FOR UPDATE USING (owner_id = auth.uid() OR public.has_role(auth.uid(), id, 'admin'));
CREATE POLICY "Anyone authenticated can create business" ON public.businesses
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners delete business" ON public.businesses
  FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Members view memberships of their businesses" ON public.business_members
  FOR SELECT USING (public.is_business_member(business_id) OR user_id = auth.uid());
CREATE POLICY "Admins manage memberships" ON public.business_members
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), business_id, 'admin') OR EXISTS(SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));
CREATE POLICY "Admins update memberships" ON public.business_members
  FOR UPDATE USING (public.has_role(auth.uid(), business_id, 'admin') OR EXISTS(SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));
CREATE POLICY "Admins delete memberships" ON public.business_members
  FOR DELETE USING (public.has_role(auth.uid(), business_id, 'admin') OR EXISTS(SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Users see roles for their businesses" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR public.is_business_member(business_id));

CREATE TRIGGER trg_businesses_updated BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Generic membership-scoped tables
-- =========================================================

-- CLIENTS
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  status client_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read clients" ON public.clients FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "Members insert clients" ON public.clients FOR INSERT WITH CHECK (public.is_business_member(business_id));
CREATE POLICY "Members update clients" ON public.clients FOR UPDATE USING (public.is_business_member(business_id));
CREATE POLICY "Members delete clients" ON public.clients FOR DELETE USING (public.is_business_member(business_id));
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_clients_business ON public.clients(business_id);

-- MATTERS
CREATE TABLE public.matters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  matter_number TEXT,
  name TEXT NOT NULL,
  practice_area TEXT,
  status matter_status NOT NULL DEFAULT 'open',
  default_rate NUMERIC(10,2),
  description TEXT,
  opened_at DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matters TO authenticated;
GRANT ALL ON public.matters TO service_role;
ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read matters" ON public.matters FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "Members insert matters" ON public.matters FOR INSERT WITH CHECK (public.is_business_member(business_id));
CREATE POLICY "Members update matters" ON public.matters FOR UPDATE USING (public.is_business_member(business_id));
CREATE POLICY "Members delete matters" ON public.matters FOR DELETE USING (public.is_business_member(business_id));
CREATE TRIGGER trg_matters_updated BEFORE UPDATE ON public.matters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_matters_business ON public.matters(business_id);
CREATE INDEX idx_matters_client ON public.matters(client_id);

-- SERVICES
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind service_kind NOT NULL DEFAULT 'hourly',
  rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit TEXT,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read services" ON public.services FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "Members insert services" ON public.services FOR INSERT WITH CHECK (public.is_business_member(business_id));
CREATE POLICY "Members update services" ON public.services FOR UPDATE USING (public.is_business_member(business_id));
CREATE POLICY "Members delete services" ON public.services FOR DELETE USING (public.is_business_member(business_id));
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TIME ENTRIES
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  minutes INT NOT NULL CHECK (minutes >= 0),
  rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  billable BOOLEAN NOT NULL DEFAULT true,
  invoice_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entries TO service_role;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read time" ON public.time_entries FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "Members insert time" ON public.time_entries FOR INSERT WITH CHECK (public.is_business_member(business_id) AND user_id = auth.uid());
CREATE POLICY "Members update time" ON public.time_entries FOR UPDATE USING (public.is_business_member(business_id));
CREATE POLICY "Members delete time" ON public.time_entries FOR DELETE USING (public.is_business_member(business_id));
CREATE TRIGGER trg_time_updated BEFORE UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_time_matter ON public.time_entries(matter_id);
CREATE INDEX idx_time_business ON public.time_entries(business_id);

-- INVOICES
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  matter_id UUID REFERENCES public.matters(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  payment_terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read invoices" ON public.invoices FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "Members insert invoices" ON public.invoices FOR INSERT WITH CHECK (public.is_business_member(business_id));
CREATE POLICY "Members update invoices" ON public.invoices FOR UPDATE USING (public.is_business_member(business_id));
CREATE POLICY "Members delete invoices" ON public.invoices FOR DELETE USING (public.is_business_member(business_id));
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_invoices_business ON public.invoices(business_id);
CREATE INDEX idx_invoices_client ON public.invoices(client_id);

ALTER TABLE public.time_entries
  ADD CONSTRAINT fk_time_invoice FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;

-- INVOICE ITEMS
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'service',
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read invoice items" ON public.invoice_items FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "Members insert invoice items" ON public.invoice_items FOR INSERT WITH CHECK (public.is_business_member(business_id));
CREATE POLICY "Members update invoice items" ON public.invoice_items FOR UPDATE USING (public.is_business_member(business_id));
CREATE POLICY "Members delete invoice items" ON public.invoice_items FOR DELETE USING (public.is_business_member(business_id));
CREATE INDEX idx_invitems_invoice ON public.invoice_items(invoice_id);

-- =========================================================
-- Invoice number generator
-- =========================================================
CREATE OR REPLACE FUNCTION public.next_invoice_number(_business_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prefix TEXT;
  v_seq INT;
BEGIN
  UPDATE public.businesses
    SET invoice_sequence = invoice_sequence + 1
    WHERE id = _business_id
    RETURNING invoice_prefix, invoice_sequence INTO v_prefix, v_seq;
  RETURN v_prefix || '-' || lpad(v_seq::text, 5, '0');
END; $$;

-- =========================================================
-- Signup trigger: profile + starter firm + membership + role
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_business_id UUID;
  v_full_name TEXT;
  v_firm_name TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1));
  v_firm_name := COALESCE(NEW.raw_user_meta_data->>'firm_name', v_full_name || '''s Firm');

  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, v_full_name, NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.businesses (owner_id, name, invoice_prefix)
  VALUES (NEW.id, v_firm_name, 'INV')
  RETURNING id INTO v_business_id;

  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (v_business_id, NEW.id, 'admin');

  INSERT INTO public.user_roles (user_id, business_id, role)
  VALUES (NEW.id, v_business_id, 'admin');

  UPDATE public.profiles SET default_business_id = v_business_id WHERE id = NEW.id;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

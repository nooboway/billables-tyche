
-- ============== DOCUMENTS ==============
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  matter_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  current_version INT NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read documents" ON public.documents FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "Members insert documents" ON public.documents FOR INSERT WITH CHECK (public.is_business_member(business_id) AND created_by = auth.uid());
CREATE POLICY "Members update documents" ON public.documents FOR UPDATE USING (public.is_business_member(business_id));
CREATE POLICY "Members delete documents" ON public.documents FOR DELETE USING (public.is_business_member(business_id));

CREATE TRIGGER documents_updated BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== DOCUMENT VERSIONS ==============
CREATE TABLE public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  business_id UUID NOT NULL,
  version INT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, version)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_versions TO authenticated;
GRANT ALL ON public.document_versions TO service_role;

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read versions" ON public.document_versions FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "Members insert versions" ON public.document_versions FOR INSERT WITH CHECK (public.is_business_member(business_id) AND uploaded_by = auth.uid());
CREATE POLICY "Members delete versions" ON public.document_versions FOR DELETE USING (public.is_business_member(business_id));

-- ============== DOCUMENT SHARES (firm-internal) ==============
CREATE TABLE public.document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  business_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  shared_with UUID,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_shares TO authenticated;
GRANT ALL ON public.document_shares TO service_role;

ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read shares" ON public.document_shares FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "Members create shares" ON public.document_shares FOR INSERT WITH CHECK (public.is_business_member(business_id) AND created_by = auth.uid());
CREATE POLICY "Members delete shares" ON public.document_shares FOR DELETE USING (public.is_business_member(business_id));

-- ============== STORAGE BUCKET ==============
INSERT INTO storage.buckets (id, name, public) VALUES ('matter-documents', 'matter-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: path layout is {business_id}/{matter_id}/{document_id}/v{n}-{filename}
CREATE POLICY "Members read matter docs" ON storage.objects FOR SELECT
  USING (bucket_id = 'matter-documents' AND public.is_business_member((storage.foldername(name))[1]::uuid));

CREATE POLICY "Members upload matter docs" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'matter-documents' AND public.is_business_member((storage.foldername(name))[1]::uuid));

CREATE POLICY "Members delete matter docs" ON storage.objects FOR DELETE
  USING (bucket_id = 'matter-documents' AND public.is_business_member((storage.foldername(name))[1]::uuid));

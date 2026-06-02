
REVOKE EXECUTE ON FUNCTION public.is_business_member(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, UUID, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_business_member(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, UUID, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
-- handle_new_user is invoked by the auth.users trigger; keep it for service_role only
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

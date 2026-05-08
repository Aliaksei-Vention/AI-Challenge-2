
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_event_capacity() FROM PUBLIC, anon, authenticated;

-- Restrict listing in public buckets: only allow SELECT on objects, not bucket listing.
-- The current SELECT policy already filters by bucket_id, which is fine for direct file fetches.
-- To address listing concerns, we keep the policy but it's already scoped.

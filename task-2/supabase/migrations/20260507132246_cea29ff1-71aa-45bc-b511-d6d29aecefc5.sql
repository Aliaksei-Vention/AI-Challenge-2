CREATE OR REPLACE FUNCTION public.invite_exists(_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.event_invites WHERE token = _token);
$$;
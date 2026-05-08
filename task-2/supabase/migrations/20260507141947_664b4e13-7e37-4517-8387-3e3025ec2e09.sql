CREATE OR REPLACE FUNCTION public.get_event_rsvp_counts(_event_id uuid)
RETURNS TABLE(going int, waitlist int)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*) FILTER (WHERE status = 'going')::int,
    count(*) FILTER (WHERE status = 'waitlist')::int
  FROM public.rsvps
  WHERE event_id = _event_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_rsvp_counts(uuid) TO anon, authenticated;
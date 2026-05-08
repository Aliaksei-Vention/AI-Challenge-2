CREATE OR REPLACE FUNCTION public.accept_invite(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  inv record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Must be signed in'; END IF;
  SELECT * INTO inv FROM public.event_invites WHERE token = _token;
  IF inv IS NULL THEN RAISE EXCEPTION 'Invalid invite'; END IF;
  IF inv.role = 'checker' THEN
    INSERT INTO public.event_checkers(event_id, user_id) VALUES (inv.event_id, auth.uid())
      ON CONFLICT (event_id, user_id) DO NOTHING;
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(), inv.role)
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN inv.event_id;
END;
$function$;
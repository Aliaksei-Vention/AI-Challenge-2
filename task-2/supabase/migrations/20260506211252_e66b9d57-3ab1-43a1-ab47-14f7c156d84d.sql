
CREATE OR REPLACE FUNCTION public.assign_checker_by_email(_event_id uuid, _email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _host uuid;
BEGIN
  SELECT host_id INTO _host FROM public.events WHERE id = _event_id;
  IF _host IS NULL OR _host <> auth.uid() THEN
    RAISE EXCEPTION 'Not the host of this event';
  END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'No user with that email. They need to sign up first.';
  END IF;
  INSERT INTO public.event_checkers(event_id, user_id) VALUES (_event_id, _uid)
    ON CONFLICT (event_id, user_id) DO NOTHING;
  INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'checker')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN _uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_checker_by_email(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_checker_by_email(uuid, text) TO authenticated;

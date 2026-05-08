
CREATE TABLE public.event_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  role public.app_role NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "host manages invites" ON public.event_invites
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_invites.event_id AND e.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_invites.event_id AND e.host_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.accept_invite(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

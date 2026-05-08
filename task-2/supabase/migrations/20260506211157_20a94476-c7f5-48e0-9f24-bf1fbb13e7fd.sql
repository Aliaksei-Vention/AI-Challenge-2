
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'checker';

CREATE TABLE IF NOT EXISTS public.event_checkers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_checkers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "host manages checkers" ON public.event_checkers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_checkers.event_id AND e.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_checkers.event_id AND e.host_id = auth.uid()));

CREATE POLICY "checker reads own assignments" ON public.event_checkers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "checkers read rsvps" ON public.rsvps
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.event_checkers c WHERE c.event_id = rsvps.event_id AND c.user_id = auth.uid()));

CREATE POLICY "checkers update rsvps" ON public.rsvps
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.event_checkers c WHERE c.event_id = rsvps.event_id AND c.user_id = auth.uid()));

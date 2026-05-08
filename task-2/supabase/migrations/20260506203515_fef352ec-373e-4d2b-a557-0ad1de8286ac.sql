
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'host', 'attendee');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Hosts
CREATE TABLE public.hosts (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  logo_url text,
  bio text,
  contact_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hosts public read" ON public.hosts FOR SELECT USING (true);
CREATE POLICY "host owner insert" ON public.hosts FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "host owner update" ON public.hosts FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Events
CREATE TYPE public.event_visibility AS ENUM ('public', 'unlisted');
CREATE TYPE public.event_status AS ENUM ('draft', 'published');

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  venue_address text,
  online_url text,
  capacity int,
  cover_url text,
  is_paid boolean NOT NULL DEFAULT false,
  visibility public.event_visibility NOT NULL DEFAULT 'public',
  status public.event_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events read published" ON public.events FOR SELECT USING (status = 'published' OR auth.uid() = host_id);
CREATE POLICY "events host insert" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "events host update" ON public.events FOR UPDATE TO authenticated USING (auth.uid() = host_id);
CREATE POLICY "events host delete" ON public.events FOR DELETE TO authenticated USING (auth.uid() = host_id);

CREATE INDEX events_host_idx ON public.events(host_id);
CREATE INDEX events_status_visibility_idx ON public.events(status, visibility);

-- RSVPs
CREATE TABLE public.rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  checked_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rsvps read own" ON public.rsvps FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "rsvps host read" ON public.rsvps FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = rsvps.event_id AND e.host_id = auth.uid())
);
CREATE POLICY "rsvps insert self" ON public.rsvps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rsvps delete self" ON public.rsvps FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "rsvps host update" ON public.rsvps FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = rsvps.event_id AND e.host_id = auth.uid())
);

-- Capacity check trigger
CREATE OR REPLACE FUNCTION public.check_event_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cap int;
  cnt int;
BEGIN
  SELECT capacity INTO cap FROM public.events WHERE id = NEW.event_id;
  IF cap IS NOT NULL THEN
    SELECT count(*) INTO cnt FROM public.rsvps WHERE event_id = NEW.event_id;
    IF cnt >= cap THEN
      RAISE EXCEPTION 'Event is at capacity';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rsvps_capacity_check BEFORE INSERT ON public.rsvps
  FOR EACH ROW EXECUTE FUNCTION public.check_event_capacity();

-- Outcomes
CREATE TABLE public.event_outcomes (
  event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.event_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outcomes host all" ON public.event_outcomes FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_outcomes.event_id AND e.host_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_outcomes.event_id AND e.host_id = auth.uid())
);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('event-covers', 'event-covers', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('host-logos', 'host-logos', true) ON CONFLICT DO NOTHING;

CREATE POLICY "public read event covers" ON storage.objects FOR SELECT USING (bucket_id = 'event-covers');
CREATE POLICY "auth upload event covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "auth update event covers" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'event-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "auth delete event covers" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'event-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "public read host logos" ON storage.objects FOR SELECT USING (bucket_id = 'host-logos');
CREATE POLICY "auth upload host logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'host-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "auth update host logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'host-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

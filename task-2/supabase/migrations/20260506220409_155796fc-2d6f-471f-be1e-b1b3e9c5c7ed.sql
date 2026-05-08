
-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read all signed in" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill
INSERT INTO public.profiles (id, email, display_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ===== RSVPS: waitlist =====
CREATE TYPE public.rsvp_status AS ENUM ('going', 'waitlist', 'cancelled');
ALTER TABLE public.rsvps ADD COLUMN status public.rsvp_status NOT NULL DEFAULT 'going';
ALTER TABLE public.rsvps ADD COLUMN promoted_at timestamptz;

-- Drop old capacity trigger if present
DROP TRIGGER IF EXISTS check_event_capacity_trigger ON public.rsvps;
DROP TRIGGER IF EXISTS rsvps_capacity_check ON public.rsvps;

-- New: assign status before insert
CREATE OR REPLACE FUNCTION public.assign_rsvp_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cap int; cnt int;
BEGIN
  SELECT capacity INTO cap FROM public.events WHERE id = NEW.event_id;
  IF cap IS NULL THEN
    NEW.status := 'going';
  ELSE
    SELECT count(*) INTO cnt FROM public.rsvps WHERE event_id = NEW.event_id AND status = 'going';
    IF cnt >= cap THEN
      NEW.status := 'waitlist';
    ELSE
      NEW.status := 'going';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER assign_rsvp_status_trigger
BEFORE INSERT ON public.rsvps
FOR EACH ROW EXECUTE FUNCTION public.assign_rsvp_status();

-- Promote oldest waitlist on delete of a 'going' RSVP
CREATE OR REPLACE FUNCTION public.promote_waitlist()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cap int; cnt int; promote_id uuid;
BEGIN
  SELECT capacity INTO cap FROM public.events WHERE id = OLD.event_id;
  IF cap IS NULL THEN RETURN OLD; END IF;
  SELECT count(*) INTO cnt FROM public.rsvps WHERE event_id = OLD.event_id AND status = 'going';
  WHILE cnt < cap LOOP
    SELECT id INTO promote_id FROM public.rsvps
      WHERE event_id = OLD.event_id AND status = 'waitlist'
      ORDER BY created_at ASC LIMIT 1;
    IF promote_id IS NULL THEN EXIT; END IF;
    UPDATE public.rsvps SET status = 'going', promoted_at = now() WHERE id = promote_id;
    cnt := cnt + 1;
  END LOOP;
  RETURN OLD;
END; $$;

CREATE TRIGGER promote_waitlist_trigger
AFTER DELETE ON public.rsvps
FOR EACH ROW EXECUTE FUNCTION public.promote_waitlist();

-- Promote on event capacity change
CREATE OR REPLACE FUNCTION public.event_capacity_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cnt int; promote_id uuid;
BEGIN
  IF NEW.capacity IS NULL OR (OLD.capacity IS NOT NULL AND NEW.capacity > OLD.capacity) OR OLD.capacity IS NULL THEN
    SELECT count(*) INTO cnt FROM public.rsvps WHERE event_id = NEW.id AND status = 'going';
    WHILE (NEW.capacity IS NULL OR cnt < NEW.capacity) LOOP
      SELECT id INTO promote_id FROM public.rsvps
        WHERE event_id = NEW.id AND status = 'waitlist'
        ORDER BY created_at ASC LIMIT 1;
      IF promote_id IS NULL THEN EXIT; END IF;
      UPDATE public.rsvps SET status = 'going', promoted_at = now() WHERE id = promote_id;
      cnt := cnt + 1;
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER event_capacity_changed_trigger
AFTER UPDATE OF capacity ON public.events
FOR EACH ROW EXECUTE FUNCTION public.event_capacity_changed();

-- ===== EVENT FEEDBACK =====
CREATE TABLE public.event_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback read host" ON public.event_feedback FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_feedback.event_id AND e.host_id = auth.uid()));

CREATE POLICY "feedback read own" ON public.event_feedback FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "feedback insert attendee after end" ON public.event_feedback FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.rsvps r WHERE r.event_id = event_feedback.event_id AND r.user_id = auth.uid() AND r.status = 'going')
  AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_feedback.event_id AND e.ends_at < now())
);

CREATE POLICY "feedback update own" ON public.event_feedback FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- ===== EVENT PHOTOS =====
CREATE TYPE public.photo_status AS ENUM ('pending', 'approved', 'hidden');

CREATE TABLE public.event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  storage_path text NOT NULL,
  status public.photo_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photos public read approved" ON public.event_photos FOR SELECT TO public
USING (status = 'approved');

CREATE POLICY "photos host read all" ON public.event_photos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_photos.event_id AND e.host_id = auth.uid()));

CREATE POLICY "photos uploader read own" ON public.event_photos FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "photos attendee insert" ON public.event_photos FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.rsvps r WHERE r.event_id = event_photos.event_id AND r.user_id = auth.uid() AND r.status = 'going')
);

CREATE POLICY "photos host manage" ON public.event_photos FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_photos.event_id AND e.host_id = auth.uid()));

CREATE POLICY "photos host delete" ON public.event_photos FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_photos.event_id AND e.host_id = auth.uid()));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('event-photos', 'event-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "event-photos public read" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'event-photos');

CREATE POLICY "event-photos auth upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "event-photos owner delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'event-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ===== REPORTS =====
CREATE TYPE public.report_target AS ENUM ('event', 'photo');
CREATE TYPE public.report_status AS ENUM ('open', 'hidden', 'dismissed');

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type public.report_target NOT NULL,
  target_id uuid NOT NULL,
  event_id uuid NOT NULL,
  reporter_id uuid NOT NULL,
  reason text,
  status public.report_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports insert auth" ON public.reports FOR INSERT TO authenticated
WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "reports host read" ON public.reports FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = reports.event_id AND e.host_id = auth.uid()));

CREATE POLICY "reports host update" ON public.reports FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = reports.event_id AND e.host_id = auth.uid()));

-- ===== Realtime =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_photos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_feedback;

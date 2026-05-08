ALTER TABLE public.reports ADD CONSTRAINT reports_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Allow public read of approved feedback so it shows on event page
CREATE POLICY "feedback public read" ON public.event_feedback FOR SELECT TO anon, authenticated USING (true);
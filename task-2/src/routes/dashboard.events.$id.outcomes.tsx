import { BackButton } from "@/components/back-button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/events/$id/outcomes")({
  component: Outcomes,
});

function Outcomes() {
  const { id } = Route.useParams();
  const [notes, setNotes] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["outcomes", id],
    queryFn: async () => {
      const [{ data: event }, { data: rsvps }, { data: outcome }] = await Promise.all([
        supabase.from("events").select("title, capacity, ends_at").eq("id", id).single(),
        supabase.from("rsvps").select("checked_in_at").eq("event_id", id),
        supabase.from("event_outcomes").select("notes").eq("event_id", id).maybeSingle(),
      ]);
      return { event, rsvps: rsvps ?? [], outcome };
    },
  });

  useEffect(() => { if (stats?.outcome?.notes) setNotes(stats.outcome.notes); }, [stats?.outcome?.notes]);

  const save = async () => {
    const { error } = await supabase.from("event_outcomes").upsert({ event_id: id, notes, recorded_at: new Date().toISOString() });
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const registered = stats?.rsvps.length ?? 0;
  const checkedIn = stats?.rsvps.filter((r) => r.checked_in_at).length ?? 0;
  const noShows = registered - checkedIn;
  const rate = registered > 0 ? Math.round((checkedIn / registered) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <BackButton />
      <h1 className="font-display text-4xl mt-4 mb-8">Outcomes — {stats?.event?.title}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Registered", value: registered },
          { label: "Checked in", value: checkedIn },
          { label: "No-shows", value: noShows },
          { label: "Attendance", value: `${rate}%` },
        ].map((s) => (
          <div key={s.label} className="border border-border rounded-lg p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="font-display text-3xl mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <h2 className="font-display text-xl mb-3">Post-event notes</h2>
      <Textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What went well, what to change next time…" />
      <Button onClick={save} className="mt-4">Save notes</Button>
    </div>
  );
}

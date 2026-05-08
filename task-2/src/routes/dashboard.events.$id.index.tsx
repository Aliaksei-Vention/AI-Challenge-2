import { BackButton } from "@/components/back-button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EventEditor } from "@/components/event-editor";

export const Route = createFileRoute("/dashboard/events/$id/")({
  component: EditEvent,
});

function EditEvent() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["event-edit", id],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").eq("id", id).single();
      return data;
    },
  });
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <BackButton label="← Back to dashboard" fallback="/dashboard" />
      <h1 className="font-display text-4xl mt-4 mb-8">Edit event</h1>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : data ? <EventEditor initial={data} /> : <p>Not found.</p>}
    </div>
  );
}

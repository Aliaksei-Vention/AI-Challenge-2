import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/check-in")({
  component: CheckInList,
});

function CheckInList() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const { data: events } = useQuery({
    queryKey: ["my-checker-events", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows } = await supabase.from("event_checkers").select("event_id").eq("user_id", user!.id);
      const ids = (rows ?? []).map((r) => r.event_id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("events").select("*").in("id", ids).order("starts_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-4xl mb-2">Check-in duties</h1>
      <p className="text-muted-foreground mb-8">Events you've been assigned to check in attendees.</p>
      {!events || events.length === 0 ? (
        <p className="text-muted-foreground">No assignments yet.</p>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.id} className="border border-border rounded-lg p-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-lg">{e.title}</h3>
                <p className="text-sm text-muted-foreground">{format(new Date(e.starts_at), "PPp")}</p>
              </div>
              <Link to="/dashboard/events/$id/check-in" params={{ id: e.id }}><Button size="sm">Open check-in</Button></Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

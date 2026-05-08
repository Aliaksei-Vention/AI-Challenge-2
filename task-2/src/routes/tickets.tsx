import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export const Route = createFileRoute("/tickets")({
  component: Tickets,
  head: () => ({ meta: [{ title: "My tickets — Gather" }] }),
});

function Tickets() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: rsvps } = useQuery({
    queryKey: ["my-tickets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("rsvps")
        .select("id, status, checked_in_at, promoted_at, events(id, slug, title, starts_at, ends_at, cover_url, venue_address, online_url, timezone)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (loading || !user) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  const now = new Date();
  const upcoming = (rsvps ?? []).filter((r: any) => r.events && new Date(r.events.ends_at) >= now);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <h1 className="font-display text-4xl mb-2">My tickets</h1>
      <p className="text-muted-foreground mb-8">Your upcoming passes — show the QR at the door.</p>
      {upcoming.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">No upcoming tickets.</p>
          <Link to="/events"><Button>Browse events</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.map((r: any) => (
            <div key={r.id} className="border border-border rounded-lg p-4 sm:p-5 flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded overflow-hidden shrink-0">
                {r.events.cover_url && <img src={r.events.cover_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1 mb-1">
                  {r.status === "waitlist" && <Badge variant="secondary">Waitlist</Badge>}
                  {r.status === "going" && r.promoted_at && <Badge>Promoted from waitlist</Badge>}
                  {r.checked_in_at && <Badge>Checked in</Badge>}
                </div>
                <h3 className="font-display text-lg truncate">{r.events.title}</h3>
                <p className="text-sm text-muted-foreground">{format(new Date(r.events.starts_at), "PPp")} ({r.events.timezone})</p>
                <p className="text-sm text-muted-foreground truncate">{r.events.online_url ? "Online" : r.events.venue_address || "TBA"}</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Link to="/pass/$rsvpId" params={{ rsvpId: r.id }}><Button size="sm">View pass</Button></Link>
                <Link to="/e/$slug" params={{ slug: r.events.slug }}><Button size="sm" variant="outline">Event</Button></Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

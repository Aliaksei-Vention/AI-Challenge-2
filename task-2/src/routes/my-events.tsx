import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export const Route = createFileRoute("/my-events")({
  component: MyEvents,
});

function MyEvents() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: rsvps } = useQuery({
    queryKey: ["my-rsvps", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("rsvps")
        .select("id, status, checked_in_at, events(id, slug, title, starts_at, ends_at, cover_url, venue_address, online_url, timezone)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: managing } = useQuery({
    queryKey: ["managing-events", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: hosted }, { data: checks }] = await Promise.all([
        supabase.from("events").select("*").eq("host_id", user!.id),
        supabase.from("event_checkers").select("event_id").eq("user_id", user!.id),
      ]);
      const checkerIds = (checks ?? []).map((c) => c.event_id).filter((id) => !(hosted ?? []).some((h: any) => h.id === id));
      let checkerEvents: any[] = [];
      if (checkerIds.length > 0) {
        const { data } = await supabase.from("events").select("*").in("id", checkerIds);
        checkerEvents = data ?? [];
      }
      return [
        ...(hosted ?? []).map((e: any) => ({ ...e, role: "host" as const })),
        ...checkerEvents.map((e) => ({ ...e, role: "checker" as const })),
      ].sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
    },
  });

  if (loading || !user) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  const now = new Date();
  const upcoming = (rsvps ?? []).filter((r: any) => r.events && new Date(r.events.ends_at) >= now);
  const past = (rsvps ?? []).filter((r: any) => r.events && new Date(r.events.ends_at) < now);

  const filteredManaging = (managing ?? []).filter((e) => {
    if (q && !e.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (from && new Date(e.starts_at) < new Date(from)) return false;
    if (to && new Date(e.starts_at) > new Date(to + "T23:59:59")) return false;
    return true;
  });

  const Section = ({ title, items }: { title: string; items: any[] }) => (
    <section className="mb-12">
      <h2 className="font-display text-2xl mb-4">{title}</h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nothing here yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className="border border-border rounded-lg p-5 flex items-center gap-4">
              <div className="w-20 h-20 bg-muted rounded overflow-hidden shrink-0">
                {r.events.cover_url && <img src={r.events.cover_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex gap-1 mb-1">
                  {r.status === "waitlist" && <Badge variant="secondary">Waitlist</Badge>}
                  {r.checked_in_at && <Badge>Checked in</Badge>}
                </div>
                <h3 className="font-display text-lg truncate">{r.events.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(r.events.starts_at), "PPp")} ({r.events.timezone})
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {r.events.online_url ? "Online" : r.events.venue_address || "TBA"}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link to="/e/$slug" params={{ slug: r.events.slug }}><Button size="sm" variant="outline">View</Button></Link>
                <Link to="/pass/$rsvpId" params={{ rsvpId: r.id }}><Button size="sm">Pass</Button></Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-4xl mb-8">My events</h1>
      <Tabs defaultValue="attending">
        <TabsList>
          <TabsTrigger value="attending">Attending</TabsTrigger>
          <TabsTrigger value="managing">Managing</TabsTrigger>
        </TabsList>
        <TabsContent value="attending" className="mt-8">
          <Section title="Upcoming" items={upcoming} />
          <Section title="Past" items={past} />
        </TabsContent>
        <TabsContent value="managing" className="mt-8">
          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            <Input placeholder="Search title…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {filteredManaging.length === 0 ? (
            <p className="text-muted-foreground text-sm">No events to manage.</p>
          ) : (
            <div className="space-y-3">
              {filteredManaging.map((e) => {
                const ended = new Date(e.ends_at) < new Date();
                return (
                  <div key={e.id} className="border border-border rounded-lg p-5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <Badge variant="outline" className="mb-1">{e.role}</Badge>
                      <h3 className="font-display text-lg truncate">{e.title}</h3>
                      <p className="text-sm text-muted-foreground">{format(new Date(e.starts_at), "PPp")}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <Link to="/e/$slug" params={{ slug: e.slug }}><Button size="sm" variant="outline">View</Button></Link>
                      <Link to="/dashboard/events/$id/check-in" params={{ id: e.id }}><Button size="sm" variant="outline">Check-in</Button></Link>
                      {e.role === "host" && (
                        <>
                          <Link to="/dashboard/events/$id" params={{ id: e.id }}><Button size="sm" variant="outline">Edit</Button></Link>
                          {ended && <Link to="/dashboard/events/$id/outcomes" params={{ id: e.id }}><Button size="sm" variant="outline">Outcomes</Button></Link>}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

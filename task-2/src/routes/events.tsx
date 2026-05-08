import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export const Route = createFileRoute("/events")({
  component: BrowseEvents,
  head: () => ({ meta: [{ title: "Browse events — Gather" }] }),
});

function BrowseEvents() {
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includePast, setIncludePast] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);

  const { data: events } = useQuery({
    queryKey: ["events-browse"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, slug, title, description, starts_at, ends_at, cover_url, venue_address, online_url")
        .eq("status", "published")
        .eq("visibility", "public")
        .order("starts_at", { ascending: true });
      return data ?? [];
    },
  });

  const now = new Date();
  const filtered = (events ?? []).filter((e) => {
    if (!includePast && new Date(e.ends_at) < now) return false;
    if (onlineOnly && !e.online_url) return false;
    if (q) {
      const ql = q.toLowerCase();
      const isOnline = !!e.online_url;
      const haystack = [
        e.title,
        e.description ?? "",
        e.venue_address ?? "",
        e.online_url ?? "",
        isOnline ? "online" : "",
      ].join(" ").toLowerCase();
      if (!haystack.includes(ql)) return false;
    }
    if (location && !onlineOnly) {
      const loc = location.toLowerCase();
      if (loc === "online") {
        if (!e.online_url) return false;
      } else if (!(e.venue_address ?? "").toLowerCase().includes(loc) && !(e.online_url ?? "").toLowerCase().includes(loc)) return false;
    }
    if (from && new Date(e.starts_at) < new Date(from)) return false;
    if (to && new Date(e.starts_at) > new Date(to + "T23:59:59")) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16">
      <h1 className="font-display text-3xl sm:text-5xl mb-3">Discover events</h1>
      <p className="text-muted-foreground mb-6 sm:mb-8">Public, community-run gatherings near and far.</p>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div><Label className="text-xs">Search</Label><Input placeholder="Name or topic…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div><Label className="text-xs">Location</Label><Input placeholder={onlineOnly ? "Disabled — online only" : "City"} value={onlineOnly ? "" : location} onChange={(e) => setLocation(e.target.value)} disabled={onlineOnly} /></div>
        <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      <div className="flex flex-wrap items-center gap-6 mb-10 text-sm">
        <label className="flex items-center gap-2">
          <Switch checked={includePast} onCheckedChange={setIncludePast} /> Include past events
        </label>
        <label className="flex items-center gap-2">
          <Switch checked={onlineOnly} onCheckedChange={setOnlineOnly} /> Online only
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">No events match.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
          {filtered.map((e) => {
            const ended = new Date(e.ends_at) < now;
            return (
              <Link key={e.id} to="/e/$slug" params={{ slug: e.slug }} className="group block">
                <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden mb-4 relative">
                  {e.cover_url
                    ? <img src={e.cover_url} alt={e.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/40" />}
                  {ended && <span className="absolute top-2 right-2 bg-background/90 text-xs uppercase tracking-wider px-2 py-1 rounded">Ended</span>}
                </div>
                <p className="text-xs uppercase tracking-wider text-primary mb-1">
                  {format(new Date(e.starts_at), "EEE, MMM d · p")}
                </p>
                <h3 className="font-display text-xl font-semibold group-hover:text-primary transition-colors">{e.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{e.venue_address || e.online_url || "TBA"}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

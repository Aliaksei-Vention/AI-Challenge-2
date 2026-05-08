import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Gather — host community events end to end" },
      { name: "description", content: "Publish an event page, collect RSVPs, hand out digital passes and check people in at the door." },
    ],
  }),
});

function Home() {
  const { data: events } = useQuery({
    queryKey: ["featured-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, slug, title, starts_at, cover_url, venue_address, online_url")
        .eq("status", "published")
        .eq("visibility", "public")
        .gte("ends_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(6);
      return data ?? [];
    },
  });

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-12 sm:pt-20 pb-16 sm:pb-24">
        <div className="max-w-3xl">
          <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-primary mb-4 sm:mb-6">Free · For organizers · By community</p>
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl leading-[1.05] font-semibold tracking-tight">
            Run beautiful events,<br />
            <span className="italic text-primary">end to end</span>.
          </h1>
          <p className="mt-6 sm:mt-8 text-base sm:text-lg text-muted-foreground max-w-xl">
            Publish a page in minutes. Share the link. Watch RSVPs roll in. Hand out digital passes and scan people in at the door — all in one calm place.
          </p>
          <div className="mt-8 sm:mt-10 flex flex-wrap gap-3">
            <Link to="/become-a-host"><Button size="lg" className="rounded-full px-7">Start hosting</Button></Link>
            <Link to="/events"><Button size="lg" variant="outline" className="rounded-full px-7">Browse events</Button></Link>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="border-t border-border/60 bg-card/40">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:py-20">
          <div className="flex items-end justify-between mb-6 sm:mb-10">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl">Happening soon</h2>
            <Link to="/events" className="text-sm underline underline-offset-4">See all</Link>
          </div>
          {events && events.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((e) => (
                <Link key={e.id} to="/e/$slug" params={{ slug: e.slug }} className="group block">
                  <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden mb-4">
                    {e.cover_url ? (
                      <img src={e.cover_url} alt={e.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/40" />
                    )}
                  </div>
                  <p className="text-xs uppercase tracking-wider text-primary mb-1">
                    {format(new Date(e.starts_at), "EEE, MMM d · p")}
                  </p>
                  <h3 className="font-display text-xl font-semibold group-hover:text-primary transition-colors">{e.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{e.venue_address || e.online_url || "TBA"}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No upcoming events yet — be the first to host one.</p>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24 text-center">
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl">Your community deserves a homepage.</h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Open a host profile in under a minute. It's free.</p>
        <Link to="/become-a-host" className="inline-block mt-8">
          <Button size="lg" className="rounded-full px-8">Become a host</Button>
        </Link>
      </section>
    </div>
  );
}

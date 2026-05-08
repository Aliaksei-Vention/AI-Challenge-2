import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export const Route = createFileRoute("/h/$slug")({
  component: HostPage,
  loader: async ({ params }) => {
    const { data } = await supabase.from("hosts").select("name, bio, logo_url").eq("slug", params.slug).maybeSingle();
    return { host: data };
  },
  head: ({ loaderData }) => {
    const h = loaderData?.host;
    if (!h) return { meta: [{ title: "Host — Gather" }] };
    const desc = (h.bio ?? `Events hosted by ${h.name}.`).slice(0, 160);
    return {
      meta: [
        { title: `${h.name} — Gather` },
        { name: "description", content: desc },
        { property: "og:title", content: h.name },
        { property: "og:description", content: desc },
        ...(h.logo_url ? [
          { property: "og:image", content: h.logo_url },
          { name: "twitter:image", content: h.logo_url },
        ] : []),
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
});

function HostPage() {
  const { slug } = Route.useParams();
  const { data: host } = useQuery({
    queryKey: ["host-public", slug],
    queryFn: async () => {
      const { data } = await supabase.from("hosts").select("*").eq("slug", slug).maybeSingle();
      return data;
    },
  });
  const { data: events } = useQuery({
    queryKey: ["host-events-public", host?.id],
    enabled: !!host,
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").eq("host_id", host!.id).eq("status", "published").eq("visibility", "public").order("starts_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!host) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex items-start gap-6 mb-12">
        {host.logo_url && <img src={host.logo_url} alt="" className="w-24 h-24 rounded-full object-cover" />}
        <div>
          <h1 className="font-display text-4xl">{host.name}</h1>
          {host.bio && <p className="text-muted-foreground mt-3 max-w-prose">{host.bio}</p>}
          <a href={`mailto:${host.contact_email}`} className="text-sm text-primary mt-3 inline-block">{host.contact_email}</a>
        </div>
      </div>
      <h2 className="font-display text-2xl mb-6">Events</h2>
      {!events || events.length === 0 ? (
        <p className="text-muted-foreground">No published events yet.</p>
      ) : (
        <div className="space-y-4">
          {events.map((e) => (
            <Link key={e.id} to="/e/$slug" params={{ slug: e.slug }} className="flex gap-4 p-4 border border-border rounded-lg hover:border-primary transition-colors">
              <div className="w-24 h-24 bg-muted rounded shrink-0 overflow-hidden">
                {e.cover_url && <img src={e.cover_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-primary">{format(new Date(e.starts_at), "EEE, MMM d · p")}</p>
                <h3 className="font-display text-xl mt-1">{e.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{e.venue_address || e.online_url}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Plus, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";

export const Route = createFileRoute("/dashboard/")({
  component: Dashboard,
});

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: host } = useQuery({
    queryKey: ["host", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("hosts").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (host === null) navigate({ to: "/become-a-host" });
  }, [host, navigate]);

  const { data: events, refetch } = useQuery({
    queryKey: ["host-events", user?.id],
    enabled: !!host,
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*, rsvps(status, checked_in_at)")
        .eq("host_id", user!.id)
        .order("starts_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: openReports } = useQuery({
    queryKey: ["open-reports", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open");
      return count ?? 0;
    },
  });

  const duplicate = async (id: string) => {
    const ev = events?.find((e) => e.id === id) as any;
    if (!ev) return;
    const { id: _i, slug: _s, created_at: _c, rsvps: _r, ...rest } = ev;
    const newSlug = `${ev.slug}-copy-${Math.random().toString(36).slice(2, 6)}`;
    await supabase.from("events").insert({ ...rest, slug: newSlug, status: "draft", title: ev.title + " (copy)" });
    refetch();
  };

  const togglePublish = async (id: string, status: string) => {
    await supabase.from("events").update({ status: status === "published" ? "draft" : "published" }).eq("id", id);
    refetch();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this draft event? This cannot be undone.")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refetch(); }
  };

  const exportCsv = async (eventId: string, title: string) => {
    const { data: rows } = await supabase
      .from("rsvps")
      .select("status, checked_in_at, user_id")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
    const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, email").in("id", userIds);
    const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const csvRows = (rows ?? []).map((r) => {
      const p = profMap.get(r.user_id) as any;
      return [p?.display_name ?? "", p?.email ?? "", r.status, r.checked_in_at ? new Date(r.checked_in_at).toISOString() : ""];
    });
    downloadCsv(`${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-attendees.csv`, ["Name", "Email", "RSVP status", "Check-in time"], csvRows);
  };

  if (loading || !host) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
        <div>
          <p className="text-xs uppercase tracking-wider text-primary mb-2">Hosting as</p>
          <h1 className="font-display text-3xl sm:text-4xl">{host.name}</h1>
          <Link to="/h/$slug" params={{ slug: host.slug }} className="text-sm text-muted-foreground underline underline-offset-4">View public page</Link>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/dashboard/reports"><Button variant="outline">Reports{openReports ? ` (${openReports})` : ""}</Button></Link>
          <Link to="/dashboard/events/new"><Button><Plus className="w-4 h-4 mr-2" />New event</Button></Link>
        </div>
      </div>

      <h2 className="font-display text-2xl mb-4">Your events</h2>
      {!events || events.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">No events yet.</p>
          <Link to="/dashboard/events/new"><Button>Create your first event</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e: any) => {
            const rs = (e.rsvps ?? []) as { status: string; checked_in_at: string | null }[];
            const going = rs.filter((r) => r.status === "going").length;
            const wait = rs.filter((r) => r.status === "waitlist").length;
            const checked = rs.filter((r) => r.checked_in_at).length;
            return (
            <div key={e.id} className="border border-border rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex gap-4 sm:contents">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded overflow-hidden shrink-0">
                  {e.cover_url && <img src={e.cover_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant={e.status === "published" ? "default" : "secondary"}>{e.status}</Badge>
                    <Badge variant="outline">{e.visibility}</Badge>
                  </div>
                  <h3 className="font-display text-lg truncate">{e.title}</h3>
                  <p className="text-sm text-muted-foreground">{format(new Date(e.starts_at), "PPp")}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Going: <strong>{going}</strong>{e.capacity ? `/${e.capacity}` : ""} · Waitlist: <strong>{wait}</strong> · Checked-in: <strong>{checked}</strong>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Link to="/e/$slug" params={{ slug: e.slug }}><Button size="sm" variant="outline">View</Button></Link>
                <Link to="/dashboard/events/$id" params={{ id: e.id }}><Button size="sm" variant="outline">Edit</Button></Link>
                <Link to="/dashboard/events/$id/check-in" params={{ id: e.id }}><Button size="sm" variant="outline">Check-in</Button></Link>
                <Link to="/dashboard/events/$id/checkers" params={{ id: e.id }}><Button size="sm" variant="outline">Checkers</Button></Link>
                <Link to="/dashboard/events/$id/gallery" params={{ id: e.id }}><Button size="sm" variant="outline">Gallery</Button></Link>
                <Button size="sm" variant="outline" onClick={() => exportCsv(e.id, e.title)}><Download className="w-3 h-3 mr-1" />CSV</Button>
                {new Date(e.ends_at) < new Date() ? (
                  <Link to="/dashboard/events/$id/outcomes" params={{ id: e.id }}><Button size="sm" variant="outline">Outcomes</Button></Link>
                ) : (
                  <Button size="sm" variant="outline" disabled title="Available after the event ends">Outcomes</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => togglePublish(e.id, e.status)}>
                  {e.status === "published" ? "Unpublish" : "Publish"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => duplicate(e.id)}>Duplicate</Button>
                {e.status === "draft" && (
                  <Button size="sm" variant="ghost" onClick={() => remove(e.id)}>Delete</Button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { BackButton } from "@/components/back-button";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/reports")({
  component: Reports,
});

function Reports() {
  const { data: reports, refetch } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data: rs } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      const reports = rs ?? [];
      const eventIds = Array.from(new Set(reports.map((r) => r.event_id).filter(Boolean)));
      const photoIds = Array.from(new Set(reports.filter((r) => r.target_type === "photo").map((r) => r.target_id)));
      let titles: Record<string, string> = {};
      let photoUrls: Record<string, string> = {};
      if (eventIds.length) {
        const { data: evs } = await supabase.from("events").select("id, title").in("id", eventIds);
        titles = Object.fromEntries((evs ?? []).map((e) => [e.id, e.title]));
      }
      if (photoIds.length) {
        const { data: ph } = await supabase.from("event_photos").select("id, storage_path").in("id", photoIds);
        photoUrls = Object.fromEntries((ph ?? []).map((p) => [p.id, supabase.storage.from("event-photos").getPublicUrl(p.storage_path).data.publicUrl]));
      }
      return reports.map((r) => ({ ...r, eventTitle: titles[r.event_id], photoUrl: photoUrls[r.target_id] }));
    },
  });

  const dismiss = async (id: string) => {
    await supabase.from("reports").update({ status: "dismissed" }).eq("id", id);
    refetch();
  };

  const hide = async (r: any) => {
    if (r.target_type === "event") {
      await supabase.from("events").update({ status: "draft" }).eq("id", r.target_id);
    } else if (r.target_type === "photo") {
      await supabase.from("event_photos").update({ status: "hidden" }).eq("id", r.target_id);
    }
    await supabase.from("reports").update({ status: "hidden" }).eq("id", r.id);
    toast.success("Hidden from public view");
    refetch();
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <BackButton />
      <h1 className="font-display text-4xl mt-4 mb-8">Reports queue</h1>
      {!reports || reports.length === 0 ? (
        <p className="text-muted-foreground">No reports.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r: any) => (
            <div key={r.id} className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{r.target_type}</Badge>
                <Badge variant={r.status === "open" ? "destructive" : "secondary"}>{r.status}</Badge>
                <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "PPp")}</span>
              </div>
              <p className="text-sm mb-1"><strong>Event:</strong> {r.eventTitle ?? r.event_id}</p>
              {r.target_type === "photo" && r.photoUrl && (
                <a href={r.photoUrl} target="_blank" rel="noreferrer" className="block mt-2 mb-3 w-40 aspect-square rounded-lg overflow-hidden bg-muted border border-border">
                  <img src={r.photoUrl} alt="Reported photo" className="w-full h-full object-cover" />
                </a>
              )}
              {r.reason && <p className="text-sm text-muted-foreground mb-3">"{r.reason}"</p>}
              {r.status === "open" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => hide(r)}>Hide</Button>
                  <Button size="sm" variant="ghost" onClick={() => dismiss(r.id)}>Dismiss</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

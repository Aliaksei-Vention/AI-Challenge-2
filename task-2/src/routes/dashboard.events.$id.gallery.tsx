import { BackButton } from "@/components/back-button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/events/$id/gallery")({
  component: GalleryModeration,
});

function GalleryModeration() {
  const { id } = Route.useParams();
  const { data: photos, refetch } = useQuery({
    queryKey: ["gallery-mod", id],
    queryFn: async () => {
      const { data } = await supabase.from("event_photos").select("*").eq("event_id", id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const setStatus = async (photoId: string, status: "approved" | "hidden" | "pending") => {
    const { error } = await supabase.from("event_photos").update({ status }).eq("id", photoId);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); refetch(); }
  };

  const remove = async (photoId: string, path: string) => {
    if (!confirm("Delete this photo?")) return;
    await supabase.storage.from("event-photos").remove([path]);
    await supabase.from("event_photos").delete().eq("id", photoId);
    refetch();
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <BackButton />
      <h1 className="font-display text-4xl mt-4 mb-8">Gallery moderation</h1>
      {!photos || photos.length === 0 ? (
        <p className="text-muted-foreground">No photo submissions yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((p) => {
            const url = supabase.storage.from("event-photos").getPublicUrl(p.storage_path).data.publicUrl;
            return (
              <div key={p.id} className="border border-border rounded-lg overflow-hidden">
                <div className="aspect-square bg-muted">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="p-3 space-y-2">
                  <Badge variant={p.status === "approved" ? "default" : p.status === "hidden" ? "destructive" : "secondary"}>{p.status}</Badge>
                  <div className="flex gap-1 flex-wrap">
                    {p.status !== "approved" && <Button size="sm" onClick={() => setStatus(p.id, "approved")}>Approve</Button>}
                    {p.status !== "hidden" && <Button size="sm" variant="outline" onClick={() => setStatus(p.id, "hidden")}>Hide</Button>}
                    <Button size="sm" variant="ghost" onClick={() => remove(p.id, p.storage_path)}>Delete</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

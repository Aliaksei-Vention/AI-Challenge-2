import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "sonner";
import { MapPin, Globe, Calendar, Users, Flag, Star, Upload } from "lucide-react";

export const Route = createFileRoute("/e/$slug")({
  component: EventPage,
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("events")
      .select("title, description, cover_url, slug")
      .eq("slug", params.slug)
      .eq("status", "published")
      .maybeSingle();
    return { event: data };
  },
  head: ({ loaderData }) => {
    const e = loaderData?.event;
    if (!e) return { meta: [{ title: "Event — Gather" }] };
    const desc = (e.description ?? "").slice(0, 160) || "Join this event on Gather.";
    return {
      meta: [
        { title: `${e.title} — Gather` },
        { name: "description", content: desc },
        { property: "og:title", content: e.title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "event" },
        ...(e.cover_url ? [
          { property: "og:image", content: e.cover_url },
          { name: "twitter:image", content: e.cover_url },
        ] : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: e.title },
        { name: "twitter:description", content: desc },
      ],
    };
  },
});

function EventPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const { data: event, refetch } = useQuery({
    queryKey: ["event", slug],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*, hosts(slug, name, logo_url)").eq("slug", slug).maybeSingle();
      return data;
    },
  });

  const { data: myRsvp, refetch: refetchRsvp } = useQuery({
    queryKey: ["rsvp", event?.id, user?.id],
    enabled: !!event && !!user,
    queryFn: async () => {
      const { data } = await supabase.from("rsvps").select("*").eq("event_id", event!.id).eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: counts, refetch: refetchCounts } = useQuery({
    queryKey: ["rsvp-counts", event?.id],
    enabled: !!event,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_event_rsvp_counts", { _event_id: event!.id });
      const row = Array.isArray(data) ? data[0] : data;
      return { going: row?.going ?? 0, waitlist: row?.waitlist ?? 0 };
    },
  });

  const { data: myFeedback, refetch: refetchFeedback } = useQuery({
    queryKey: ["my-feedback", event?.id, user?.id],
    enabled: !!event && !!user,
    queryFn: async () => {
      const { data } = await supabase.from("event_feedback").select("*").eq("event_id", event!.id).eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: photos, refetch: refetchPhotos } = useQuery({
    queryKey: ["photos", event?.id],
    enabled: !!event,
    queryFn: async () => {
      const { data } = await supabase.from("event_photos").select("*").eq("event_id", event!.id).eq("status", "approved").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: feedbacks } = useQuery({
    queryKey: ["feedbacks", event?.id],
    enabled: !!event,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_feedback")
        .select("id, rating, comment, created_at")
        .eq("event_id", event!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const rsvp = async () => {
    if (!user) {
      sessionStorage.setItem("pendingRsvp", JSON.stringify({ eventId: event!.id, slug }));
      return navigate({ to: "/auth" });
    }
    const { data, error } = await supabase.from("rsvps").insert({ event_id: event!.id, user_id: user.id }).select().single();
    if (error) toast.error(error.message);
    else {
      if (data.status === "waitlist") toast.success("You're on the waitlist");
      else toast.success("You're going!");
      refetchRsvp(); refetchCounts();
      navigate({ to: "/pass/$rsvpId", params: { rsvpId: data.id } });
    }
  };

  const cancel = async () => {
    if (!myRsvp) return;
    await supabase.from("rsvps").delete().eq("id", myRsvp.id);
    toast.success("RSVP cancelled");
    refetchRsvp();
    refetchCounts();
  };

  // Realtime + waitlist promotion notice
  useEffect(() => {
    if (!event?.id) return;
    const channel = supabase
      .channel(`rsvps-${event.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rsvps", filter: `event_id=eq.${event.id}` }, (payload: any) => {
        refetchCounts();
        refetchRsvp();
        if (
          payload.eventType === "UPDATE" &&
          payload.new?.user_id === user?.id &&
          payload.old?.status === "waitlist" &&
          payload.new?.status === "going"
        ) {
          toast.success("A seat opened — you're in!");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [event?.id, user?.id, refetchCounts, refetchRsvp]);

  const submitReport = async () => {
    if (!user) return navigate({ to: "/auth" });
    await supabase.from("reports").insert({
      target_type: "event", target_id: event!.id, event_id: event!.id,
      reporter_id: user.id, reason: reportReason,
    });
    setReportOpen(false); setReportReason("");
    toast.success("Reported. Thanks.");
  };

  const reportPhoto = async (photoId: string) => {
    if (!user) return navigate({ to: "/auth" });
    const reason = window.prompt("Reason for reporting this photo (optional):") ?? "";
    const { error } = await supabase.from("reports").insert({
      target_type: "photo", target_id: photoId, event_id: event!.id,
      reporter_id: user.id, reason,
    });
    if (error) toast.error(error.message);
    else toast.success("Reported. Thanks.");
  };

  const submitFeedback = async () => {
    if (!user || !feedbackRating) return;
    const { error } = await supabase.from("event_feedback").upsert({
      event_id: event!.id, user_id: user.id, rating: feedbackRating, comment: feedbackComment || null,
    }, { onConflict: "event_id,user_id" });
    if (error) toast.error(error.message);
    else { toast.success("Thanks for the feedback"); refetchFeedback(); }
  };

  const uploadPhoto = async () => {
    if (!user || !photoFile) return;
    const path = `${user.id}/${event!.id}/${Date.now()}-${photoFile.name}`;
    const { error: upErr } = await supabase.storage.from("event-photos").upload(path, photoFile);
    if (upErr) return toast.error(upErr.message);
    const { error } = await supabase.from("event_photos").insert({
      event_id: event!.id, user_id: user.id, storage_path: path,
    });
    if (error) toast.error(error.message);
    else { toast.success("Submitted for host approval"); setPhotoFile(null); refetchPhotos(); }
  };

  if (!event) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  const ended = new Date(event.ends_at) < new Date();
  const full = event.capacity != null && (counts?.going ?? 0) >= event.capacity;
  const isAttendee = myRsvp?.status === "going";

  return (
    <article className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      {event.cover_url && (
        <div className="aspect-[16/9] rounded-xl overflow-hidden mb-10 bg-muted">
          <img src={event.cover_url} alt={event.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="outline">{event.visibility}</Badge>
        {event.status === "draft" && <Badge variant="secondary">Draft preview</Badge>}
        {ended && <Badge variant="secondary">Ended</Badge>}
      </div>
      <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-tight mb-6">{event.title}</h1>
      {event.hosts && (
        <Link to="/h/$slug" params={{ slug: (event.hosts as any).slug }} className="inline-flex items-center gap-3 mb-8 group">
          {(event.hosts as any).logo_url && <img src={(event.hosts as any).logo_url} className="w-10 h-10 rounded-full object-cover" alt="" />}
          <span className="text-sm">Hosted by <span className="font-medium group-hover:text-primary">{(event.hosts as any).name}</span></span>
        </Link>
      )}

      <div className="grid sm:grid-cols-2 gap-4 my-8">
        <div className="flex gap-3 p-4 border border-border rounded-lg">
          <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{format(new Date(event.starts_at), "EEEE, MMMM d, yyyy")}</p>
            <p className="text-sm text-muted-foreground">{format(new Date(event.starts_at), "p")} – {format(new Date(event.ends_at), "p")} ({event.timezone})</p>
          </div>
        </div>
        <div className="flex gap-3 p-4 border border-border rounded-lg">
          {event.online_url ? <Globe className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />}
          <div className="min-w-0">
            <p className="font-medium">{event.online_url ? "Online" : "In person"}</p>
            <p className="text-sm text-muted-foreground truncate">{event.online_url || event.venue_address || "TBA"}</p>
          </div>
        </div>
      </div>

      {event.description && <div className="prose prose-stone max-w-none whitespace-pre-wrap text-foreground/90 mb-10">{event.description}</div>}

      <div className="border-t border-border pt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" /> {counts?.going ?? 0} going{event.capacity ? ` · ${event.capacity} max` : ""}
          {(counts?.waitlist ?? 0) > 0 && <span> · {counts!.waitlist} on waitlist</span>}
        </div>
        <div className="flex gap-2">
          <Dialog open={reportOpen} onOpenChange={setReportOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm"><Flag className="w-4 h-4 mr-1" />Report</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Report this event</DialogTitle></DialogHeader>
              <Textarea placeholder="Reason (optional)" value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
              <DialogFooter><Button onClick={submitReport}>Submit report</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          {ended ? (
            <p className="text-sm font-medium text-muted-foreground">Registration closed — this event has ended.</p>
          ) : myRsvp ? (
            <>
              <Link to="/pass/$rsvpId" params={{ rsvpId: myRsvp.id }}>
                <Button>{myRsvp.status === "waitlist" ? "View waitlist pass" : "View pass"}</Button>
              </Link>
              <Button variant="outline" onClick={cancel}>Cancel RSVP</Button>
            </>
          ) : (
            <Button size="lg" onClick={rsvp}>{full ? "Join waitlist" : "RSVP — I'm going"}</Button>
          )}
        </div>
      </div>

      {/* Post-event feedback */}
      {ended && isAttendee && (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="font-display text-2xl mb-4">Your feedback</h2>
          {myFeedback ? (
            <p className="text-sm text-muted-foreground">You rated this event {myFeedback.rating}/5. Thanks!</p>
          ) : (
            <div className="space-y-3 max-w-md">
              <div className="flex gap-1">
                {[1,2,3,4,5].map((n) => (
                  <button key={n} onClick={() => setFeedbackRating(n)} aria-label={`${n} stars`}>
                    <Star className={`w-7 h-7 ${n <= feedbackRating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
              <Textarea placeholder="Optional comment…" value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} />
              <Button onClick={submitFeedback} disabled={!feedbackRating}>Submit feedback</Button>
            </div>
          )}
        </section>
      )}

      {/* Gallery */}
      {(ended || (photos && photos.length > 0)) && (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="font-display text-2xl mb-4">Photo gallery</h2>
          {ended && isAttendee && (
            <div className="flex items-center gap-2 mb-6">
              <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} className="max-w-xs" />
              <Button onClick={uploadPhoto} disabled={!photoFile}><Upload className="w-4 h-4 mr-1" />Upload</Button>
            </div>
          )}
          {photos && photos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map((p) => {
                const url = supabase.storage.from("event-photos").getPublicUrl(p.storage_path).data.publicUrl;
                return (
                  <div key={p.id} className="aspect-square rounded-lg overflow-hidden bg-muted relative group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => reportPhoto(p.id)}
                      className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Report photo"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No photos yet.</p>
          )}
        </section>
      )}

      {/* Attendee feedback */}
      {ended && feedbacks && feedbacks.length > 0 && (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="font-display text-2xl mb-4">Attendee feedback</h2>
          <div className="space-y-4">
            {feedbacks.map((f) => (
              <div key={f.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-1 mb-2">
                  {[1,2,3,4,5].map((n) => (
                    <Star key={n} className={`w-4 h-4 ${n <= f.rating ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-2">{format(new Date(f.created_at), "PP")}</span>
                </div>
                {f.comment && <p className="text-sm text-foreground/90 whitespace-pre-wrap">{f.comment}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

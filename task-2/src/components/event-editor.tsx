import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { slugify, randomSuffix } from "@/lib/slug";

const TITLE_MAX = 120;
const DESC_MAX = 5000;

type EventForm = {
  id?: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  venue_address: string;
  online_url: string;
  capacity: string;
  cover_url: string;
  visibility: "public" | "unlisted";
  status: "draft" | "published";
  is_paid: boolean;
};

const empty: EventForm = {
  title: "", description: "", starts_at: "", ends_at: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  venue_address: "", online_url: "", capacity: "", cover_url: "",
  visibility: "public", status: "draft", is_paid: false,
};

// datetime-local value in a given IANA timezone for "now"
function nowInTz(tz: string) {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  } catch {
    return new Date().toISOString().slice(0, 16);
  }
}

// Convert a "wall time" string in given tz to a UTC Date
function zonedToUtc(local: string, tz: string): Date {
  const [date, time] = local.split("T");
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  // Iteratively find UTC ms whose representation in tz equals local
  let utc = Date.UTC(y, mo - 1, d, h, mi);
  for (let i = 0; i < 3; i++) {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(new Date(utc)).map((p) => [p.type, p.value]));
    const seenLocal = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
    const wantLocal = Date.UTC(y, mo - 1, d, h, mi);
    const diff = wantLocal - seenLocal;
    if (diff === 0) break;
    utc += diff;
  }
  return new Date(utc);
}

export function EventEditor({ initial }: { initial?: any }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<EventForm>(empty);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        id: initial.id,
        title: initial.title ?? "",
        description: initial.description ?? "",
        starts_at: initial.starts_at?.slice(0, 16) ?? "",
        ends_at: initial.ends_at?.slice(0, 16) ?? "",
        timezone: initial.timezone ?? "UTC",
        venue_address: initial.venue_address ?? "",
        online_url: initial.online_url ?? "",
        capacity: initial.capacity?.toString() ?? "",
        cover_url: initial.cover_url ?? "",
        visibility: initial.visibility ?? "public",
        status: initial.status ?? "draft",
        is_paid: false,
      });
    }
  }, [initial]);

  const set = <K extends keyof EventForm>(k: K, v: EventForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const minDateTime = nowInTz(form.timezone);

  // unpublish=true -> save as draft (only used when editing already-published event)
  const save = async (mode: "draft" | "publish" | "unpublish") => {
    if (!user) return;
    if (!form.title.trim() || !form.starts_at || !form.ends_at) {
      toast.error("Title and dates are required");
      return;
    }
    if (form.title.length > TITLE_MAX) return toast.error(`Title must be ≤ ${TITLE_MAX} chars`);
    if (form.description.length > DESC_MAX) return toast.error(`Description must be ≤ ${DESC_MAX} chars`);

    const startsUtc = zonedToUtc(form.starts_at, form.timezone);
    const endsUtc = zonedToUtc(form.ends_at, form.timezone);
    const now = new Date();
    if (!form.id && startsUtc < now) return toast.error("Start date can't be in the past");
    if (endsUtc <= startsUtc) return toast.error("End must be after start");

    let capacityNum: number | null = null;
    if (form.capacity !== "") {
      const n = parseInt(form.capacity);
      if (!Number.isFinite(n) || n <= 0) return toast.error("Capacity must be a positive number");
      capacityNum = n;
    }

    setBusy(true);
    try {
      let cover_url = form.cover_url;
      if (coverFile) {
        const path = `${user.id}/${Date.now()}-${coverFile.name}`;
        const { error: upErr } = await supabase.storage.from("event-covers").upload(path, coverFile);
        if (upErr) throw upErr;
        cover_url = supabase.storage.from("event-covers").getPublicUrl(path).data.publicUrl;
      }
      const nextStatus: "draft" | "published" =
        mode === "publish" ? "published" : mode === "unpublish" ? "draft" : form.status;
      const payload = {
        host_id: user.id,
        title: form.title.trim(),
        description: form.description,
        starts_at: startsUtc.toISOString(),
        ends_at: endsUtc.toISOString(),
        timezone: form.timezone,
        venue_address: form.venue_address || null,
        online_url: form.online_url || null,
        capacity: capacityNum,
        cover_url: cover_url || null,
        visibility: form.visibility,
        status: nextStatus,
        is_paid: false,
      };
      if (form.id) {
        const { error } = await supabase.from("events").update(payload).eq("id", form.id);
        if (error) throw error;
        toast.success(mode === "unpublish" ? "Unpublished" : "Saved");
        if (mode === "unpublish") set("status", "draft");
        if (mode === "publish") set("status", "published");
      } else {
        const slug = `${slugify(form.title)}-${randomSuffix()}`;
        const { data, error } = await supabase.from("events").insert({ ...payload, slug }).select("id").single();
        if (error) throw error;
        toast.success("Created");
        navigate({ to: "/dashboard/events/$id", params: { id: data.id } });
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally { setBusy(false); }
  };

  const isEditingPublished = !!form.id && form.status === "published";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Label>Title *</Label>
        <Input maxLength={TITLE_MAX} value={form.title} onChange={(e) => set("title", e.target.value)} />
        <p className="text-xs text-muted-foreground mt-1">{form.title.length}/{TITLE_MAX}</p>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea rows={6} maxLength={DESC_MAX} value={form.description} onChange={(e) => set("description", e.target.value)} />
        <p className="text-xs text-muted-foreground mt-1">{form.description.length}/{DESC_MAX}</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><Label>Starts *</Label><Input type="datetime-local" min={minDateTime} value={form.starts_at} onChange={(e) => {
          const v = e.target.value;
          setForm((f) => ({ ...f, starts_at: v, ends_at: f.ends_at && f.ends_at < v ? v : f.ends_at }));
        }} /></div>
        <div><Label>Ends *</Label><Input type="datetime-local" min={form.starts_at || minDateTime} value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} /></div>
      </div>
      <div><Label>Time zone</Label><Input value={form.timezone} onChange={(e) => set("timezone", e.target.value)} /></div>
      <div><Label>Venue address</Label><Input value={form.venue_address} onChange={(e) => set("venue_address", e.target.value)} placeholder="123 Main St, Brooklyn" /></div>
      <div><Label>Online URL</Label><Input value={form.online_url} onChange={(e) => set("online_url", e.target.value)} placeholder="https://meet…" /></div>
      <div><Label>Capacity</Label><Input type="number" min={1} step={1} value={form.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="leave empty for unlimited" /></div>
      <div>
        <Label>Cover image</Label>
        <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
        {form.cover_url && !coverFile && <img src={form.cover_url} alt="" className="mt-3 max-h-40 rounded" />}
      </div>
      <div>
        <Label>Visibility</Label>
        <RadioGroup value={form.visibility} onValueChange={(v) => set("visibility", v as any)} className="mt-2">
          <label className="flex items-center gap-2"><RadioGroupItem value="public" /> Public — discoverable in browse</label>
          <label className="flex items-center gap-2"><RadioGroupItem value="unlisted" /> Unlisted — link only</label>
        </RadioGroup>
      </div>
      <div className="border border-border rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="font-medium">Paid event</p>
          <p className="text-sm text-muted-foreground">Paid tickets coming soon.</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div><Switch checked={form.is_paid} disabled /></div>
            </TooltipTrigger>
            <TooltipContent>Coming soon</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex gap-3 pt-4">
        {isEditingPublished ? (
          <>
            <Button onClick={() => save("unpublish")} disabled={busy} variant="outline">Save & Unpublish</Button>
            <Button onClick={() => save("publish")} disabled={busy}>Save</Button>
          </>
        ) : (
          <>
            <Button onClick={() => save("draft")} disabled={busy} variant="outline">Save draft</Button>
            <Button onClick={() => save("publish")} disabled={busy}>Publish</Button>
          </>
        )}
      </div>
    </div>
  );
}

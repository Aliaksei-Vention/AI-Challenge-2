import { BackButton } from "@/components/back-button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Camera, CameraOff } from "lucide-react";

export const Route = createFileRoute("/dashboard/events/$id/check-in")({
  component: CheckIn,
});

function CheckIn() {
  const { id } = Route.useParams();
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lastCheckedId, setLastCheckedId] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const lastCodeRef = useRef<{ code: string; t: number }>({ code: "", t: 0 });

  const { data: rsvps, refetch } = useQuery({
    queryKey: ["rsvps", id],
    queryFn: async () => {
      const { data } = await supabase.from("rsvps").select("*").eq("event_id", id).order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const handleCode = async (raw: string) => {
    const codeVal = raw.trim();
    if (!codeVal) return;
    // debounce duplicate scans
    const now = Date.now();
    if (lastCodeRef.current.code === codeVal && now - lastCodeRef.current.t < 3000) return;
    lastCodeRef.current = { code: codeVal, t: now };

    const target = (rsvps ?? []).find((r) => r.code === codeVal);
    if (!target) return toast.error("Code not found for this event");
    if (target.checked_in_at) return toast.info("Already checked in");
    const { error } = await supabase
      .from("rsvps")
      .update({ checked_in_at: new Date().toISOString() })
      .eq("id", target.id)
      .eq("code", target.code);
    if (error) toast.error(error.message);
    else { toast.success("Checked in ✓"); setLastCheckedId(target.id); refetch(); }
  };

  const checkIn = async (rsvpId: string, codeVal: string) => {
    const { data, error } = await supabase
      .from("rsvps")
      .update({ checked_in_at: new Date().toISOString() })
      .eq("id", rsvpId)
      .eq("code", codeVal)
      .select()
      .single();
    if (error || !data) toast.error("Invalid code");
    else { toast.success("Checked in"); setLastCheckedId(rsvpId); refetch(); }
  };

  const undoLast = async () => {
    if (!lastCheckedId) return;
    const { error } = await supabase.from("rsvps").update({ checked_in_at: null }).eq("id", lastCheckedId);
    if (error) toast.error(error.message);
    else { toast.success("Undone"); setLastCheckedId(null); refetch(); }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleCode(code);
    setCode("");
  };

  // QR scanner lifecycle
  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const inst = new Html5Qrcode("qr-reader");
      scannerRef.current = inst;
      try {
        await inst.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => { handleCode(decoded); },
          () => {}
        );
      } catch (err: any) {
        toast.error(err?.message ?? "Camera unavailable");
        setScanning(false);
      }
    })();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        s.stop().catch(() => {}).finally(() => s.clear?.());
        scannerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const total = rsvps?.length ?? 0;
  const checked = rsvps?.filter((r) => r.checked_in_at).length ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <BackButton />
      <h1 className="font-display text-4xl mt-4 mb-2">Check-in</h1>
      <p className="text-muted-foreground mb-8">{checked} of {total} attendees checked in</p>

      <div className="mb-6">
        <Button variant={scanning ? "outline" : "default"} onClick={() => setScanning((s) => !s)}>
          {scanning ? <><CameraOff className="w-4 h-4 mr-2" />Stop scanning</> : <><Camera className="w-4 h-4 mr-2" />Scan QR code</>}
        </Button>
        {scanning && (
          <div className="mt-4 max-w-sm">
            <div id="qr-reader" className="rounded-lg overflow-hidden border border-border" />
            <p className="text-xs text-muted-foreground mt-2">Point camera at attendee's pass QR.</p>
          </div>
        )}
      </div>

      <form onSubmit={submitCode} className="flex gap-2 mb-3">
        <Input placeholder="Or enter pass code manually" value={code} onChange={(e) => setCode(e.target.value)} />
        <Button type="submit">Check in</Button>
      </form>
      {lastCheckedId && (
        <Button variant="ghost" size="sm" onClick={undoLast} className="mb-6">↶ Undo last check-in</Button>
      )}

      <div className="border border-border rounded-lg divide-y divide-border">
        {rsvps?.map((r) => (
          <div key={r.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-mono text-sm">{r.code}</p>
              <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
            </div>
            {r.checked_in_at ? (
              <span className="text-sm text-primary">✓ Checked in</span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => checkIn(r.id, r.code)}>Mark in</Button>
            )}
          </div>
        ))}
        {(!rsvps || rsvps.length === 0) && <p className="p-6 text-muted-foreground text-center">No RSVPs yet.</p>}
      </div>
    </div>
  );
}

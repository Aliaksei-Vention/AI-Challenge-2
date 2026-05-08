import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarPlus } from "lucide-react";
import { googleCalendarUrl, outlookCalendarUrl, yahooCalendarUrl } from "@/lib/calendar-links";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/pass/$rsvpId")({
  component: Pass,
});

function Pass() {
  const { rsvpId } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["pass", rsvpId],
    queryFn: async () => {
      const { data } = await supabase.from("rsvps").select("*, events(id, title, description, starts_at, ends_at, venue_address, online_url, timezone)").eq("id", rsvpId).maybeSingle();
      return data;
    },
  });

  if (!data) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;
  const ev = data.events as any;
  const isWaitlist = data.status === "waitlist";

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <Link to="/" className="text-sm text-muted-foreground">← Home</Link>
      <div className="mt-6 bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
        <div className="bg-primary text-primary-foreground px-6 py-4">
          <p className="text-xs uppercase tracking-[0.2em] opacity-80">{isWaitlist ? "Waitlist pass" : "Your pass"}</p>
          <h1 className="font-display text-2xl mt-1">{ev.title}</h1>
        </div>
        <div className="p-6 flex flex-col items-center">
          {isWaitlist ? (
            <div className="text-center py-6">
              <Badge variant="secondary" className="mb-3">On waitlist</Badge>
              <p className="text-sm text-muted-foreground">We'll let you know if a seat opens up.</p>
            </div>
          ) : (
            <>
              {data.promoted_at && (
                <Badge className="mb-3">Promoted from waitlist — you're in!</Badge>
              )}
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG value={data.code} size={200} />
              </div>
              <p className="font-mono text-sm mt-4 tracking-widest">{data.code}</p>
            </>
          )}
          {data.checked_in_at && (
            <p className="mt-3 text-primary font-medium">✓ Checked in {format(new Date(data.checked_in_at), "p")}</p>
          )}
        </div>
        <div className="border-t border-border px-6 py-4 text-sm space-y-1">
          <p>{format(new Date(ev.starts_at), "EEE, MMM d · p")} ({ev.timezone})</p>
          <p className="text-muted-foreground">{ev.venue_address || ev.online_url || "TBA"}</p>
        </div>
        <div className="border-t border-border px-6 py-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full">
                <CalendarPlus className="w-4 h-4 mr-2" />Add to Calendar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56">
              <DropdownMenuItem asChild>
                <a href={googleCalendarUrl(ev)} target="_blank" rel="noopener noreferrer">Google Calendar</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={outlookCalendarUrl(ev)} target="_blank" rel="noopener noreferrer">Outlook</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={yahooCalendarUrl(ev)} target="_blank" rel="noopener noreferrer">Yahoo Calendar</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {!isWaitlist && <p className="text-xs text-muted-foreground mt-6 text-center">Show this pass at the door for check-in.</p>}
    </div>
  );
}

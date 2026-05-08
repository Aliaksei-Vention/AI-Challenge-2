// Build calendar URLs for popular providers (no file download)
function pad(n: number) { return n.toString().padStart(2, "0"); }
function toCompactUtc(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export type CalendarEvent = {
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at: string;
  venue_address?: string | null;
  online_url?: string | null;
};

function location(ev: CalendarEvent) {
  return ev.venue_address || ev.online_url || "";
}

export function googleCalendarUrl(ev: CalendarEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${toCompactUtc(ev.starts_at)}/${toCompactUtc(ev.ends_at)}`,
    details: ev.description ?? "",
    location: location(ev),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(ev: CalendarEvent) {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: ev.title,
    body: ev.description ?? "",
    location: location(ev),
    startdt: new Date(ev.starts_at).toISOString(),
    enddt: new Date(ev.ends_at).toISOString(),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function yahooCalendarUrl(ev: CalendarEvent) {
  const params = new URLSearchParams({
    v: "60",
    title: ev.title,
    st: toCompactUtc(ev.starts_at),
    et: toCompactUtc(ev.ends_at),
    desc: ev.description ?? "",
    in_loc: location(ev),
  });
  return `https://calendar.yahoo.com/?${params.toString()}`;
}

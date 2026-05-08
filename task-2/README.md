# Gather

Gather is a lightweight community events platform: hosts publish events, attendees RSVP and receive a ticket (QR pass), and check-in staff scan tickets at the door. The deployed app is at **https://gather-vention.lovable.app**.

This README is a usage guide for the four core flows.

---

## Test accounts (deployed app)

All passwords: `Password123!`

| Role          | Email                 | Use for                                  |
| ------------- | --------------------- | ---------------------------------------- |
| Host          | host@gather.test      | Create / publish events, manage RSVPs    |
| Check-in      | checker@gather.test   | Scan tickets at the door                 |
| Attendee A    | alice@gather.test     | RSVP, view ticket                        |
| Attendee B    | bob@gather.test       | RSVP, view ticket                        |
| Attendee C    | carol@gather.test     | RSVP, view ticket                        |

Seeded data:

- **Host:** Gather Collective — `/h/gather-collective`
- **Upcoming event:** Future of Community Meetup — `/e/future-of-community-meetup` (in 7 days, capacity 30, 3 RSVPs already going)
- **Past event:** Spring Book Night — `/e/spring-book-night` (2 weeks ago, 2 attendees checked in)

---

## 1. Publish an event (Host)

1. Sign in as `host@gather.test`.
2. Go to **Dashboard → Create event** (or `/dashboard/events/new`).
3. Fill in title, description, start/end time, venue (or online URL), and an optional capacity.
4. Save as draft to keep iterating, or set status to **Published** to make the page live.
5. The event is now reachable at `/e/<slug>` and listed under the host page `/h/<host-slug>` and on the public **Browse** page.
6. Optional: open the event in the dashboard to assign a check-in helper by email under **Checkers** — they will be granted scan access for that event only.

## 2. RSVP (Attendee)

1. Sign in as any attendee account (e.g. `alice@gather.test`).
2. Open the public event page, e.g. `/e/future-of-community-meetup`.
3. Click **RSVP**. The system automatically:
   - assigns **going** if there is room under the event capacity, or
   - puts you on the **waitlist** if the event is full.
4. If a "going" attendee later cancels, the next person on the waitlist is automatically promoted and gets an in-app toast notification (open in another tab to see it live).
5. To cancel, click **Cancel RSVP** on the same event page.

## 3. View your ticket (Attendee)

1. After a successful **going** RSVP, the event page shows a **View ticket** link.
2. Tickets are also listed under **Tickets** in the top nav (`/tickets`) — one card per upcoming event you're attending.
3. Each ticket page (`/pass/<rsvpId>`) shows:
   - event title, time, and venue
   - a **QR code** encoding the unique RSVP code
   - the human-readable code (fallback for manual entry)
   - **Add to calendar** buttons
4. Bring the QR on your phone to the door — that's the ticket.

## 4. Check-in (Door staff)

1. Sign in as `checker@gather.test` (or any user the host has added as a checker for that event).
2. Go to **Check-in** in the top nav (`/check-in`). Pick the event from the list.
3. Use the camera scanner to scan an attendee's QR code, **or** type the code manually.
4. The app shows the attendee's name and marks them as checked in (timestamp stored).
5. Already-checked-in tickets are flagged so the same QR can't be reused.
6. The host can review check-in stats from **Dashboard → event → Check-in / Outcomes**.

---

## Local development

```bash
bun install
bun run dev
```

The Supabase URL and publishable key are read from `.env` (auto-managed by Lovable Cloud — do not edit by hand). Server-only secrets live in the Cloud project.

# Project report

A short retrospective on building **Gather**, a community events app, on Lovable.

## Tools and techniques used

- **Lovable** as the AI-assisted IDE — most code (routes, components, RLS, migrations) was generated and iterated through chat.
- **TanStack Start v1** (React 19 + Vite 7) for the app framework, with file-based routing under `src/routes/` and `createServerFn` for typed RPC.
- **Lovable Cloud (Supabase)** for database, auth, storage, and RLS — no separate backend project to wire up.
- **Tailwind v4** + **shadcn/ui** (Radix primitives) for the design system; semantic tokens defined in `src/styles.css`.
- **TanStack Query** for client-side data fetching and cache invalidation, paired with Supabase Realtime for the waitlist promotion toast.
- **Zod** + Supabase Postgres triggers for input validation and capacity / waitlist enforcement on the server side.
- **Deployment** via Lovable Publish to `gather-vention.lovable.app`.

## What worked well

- **File-based routing** kept new pages cheap to add — each flow (`/e/$slug`, `/pass/$rsvpId`, `/check-in`, `/dashboard/...`) is one file with its loader and head metadata co-located.
- **RLS-first thinking.** Modeling who can read/write each table up front (host, attendee, checker, anon) caught several bugs before they shipped, and `has_role()` SECURITY DEFINER avoided recursive policy checks.
- **Database triggers for capacity / waitlist promotion.** Putting the `assign_rsvp_status`, `promote_waitlist`, and `event_capacity_changed` logic in Postgres meant the rules hold no matter which client inserts/deletes — much safer than enforcing it from the React layer.
- **Realtime subscription** on the `rsvps` table made the "you've been promoted from the waitlist" toast feel instant with very little code.
- **Iterating with seeded test data** (multiple attendee accounts + a full waitlist) made manual QA of the FIFO promotion order trivial.

## What did not work / had to be reworked

- **Public event counts hidden by RLS.** `SELECT count(*) FROM rsvps` on the public event page returned 0 for signed-out visitors because RLS hides rows they can't see. Fix: a `get_event_rsvp_counts(event_id)` SECURITY DEFINER RPC that returns just the aggregate counts and is granted to `anon`.
- **Promotion notification missed by the canceller's tab.** The first cut of the waitlist toast subscribed only on the event detail page; users who got promoted while elsewhere in the app didn't see anything. Pulled the subscription up into a global `<PromotionListener />` mounted in the root layout.
- **Sharing preview links from the Lovable sandbox.** `window.location.origin` returned the `*.lovableproject.com` URL that requires a Lovable login. Added `shareOrigin()` that swaps in the published URL when generating shareable links.
- **Initial confusion about `online` placeholder** in the events search — small UX nit, but a reminder that placeholder copy ships and matters.

## Notable decisions

- **Roles in a separate `user_roles` table**, never on `profiles` — avoids the classic "user updates own role to admin" privilege escalation. Checked via `has_role()` in policies.
- **Event slugs are user-visible URLs** (`/e/future-of-community-meetup`) rather than UUIDs, generated from title with a short random suffix to stay unique.
- **Tickets are RSVP rows, not a separate table.** The QR encodes the RSVP `code` column, which is generated server-side at insert. One source of truth for "is this person allowed in".
- **No email sending in v1.** All notifications are in-app toasts via Supabase Realtime — keeps the deploy story simple and avoids needing an SMTP secret. Email can be layered on later via a Cloud edge function.
- **Service role key is only used in seed scripts and trusted server functions**, never from the browser. The publishable anon key is safe in the client because RLS is the actual access boundary.
- **Past events are kept visible** (not auto-archived) so attendees and hosts can still leave / read feedback and view photos after the fact.

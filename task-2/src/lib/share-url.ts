// Returns a shareable origin for links sent to other people.
// In the Lovable editor preview, window.location.origin is a *.lovableproject.com
// sandbox URL that requires a Lovable account to view. Swap it for the
// published app URL so recipients land on our own /auth page.
const PUBLISHED_ORIGIN = "https://gather-vention.lovable.app";

export function shareOrigin(): string {
  if (typeof window === "undefined") return PUBLISHED_ORIGIN;
  const host = window.location.hostname;
  if (host.endsWith(".lovableproject.com") || host.endsWith(".lovable.dev")) {
    return PUBLISHED_ORIGIN;
  }
  return window.location.origin;
}

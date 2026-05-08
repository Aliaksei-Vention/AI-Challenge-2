import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      sessionStorage.setItem("pendingInvite", token);
      navigate({ to: "/auth" });
      return;
    }
    (async () => {
      const { data } = await supabase.rpc("invite_exists", { _token: token });
      setValid(!!data);
      setChecking(false);
    })();
  }, [user, loading, token, navigate]);

  const accept = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("accept_invite", { _token: token });
    setBusy(false);
    if (error) return toast.error(error.message);
    setDone(true);
    toast.success("Invite accepted");
    if (data) navigate({ to: "/check-in" });
  };

  if (loading || !user || checking) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  if (!valid) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-4xl mb-3">Invite not available</h1>
        <p className="text-muted-foreground mb-8">This invite link has been revoked or doesn't exist. Ask the host for a new one.</p>
        <Link to="/"><Button>Back home</Button></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      <h1 className="font-display text-4xl mb-3">You've been invited</h1>
      <p className="text-muted-foreground mb-8">Accept this invite to be added as a checker for the event.</p>
      {done ? (
        <Link to="/check-in"><Button>Go to check-in</Button></Link>
      ) : (
        <Button onClick={accept} disabled={busy} size="lg">{busy ? "Accepting…" : "Accept invite"}</Button>
      )}
    </div>
  );
}

import { BackButton } from "@/components/back-button";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const goNext = async () => {
    // 1. Pending RSVP intent — finalize and route to pass
    const pendingRaw = typeof window !== "undefined" ? sessionStorage.getItem("pendingRsvp") : null;
    if (pendingRaw) {
      try {
        const { eventId } = JSON.parse(pendingRaw);
        sessionStorage.removeItem("pendingRsvp");
        const { data: { user: u } } = await supabase.auth.getUser();
        if (u && eventId) {
          // try to insert; if already exists, fetch existing
          let rsvpId: string | undefined;
          const { data: ins, error } = await supabase
            .from("rsvps")
            .insert({ event_id: eventId, user_id: u.id })
            .select("id")
            .single();
          if (ins) rsvpId = ins.id;
          else if (error) {
            const { data: existing } = await supabase
              .from("rsvps").select("id").eq("event_id", eventId).eq("user_id", u.id).maybeSingle();
            if (existing) rsvpId = existing.id;
            else toast.error(error.message);
          }
          if (rsvpId) {
            toast.success("You're going!");
            return navigate({ to: "/pass/$rsvpId", params: { rsvpId } });
          }
        }
      } catch {/* fall through */}
    }
    // 2. Pending invite token — accept and route to event
    const inviteToken = typeof window !== "undefined" ? sessionStorage.getItem("pendingInvite") : null;
    if (inviteToken) {
      sessionStorage.removeItem("pendingInvite");
      return navigate({ to: "/invite/$token", params: { token: inviteToken } });
    }
    // 3. Generic redirect target
    const dest = typeof window !== "undefined" ? sessionStorage.getItem("redirectAfterAuth") : null;
    if (dest) {
      sessionStorage.removeItem("redirectAfterAuth");
      return navigate({ to: dest });
    }
    navigate({ to: "/" });
  };

  useEffect(() => {
    if (user) goNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    // Don't call goNext here — the useEffect on `user` will handle redirect
    // once the session updates. Calling it twice consumes pending tokens
    // and clobbers the destination on the second run.
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email to confirm your account.");
  };

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <BackButton />
      <h1 className="font-display text-4xl mt-6 mb-2">Welcome</h1>
      <p className="text-muted-foreground mb-8">Sign in to RSVP, host, and manage your events.</p>
      <Tabs defaultValue="signin">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Sign up</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <form onSubmit={signIn} className="space-y-4 mt-6">
            <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>Password</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <Button type="submit" disabled={loading} className="w-full">{loading ? "..." : "Sign in"}</Button>
          </form>
        </TabsContent>
        <TabsContent value="signup">
          <form onSubmit={signUp} className="space-y-4 mt-6">
            <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <Button type="submit" disabled={loading} className="w-full">{loading ? "..." : "Create account"}</Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

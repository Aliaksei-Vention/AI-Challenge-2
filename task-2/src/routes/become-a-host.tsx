import { BackButton } from "@/components/back-button";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { slugify, randomSuffix } from "@/lib/slug";

export const Route = createFileRoute("/become-a-host")({
  component: BecomeHost,
});

function BecomeHost() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
    if (user) {
      setContactEmail(user.email ?? "");
      supabase.from("hosts").select("slug").eq("id", user.id).maybeSingle().then(({ data }) => {
        if (data) {
          setExisting(true);
          navigate({ to: "/dashboard", replace: true });
        } else setExisting(false);
      });
    }
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      let logo_url: string | null = null;
      if (logoFile) {
        const path = `${user.id}/${Date.now()}-${logoFile.name}`;
        const { error: upErr } = await supabase.storage.from("host-logos").upload(path, logoFile);
        if (upErr) throw upErr;
        logo_url = supabase.storage.from("host-logos").getPublicUrl(path).data.publicUrl;
      }
      const slug = `${slugify(name)}-${randomSuffix()}`;
      const { error } = await supabase.from("hosts").insert({
        id: user.id, slug, name, bio, contact_email: contactEmail, logo_url,
      });
      if (error) throw error;
      await supabase.from("user_roles").insert({ user_id: user.id, role: "host" });
      toast.success("You're a host!");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message);
    } finally { setBusy(false); }
  };

  if (loading || existing === null) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <BackButton />
      <h1 className="font-display text-4xl mt-6 mb-2">Become a host</h1>
      <p className="text-muted-foreground mb-8">Create your public host profile. You can edit it later.</p>
      <form onSubmit={submit} className="space-y-5">
        <div><Label>Host name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brooklyn Book Club" /></div>
        <div><Label>Short bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What do you organize?" rows={4} /></div>
        <div><Label>Contact email</Label><Input type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
        <div><Label>Logo (optional)</Label><Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} /></div>
        <Button type="submit" disabled={busy} size="lg" className="w-full">{busy ? "Creating…" : "Create host profile"}</Button>
      </form>
    </div>
  );
}

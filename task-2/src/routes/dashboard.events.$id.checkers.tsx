import { BackButton } from "@/components/back-button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Link as LinkIcon } from "lucide-react";
import { shareOrigin } from "@/lib/share-url";

export const Route = createFileRoute("/dashboard/events/$id/checkers")({
  component: Checkers,
});

function Checkers() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [email, setEmail] = useState("");

  const { data: rows, refetch } = useQuery({
    queryKey: ["checkers", id],
    queryFn: async () => {
      const { data } = await supabase.from("event_checkers").select("*").eq("event_id", id);
      return data ?? [];
    },
  });

  const { data: invites, refetch: refetchInvites } = useQuery({
    queryKey: ["invites", id],
    queryFn: async () => {
      const { data } = await supabase.from("event_invites").select("*").eq("event_id", id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.rpc("assign_checker_by_email", { _event_id: id, _email: email.trim() });
    if (error) toast.error(error.message);
    else { toast.success("Checker assigned"); setEmail(""); refetch(); }
  };

  const remove = async (rowId: string) => {
    await supabase.from("event_checkers").delete().eq("id", rowId);
    refetch();
  };

  const createInvite = async (role: "checker" | "host" | "attendee" | "admin") => {
    if (!user) return;
    const { data, error } = await supabase.from("event_invites")
      .insert({ event_id: id, role, created_by: user.id })
      .select("token").single();
    if (error) return toast.error(error.message);
    refetchInvites();
    const link = `${shareOrigin()}/invite/${data.token}`;
    await navigator.clipboard.writeText(link).catch(() => {});
    toast.success("Invite link copied to clipboard");
  };

  const copyLink = async (token: string) => {
    const link = `${shareOrigin()}/invite/${token}`;
    await navigator.clipboard.writeText(link);
    toast.success("Copied");
  };

  const revokeInvite = async (inviteId: string) => {
    await supabase.from("event_invites").delete().eq("id", inviteId);
    refetchInvites();
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <BackButton />
      <h1 className="font-display text-4xl mt-4 mb-2">Checkers</h1>
      <p className="text-muted-foreground mb-8">Assign trusted users to check in attendees.</p>

      <section className="mb-10">
        <h2 className="font-display text-xl mb-3">Invite by link</h2>
        <p className="text-sm text-muted-foreground mb-3">Share a link — anyone who opens it (signed in) gets the role.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button onClick={() => createInvite("checker")}><LinkIcon className="w-4 h-4 mr-2" />Create checker invite</Button>
          <Button variant="outline" onClick={() => createInvite("host")}><LinkIcon className="w-4 h-4 mr-2" />Create host invite</Button>
        </div>
        <div className="border border-border rounded-lg divide-y divide-border">
          {invites?.map((inv) => (
            <div key={inv.id} className="p-3 flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-primary w-20">{inv.role}</span>
              <Input readOnly value={`${shareOrigin()}/invite/${inv.token}`} className="font-mono text-xs" />
              <Button size="icon" variant="ghost" onClick={() => copyLink(inv.token)}><Copy className="w-4 h-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => revokeInvite(inv.id)}>Revoke</Button>
            </div>
          ))}
          {(!invites || invites.length === 0) && <p className="p-4 text-muted-foreground text-center text-sm">No invite links yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl mb-3">Add by email</h2>
        <p className="text-sm text-muted-foreground mb-3">User must already have a Gather account.</p>
        <form onSubmit={add} className="flex gap-2 mb-4">
          <Input type="email" required placeholder="checker@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit">Add</Button>
        </form>
        <div className="border border-border rounded-lg divide-y divide-border">
          {rows?.map((r) => (
            <div key={r.id} className="p-4 flex items-center justify-between">
              <p className="font-mono text-xs">{r.user_id}</p>
              <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>Remove</Button>
            </div>
          ))}
          {(!rows || rows.length === 0) && <p className="p-6 text-muted-foreground text-center">No checkers yet.</p>}
        </div>
      </section>
    </div>
  );
}

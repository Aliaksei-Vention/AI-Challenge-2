import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * Global listener: when the signed-in user's RSVP gets promoted from waitlist
 * to going (via DB trigger after someone cancels or capacity grows), show an
 * in-app toast no matter which page they're on.
 */
export function PromotionListener() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`user-rsvps-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rsvps", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;
          const rsvpId = payload.new?.id;
          if (oldStatus === "waitlist" && newStatus === "going" && rsvpId && !notifiedRef.current.has(rsvpId)) {
            notifiedRef.current.add(rsvpId);
            toast.success("A seat opened — you're in!", {
              description: "You've been promoted from the waitlist.",
              duration: 8000,
              action: {
                label: "View pass",
                onClick: () => {
                  window.location.href = `/pass/${rsvpId}`;
                },
              },
            });
            qc.invalidateQueries({ queryKey: ["my-tickets"] });
            qc.invalidateQueries({ queryKey: ["my-events"] });
            qc.invalidateQueries({ queryKey: ["pass", rsvpId] });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  return null;
}

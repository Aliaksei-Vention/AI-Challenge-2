import { BackButton } from "@/components/back-button";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { EventEditor } from "@/components/event-editor";

export const Route = createFileRoute("/dashboard/events/new")({
  component: NewEvent,
});

function NewEvent() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <BackButton label="← Back to dashboard" fallback="/dashboard" />
      <h1 className="font-display text-4xl mt-4 mb-8">Create event</h1>
      <EventEditor />
    </div>
  );
}

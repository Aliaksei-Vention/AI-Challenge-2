import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/events/$id")({
  component: () => <Outlet />,
});

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/create-users")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/create-users"!</div>;
}

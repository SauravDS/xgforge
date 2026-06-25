import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/series")({
  component: SeriesLayout,
});

function SeriesLayout() {
  return <Outlet />;
}
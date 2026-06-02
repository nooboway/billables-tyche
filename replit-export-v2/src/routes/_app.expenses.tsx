import { createFileRoute, Link } from "@tanstack/react-router";
import { AppTopbar } from "@/components/app/app-topbar";

export const Route = createFileRoute("/_app/expenses")({
  head: () => ({ meta: [{ title: "Expenses — Billables" }] }),
  component: () => (
    <>
      <AppTopbar title="Expenses" />
      <div className="p-12 max-w-2xl mx-auto text-center space-y-4">
        <h2 className="text-2xl font-semibold">Coming soon</h2>
        <p className="text-sm text-muted-foreground">
          Trust accounting, expense tracking, and detailed reports ship in the next release.
        </p>
        <Link to="/dashboard" className="text-primary hover:underline text-sm">← Back to dashboard</Link>
      </div>
    </>
  ),
});

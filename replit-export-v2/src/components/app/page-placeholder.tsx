import { AppTopbar } from "./app-topbar";

export function PagePlaceholder({
  topbar,
  title,
  description,
}: {
  topbar: string;
  title: string;
  description: string;
}) {
  return (
    <>
      <AppTopbar title={topbar} />
      <div className="p-8 max-w-7xl mx-auto">
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-16 text-center">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{description}</p>
        </div>
      </div>
    </>
  );
}
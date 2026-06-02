import type { InvoiceStatus } from "@/lib/mock-data";

const styles: Record<InvoiceStatus, string> = {
  Paid: "bg-primary/10 text-primary border-primary/20",
  Pending: "bg-warning/10 text-warning border-warning/30",
  Overdue: "bg-destructive/10 text-destructive border-destructive/30",
  Draft: "bg-surface text-muted-foreground border-border",
};

export function StatusPill({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-medium border inline-flex items-center gap-1.5 ${styles[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
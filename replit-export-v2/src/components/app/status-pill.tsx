import type { InvoiceStatus } from "@/lib/mock-data";

const styles: Record<InvoiceStatus, string> = {
  Paid: "bg-primary/10 text-primary border-primary/20",
  Pending: "bg-info/10 text-info border-info/20",
  Overdue: "bg-destructive/10 text-destructive border-destructive/30",
  Draft: "bg-surface text-muted-foreground border-border",
};

const LABELS: Record<InvoiceStatus, string> = { Paid: "Paid", Pending: "Sent", Overdue: "Overdue", Draft: "Draft" };

export function StatusPill({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`px-2 h-[22px] rounded-full text-[11px] font-semibold border inline-flex items-center gap-1.5 ${styles[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {LABELS[status]}
    </span>
  );
}
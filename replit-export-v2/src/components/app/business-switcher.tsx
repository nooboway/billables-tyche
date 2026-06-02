import { useState } from "react";
import { Check, ChevronsUpDown, Plus, Building2 } from "lucide-react";
import { useBusiness } from "@/lib/business";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function BusinessSwitcher() {
  const { businesses, current, setCurrentId, addBusiness } = useBusiness();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!current) {
    return (
      <div className="w-full p-2 rounded-lg bg-surface ring-1 ring-border text-xs text-muted-foreground">
        Loading workspaces…
      </div>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="w-full flex items-center justify-between p-2 rounded-lg bg-surface ring-1 ring-border hover:ring-primary/40 transition-all group"
            aria-label="Switch business"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="size-8 shrink-0 rounded bg-primary/15 flex items-center justify-center border border-primary/30">
                <span className="text-[10px] font-semibold text-primary">{current.initials}</span>
              </div>
              <div className="truncate text-left">
                <p className="text-sm font-medium text-foreground truncate">{current.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {current.role}
                </p>
              </div>
            </div>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-1">
          <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Workspaces
          </div>
          {businesses.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                setCurrentId(b.id);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-surface transition-colors"
            >
              <div className="size-6 rounded bg-primary/15 flex items-center justify-center border border-primary/20">
                <span className="text-[9px] font-semibold text-primary">{b.initials}</span>
              </div>
              <span className="flex-1 text-left truncate">{b.name}</span>
              {b.id === current.id && <Check className="size-3.5 text-primary" />}
            </button>
          ))}
          <div className="h-px bg-border my-1" />
          <button
            onClick={() => {
              setOpen(false);
              setDialogOpen(true);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-surface transition-colors text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-3.5" />
            Add business
          </button>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              Add a new firm
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="biz-name">Firm name</Label>
              <Input
                id="biz-name"
                placeholder="e.g. Sterling & Associates LLP"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Each workspace has its own invoices, clients, and branding.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim() || busy}
              onClick={async () => {
                const trimmed = name.trim();
                if (!trimmed) return;
                setBusy(true);
                try {
                  await addBusiness(trimmed);
                } finally {
                  setBusy(false);
                }
                setName("");
                setDialogOpen(false);
              }}
            >
              {busy ? "Creating…" : "Create workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// avoid unused warning when cn isn't used; kept for future variants
export const _cn = cn;
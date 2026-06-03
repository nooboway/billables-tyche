import { useState } from "react";
import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTimer, formatHMS } from "@/lib/timer";

export function TimerWidget() {
  const { running, matterId, desc, elapsedSec, matters, start, stop, setDesc } = useTimer();
  const [open, setOpen] = useState(false);
  const [pickMatter, setPickMatter] = useState<string>("");
  const [pickDesc, setPickDesc] = useState("");

  if (running) {
    const matter = matters.find((m) => m.id === matterId);
    return (
      <div className="flex items-center gap-2 pl-3 pr-1.5 h-9 rounded-full bg-primary/10 border border-primary/20">
        <span className="size-1.5 rounded-full bg-primary animate-pulse" />
        <span className="font-mono text-sm font-bold tabular-nums text-foreground">{formatHMS(elapsedSec)}</span>
        <span className="hidden sm:inline text-[10px] text-muted-foreground max-w-[120px] truncate">{matter?.name ?? "—"}</span>
        <Button size="icon" className="size-6 rounded-md" onClick={() => stop()} aria-label="Stop timer">
          <Square className="size-3 fill-current" />
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-9">
          <Play className="size-3.5 text-primary fill-primary" />
          <span className="hidden sm:inline">Start timer</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Start a timer</p>
        <Select value={pickMatter} onValueChange={setPickMatter}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select a matter" /></SelectTrigger>
          <SelectContent>
            {matters.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="What are you working on? (optional)" value={pickDesc} onChange={(e) => setPickDesc(e.target.value)} />
        <Button
          className="w-full gap-1.5"
          disabled={!pickMatter}
          onClick={() => { start(pickMatter, pickDesc); setDesc(pickDesc); setOpen(false); setPickDesc(""); }}
        >
          <Play className="size-3.5 fill-current" /> Start
        </Button>
        {matters.length === 0 && (
          <p className="text-xs text-muted-foreground">Create a matter first to track time against it.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listMatters, upsertTimeEntry } from "@/lib/api.functions";
import { useBusiness } from "@/lib/business";

type Matter = { id: string; name: string; default_rate: number | null; clients?: { name?: string } | null };

type TimerState = { running: boolean; matterId: string | null; startedAt: number | null; desc: string };

type TimerCtx = {
  running: boolean;
  matterId: string | null;
  desc: string;
  elapsedSec: number;
  matters: Matter[];
  start: (matterId: string, desc?: string) => void;
  stop: () => Promise<void>;
  cancel: () => void;
  setDesc: (d: string) => void;
  setMatterId: (id: string) => void;
};

const Ctx = createContext<TimerCtx | null>(null);
const KEY = "billables.timer";

function load(): TimerState {
  if (typeof window === "undefined") return { running: false, matterId: null, startedAt: null, desc: "" };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as TimerState;
  } catch { /* ignore */ }
  return { running: false, matterId: null, startedAt: null, desc: "" };
}

export function formatHMS(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const { current } = useBusiness();
  const qc = useQueryClient();
  const saveFn = useServerFn(upsertTimeEntry);
  const fetchMatters = useServerFn(listMatters);

  const { data: matters = [] } = useQuery({
    queryKey: ["matters", current?.id],
    queryFn: () => fetchMatters({ data: { businessId: current!.id } }) as Promise<Matter[]>,
    enabled: !!current?.id,
    staleTime: 60_000,
  });

  const [state, setState] = useState<TimerState>(load);
  const [now, setNow] = useState(Date.now());
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  // persist
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  // 1s tick while running
  useEffect(() => {
    if (state.running) {
      setNow(Date.now());
      tick.current = setInterval(() => setNow(Date.now()), 1000);
      return () => { if (tick.current) clearInterval(tick.current); };
    }
    if (tick.current) clearInterval(tick.current);
  }, [state.running]);

  const elapsedSec = state.running && state.startedAt ? Math.floor((now - state.startedAt) / 1000) : 0;

  const start = useCallback((matterId: string, desc = "") => {
    setState({ running: true, matterId, startedAt: Date.now(), desc });
  }, []);

  const cancel = useCallback(() => {
    setState({ running: false, matterId: null, startedAt: null, desc: "" });
  }, []);

  const setDesc = useCallback((d: string) => setState((s) => ({ ...s, desc: d })), []);
  const setMatterId = useCallback((id: string) => setState((s) => ({ ...s, matterId: id })), []);

  const stop = useCallback(async () => {
    if (!state.running || !state.startedAt || !state.matterId || !current) { cancel(); return; }
    const minutes = Math.max(1, Math.round((Date.now() - state.startedAt) / 60000));
    const matter = matters.find((m) => m.id === state.matterId);
    const rate = Number(matter?.default_rate ?? 0);
    const descSnapshot = state.desc;
    cancel();
    try {
      await saveFn({ data: {
        business_id: current.id,
        matter_id: state.matterId,
        entry_date: new Date().toISOString().slice(0, 10),
        minutes,
        rate,
        description: descSnapshot || "Timed work",
        billable: true,
      } });
      // Cross-surface sync: refresh everything that derives from time entries.
      qc.invalidateQueries();
      const h = (minutes / 60).toFixed(2);
      toast.success(`Logged ${h}h to ${matter?.name ?? "matter"}`);
    } catch (e) {
      toast.error((e as Error).message || "Could not log time");
    }
  }, [state, current, matters, saveFn, qc, cancel]);

  return (
    <Ctx.Provider value={{
      running: state.running, matterId: state.matterId, desc: state.desc, elapsedSec,
      matters, start, stop, cancel, setDesc, setMatterId,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTimer must be used inside TimerProvider");
  return ctx;
}

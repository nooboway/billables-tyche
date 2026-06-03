import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBusinesses, createBusiness } from "@/lib/api.functions";

export type Business = {
  id: string;
  name: string;
  tagline: string | null;
  brand: { primaryColor?: string; accentColor?: string } & Record<string, string>;
  invoice_prefix: string;
  payment_terms: string;
  footer_note: string | null;
  address_lines: string[] | null;
  default_currency: string;
  role: string;
  initials?: string;
};

function initialsFor(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "B";
}

type Ctx = {
  businesses: Business[];
  current: Business | null;
  setCurrentId: (id: string) => void;
  addBusiness: (name: string) => Promise<void>;
  refetch: () => void;
  loading: boolean;
  error: Error | null;
};

const BusinessContext = createContext<Ctx | null>(null);
const CURRENT_KEY = "billables.currentBusiness";

export function BusinessProvider({ children }: { children: ReactNode }) {
  const fetchBiz = useServerFn(listBusinesses);
  const createFn = useServerFn(createBusiness);
  const qc = useQueryClient();
  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => fetchBiz(),
    retry: 2,
    staleTime: 60_000,
  });

  const businesses: Business[] = useMemo(
    () => ((data ?? []) as unknown as Business[]).map((b) => ({
      ...b,
      brand: (b.brand && typeof b.brand === "object" ? b.brand : {}) as Business["brand"],
      initials: initialsFor(b.name),
    })),
    [data]
  );

  const [currentId, setCurrentIdState] = useState<string | null>(null);
  useEffect(() => {
    if (!businesses.length) return;
    const stored = typeof window !== "undefined" ? localStorage.getItem(CURRENT_KEY) : null;
    if (stored && businesses.find((b) => b.id === stored)) {
      setCurrentIdState(stored);
    } else {
      setCurrentIdState(businesses[0].id);
    }
  }, [businesses]);

  const setCurrentId = (id: string) => {
    setCurrentIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(CURRENT_KEY, id);
    qc.invalidateQueries();
  };

  const current = businesses.find((b) => b.id === currentId) ?? businesses[0] ?? null;

  const addBusiness = async (name: string) => {
    const biz = await createFn({ data: { name } });
    await refetch();
    setCurrentId(biz.id);
  };

  return (
    <BusinessContext.Provider value={{ businesses, current, setCurrentId, addBusiness, refetch, loading: isLoading, error: (error as Error) ?? null }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used inside BusinessProvider");
  return ctx;
}

export function useActiveBusinessId(): string | null {
  return useBusiness().current?.id ?? null;
}
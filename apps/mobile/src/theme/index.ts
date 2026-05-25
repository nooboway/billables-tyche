export const Colors = {
  bg: "#0a0a0a",
  surface: "#111111",
  surfaceHigh: "#1a1a1a",
  border: "#2a2a2a",
  text: "#ffffff",
  textMuted: "#6b7280",
  primary: "#0066FF",
  primaryMuted: "#0066FF22",
  success: "#22c55e",
  successMuted: "#22c55e22",
  danger: "#ef4444",
  dangerMuted: "#ef444422",
  warning: "#f59e0b",
  warningMuted: "#f59e0b22",
};

export const Typography = {
  heading: {
    color: Colors.text,
    fontWeight: "700" as const,
  },
  body: {
    color: Colors.text,
    fontSize: 15,
  },
  caption: {
    color: Colors.textMuted,
    fontSize: 12,
  },
};

const TRIAL_END_DATE = new Date("2026-05-29");

export function trialDaysLeft(): number {
  const now = new Date();
  const diff = TRIAL_END_DATE.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function fmtCurrency(cents: number, currency = "NGN"): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2) + "%";
}

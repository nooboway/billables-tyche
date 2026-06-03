import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  Clock,
  Tags,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Scale,
  FolderOpen,
  BarChart3,
  Menu,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BusinessSwitcher } from "./business-switcher";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/matters", label: "Matters", icon: Briefcase },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/time", label: "Time tracking", icon: Clock },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/documents", label: "Documents", icon: FolderOpen },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/services", label: "Services & rates", icon: Tags },
  { to: "/settings", label: "Settings", icon: Settings },
];

function Wordmark({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <div className="size-7 shrink-0 rounded-md bg-primary flex items-center justify-center">
        <Scale className="size-4 text-primary-foreground" />
      </div>
      {!collapsed && <span className="font-display font-semibold text-foreground tracking-tight">Billables</span>}
    </div>
  );
}

function NavLinks({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className={cn("flex-1 space-y-1", collapsed ? "px-2" : "px-4")}>
      {nav.map((item) => {
        const active = pathname === item.to || pathname.startsWith(item.to + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 py-2 text-sm font-medium rounded-md transition-colors",
              collapsed ? "justify-center px-0" : "px-3",
              active
                ? "text-primary bg-primary/10 ring-1 ring-primary/15"
                : "text-muted-foreground hover:text-foreground hover:bg-surface"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function TrustCard() {
  return (
    <div className="p-4 mt-auto">
      <div className="p-4 rounded-xl bg-gradient-to-br from-surface to-background ring-1 ring-border">
        <p className="text-xs font-medium text-foreground mb-1">Trust accounting</p>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          IOLTA &amp; three-way reconciliation coming in the next release.
        </p>
      </div>
    </div>
  );
}

/** Desktop sidebar — fixed, collapsible. Hidden below lg (use MobileSidebar there). */
export function AppSidebar() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("billables.sidebarCollapsed") === "1";
  });
  useEffect(() => {
    localStorage.setItem("billables.sidebarCollapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <aside
      className={cn(
        "hidden lg:flex shrink-0 border-r border-border flex-col bg-sidebar transition-[width] duration-200 ease-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className={cn(collapsed ? "px-2 py-4" : "p-6")}>
        <div className={cn("flex items-center mb-6", collapsed ? "justify-center" : "justify-between px-1")}>
          <Wordmark collapsed={collapsed} />
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface" aria-label="Collapse sidebar">
              <PanelLeftClose className="size-4" />
            </button>
          )}
        </div>
        {collapsed ? (
          <button onClick={() => setCollapsed(false)} className="w-full flex items-center justify-center h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface" aria-label="Expand sidebar">
            <PanelLeft className="size-4" />
          </button>
        ) : (
          <BusinessSwitcher />
        )}
      </div>
      <NavLinks collapsed={collapsed} />
      {!collapsed && <TrustCard />}
    </aside>
  );
}

/** Mobile hamburger + off-canvas drawer. Hidden at lg and up. */
export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="lg:hidden p-2 -ml-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface" aria-label="Open menu">
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar flex flex-col gap-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="p-6">
          <div className="mb-6"><Wordmark /></div>
          <BusinessSwitcher />
        </div>
        <NavLinks onNavigate={() => setOpen(false)} />
        <TrustCard />
      </SheetContent>
    </Sheet>
  );
}

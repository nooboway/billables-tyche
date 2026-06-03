import { ThemeToggle } from "./theme-toggle";
import { TimerWidget } from "./timer-widget";
import { useBusiness } from "@/lib/business";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function AppTopbar({ title }: { title: string }) {
  const { current } = useBusiness();
  const { user } = useAuth();
  return (
    <header className="flex items-center justify-between h-16 px-8 border-b border-border bg-background/70 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-display font-semibold text-foreground">{title}</h1>
        {current && (
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium border border-primary/20 inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" />
            {current.name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <TimerWidget />
        <span className="h-5 w-px bg-border mx-1 hidden sm:block" />
        {user && (
          <span className="hidden lg:inline text-xs text-muted-foreground">{user.email}</span>
        )}
        <ThemeToggle />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => supabase.auth.signOut()}
          className="gap-1.5"
          aria-label="Sign out"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}

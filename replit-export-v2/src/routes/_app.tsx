import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ThemeProvider } from "@/lib/theme";
import { BusinessProvider } from "@/lib/business";
import { AppSidebar } from "@/components/app/app-sidebar";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider } from "@/lib/auth";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BusinessProvider>
          <div className="flex min-h-screen w-full bg-background text-foreground">
            <AppSidebar />
            <main className="flex-1 min-w-0 overflow-y-auto">
              <Outlet />
            </main>
          </div>
        </BusinessProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
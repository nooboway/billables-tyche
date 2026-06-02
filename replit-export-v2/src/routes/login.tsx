import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { seedDemoAccount } from "@/lib/api.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const seedFn = useServerFn(seedDemoAccount);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user) navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  };

  const google = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) toast.error("Google sign-in failed");
  };

  const demo = async () => {
    setBusy(true);
    try {
      const creds = await seedFn() as { email: string; password: string };
      const { error } = await supabase.auth.signInWithPassword(creds);
      if (error) throw error;
      toast.success("Signed in as managing partner");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="size-10 mx-auto rounded-md bg-primary flex items-center justify-center mb-3">
            <span className="text-primary-foreground font-bold">B</span>
          </div>
          <h1 className="text-2xl font-semibold">Sign in to Billables</h1>
          <p className="text-sm text-muted-foreground">Practice management for modern law firms.</p>
        </div>
        <Button onClick={google} variant="outline" className="w-full">Continue with Google</Button>
        <Button onClick={demo} disabled={busy} variant="secondary" className="w-full">
          Try as Managing Partner (demo)
        </Button>
        <p className="text-[10px] text-center text-muted-foreground">
          Demo seeds a Nigerian law firm with sample clients, matters, time, and invoices.
        </p>
        <div className="text-center text-xs text-muted-foreground">or sign in with email</div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="space-y-1"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <Button disabled={busy} type="submit" className="w-full">{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          New here? <Link to="/signup" className="text-primary hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
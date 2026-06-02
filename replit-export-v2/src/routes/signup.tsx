import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [firmName, setFirmName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user) navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, firm_name: firmName || `${fullName}'s Firm` },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Check your email to confirm your account.");
  };

  const google = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) toast.error("Google sign-in failed");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="size-10 mx-auto rounded-md bg-primary flex items-center justify-center mb-3">
            <span className="text-primary-foreground font-bold">B</span>
          </div>
          <h1 className="text-2xl font-semibold">Create your firm workspace</h1>
          <p className="text-sm text-muted-foreground">A workspace is created for you automatically.</p>
        </div>
        <Button onClick={google} variant="outline" className="w-full">Continue with Google</Button>
        <div className="text-center text-xs text-muted-foreground">or sign up with email</div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1"><Label>Your name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
          <div className="space-y-1"><Label>Firm name</Label><Input value={firmName} onChange={(e) => setFirmName(e.target.value)} placeholder="Optional" /></div>
          <div className="space-y-1"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="space-y-1"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></div>
          <Button disabled={busy} type="submit" className="w-full">{busy ? "Creating…" : "Create account"}</Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
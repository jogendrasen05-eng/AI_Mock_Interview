import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import { Sparkles, Loader2, Zap, ArrowRight, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — InterviewSarthi" },
      { name: "description", content: "Sign in or explore with Instant Demo Mode to start practicing AI-powered mock interviews." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading, enableDemoMode } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/app" });
  }, [user, loading, nav]);

  const handleDemoAccess = () => {
    enableDemoMode();
    toast.success("Welcome to Demo Mode! Enjoy full access to all features.");
    nav({ to: "/app" });
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created! You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md glass rounded-3xl p-8 sm:p-10 glow-primary relative z-10 border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </span>
          <span className="font-bold text-lg text-gradient">InterviewSarthi</span>
        </div>

        <h1 className="text-3xl font-bold mt-4 tracking-tight">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "signin" ? "Sign in to access your interview dashboard." : "Start your AI-powered interview practice."}
        </p>

        {/* 1-Click Instant Demo Button */}
        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-primary/15 via-accent/10 to-transparent border border-primary/20 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 fill-primary text-primary" /> Instant Access
              </div>
              <p className="text-xs text-muted-foreground mt-1">Want to explore right away without signing up?</p>
            </div>
            <button
              type="button"
              onClick={handleDemoAccess}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-semibold hover:scale-[1.03] transition-transform shadow-[0_0_15px_-3px_rgba(34,211,238,0.5)] shrink-0 flex items-center gap-1.5"
            >
              Try Demo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="relative my-6 text-center text-xs text-muted-foreground">
          <span className="relative z-10 bg-background/80 px-3 uppercase tracking-wider text-[10px]">or continue with credentials</span>
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/60"></div></div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-xs font-medium text-foreground/80">Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 w-full px-4 py-3 rounded-xl bg-input/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                placeholder="Candidate Name"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-foreground/80">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full px-4 py-3 rounded-xl bg-input/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground/80">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 w-full px-4 py-3 rounded-xl bg-input/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold glow-accent disabled:opacity-60 flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform text-sm shadow-md"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 text-xs text-muted-foreground hover:text-foreground w-full text-center transition-colors"
        >
          {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

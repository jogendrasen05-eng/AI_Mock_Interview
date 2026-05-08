import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home, Mic, BarChart3, History, Settings, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

const nav = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/interview", label: "Start Interview", icon: Mic },
  { to: "/app/performance", label: "Performance", icon: BarChart3 },
  { to: "/app/history", label: "History", icon: History },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-64 flex-col border-r border-border/50 bg-sidebar/60 backdrop-blur-xl p-4 sticky top-0 h-screen">
        <Link to="/" className="flex items-center gap-2 px-2 py-3 mb-4">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </span>
          <span className="font-semibold text-gradient">InterviewSarthi</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {nav.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? path === to : path.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active ? "bg-primary/15 text-foreground glow-primary" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={async () => { await signOut(); navigate({ to: "/" }); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </aside>

      {/* mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-sidebar/80 backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-4 h-14">
        <Link to="/" className="font-semibold text-gradient">InterviewSarthi</Link>
        <button onClick={signOut} className="text-sm text-muted-foreground"><LogOut className="w-4 h-4" /></button>
      </div>

      <main className="flex-1 md:p-8 p-4 pt-20 md:pt-8">
        <Outlet />
        {/* mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-sidebar/90 backdrop-blur-xl border-t border-border/50 flex justify-around py-2 z-30">
          {nav.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? path === to : path.startsWith(to);
            return (
              <Link key={to} to={to} className={cn("flex flex-col items-center gap-1 px-2 py-1 text-[10px]", active ? "text-primary" : "text-muted-foreground")}>
                <Icon className="w-5 h-5" /> {label.split(" ")[0]}
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}

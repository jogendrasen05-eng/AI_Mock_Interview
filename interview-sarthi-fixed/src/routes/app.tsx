import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home, Mic, BarChart3, History, Settings, LogOut, Sparkles, Bot, Zap, User } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

const nav = [
  { to: "/app", label: "Dashboard", icon: Home, exact: true },
  { to: "/app/interview", label: "Start Interview", icon: Mic },
  { to: "/app/chat", label: "AI Prep Assistant", icon: Bot },
  { to: "/app/performance", label: "Performance", icon: BarChart3 },
  { to: "/app/history", label: "History", icon: History },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

function AppLayout() {
  const { user, loading, signOut, isDemo } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary animate-spin" />
          Loading workspace…
        </div>
      </div>
    );
  }

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Candidate";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border/50 bg-sidebar/70 backdrop-blur-xl p-4 sticky top-0 h-screen justify-between z-20">
        <div>
          <Link to="/" className="flex items-center gap-2.5 px-3 py-3 mb-6">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </span>
            <div>
              <span className="font-extrabold text-base text-gradient block leading-tight">InterviewSarthi</span>
              <span className="text-[10px] text-muted-foreground tracking-wider uppercase font-semibold">AI Coach</span>
            </div>
          </Link>

          {isDemo && (
            <div className="mb-4 mx-2 px-3 py-1.5 rounded-lg bg-accent/15 border border-accent/30 flex items-center gap-1.5 text-[11px] text-accent font-semibold">
              <Zap className="w-3.5 h-3.5 fill-accent" /> Demo Session Active
            </div>
          )}

          <nav className="space-y-1">
            {nav.map(({ to, label, icon: Icon, exact }) => {
              const active = exact ? path === to : path.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all",
                    active
                      ? "bg-primary/15 text-foreground glow-primary border border-primary/20 font-semibold"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                >
                  <Icon className={cn("w-4 h-4", active ? "text-primary" : "")} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Sign Out */}
        <div className="pt-4 border-t border-border/50 space-y-2">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/20 border border-border/30">
            <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase">
              {displayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-foreground truncate">{displayName}</div>
              <div className="text-[10px] text-muted-foreground truncate">{user.email || "Active User"}</div>
            </div>
          </div>

          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-sidebar/85 backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-4 h-14">
        <Link to="/" className="font-extrabold text-base text-gradient flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" /> InterviewSarthi
        </Link>
        <button onClick={signOut} className="text-xs text-muted-foreground p-2 rounded-lg hover:bg-muted/30">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Main Page Content */}
      <main className="flex-1 md:p-8 p-4 pt-18 md:pt-8 overflow-y-auto">
        <Outlet />

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-sidebar/95 backdrop-blur-2xl border-t border-border/50 flex justify-around py-2 z-30 shadow-lg">
          {nav.slice(0, 5).map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? path === to : path.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 px-2.5 py-1 text-[10px] font-medium transition-colors",
                  active ? "text-primary font-bold" : "text-muted-foreground",
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}

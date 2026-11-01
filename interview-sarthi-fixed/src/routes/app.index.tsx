import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import {
  Mic,
  TrendingUp,
  Trophy,
  Target,
  ArrowRight,
  Bot,
  Sparkles,
  Code2,
  Network,
  Cpu,
  Users,
  MessagesSquare,
  Clock,
  CheckCircle,
} from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: AppHome,
});

const QUICK_TRACKS = [
  { id: "DSA", label: "DSA", icon: Code2, desc: "Algorithms & Logic", color: "from-blue-500 to-indigo-600" },
  { id: "System Design", label: "System Design", icon: Network, desc: "Scale & Architecture", color: "from-purple-500 to-pink-600" },
  { id: "Core CSE", label: "Core CSE", icon: Cpu, desc: "OS, DBMS & Networks", color: "from-emerald-500 to-teal-600" },
  { id: "HR / Behavioral", label: "HR / Behavioral", icon: Users, desc: "STAR Leadership", color: "from-amber-500 to-orange-600" },
];

function AppHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    avg: 0,
    best: 0,
    last: null as string | null,
  });
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => {
    async function fetchAll() {
      let combined: any[] = [];
      const local = JSON.parse(localStorage.getItem("local_interviews") || "[]");

      if (user) {
        try {
          const { data } = await supabase
            .from("interviews")
            .select("id, topic, score, created_at, status")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          if (data) combined = [...data];
        } catch (e) {
          console.warn("Supabase fetch skipped", e);
        }
      }

      const seen = new Set(combined.map((c) => c.id));
      for (const item of local) {
        if (!seen.has(item.id)) combined.push(item);
      }

      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentSessions(combined.slice(0, 3));

      const completed = combined.filter((d) => d.score != null);
      const total = completed.length;
      const avg = total
        ? Math.round(completed.reduce((a, b) => a + Number(b.score ?? 0), 0) / total)
        : 0;
      const best = total
        ? Math.max(...completed.map((c) => Number(c.score ?? 0)))
        : 0;

      setStats({
        total,
        avg,
        best,
        last: combined[0]?.topic ?? null,
      });
    }

    fetchAll();
  }, [user]);

  const cards = [
    {
      label: "Total Interviews",
      value: stats.total,
      icon: Trophy,
      hint: "Mock sessions completed",
    },
    {
      label: "Average Score",
      value: stats.avg ? `${stats.avg}%` : "—",
      icon: TrendingUp,
      hint: "Performance across topics",
    },
    {
      label: "Best Score",
      value: stats.best ? `${stats.best}%` : "—",
      icon: Target,
      hint: "Personal highest rating",
    },
    {
      label: "Recent Track",
      value: stats.last ?? "None yet",
      icon: Mic,
      hint: "Last practiced discipline",
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24 md:pb-0">
      {/* Hero Banner */}
      <div className="glass rounded-3xl p-8 md:p-10 relative overflow-hidden border border-border/50 glow-primary">
        <div className="absolute -top-16 -right-10 w-72 h-72 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-16 -left-10 w-72 h-72 bg-accent/15 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-semibold text-primary mb-3">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            AI Interview Intelligence Active
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Master Your Next <span className="text-gradient">Tech Interview</span>
          </h1>

          <p className="text-muted-foreground mt-3 max-w-xl text-sm md:text-base leading-relaxed">
            Practice voice-driven mock interviews with instant scoring, facial expression tracking, and personalized STAR feedback.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-7">
            <Link
              to="/app/interview"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold glow-accent hover:scale-[1.02] transition-transform text-sm shadow-md"
            >
              <Mic className="w-4 h-4" /> Start Mock Interview <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/app/chat"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl glass hover:bg-muted/40 text-foreground font-medium transition-all text-sm"
            >
              <Bot className="w-4 h-4 text-primary" /> AI Prep Coach
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, hint }) => (
          <div key={label} className="glass rounded-2xl p-6 border border-border/50 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                {label}
              </div>
              <Icon className="w-4 h-4 text-accent" />
            </div>
            <div className="text-3xl font-black mt-2 text-foreground tracking-tight">
              {value}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {hint}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Start Tracks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Quick Start Practice</h2>
          <Link to="/app/interview" className="text-xs font-semibold text-primary hover:underline">
            View all tracks →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_TRACKS.map(({ id, label, icon: Icon, desc, color }) => (
            <Link
              key={id}
              to="/app/interview"
              className="glass rounded-2xl p-5 border border-border/50 hover:-translate-y-1 transition-all hover:glow-primary group"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-md group-hover:scale-105 transition-transform`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                {label}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {desc}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity & Quick Navigation */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Recent Sessions list */}
        <div className="md:col-span-2 glass rounded-2xl p-6 border border-border/50 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Recent Practice Sessions
            </h3>
            <Link to="/app/history" className="text-xs font-semibold text-primary hover:underline">
              See history →
            </Link>
          </div>

          {recentSessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No interview sessions recorded yet. Start your first session above!
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentSessions.map((session) => (
                <Link
                  key={session.id}
                  to="/app/result/$id"
                  params={{ id: session.id }}
                  className="p-3.5 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/30 flex items-center justify-between transition-colors group"
                >
                  <div>
                    <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                      {session.topic}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(session.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gradient">
                      {session.score != null ? `${Math.round(Number(session.score))}%` : "—"}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* AI Assistant Spotlight */}
        <div className="glass rounded-2xl p-6 border border-border/50 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-3xl rounded-full pointer-events-none" />

          <div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground mb-4 shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">Interactive AI Coach</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Drill LeetCode problems, System Design architectures, STAR stories, and ATS resume bullet points with interactive voice feedback.
            </p>
          </div>

          <Link
            to="/app/chat"
            className="mt-6 w-full py-2.5 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-xs font-semibold text-center transition-colors block"
          >
            Launch AI Assistant →
          </Link>
        </div>
      </div>
    </div>
  );
}
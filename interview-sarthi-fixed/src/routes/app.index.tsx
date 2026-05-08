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
} from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: AppHome,
});

function AppHome() {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    total: 0,
    avg: 0,
    best: 0,
    last: null as string | null,
  });

  useEffect(() => {
    if (!user) return;

    supabase
      .from("interviews")
      .select("topic, score, created_at, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const completed = (data ?? []).filter(
          (d) => d.score != null
        );

        const total = completed.length;

        const avg = total
          ? Math.round(
              completed.reduce(
                (a, b) => a + Number(b.score ?? 0),
                0
              ) / total
            )
          : 0;

        const best = total
          ? Math.max(
              ...completed.map((c) =>
                Number(c.score ?? 0)
              )
            )
          : 0;

        setStats({
          total,
          avg,
          best,
          last: data?.[0]?.topic ?? null,
        });
      });
  }, [user]);

  const cards = [
    {
      label: "Total Interviews",
      value: stats.total,
      icon: Trophy,
      hint: "Sessions completed",
    },
    {
      label: "Average Score",
      value: `${stats.avg}`,
      icon: TrendingUp,
      hint: "Across all topics",
    },
    {
      label: "Best Score",
      value: `${stats.best}`,
      icon: Target,
      hint: "Personal best",
    },
    {
      label: "Last Topic",
      value: stats.last ?? "—",
      icon: Mic,
      hint: "Recent practice",
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24 md:pb-0">

      {/* Hero Section */}
      <div className="glass rounded-3xl p-8 md:p-10 relative overflow-hidden">

        <div className="absolute -top-16 -right-10 w-60 h-60 bg-primary/30 blur-3xl rounded-full" />

        <div className="relative">

          <div className="text-sm text-muted-foreground">
            Welcome back 👋
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mt-2">
            Ready for your next mock interview?
          </h1>

          <p className="text-muted-foreground mt-2 max-w-xl">
            Pick a topic, talk to the AI, and get a full
            performance breakdown afterwards.
          </p>

          <Link
            to="/app/interview"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold glow-accent hover:scale-[1.02] transition-transform"
          >
            <Mic className="w-4 h-4" />

            Start Interview

            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {cards.map(
          ({ label, value, icon: Icon, hint }) => (
            <div
              key={label}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">

                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  {label}
                </div>

                <Icon className="w-4 h-4 text-accent" />
              </div>

              <div className="text-3xl font-bold mt-2">
                {value}
              </div>

              <div className="text-xs text-muted-foreground mt-1">
                {hint}
              </div>
            </div>
          )
        )}
      </div>

      {/* Quick Access Cards */}
      <div className="grid md:grid-cols-3 gap-4">

        {/* Performance */}
        <Link
          to="/app/performance"
          className="glass rounded-2xl p-6 hover:-translate-y-1 transition-transform"
        >
          <TrendingUp className="w-6 h-6 text-primary mb-3" />

          <div className="font-semibold">
            View Performance
          </div>

          <div className="text-sm text-muted-foreground">
            Charts, strengths and weak areas.
          </div>
        </Link>

        {/* History */}
        <Link
          to="/app/history"
          className="glass rounded-2xl p-6 hover:-translate-y-1 transition-transform"
        >
          <Trophy className="w-6 h-6 text-accent mb-3" />

          <div className="font-semibold">
            Interview History
          </div>

          <div className="text-sm text-muted-foreground">
            Revisit past sessions and feedback.
          </div>
        </Link>

        {/* AI Chatbot */}
        <Link
          to="/app/chat"
          className="glass rounded-2xl p-6 hover:-translate-y-1 transition-transform relative overflow-hidden"
        >

          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/10 blur-3xl rounded-full" />

          <div className="relative">

            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400 to-primary flex items-center justify-center mb-3 text-xl">
              🤖
            </div>

            <div className="font-semibold">
              AI Chatbot
            </div>

            <div className="text-sm text-muted-foreground">
              Talk with AI for interview preparation and guidance.
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
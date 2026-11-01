import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { BarChart3, TrendingUp, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/app/performance")({
  component: PerformancePage,
});

function PerformancePage() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      let combined: any[] = [];
      const local = JSON.parse(localStorage.getItem("local_interviews") || "[]");

      if (user) {
        try {
          const { data } = await supabase
            .from("interviews")
            .select("id, topic, score, metrics, created_at, status")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .order("created_at", { ascending: true });
          if (data) combined = [...data];
        } catch (e) {
          console.warn("Supabase performance fetch skipped", e);
        }
      }

      const seen = new Set(combined.map((c) => c.id));
      for (const item of local) {
        if (!seen.has(item.id) && item.score != null) {
          combined.push(item);
        }
      }

      combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setInterviews(combined);
    }

    loadData();
  }, [user]);

  const radarData = (() => {
    if (!interviews.length) return [];
    const keys = ["accuracy", "clarity", "confidence", "technical", "english"];
    return keys.map((k) => ({
      skill: k.charAt(0).toUpperCase() + k.slice(1),
      value: Math.round(interviews.reduce((a, b) => a + (Number(b.metrics?.[k]) || 0), 0) / interviews.length),
    }));
  })();

  const timeline = interviews.map((i, idx) => ({ n: idx + 1, score: Number(i.score) || 0 }));

  if (!interviews.length) {
    return (
      <div className="max-w-3xl mx-auto pb-24 md:pb-0 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <BarChart3 className="w-3.5 h-3.5" /> Analytics Overview
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Performance Dashboard</h1>
        </div>

        <div className="glass rounded-3xl p-12 text-center border border-border/50 max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center mx-auto">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">No interview data yet</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Complete your first 5-question mock interview in DSA, System Design, or Behavioral to unlock radar skill breakdowns and performance trajectory charts.
          </p>
          <Link
            to="/app/interview"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-xs hover:scale-105 transition-transform shadow-md"
          >
            Start First Interview <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-24 md:pb-0 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <BarChart3 className="w-3.5 h-3.5" /> Competency Metrics
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Candidate Performance</h1>
        </div>
        <div className="text-xs text-muted-foreground glass px-3 py-1.5 rounded-full border border-border/50">
          Based on <span className="font-bold text-foreground">{interviews.length}</span> completed session{interviews.length > 1 ? "s" : ""}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Radar Skill Chart */}
        <div className="glass rounded-2xl p-6 border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-sm text-foreground">Skill Competency Profile (Averaged)</div>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">0 - 100 Scale</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke="oklch(1 0 0 / 0.15)" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: "oklch(0.85 0.02 250)", fontSize: 12 }} />
                <Radar dataKey="value" stroke="oklch(0.72 0.18 270)" fill="oklch(0.72 0.18 270)" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Improvement Timeline */}
        <div className="glass rounded-2xl p-6 border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-sm text-foreground">Score Trajectory Over Time</div>
            <span className="text-[10px] text-accent uppercase font-semibold">Progress Trend</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={timeline}>
                <XAxis dataKey="n" stroke="oklch(0.7 0.02 250)" label={{ value: 'Session Number', position: 'insideBottom', offset: -5, fill: 'oklch(0.7 0.02 250)', fontSize: 10 }} />
                <YAxis domain={[0, 100]} stroke="oklch(0.7 0.02 250)" />
                <Tooltip contentStyle={{ background: "oklch(0.21 0.05 268)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="score" stroke="oklch(0.82 0.17 80)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Completed Sessions Table */}
      <div className="glass rounded-2xl p-6 border border-border/50">
        <div className="font-bold text-sm text-foreground mb-4">Recent Graded Sessions</div>
        <div className="divide-y divide-border/40">
          {interviews.slice().reverse().slice(0, 5).map((i) => (
            <Link key={i.id} to="/app/result/$id" params={{ id: i.id }} className="flex items-center justify-between py-3.5 hover:bg-muted/20 px-3 rounded-xl transition-colors group">
              <div>
                <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{i.topic}</div>
                <div className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <div className="text-2xl font-black text-gradient">{Math.round(Number(i.score) || 0)}%</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

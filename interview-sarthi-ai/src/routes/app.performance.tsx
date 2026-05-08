import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

export const Route = createFileRoute("/app/performance")({
  component: PerformancePage,
});

function PerformancePage() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("interviews")
      .select("id, topic, score, metrics, created_at, status")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: true })
      .then(({ data }) => setInterviews(data ?? []));
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
      <div className="max-w-3xl mx-auto pb-24 md:pb-0">
        <div className="glass rounded-3xl p-12 text-center">
          <h2 className="text-2xl font-bold">No data yet</h2>
          <p className="text-muted-foreground mt-2">Complete your first interview to unlock analytics.</p>
          <Link to="/app/interview" className="mt-6 inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold">Start now</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-24 md:pb-0 space-y-6">
      <h1 className="text-3xl font-bold">Performance</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <div className="font-semibold mb-4">Skill profile (avg)</div>
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

        <div className="glass rounded-2xl p-6">
          <div className="font-semibold mb-4">Improvement timeline</div>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={timeline}>
                <XAxis dataKey="n" stroke="oklch(0.7 0.02 250)" />
                <YAxis domain={[0, 100]} stroke="oklch(0.7 0.02 250)" />
                <Tooltip contentStyle={{ background: "oklch(0.21 0.05 268)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="score" stroke="oklch(0.82 0.17 80)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="font-semibold mb-4">Recent interviews</div>
        <div className="divide-y divide-border/50">
          {interviews.slice().reverse().slice(0, 5).map((i) => (
            <Link key={i.id} to="/app/result/$id" params={{ id: i.id }} className="flex items-center justify-between py-3 hover:bg-muted/20 px-2 rounded-lg">
              <div>
                <div className="font-medium">{i.topic}</div>
                <div className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleString()}</div>
              </div>
              <div className="text-2xl font-bold text-gradient">{Math.round(Number(i.score) || 0)}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Trash2, History, ArrowRight, Award, Calendar, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    let combined: any[] = [];
    const local = JSON.parse(localStorage.getItem("local_interviews") || "[]");

    if (user) {
      try {
        const { data } = await supabase
          .from("interviews")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (data) combined = [...data];
      } catch (e) {
        console.warn("Could not query supabase interviews", e);
      }
    }

    const seenIds = new Set(combined.map((i) => i.id));
    for (const item of local) {
      if (!seenIds.has(item.id)) {
        combined.push(item);
      }
    }

    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setItems(combined);
  }

  useEffect(() => {
    load();
  }, [user]);

  async function remove(id: string) {
    try {
      await supabase.from("interviews").delete().eq("id", id);
    } catch (e) {
      // ignore
    }
    const local = JSON.parse(localStorage.getItem("local_interviews") || "[]");
    const updated = local.filter((i: any) => i.id !== id);
    localStorage.setItem("local_interviews", JSON.stringify(updated));
    toast.success("Interview session removed");
    load();
  }

  return (
    <div className="max-w-5xl mx-auto pb-24 md:pb-0 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <History className="w-3.5 h-3.5" /> Practice Records
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Interview History</h1>
        </div>
        <Link
          to="/app/interview"
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-semibold hover:scale-[1.02] transition-transform shadow-md"
        >
          + New Session
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center border border-border/50 max-w-md mx-auto my-8 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">No sessions completed yet</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Take your first 5-question mock interview in DSA, System Design, or Behavioral to view your AI evaluations and scoring breakdown here.
          </p>
          <Link
            to="/app/interview"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:scale-105 transition-transform"
          >
            Start Mock Interview <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((i) => {
            const scoreNum = i.score != null ? Math.round(Number(i.score)) : null;
            return (
              <div
                key={i.id}
                className="glass rounded-2xl p-5 flex items-center justify-between gap-4 border border-border/50 hover:border-primary/40 transition-colors group"
              >
                <Link to="/app/result/$id" params={{ id: i.id }} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-base text-foreground group-hover:text-primary transition-colors truncate">
                      {i.topic}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                      {i.status || "completed"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(i.created_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {i.metrics?.accuracy && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-accent">
                        <CheckCircle className="w-3 h-3" /> {i.metrics.accuracy}% Accuracy
                      </span>
                    )}
                  </div>
                </Link>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-black text-gradient">
                      {scoreNum !== null ? `${scoreNum}` : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                      Score / 100
                    </div>
                  </div>

                  <Link
                    to="/app/result/$id"
                    params={{ id: i.id }}
                    className="p-2.5 rounded-xl glass hover:bg-primary/20 text-muted-foreground hover:text-foreground transition-colors"
                    title="View report"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => remove(i.id)}
                    className="p-2.5 rounded-xl glass hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

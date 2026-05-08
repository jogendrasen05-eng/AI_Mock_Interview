import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("interviews")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  }
  useEffect(() => { load(); }, [user]);

  async function remove(id: string) {
    await supabase.from("interviews").delete().eq("id", id);
    toast.success("Deleted");
    load();
  }

  return (
    <div className="max-w-5xl mx-auto pb-24 md:pb-0 space-y-4">
      <h1 className="text-3xl font-bold">History</h1>
      {items.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">No interviews yet.</div>
      )}
      <div className="grid gap-3">
        {items.map((i) => (
          <div key={i.id} className="glass rounded-2xl p-5 flex items-center justify-between gap-4">
            <Link to="/app/result/$id" params={{ id: i.id }} className="flex-1 min-w-0">
              <div className="font-semibold truncate">{i.topic}</div>
              <div className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleString()} · {i.status}</div>
            </Link>
            <div className="text-2xl font-bold text-gradient">{i.score != null ? Math.round(Number(i.score)) : "—"}</div>
            <button onClick={() => remove(i.id)} className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

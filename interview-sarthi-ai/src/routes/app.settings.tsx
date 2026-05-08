import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).single().then(({ data }) => setName(data?.full_name ?? ""));
  }, [user]);

  async function save() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: name, updated_at: new Date().toISOString() }).eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  }

  return (
    <div className="max-w-xl mx-auto pb-24 md:pb-0 space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <div className="glass rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <input value={user?.email ?? ""} disabled className="mt-1 w-full px-4 py-3 rounded-xl bg-input/30 border border-border opacity-60" />
        </div>
        <div>
          <label className="text-sm font-medium">Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-xl bg-input/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <button onClick={save} disabled={busy} className="px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold disabled:opacity-60">
          Save changes
        </button>
      </div>
    </div>
  );
}

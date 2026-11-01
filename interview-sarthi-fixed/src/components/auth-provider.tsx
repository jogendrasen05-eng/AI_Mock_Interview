import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const DEMO_USER: User = {
  id: "demo-user-101",
  email: "demo.candidate@interviewsarthi.ai",
  user_metadata: { full_name: "Demo Candidate" },
  app_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as any;

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  signOut: () => Promise<void>;
  enableDemoMode: () => void;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  isDemo: false,
  signOut: async () => {},
  enableDemoMode: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    return typeof window !== "undefined" && localStorage.getItem("is_demo") === "true";
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const enableDemoMode = () => {
    localStorage.setItem("is_demo", "true");
    setIsDemo(true);
  };

  const signOut = async () => {
    localStorage.removeItem("is_demo");
    setIsDemo(false);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    setSession(null);
  };

  const effectiveUser = isDemo ? DEMO_USER : (session?.user ?? null);

  return (
    <Ctx.Provider
      value={{
        user: effectiveUser,
        session,
        loading,
        isDemo,
        signOut,
        enableDemoMode,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

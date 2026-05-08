import { createFileRoute, Link } from "@tanstack/react-router";
import { AIAvatar } from "@/components/ai-avatar";
import { Mic, BarChart3, Brain, ArrowRight, Sparkles, Zap, Target } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InterviewSarthi — Your Personal AI Interview Coach" },
      { name: "description", content: "Voice-driven mock interviews with instant AI feedback, scoring, and analytics. Practice DSA, System Design, HR and more." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-6 pt-20 pb-28 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>AI-powered mock interviews</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
              Your Personal <span className="text-gradient">AI Interview</span> Coach
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              Practice real interview scenarios with a voice-driven AI. Get instant feedback on
              accuracy, clarity, confidence and technical depth — backed by a beautiful analytics dashboard.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/auth"
                className="group inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold glow-accent hover:scale-[1.02] transition-transform"
              >
                Start Mock Interview
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl glass font-medium hover:bg-muted/40"
              >
                Learn more
              </a>
            </div>
            <div className="flex gap-8 pt-4 text-sm text-muted-foreground">
              <div><span className="text-foreground font-semibold text-2xl">5+</span><div>Interview tracks</div></div>
              <div><span className="text-foreground font-semibold text-2xl">100%</span><div>Voice-powered</div></div>
              <div><span className="text-foreground font-semibold text-2xl">Instant</span><div>AI feedback</div></div>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 blur-3xl rounded-full" />
            <div className="relative glass rounded-[2.5rem] p-12 glow-primary">
              <AIAvatar size="xl" speaking />
              <div className="mt-8 text-center">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Now interviewing</div>
                <div className="text-lg font-semibold">"Tell me about a time you debugged production code…"</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl font-bold mb-4">Everything you need to ace your next interview</h2>
          <p className="text-muted-foreground">A premium coaching experience built around your voice.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Mic, title: "Voice Interview", desc: "Speak naturally. Our AI listens, transcribes, and responds with a human-like voice." },
            { icon: Brain, title: "AI Evaluation", desc: "Get scored on accuracy, clarity, confidence, technical depth and English quality." },
            { icon: BarChart3, title: "Analytics Dashboard", desc: "Track progress with radar charts, per-question scores, and an improvement timeline." },
            { icon: Target, title: "5 Interview Tracks", desc: "DSA, System Design, Core CSE, HR/Behavioral, and Communication Skills." },
            { icon: Zap, title: "Adaptive Difficulty", desc: "Questions adapt to your level with dynamic follow-ups." },
            { icon: Sparkles, title: "Improvement Plan", desc: "Receive a personalized improvement plan after every session." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass rounded-2xl p-7 hover:-translate-y-1 transition-transform">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-24">
        <div className="glass rounded-3xl p-16 text-center relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/30 blur-3xl rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-accent/30 blur-3xl rounded-full" />
          <div className="relative">
            <h2 className="text-4xl font-bold mb-4">Ready for your next interview?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Start your first mock session in under 30 seconds.</p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold glow-accent"
            >
              Start free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        © 2026 InterviewSarthi · Made By Arun Ghorse
      </footer>
    </main>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LineChart, Line, Legend } from "recharts";
import { CheckCircle2, AlertCircle, Lightbulb, ArrowLeft, Mic, Smile, Frown, Meh, Eye, Send, Loader2 } from "lucide-react";
// @ts-ignore
import html2pdf from "html2pdf.js";
import { toast } from "sonner";

export const Route = createFileRoute("/app/result/$id")({
  component: ResultPage,
});

function ResultPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [interview, setInterview] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [emotions, setEmotions] = useState<any[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const sendReportEmail = async () => {
    if (!user || !user.email || !interview) {
      toast.error("User email or interview data not found.");
      return;
    }

    setSendingEmail(true);
    const element = document.getElementById("report-content");
    if (!element) {
      setSendingEmail(false);
      return;
    }

    // Hide UI elements that shouldn't be in the PDF
    const noPrintElements = document.querySelectorAll('.no-print');
    noPrintElements.forEach(el => (el as HTMLElement).style.display = 'none');

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Interview_Report_${id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, windowWidth: 1200 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      const pdfBase64 = await html2pdf().set(opt).from(element).outputPdf('datauristring');
      
      // Restore UI elements
      noPrintElements.forEach(el => (el as HTMLElement).style.display = '');

      const res = await fetch("/api/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: user.email,
          pdfBase64,
          interviewId: id,
          topic: interview.topic
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Interview report sent to your email!");
        setEmailSent(true);
      } else {
        throw new Error(data.error || "Failed to send email");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate or send PDF.");
      // Restore UI elements in case of error
      noPrintElements.forEach(el => (el as HTMLElement).style.display = '');
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("interviews").select("*").eq("id", id).single().then(({ data }) => setInterview(data));
    supabase.from("interview_questions").select("*").eq("interview_id", id).order("order_index").then(({ data }) => setQuestions(data ?? []));
    
    // Load local emotions log
    const stored = localStorage.getItem(`emotions-${id}`);
    if (stored) {
      setEmotions(JSON.parse(stored));
    }
  }, [id, user]);

  if (!interview) return <div className="text-center text-muted-foreground py-20">Loading…</div>;

  const m = interview.metrics ?? {};
  const radarData = ["accuracy", "clarity", "confidence", "technical", "english"].map((k) => ({
    skill: k.charAt(0).toUpperCase() + k.slice(1),
    value: Number(m[k]) || 0,
  }));
  const barData = questions.map((q, i) => ({ name: `Q${i + 1}`, score: Number(q.score) || 0 }));

  const allStrengths = questions.flatMap((q) => q.ai_feedback?.strengths ?? []).slice(0, 6);
  const allWeak = questions.flatMap((q) => q.ai_feedback?.weaknesses ?? []).slice(0, 6);
  const allImpr = questions.flatMap((q) => q.ai_feedback?.improvements ?? []).slice(0, 6);

  // Format emotions data for charting
  const emotionData = emotions.map((e, index) => ({
    time: index, // seconds
    happy: Math.round(e.scores.happy * 100),
    neutral: Math.round(e.scores.neutral * 100),
    stressed: Math.round((e.scores.angry + e.scores.sad + e.scores.fearful + e.scores.disgusted) * 100)
  }));

  return (
    <div className="max-w-6xl mx-auto pb-24 md:pb-0 space-y-6">
      <Link to="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground no-print">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>

      <div id="report-content" className="space-y-6 bg-background">
      <div className="glass rounded-3xl p-8 md:p-10 relative overflow-hidden">
        <div className="absolute -top-16 -right-10 w-60 h-60 bg-accent/30 blur-3xl rounded-full" />
        <div className="relative grid md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">{interview.topic}</div>
            <h1 className="text-3xl md:text-4xl font-bold mt-1">Your interview report</h1>
            <p className="text-muted-foreground mt-2">{new Date(interview.created_at).toLocaleString()}</p>
            <div className="flex flex-wrap gap-3 mt-6 no-print">
              <Link to="/app/interview" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold">
                <Mic className="w-4 h-4" /> Practice again
              </Link>
              <button 
                onClick={sendReportEmail}
                disabled={sendingEmail || emailSent}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl glass font-semibold disabled:opacity-50"
              >
                {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {emailSent ? "Sent to Email" : "Send Report to Email"}
              </button>
            </div>
          </div>
          <div className="text-center">
            <div className="text-7xl font-bold text-gradient">{Math.round(Number(interview.score) || 0)}</div>
            <div className="text-sm text-muted-foreground mt-1">Overall score / 100</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <div className="font-semibold mb-4">Skill breakdown</div>
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
          <div className="font-semibold mb-4">Per-question score</div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={barData}>
                <XAxis dataKey="name" stroke="oklch(0.7 0.02 250)" />
                <YAxis domain={[0, 100]} stroke="oklch(0.7 0.02 250)" />
                <Tooltip contentStyle={{ background: "oklch(0.21 0.05 268)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12 }} />
                <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? "oklch(0.72 0.18 270)" : "oklch(0.82 0.17 80)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Sentiment Analysis (ML/DL) Chart */}
      {emotionData.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 font-semibold mb-4 text-cyan-400">
            <Eye className="w-5 h-5" /> Live Video Sentiment Analysis Timeline
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Analysis of your facial expressions during the interview (Confidence vs Stress).
          </p>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={emotionData}>
                <XAxis dataKey="time" stroke="oklch(0.7 0.02 250)" tickFormatter={(val) => `${val}s`} />
                <YAxis domain={[0, 100]} stroke="oklch(0.7 0.02 250)" />
                <Tooltip 
                  contentStyle={{ background: "oklch(0.21 0.05 268)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12 }}
                  formatter={(val: number) => [`${val}%`, '']}
                />
                <Legend />
                <Line type="monotone" dataKey="happy" name="Confident (Happy)" stroke="#22d3ee" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="neutral" name="Neutral" stroke="#94a3b8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="stressed" name="Stressed (Negative)" stroke="#ef4444" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <FeedbackList title="Strengths" icon={CheckCircle2} color="text-secondary" items={allStrengths} />
        <FeedbackList title="Weaknesses" icon={AlertCircle} color="text-destructive" items={allWeak} />
        <FeedbackList title="Improvements" icon={Lightbulb} color="text-accent" items={allImpr} />
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="font-semibold mb-4">Question-by-question</div>
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={q.id} className="border border-border/50 rounded-xl p-5">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="font-medium">Q{i + 1}. {q.question}</div>
                <div className="text-lg font-bold text-gradient shrink-0">{Math.round(Number(q.score) || 0)}</div>
              </div>
              <div className="text-sm text-muted-foreground italic mb-3">"{q.user_answer || "(no answer)"}"</div>
              {q.ai_feedback?.model_answer && (
                <div className="text-sm bg-muted/30 rounded-lg p-3">
                  <span className="font-semibold text-accent">Model answer: </span>{q.ai_feedback.model_answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}

function FeedbackList({ title, icon: Icon, color, items }: any) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-2 font-semibold mb-3">
        <Icon className={`w-5 h-5 ${color}`} /> {title}
      </div>
      {items.length ? (
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((s: string, i: number) => <li key={i} className="flex gap-2"><span className="text-accent">•</span> {s}</li>)}
        </ul>
      ) : (
        <div className="text-sm text-muted-foreground">—</div>
      )}
    </div>
  );
}

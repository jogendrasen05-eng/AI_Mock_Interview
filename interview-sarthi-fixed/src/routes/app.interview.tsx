import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import * as faceapi from '@vladmandic/face-api';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { useSTT, useTTS } from "@/hooks/use-speech";
import { AIAvatar } from "@/components/ai-avatar";
import {
  Mic,
  MicOff,
  SkipForward,
  Square,
  Loader2,
  Code2,
  Network,
  Cpu,
  Users,
  MessagesSquare,
  Upload,
  FileText,
  Lightbulb,
  Clock,
  Volume2,
  HelpCircle,
  Award,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/interview")({
  component: InterviewPage,
});

const TOPICS = [
  { id: "DSA", label: "DSA", desc: "Data Structures & Algorithms", icon: Code2, color: "from-blue-500 to-indigo-600" },
  { id: "System Design", label: "System Design", desc: "Scalability, caching & architecture", icon: Network, color: "from-purple-500 to-pink-600" },
  { id: "Core CSE", label: "Core CSE", desc: "Operating Systems, DBMS & Networking", icon: Cpu, color: "from-emerald-500 to-teal-600" },
  { id: "HR / Behavioral", label: "HR / Behavioral", desc: "Leadership, conflict & STAR method", icon: Users, color: "from-amber-500 to-orange-600" },
  { id: "Communication Skills", label: "Communication", desc: "Clarity, executive presence & English", icon: MessagesSquare, color: "from-cyan-500 to-blue-600" },
];

const DIFFICULTIES = [
  { id: "Junior", label: "Junior (0-2 YOE)", desc: "Fundamentals, syntax & direct concepts" },
  { id: "Mid-Level", label: "Mid-Level (2-5 YOE)", desc: "Problem solving, edge cases & trade-offs" },
  { id: "Senior", label: "Senior / Staff (5+ YOE)", desc: "System architecture, scale & high-impact decisions" },
];

const TOTAL_QUESTIONS = 5;
const QUESTION_TIME_SECONDS = 120; // 2 minutes

type QA = {
  question: string;
  answer: string;
  feedback?: any;
};

function InterviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [topic, setTopic] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState("Mid-Level");
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [history, setHistory] = useState<QA[]>([]);
  const [currentQ, setCurrentQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // Hint states
  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);

  // Timer states
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);
  const [timerActive, setTimerActive] = useState(false);

  // Resume states
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const tts = useTTS();
  const stt = useSTT();

  // Video and ML refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const emotionIntervalRef = useRef<any>(null);
  const [emotionsLog, setEmotionsLog] = useState<any[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Timer countdown effect
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // Load ML Models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models')
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.warn("Face-api models not loaded:", err);
      }
    };
    loadModels();
  }, []);

  // Emotion Tracking Loop
  const startEmotionTracking = () => {
    if (!videoRef.current || !modelsLoaded) return;
    emotionIntervalRef.current = setInterval(async () => {
      if (videoRef.current) {
        try {
          const detections = await faceapi.detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions()
          ).withFaceExpressions();

          if (detections) {
            const expressions = detections.expressions;
            const dominantEmotion = Object.keys(expressions).reduce((a, b) => 
              // @ts-ignore
              expressions[a] > expressions[b] ? a : b
            );
            setEmotionsLog(prev => [...prev, { time: Date.now(), emotion: dominantEmotion, scores: expressions }]);
          }
        } catch (e) {
          // ignore tracking error
        }
      }
    }, 1000);
  };

  async function callAI(payload: any) {
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, difficulty }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn("Local API call failed, falling back to supabase edge function...", err);
    }

    const { data, error } = await supabase.functions.invoke("interview-ai", {
      body: payload,
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    return data;
  }

  // Request a gentle hint from the AI
  async function requestHint() {
    if (!currentQ || loadingHint) return;
    setLoadingHint(true);
    try {
      const res = await callAI({
        action: "hint",
        topic,
        question: currentQ,
      });
      if (res?.hint) {
        setHint(res.hint);
        toast.info("💡 Hint provided below");
      }
    } catch (err: any) {
      toast.error("Could not fetch hint right now.");
    } finally {
      setLoadingHint(false);
    }
  }

  // Resume Upload
  async function handleResumeUpload(file: File) {
    try {
      setResumeFile(file);
      const text = await file.text();
      setResumeText(text);
      toast.success("Resume uploaded successfully! AI will tailor questions to your experience.");
    } catch (e: any) {
      toast.error("Failed to read resume file.");
    }
  }

  async function startInterview(t: string) {
    if (!user) return;

    setTopic(t);
    setLoading(true);
    setHint(null);
    setTimeLeft(QUESTION_TIME_SECONDS);

    let currentId = `session-${Date.now()}`;

    try {
      const { data: interview, error } = await supabase
        .from("interviews")
        .insert({
          user_id: user.id,
          topic: t,
          status: "in_progress",
        })
        .select()
        .single();

      if (!error && interview?.id) {
        currentId = interview.id;
      }
    } catch (e) {
      console.warn("Using offline fallback ID", e);
    }

    setInterviewId(currentId);

    // Camera & Audio
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setTimeout(startEmotionTracking, 1000);
    } catch (err) {
      console.warn("Camera/mic access error:", err);
    }

    // Generate first question
    try {
      const res = await callAI({
        action: "next_question",
        topic: t,
        resume: resumeText,
        history: [],
      });

      setCurrentQ(res.question);
      setTimerActive(true);
      tts.speak(res.question);
    } catch (e: any) {
      toast.error(e.message || "Failed to start interview.");
      setTopic(null);
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (!currentQ || !interviewId || !user || !topic) return;

    stt.stop();
    tts.stop();
    setTimerActive(false);
    setLoading(true);

    const answer = stt.transcript.trim();

    try {
      const feedback = await callAI({
        action: "evaluate",
        topic,
        question: currentQ,
        answer,
      });

      const newQA: QA = {
        question: currentQ,
        answer,
        feedback,
      };

      const newHistory = [...history, newQA];
      setHistory(newHistory);
      stt.reset();
      setHint(null);

      // Save question in Supabase
      try {
        await supabase.from("interview_questions").insert({
          interview_id: interviewId,
          user_id: user.id,
          order_index: newHistory.length - 1,
          question: currentQ,
          user_answer: answer,
          ai_feedback: feedback,
          score: feedback.score,
        });
      } catch (e) {
        // ignore offline error
      }

      // Save question in LocalStorage Cache
      const localQ = JSON.parse(localStorage.getItem(`questions-${interviewId}`) || "[]");
      localQ.push({
        id: `q-${Date.now()}`,
        interview_id: interviewId,
        order_index: newHistory.length - 1,
        question: currentQ,
        user_answer: answer,
        ai_feedback: feedback,
        score: feedback.score,
      });
      localStorage.setItem(`questions-${interviewId}`, JSON.stringify(localQ));

      // Finish Interview if reached question limit
      if (newHistory.length >= TOTAL_QUESTIONS) {
        await finishInterview(newHistory);
        return;
      }

      // Next Question
      setTimeLeft(QUESTION_TIME_SECONDS);
      const next = await callAI({
        action: "next_question",
        topic,
        resume: resumeText,
        history: newHistory.map((h) => ({
          question: h.question,
          answer: h.answer,
        })),
      });

      setCurrentQ(next.question);
      setTimerActive(true);
      tts.speak(next.question);
    } catch (e: any) {
      toast.error(e.message || "Failed to evaluate answer.");
    } finally {
      setLoading(false);
    }
  }

  async function finishInterview(qa: QA[]) {
    if (!interviewId || !user) return;

    setFinishing(true);

    const avg = (key: string) =>
      Math.round(
        qa.reduce((a, b) => a + (Number(b.feedback?.[key]) || 0), 0) / qa.length
      );

    const metrics = {
      accuracy: avg("accuracy"),
      clarity: avg("clarity"),
      confidence: avg("confidence"),
      technical: avg("technical"),
      english: avg("english"),
    };

    const score = avg("score");

    const sessionData = {
      id: interviewId,
      user_id: user.id,
      topic,
      score,
      metrics,
      status: "completed",
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };

    // Save in Supabase
    try {
      await supabase
        .from("interviews")
        .update({
          score,
          metrics,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", interviewId);
    } catch (e) {
      // ignore
    }

    // Save in LocalStorage for 100% resilient results view
    localStorage.setItem(`interview-${interviewId}`, JSON.stringify(sessionData));
    const cachedList = JSON.parse(localStorage.getItem("local_interviews") || "[]");
    cachedList.unshift(sessionData);
    localStorage.setItem("local_interviews", JSON.stringify(cachedList));

    // Stop Media Recorder and Tracking
    if (emotionIntervalRef.current) clearInterval(emotionIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `interview-${interviewId}.webm`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      };
      mediaRecorderRef.current.stop();

      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }

    localStorage.setItem(`emotions-${interviewId}`, JSON.stringify(emotionsLog));

    navigate({
      to: "/app/result/$id",
      params: { id: interviewId },
    });
  }

  useEffect(() => {
    return () => {
      tts.stop();
      stt.stop();
      if (emotionIntervalRef.current) clearInterval(emotionIntervalRef.current);
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Format MM:SS for timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // TOPIC SELECTION SCREEN
  if (!topic) {
    return (
      <div className="max-w-5xl mx-auto pb-24 md:pb-0 space-y-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-primary mb-3">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            Adaptive AI Mock Sessions
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Choose Your Interview Track
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm md:text-base">
            Select an interview discipline, target seniority level, or upload your resume for tailored AI coaching with voice transcription and real-time evaluation.
          </p>
        </div>

        {/* Seniority Selector */}
        <div className="glass rounded-2xl p-6 border border-border/50">
          <div className="flex items-center gap-2 text-sm font-semibold mb-3">
            <Award className="w-4 h-4 text-accent" />
            <span>Target Experience Level</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.id)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  difficulty === d.id
                    ? "bg-primary/20 border-primary text-foreground glow-primary"
                    : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <div className="font-semibold text-sm">{d.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{d.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Resume Upload Box */}
        <div className="glass rounded-2xl p-6 border border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Personalized Resume Interview</h3>
              <p className="text-xs text-muted-foreground">
                Upload your resume (TXT, PDF, DOCX) and our AI will simulate an interviewer asking questions about your specific projects and skills.
              </p>
            </div>
          </div>

          <label className="flex items-center justify-center gap-3 border border-dashed border-border/70 rounded-xl p-6 cursor-pointer hover:bg-muted/30 transition-colors">
            <Upload className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {resumeFile ? resumeFile.name : "Click to browse resume file"}
            </span>
            <input
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleResumeUpload(file);
              }}
            />
          </label>

          {resumeText && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => startInterview("Resume Based")}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold hover:scale-[1.02] transition-transform shadow-lg flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Start Resume Interview
              </button>
            </div>
          )}
        </div>

        {/* Topic Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOPICS.map(({ id, label, desc, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => startInterview(id)}
              className="glass rounded-2xl p-6 text-left hover:-translate-y-1 transition-all hover:glow-primary border border-border/50 group relative overflow-hidden"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-md group-hover:scale-105 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                {label}
              </div>
              <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {desc}
              </div>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Start session →
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ACTIVE INTERVIEW SCREEN
  return (
    <div className="max-w-4xl mx-auto pb-24 md:pb-0 space-y-6">
      {/* Top Bar: Topic, Question Index & Countdown */}
      <div className="glass rounded-2xl p-4 flex items-center justify-between border border-border/50">
        <div>
          <div className="text-[11px] font-semibold text-primary uppercase tracking-wider">
            {topic} · {difficulty}
          </div>
          <div className="text-sm font-bold text-foreground">
            Question {Math.min(history.length + 1, TOTAL_QUESTIONS)} of {TOTAL_QUESTIONS}
          </div>
        </div>

        {/* Timer Badge */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            timeLeft < 30 ? "bg-destructive/20 border-destructive text-destructive animate-pulse" : "bg-muted/40 border-border text-foreground"
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <div className="w-24 md:w-36 h-2 bg-muted/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
              style={{
                width: `${(history.length / TOTAL_QUESTIONS) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Webcam & AI Avatar */}
        <div className="md:col-span-1 flex flex-col gap-5">
          {/* Webcam View */}
          <div className="glass rounded-2xl p-4 flex flex-col items-center border border-border/50">
            <div className="w-full aspect-video bg-black/60 rounded-xl overflow-hidden relative border border-primary/20 shadow-md">
              <video 
                ref={videoRef}
                autoPlay 
                muted 
                playsInline
                className="w-full h-full object-cover transform -scale-x-100"
              />
              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded-md text-[10px] text-red-400 font-medium backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Live Camera
              </div>
            </div>
            <div className="mt-3 text-[11px] text-primary/80 uppercase tracking-widest font-semibold flex items-center justify-center gap-1.5">
              <Cpu className="w-3 h-3 text-primary animate-pulse" /> AI Emotion & Eye-Contact
            </div>
          </div>

          {/* AI Avatar */}
          <div className="glass rounded-2xl p-6 text-center flex-1 flex flex-col items-center justify-center border border-border/50 relative overflow-hidden">
            <div className="absolute top-2 left-3 flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-semibold">
              <Volume2 className={`w-3 h-3 ${tts.speaking ? "text-accent animate-bounce" : ""}`} />
              {tts.speaking ? "Speaking…" : "Listening"}
            </div>
            <AIAvatar
              size="lg"
              speaking={tts.speaking}
              question={currentQ}
              className="mx-auto"
            />
          </div>
        </div>

        {/* Right Column: Active Question & Dual Input */}
        <div className="md:col-span-2 flex flex-col gap-4">
          {/* Question Box */}
          <div className="glass rounded-2xl p-6 border border-border/50 relative min-h-[140px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
                  Interviewer Question
                </span>
                <button
                  type="button"
                  onClick={requestHint}
                  disabled={loadingHint || !currentQ}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium glass hover:bg-primary/20 text-accent transition-colors disabled:opacity-40"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-accent" />
                  {loadingHint ? "Fetching hint…" : "Need a hint?"}
                </button>
              </div>

              {loading && !currentQ ? (
                <div className="flex items-center gap-2 text-muted-foreground py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Generating interview question…
                </div>
              ) : (
                <p className="text-lg md:text-xl font-medium leading-relaxed text-foreground">
                  {currentQ}
                </p>
              )}
            </div>

            {/* Hint Box */}
            {hint && (
              <div className="mt-4 p-3 rounded-xl bg-accent/10 border border-accent/20 text-xs text-foreground/90 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-accent">Coach's Hint: </span>
                  {hint}
                </div>
              </div>
            )}
          </div>

          {/* Answer Box */}
          <div className="glass rounded-2xl p-6 border border-border/50 flex-1 flex flex-col">
            <div className="text-xs text-primary uppercase tracking-wider mb-2 font-semibold flex justify-between items-center">
              <span>Your Candidate Answer</span>
              <span className="text-muted-foreground text-[10px] normal-case">
                {stt.transcript.length} characters
              </span>
            </div>

            <textarea
              value={stt.transcript}
              onChange={(e) => stt.setTranscript(e.target.value)}
              placeholder="Speak using the microphone below, or type your structured answer here directly..."
              className="w-full flex-1 min-h-[140px] bg-background/40 p-4 rounded-xl border border-border/40 resize-none focus:outline-none focus:ring-2 focus:ring-primary text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 transition-all"
            />

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-border/40">
              <div className="flex items-center gap-2">
                {!stt.listening ? (
                  <button
                    onClick={stt.start}
                    disabled={!stt.supported || tts.speaking || loading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-xs md:text-sm hover:scale-[1.02] transition-transform disabled:opacity-40 shadow-sm"
                  >
                    <Mic className="w-4 h-4" /> Start Voice Recording
                  </button>
                ) : (
                  <button
                    onClick={stt.stop}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-semibold text-xs md:text-sm animate-pulse"
                  >
                    <Square className="w-4 h-4" /> Stop Recording
                  </button>
                )}

                {tts.speaking && (
                  <button
                    onClick={tts.stop}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-xs text-muted-foreground hover:text-foreground"
                  >
                    <MicOff className="w-3.5 h-3.5" /> Mute AI
                  </button>
                )}
              </div>

              <button
                onClick={submitAnswer}
                disabled={loading || finishing || !currentQ || (!stt.transcript.trim() && !stt.listening)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs md:text-sm hover:scale-[1.02] transition-transform disabled:opacity-40 shadow-md"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SkipForward className="w-4 h-4" />}
                {history.length + 1 >= TOTAL_QUESTIONS ? "Submit & Complete" : "Submit Answer"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {finishing && (
        <div className="glass rounded-xl p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Compiling your interview report, performance analytics, and STAR metrics…
        </div>
      )}
    </div>
  );
}
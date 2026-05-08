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
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/interview")({
  component: InterviewPage,
});

const TOPICS = [
  { id: "DSA", label: "DSA", desc: "Data Structures & Algorithms", icon: Code2 },
  { id: "System Design", label: "System Design", desc: "Scalability & architecture", icon: Network },
  { id: "Core CSE", label: "Core CSE", desc: "OS, DBMS, Networking", icon: Cpu },
  { id: "HR / Behavioral", label: "HR / Behavioral", desc: "Personality & teamwork", icon: Users },
  { id: "Communication Skills", label: "Communication", desc: "English & clarity", icon: MessagesSquare },
];

const TOTAL_QUESTIONS = 5;

type QA = {
  question: string;
  answer: string;
  feedback?: any;
};

function InterviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [topic, setTopic] = useState<string | null>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [history, setHistory] = useState<QA[]>([]);
  const [currentQ, setCurrentQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // Resume states
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const tts = useTTS();
  const stt = useSTT();

  const startedRef = useRef(false);
  
  // Video and ML refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const emotionIntervalRef = useRef<any>(null);
  const [emotionsLog, setEmotionsLog] = useState<any[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);

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
        console.error("Failed to load face-api models", err);
      }
    };
    loadModels();
  }, []);

  // Emotion Tracking Loop
  const startEmotionTracking = () => {
    if (!videoRef.current || !modelsLoaded) return;
    emotionIntervalRef.current = setInterval(async () => {
      if (videoRef.current) {
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
      }
    }, 1000); // Check every second
  };

  async function callAI(payload: any) {
    const { data, error } = await supabase.functions.invoke("interview-ai", {
      body: payload,
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    return data;
  }

  // Resume Upload
  async function handleResumeUpload(file: File) {
    try {
      setResumeFile(file);

      const text = await file.text();

      setResumeText(text);

      toast.success("Resume uploaded successfully");
    } catch (e: any) {
      toast.error("Failed to read resume");
    }
  }

  async function startInterview(t: string) {
    if (!user) return;

    setTopic(t);
    setLoading(true);

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

      if (error) throw error;

      setInterviewId(interview.id);

      // Start Recording and Camera
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
        
        // Wait a bit for video to play then start tracking
        setTimeout(startEmotionTracking, 1000);
      } catch (err) {
        toast.error("Could not access camera/mic for recording.");
      }

      // AI Question
      const res = await callAI({
        action: "next_question",
        topic: t,
        resume: resumeText,
        history: [],
      });

      setCurrentQ(res.question);

      tts.speak(res.question);
    } catch (e: any) {
      toast.error(e.message);
      setTopic(null);
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (!currentQ || !interviewId || !user || !topic) return;

    stt.stop();
    tts.stop();

    setLoading(true);

    const answer = stt.transcript;

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

      await supabase.from("interview_questions").insert({
        interview_id: interviewId,
        user_id: user.id,
        order_index: newHistory.length - 1,
        question: currentQ,
        user_answer: answer,
        ai_feedback: feedback,
        score: feedback.score,
      });

      // Finish Interview
      if (newHistory.length >= TOTAL_QUESTIONS) {
        await finishInterview(newHistory);
        return;
      }

      // Next Question
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

      tts.speak(next.question);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function finishInterview(qa: QA[]) {
    if (!interviewId) return;

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

    await supabase
      .from("interviews")
      .update({
        score,
        metrics,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", interviewId);

    // Stop Media Recorder and Tracking
    if (emotionIntervalRef.current) clearInterval(emotionIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        
        // 1. Download Local Copy
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `interview-${interviewId}.webm`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        // 2. We can upload to Supabase here if needed (Dual Save)
        // supabase.storage.from('interviews').upload(...)
      };
      mediaRecorderRef.current.stop();
      
      // Stop webcam tracks
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }

    // Save Emotion Log in LocalStorage for Results Page (or Supabase)
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

  // TOPIC SELECTION SCREEN
  if (!topic) {
    return (
      <div className="max-w-5xl mx-auto pb-24 md:pb-0">

        <h1 className="text-3xl font-bold mb-2">
          Choose your interview track
        </h1>

        <p className="text-muted-foreground mb-8">
          5 questions, voice-powered. Upload resume for personalized questions.
        </p>

        {/* Resume Upload */}
        <div className="glass rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-primary" />

            <div>
              <h3 className="font-semibold">Upload Resume</h3>

              <p className="text-sm text-muted-foreground">
                AI will generate questions from your resume
              </p>
            </div>
          </div>

          <label className="flex items-center justify-center gap-3 border border-dashed border-border rounded-xl p-6 cursor-pointer hover:bg-muted/30 transition">

            <Upload className="w-5 h-5" />

            <span className="text-sm font-medium">
              {resumeFile ? resumeFile.name : "Choose Resume File"}
            </span>

            <input
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (file) {
                  handleResumeUpload(file);
                }
              }}
            />
          </label>
          
          {resumeText && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => startInterview("Resume Based")}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold hover:scale-[1.02] transition-transform shadow-[0_0_20px_-5px_rgba(34,211,238,0.5)] flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Start Resume Interview
              </button>
            </div>
          )}
        </div>

        {/* Browser support */}
        {!stt.supported && (
          <div className="glass rounded-xl p-4 mb-6 text-sm text-destructive">
            Your browser doesn't support speech recognition.
            Use Chrome or Edge for full experience.
          </div>
        )}

        {/* Topics */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {TOPICS.map(({ id, label, desc, icon: Icon }) => (
            <button
              key={id}
              onClick={() => startInterview(id)}
              className="glass rounded-2xl p-6 text-left hover:-translate-y-1 transition-transform hover:glow-primary"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-primary-foreground" />
              </div>

              <div className="font-semibold text-lg">
                {label}
              </div>

              <div className="text-sm text-muted-foreground mt-1">
                {desc}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // INTERVIEW SCREEN
  return (
    <div className="max-w-4xl mx-auto pb-24 md:pb-0">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">

        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Interview · {topic}
          </div>

          <div className="text-sm text-muted-foreground">
            Question {Math.min(history.length + 1, TOTAL_QUESTIONS)} of {TOTAL_QUESTIONS}
          </div>
        </div>

        <div className="w-32 h-1.5 bg-muted/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all"
            style={{
              width: `${(history.length / TOTAL_QUESTIONS) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Video & AI */}
        <div className="md:col-span-1 flex flex-col gap-6">
          {/* Webcam View */}
          <div className="glass rounded-3xl p-4 flex flex-col items-center">
            <div className="w-full aspect-video bg-black/40 rounded-xl overflow-hidden relative border border-cyan-500/20 shadow-[0_0_15px_-3px_rgba(34,211,238,0.3)]">
              <video 
                ref={videoRef}
                autoPlay 
                muted 
                playsInline
                className="w-full h-full object-cover transform -scale-x-100"
              />
              <div className="absolute top-2 right-2 flex items-center gap-2 bg-black/50 px-2 py-1 rounded-md text-xs text-red-400 font-medium backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                REC & AI Analyzing
              </div>
            </div>
            <div className="mt-4 text-xs text-cyan-300 text-center uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
               <Cpu className="w-3 h-3 animate-pulse" /> Live Remote Analysis
            </div>
          </div>

          {/* AI Card */}
          <div className="glass rounded-3xl p-6 text-center flex-1">
            <AIAvatar
              size="lg"
              speaking={tts.speaking}
              question={currentQ}
              className="mx-auto"
            />
          </div>
        </div>

        {/* Right Column: Q&A */}
        <div className="md:col-span-2 flex flex-col">
          <div className="glass rounded-3xl p-8 flex-1 flex flex-col">
            <div className="mb-6 min-h-[60px]">
              {loading && !currentQ ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparing question…
                </div>
              ) : (
                <p className="text-xl font-medium leading-relaxed">
                  {currentQ}
                </p>
              )}
            </div>

            {/* Answer Section */}
            <div className="bg-black/20 rounded-2xl p-6 mt-auto border border-cyan-500/10 backdrop-blur-xl flex flex-col">
              <div className="text-xs text-cyan-400 uppercase tracking-wider mb-3 font-semibold flex justify-between items-center">
                <span>Your Answer Feed</span>
                <span className="text-muted-foreground text-[10px] normal-case font-normal">Speak or type your answer</span>
              </div>

              <textarea
                value={stt.transcript}
                onChange={(e) => stt.setTranscript(e.target.value)}
                placeholder="Tap the mic and start speaking, or type your answer here..."
                className="min-h-[120px] w-full bg-transparent border-none resize-none focus:outline-none text-base leading-relaxed text-gray-100 placeholder:text-muted-foreground placeholder:italic focus:not-italic"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Answer Controls Section */}
      <div className="glass rounded-2xl p-6 mt-6">



        {/* Buttons */}
        <div className="flex flex-wrap gap-3 mt-6">

          {!stt.listening ? (
            <button
              onClick={stt.start}
              disabled={!stt.supported || tts.speaking || loading}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold disabled:opacity-50"
            >
              <Mic className="w-4 h-4" />
              Start recording
            </button>
          ) : (
            <button
              onClick={stt.stop}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-destructive text-destructive-foreground font-semibold"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          )}

          <button
            onClick={submitAnswer}
            disabled={loading || finishing || !currentQ}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl glass font-medium disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <SkipForward className="w-4 h-4" />
            )}

            {history.length + 1 >= TOTAL_QUESTIONS
              ? "Submit & Finish"
              : "Submit Answer"}
          </button>

          {tts.speaking && (
            <button
              onClick={tts.stop}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl glass"
            >
              <MicOff className="w-4 h-4" />
              Mute AI
            </button>
          )}
        </div>
      </div>

      {/* Finishing */}
      {finishing && (
        <div className="mt-6 text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Compiling your results…
        </div>
      )}
    </div>
    
  );
}
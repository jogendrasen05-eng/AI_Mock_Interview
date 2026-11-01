import { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Download,
  Trash2,
  Sparkles,
  Code2,
  FileText,
  MessageSquareQuote,
  Server,
  CornerDownLeft,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTTS, useSTT } from "@/hooks/use-speech";

type ModeKey = "technical" | "behavioral" | "resume" | "coding" | "general";

type PracticeMode = {
  id: ModeKey;
  title: string;
  shortLabel: string;
  icon: any;
  accentColor: string;
  badge: string;
  welcome: string;
  starters: string[];
};

const PRACTICE_MODES: Record<ModeKey, PracticeMode> = {
  general: {
    id: "general",
    title: "General Interview Prep",
    shortLabel: "General Prep",
    icon: Sparkles,
    accentColor: "from-cyan-400 to-blue-500",
    badge: "Prep Coach",
    welcome:
      "Hello! 👋 I'm your AI Interview Coach. I can help you prepare questions, polish your elevator pitch, build interview confidence, and navigate tough interview scenarios. How can I help you today?",
    starters: [
      "What are 5 intelligent questions I should ask the interviewer at the end?",
      "How do I answer: 'Tell me about yourself' for a software engineer role?",
      "How do I handle a question when I don't know the answer?",
      "What are the best tips to negotiate my salary after an offer?",
    ],
  },
  technical: {
    id: "technical",
    title: "Technical & System Design",
    shortLabel: "Technical / System Design",
    icon: Server,
    accentColor: "from-blue-500 to-indigo-500",
    badge: "Architecture & Fundamentals",
    welcome:
      "Welcome to Technical Interview Prep! 💻 Let's drill down into System Design, backend architectures, concurrency, databases, and trade-offs. What topic or problem do you want to explore?",
    starters: [
      "How do I design a scalable URL shortener like bit.ly?",
      "Explain the trade-offs between SQL and NoSQL databases.",
      "How does Redis caching prevent database cache stampedes?",
      "What happens step-by-step when typing a URL in the browser?",
    ],
  },
  behavioral: {
    id: "behavioral",
    title: "Behavioral & STAR Method",
    shortLabel: "Behavioral (STAR)",
    icon: MessageSquareQuote,
    accentColor: "from-purple-500 to-pink-500",
    badge: "STAR Method",
    welcome:
      "Welcome to Behavioral Coaching! 🤝 We'll practice structuring your experiences using the STAR method (Situation, Task, Action, Result) to impress recruiters and hiring managers. Share a story or ask for a practice question!",
    starters: [
      "How do I answer 'Tell me about a time you handled a conflict' using STAR?",
      "Review my story: We were behind deadline so I reorganized the sprint backlog...",
      "How should I answer 'What is your greatest weakness' without sounding cliché?",
      "Give me a behavioral question about handling failure and how to answer it.",
    ],
  },
  resume: {
    id: "resume",
    title: "Resume & Bullet Points Reviewer",
    shortLabel: "Resume Reviewer",
    icon: FileText,
    accentColor: "from-emerald-400 to-teal-500",
    badge: "ATS & XYZ Formula",
    welcome:
      "Welcome to Resume Review! 📄 Paste any resume bullet point, summary, or project description. I will review it using Google's XYZ formula (Accomplished X, measured by Y, by doing Z) and optimize it for ATS keywords.",
    starters: [
      "Rewrite this bullet point with quantifiable impact: 'Created user dashboard using React'",
      "What are strong power verbs to replace 'Responsible for' on my resume?",
      "Review my professional summary: 'Passionate developer with 3 years experience...'",
      "How do I showcase side projects on a resume if I don't have senior experience?",
    ],
  },
  coding: {
    id: "coding",
    title: "Coding & DSA Coach",
    shortLabel: "Coding / DSA",
    icon: Code2,
    accentColor: "from-amber-400 to-orange-500",
    badge: "LeetCode & Algorithms",
    welcome:
      "Welcome to Coding & DSA Mentorship! ⚡ I'll guide you step-by-step through algorithmic intuition, brute force, optimal approaches, and Big-O time/space complexity without giving away the answers immediately unless you want them.",
    starters: [
      "Guide me through solving the Two Sum problem optimally.",
      "Explain the sliding window technique with an example problem.",
      "How do I approach Dynamic Programming problems systematically?",
      "Give me a mock question on Binary Search Trees with edge cases.",
    ],
  },
};

type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: string;
};

// Code block with Copy button component
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-cyan-500/20 bg-[#090d1a]">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#0d1527] border-b border-cyan-500/10 text-xs text-cyan-300 font-mono">
        <span>{language || "code"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-white/10"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3 text-xs overflow-x-auto text-gray-200 font-mono leading-relaxed">
        <pre className="!bg-transparent !p-0 !m-0">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

export default function AIChatbot() {
  const [mode, setMode] = useState<ModeKey>("general");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSpeechMsgId, setActiveSpeechMsgId] = useState<string | null>(null);

  const activeModeConfig = PRACTICE_MODES[mode];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init-1",
      role: "ai",
      text: PRACTICE_MODES.general.welcome,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Speech TTS & STT hooks
  const { speak, stop: stopTTS, speaking } = useTTS();
  const { start: startSTT, stop: stopSTT, listening, transcript, reset: resetSTT, supported: sttSupported } = useSTT();

  // Scroll to bottom whenever messages update or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Sync speech recognition transcript into input
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Handle mode switch
  const handleModeChange = (newMode: ModeKey) => {
    if (newMode === mode) return;
    setMode(newMode);
    stopTTS();
    setActiveSpeechMsgId(null);
    if (listening) stopSTT();

    // Reset conversation for the newly chosen mode
    const welcomeMsg: Message = {
      id: "mode-welcome-" + Date.now(),
      role: "ai",
      text: PRACTICE_MODES[newMode].welcome,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([welcomeMsg]);
  };

  // Toggle voice dictation (STT)
  const toggleListening = () => {
    if (listening) {
      stopSTT();
    } else {
      resetSTT();
      startSTT();
    }
  };

  // Toggle speech synthesis (TTS) for a message
  const handleToggleSpeech = (msg: Message) => {
    if (speaking && activeSpeechMsgId === msg.id) {
      stopTTS();
      setActiveSpeechMsgId(null);
    } else {
      stopTTS();
      setActiveSpeechMsgId(msg.id);
      speak(msg.text, {
        onEnd: () => setActiveSpeechMsgId(null),
      });
    }
  };

  // Send message
  async function sendMessage(textToSend?: string) {
    const text = (textToSend !== undefined ? textToSend : input).trim();
    if (!text || loading) return;

    if (listening) {
      stopSTT();
      resetSTT();
    }

    const userMessage: Message = {
      id: "user-" + Date.now(),
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          mode: mode,
          // Exclude the initial welcome message from history payload
          history: messages.slice(1).map((m) => ({
            role: m.role,
            text: m.text,
          })),
        }),
      });

      let replyText = "";
      if (!res.ok) {
        let errDetail = `Server returned HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          errDetail = errJson.reply || errJson.error || errJson.message || errDetail;
        } catch (_) {}
        replyText = `⚠️ Error: ${errDetail}`;
      } else {
        const data = await res.json();
        replyText = data.reply || data.error || "Sorry, I encountered an issue processing your request.";
      }

      const aiMessage: Message = {
        id: "ai-" + Date.now(),
        role: "ai",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: "err-" + Date.now(),
        role: "ai",
        text: "Could not connect to the interview assistant server. Please ensure the backend server is running and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  // Clear chat
  const handleClearChat = () => {
    stopTTS();
    setActiveSpeechMsgId(null);
    setMessages([
      {
        id: "reset-" + Date.now(),
        role: "ai",
        text: activeModeConfig.welcome,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Export chat transcript as Markdown
  const handleExportChat = () => {
    let transcriptContent = `# Interview Sarthi - Practice Session Transcript\n`;
    transcriptContent += `**Practice Track:** ${activeModeConfig.title}\n`;
    transcriptContent += `**Date:** ${new Date().toLocaleString()}\n\n---\n\n`;

    messages.forEach((m) => {
      const speaker = m.role === "user" ? "Candidate" : "AI Coach";
      transcriptContent += `### [${m.timestamp}] ${speaker}:\n\n${m.text}\n\n`;
    });

    const blob = new Blob([transcriptContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `InterviewSarthi_${mode}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-[760px] rounded-3xl overflow-hidden border border-cyan-500/20 bg-[#050816] shadow-[0_0_60px_-15px_rgba(34,211,238,0.15)] flex flex-col">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-cyan-500/15 bg-black/30 backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div
            className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${activeModeConfig.accentColor} flex items-center justify-center shadow-[0_0_25px_-5px_rgba(34,211,238,0.4)]`}
          >
            <activeModeConfig.icon className="w-6 h-6 text-white" />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#050816]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Interview Sarthi Assistant
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-medium">
                {activeModeConfig.badge}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Personalized mock interview & career preparation coach
            </p>
          </div>
        </div>

        {/* Top actions: Export & Clear */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleExportChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/20 bg-white/5 hover:bg-cyan-500/10 text-xs text-gray-300 hover:text-cyan-300 transition-all cursor-pointer"
            title="Download conversation transcript as Markdown"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            onClick={handleClearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-red-500/10 text-xs text-gray-400 hover:text-red-400 transition-all cursor-pointer"
            title="Reset conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Practice Mode Switcher Pills */}
      <div className="px-6 py-2.5 border-b border-cyan-500/10 bg-[#080d1e]/80 overflow-x-auto flex items-center gap-2 scrollbar-thin">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mr-1 shrink-0">
          Track:
        </span>
        {(Object.keys(PRACTICE_MODES) as ModeKey[]).map((key) => {
          const m = PRACTICE_MODES[key];
          const Icon = m.icon;
          const isSelected = mode === key;
          return (
            <button
              key={key}
              onClick={() => handleModeChange(key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? "bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 shadow-[0_0_15px_-3px_rgba(34,211,238,0.3)]"
                  : "bg-white/5 border border-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{m.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.06),transparent_50%)]">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const isSpeakingThis = speaking && activeSpeechMsgId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} group`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-5 py-4 shadow-lg transition-all ${
                  isUser
                    ? "bg-gradient-to-r from-primary to-cyan-600 text-white rounded-tr-sm"
                    : "bg-[#0f172a]/90 border border-cyan-500/15 text-gray-100 rounded-tl-sm backdrop-blur-xl"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0">
                    {isUser ? (
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-white" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
                        <Bot className="w-3.5 h-3.5 text-cyan-300" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-sm leading-relaxed overflow-hidden">
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
                        <ReactMarkdown
                          components={{
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || "");
                              const codeString = String(children).replace(/\n$/, "");
                              if (!inline && (match || codeString.includes("\n"))) {
                                return (
                                  <CodeBlock
                                    language={match ? match[1] : ""}
                                    code={codeString}
                                  />
                                );
                              }
                              return (
                                <code
                                  className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/20 text-cyan-200 font-mono text-xs"
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer metadata & actions */}
                <div
                  className={`mt-2 pt-1 border-t flex items-center justify-between text-[10px] ${
                    isUser
                      ? "border-white/10 text-cyan-100/70"
                      : "border-white/5 text-gray-400"
                  }`}
                >
                  <span>{msg.timestamp}</span>

                  {!isUser && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleSpeech(msg)}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                          isSpeakingThis
                            ? "bg-cyan-400/20 text-cyan-300 animate-pulse"
                            : "hover:bg-white/10 text-gray-400 hover:text-white"
                        }`}
                        title={isSpeakingThis ? "Stop speaking" : "Listen out loud"}
                      >
                        {isSpeakingThis ? (
                          <>
                            <VolumeX className="w-3 h-3 text-cyan-300" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>Listen</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading typing bubble */}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm px-5 py-3.5 bg-[#0f172a]/90 border border-cyan-500/20 flex items-center gap-3">
              <Bot className="w-4 h-4 text-cyan-300 animate-pulse" />
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.15s]" />
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.3s]" />
              </div>
              <span className="text-xs text-gray-400 ml-1">Analyzing & formulating response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Starter Chips */}
      <div className="px-6 py-2 border-t border-cyan-500/10 bg-[#060a18]/90">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          <span className="text-[11px] text-cyan-400/80 font-semibold shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Quick Prompts:
          </span>
          {activeModeConfig.starters.map((starter, index) => (
            <button
              key={index}
              onClick={() => sendMessage(starter)}
              disabled={loading}
              className="shrink-0 text-left px-3 py-1 rounded-full text-xs bg-cyan-500/5 hover:bg-cyan-500/15 border border-cyan-500/20 text-cyan-200/90 hover:text-cyan-100 transition-all truncate max-w-[260px] disabled:opacity-50 cursor-pointer"
              title={starter}
            >
              {starter}
            </button>
          ))}
        </div>
      </div>

      {/* Input Composer */}
      <div className="p-4 sm:p-5 border-t border-cyan-500/15 bg-black/40 backdrop-blur-xl">
        {/* Listening indicator */}
        {listening && (
          <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            <span>Listening... Speak into your microphone. Click mic again to stop.</span>
          </div>
        )}

        <div className="flex items-end gap-2.5">
          <div className="flex-1 relative rounded-2xl border border-cyan-500/20 bg-[#0b1120] focus-within:border-cyan-400/60 focus-within:ring-1 focus-within:ring-cyan-400/30 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder={`Ask anything about ${activeModeConfig.title.toLowerCase()}... (Shift + Enter for new line)`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="w-full max-h-32 min-h-[50px] resize-none px-4 py-3.5 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
            />
          </div>

          {/* Voice Input Mic Button */}
          {sttSupported && (
            <button
              type="button"
              onClick={toggleListening}
              className={`h-[50px] w-[50px] rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                listening
                  ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse"
                  : "bg-white/5 border border-cyan-500/20 text-gray-300 hover:text-cyan-300 hover:bg-cyan-500/10"
              }`}
              title={listening ? "Stop microphone" : "Speak with voice"}
            >
              {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}

          {/* Send Button */}
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="h-[50px] px-5 rounded-2xl bg-gradient-to-r from-primary to-cyan-500 text-white font-medium shadow-[0_0_25px_-5px_rgba(34,211,238,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:scale-100 flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Send</span>
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 px-1">
          <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for line break</span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3" />
            Powered by Gemini AI
          </span>
        </div>
      </div>
    </div>
  );
}
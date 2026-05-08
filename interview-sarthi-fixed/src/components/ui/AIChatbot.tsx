import { useState } from "react";
import { Send, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "ai";
  text: string;
};

export default function AIChatbot() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Hi 👋 I’m your AI Interview Assistant. Ask me anything.",
    },
  ]);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      text: input,
    };

    setMessages((prev) => [...prev, userMessage]);

    const currentInput = input;

    setInput("");

    setLoading(true);

    try {
      const res = await fetch("/api/chat",{
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
          // Exclude the first welcome message and the current user message being sent
          history: messages.slice(1), 
        }),
      });

      const data = await res.json();

      const aiMessage: Message = {
        role: "ai",
        text: data.reply,
      };

      setMessages((prev) => [...prev, aiMessage]);

    } catch (error) {
      console.log(error);
    }

    setLoading(false);
  }

  return (
    <div className="w-full h-[700px] rounded-3xl overflow-hidden border border-cyan-500/10 bg-[#050816] shadow-[0_0_60px_-12px_rgba(34,211,238,0.12)] flex flex-col">

      <div className="flex items-center justify-between px-6 py-5 border-b border-cyan-500/10 bg-black/20 backdrop-blur-xl">

        <div className="flex items-center gap-4">

          <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-primary flex items-center justify-center shadow-[0_0_30px_-8px_rgba(34,211,238,0.5)]">

            <Bot className="w-7 h-7 text-white" />

            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-cyan-300 border-2 border-[#050816]" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">
              AI Interview Assistant
            </h2>

            <div className="flex items-center gap-2 text-sm text-cyan-300">
              <div className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
              Online
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.06),transparent_40%)]">

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user"
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-5 py-4 shadow-lg ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-primary to-cyan-500 text-white"
                  : "bg-[#0f172a]/80 border border-cyan-500/10 text-gray-100 backdrop-blur-xl"
              }`}
            >

              <div className="flex items-start gap-3">

                <div className="mt-1">
                  {msg.role === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4 text-cyan-300" />
                  )}
                </div>

                <div className="text-sm leading-relaxed prose prose-invert max-w-none">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">

            <div className="rounded-2xl px-5 py-4 bg-[#0f172a]/80 border border-cyan-500/10">

              <div className="flex items-center gap-2">

                <div className="w-2 h-2 rounded-full bg-cyan-300 animate-bounce" />

                <div className="w-2 h-2 rounded-full bg-cyan-300 animate-bounce delay-150" />

                <div className="w-2 h-2 rounded-full bg-cyan-300 animate-bounce delay-300" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 border-t border-cyan-500/10 bg-black/20 backdrop-blur-xl">

        <div className="flex items-center gap-3">

          <input
            type="text"
            placeholder="Ask anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
            className="flex-1 h-14 rounded-2xl border border-cyan-500/10 bg-[#0b1120] px-5 text-white placeholder:text-gray-500 outline-none focus:border-cyan-300/40"
          />

          <button
            onClick={sendMessage}
            disabled={loading}
            className="h-14 px-6 rounded-2xl bg-gradient-to-r from-primary to-cyan-500 text-white font-semibold shadow-[0_0_25px_-8px_rgba(34,211,238,0.6)] hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>

        </div>
      </div>
    </div>
  );
}
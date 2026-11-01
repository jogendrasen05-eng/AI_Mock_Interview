import { createFileRoute } from "@tanstack/react-router";
import AIChatbot from "@/components/ui/AIChatbot";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/chat")({
  component: ChatPage,
});

function ChatPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 border border-primary/20 text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            Interview Coach
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          AI Preparation Assistant
        </h1>
        <p className="text-sm text-muted-foreground">
          Practice Technical, Behavioral, Coding, and Resume questions with interactive AI coaching and voice feedback.
        </p>
      </div>

      <AIChatbot />
    </div>
  );
}
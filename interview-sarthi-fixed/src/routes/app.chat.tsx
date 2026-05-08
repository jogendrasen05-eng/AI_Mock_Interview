import { createFileRoute } from "@tanstack/react-router";
import AIChatbot from "@/components/ui/AIChatbot";

export const Route = createFileRoute("/app/chat")({
  component: ChatPage,
});

function ChatPage() {
  return (
    <div className="min-h-screen bg-[#050816] p-6">
      <div className="max-w-6xl mx-auto">
        <AIChatbot />
      </div>
    </div>
  );
}
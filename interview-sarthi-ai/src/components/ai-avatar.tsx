import { cn } from "@/lib/utils";
import { MessageCircle } from "lucide-react";

interface AIAvatarProps {
  speaking?: boolean;
  question?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "w-20 h-20",
  md: "w-32 h-32",
  lg: "w-48 h-48",
  xl: "w-40 h-40",
};

export function AIAvatar({
  speaking = false,
  question = "Tell me about yourself.",
  size = "lg",
  className,
}: AIAvatarProps) {
  return (
    <div className={cn("relative flex flex-col items-center", className)}>

      {/* Question Bubble */}
      {speaking && (
        <div className="mb-4 max-w-xs rounded-2xl border border-border bg-background/80 px-4 py-3 shadow-lg backdrop-blur-md animate-in fade-in zoom-in duration-300">
          <div className="flex items-start gap-2">
            <MessageCircle className="mt-1 h-4 w-4 text-cyan-300" />

            <p className="text-sm font-medium text-foreground">
              {question}
            </p>
          </div>
        </div>
      )}

      {/* Avatar */}
      <div className="relative flex items-center justify-center">

        {/* Soft Speaking Effect */}
        {speaking && (
          <>
            <span className="absolute inset-0 rounded-full border border-cyan-300/30 animate-pulse" />
            <span className="absolute -inset-2 rounded-full border border-cyan-300/10 animate-pulse [animation-delay:0.8s]" />
          </>
        )}

        {/* Main Avatar */}
        <div
          className={cn(
            sizes[size],
            "relative overflow-hidden rounded-full",
            "bg-[conic-gradient(from_180deg,oklch(0.72_0.18_270),oklch(0.85_0.12_180),oklch(0.82_0.17_80),oklch(0.72_0.18_270))]",
            "shadow-[0_0_35px_-8px_oklch(0.72_0.18_270/0.4)]",
            speaking && "scale-[1.02] transition-transform duration-300"
          )}
        >

          {/* Moving Shine */}
          {speaking && (
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div className="absolute -left-10 top-0 h-full w-10 rotate-12 bg-white/20 blur-xl animate-[shine_3s_linear_infinite]" />
            </div>
          )}

          {/* Inner Circle */}
          <div className="absolute inset-2 flex items-center justify-center rounded-full bg-background/70 backdrop-blur-xl">

            <div className="relative flex flex-col items-center justify-center">

              {/* Eyes */}
              <div className="mb-4 flex gap-4">
                <div
                  className={cn(
                    "h-3 w-3 rounded-full bg-cyan-300",
                    speaking && "animate-pulse"
                  )}
                />
                <div
                  className={cn(
                    "h-3 w-3 rounded-full bg-cyan-300",
                    speaking && "animate-pulse"
                  )}
                />
              </div>

              {/* Mouth */}
              <div
                className={cn(
                  "rounded-full bg-cyan-300 transition-all duration-200",
                  speaking
                    ? "w-8 h-2 animate-[talk_1.2s_ease-in-out_infinite]"
                    : "w-5 h-1"
                )}
              />

              {/* Soft Center Glow */}
              <div className="absolute h-24 w-24 rounded-full bg-cyan-400/10 blur-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
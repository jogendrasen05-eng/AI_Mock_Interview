// Edge function for InterviewSarthi AI: generate next question OR evaluate answer.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_INTERVIEWER = `You are InterviewSarthi, a friendly but rigorous AI interviewer.
Ask exactly ONE concise interview question at a time on the given topic.
Keep questions 1-2 sentences, natural spoken tone, progressively harder.
Do NOT include numbering, prefaces, or "Question:" labels. Just the question text.`;

const SYSTEM_EVALUATOR = `You are an expert interview evaluator. Given a question and the candidate's answer, return ONLY valid JSON matching this schema:
{
  "score": number (0-100 overall),
  "accuracy": number (0-100),
  "clarity": number (0-100),
  "confidence": number (0-100),
  "technical": number (0-100),
  "english": number (0-100),
  "strengths": string[] (1-3 short bullets),
  "weaknesses": string[] (1-3 short bullets),
  "improvements": string[] (1-3 actionable bullets),
  "model_answer": string (1-3 sentence ideal answer)
}
Be fair but honest. No prose outside the JSON.`;

async function callAI(messages: any[], jsonMode = false) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const body: any = {
    model: "google/gemini-2.5-flash",
    messages,
  };
  if (jsonMode) body.response_format = { type: "json_object" };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429) throw new Error("Rate limit exceeded. Try again soon.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add funds in Workspace Settings.");
    throw new Error(`AI gateway error ${res.status}: ${txt}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action, topic, history, question, answer, resume } = await req.json();

    if (action === "next_question") {
      const resumeContext = resume ? `\nCandidate Resume Context:\n${resume.substring(0, 3000)}\n(Generate questions heavily tailored to the skills and experiences found in this resume)` : "";
      
      const msgs = [
        { role: "system", content: SYSTEM_INTERVIEWER },
        {
          role: "user",
          content: `Topic: ${topic}${resumeContext}\nPrevious Q&A:\n${
            (history || [])
              .map((h: any, i: number) => `${i + 1}. Q: ${h.question}\nA: ${h.answer ?? "(skipped)"}`)
              .join("\n") || "(none yet — ask the opening question)"
          }\n\nAsk the next question.`,
        },
      ];
      const out = await callAI(msgs);
      return new Response(JSON.stringify({ question: out.trim() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "evaluate") {
      const msgs = [
        { role: "system", content: SYSTEM_EVALUATOR },
        { role: "user", content: `Topic: ${topic}\nQuestion: ${question}\nCandidate Answer: ${answer || "(no answer)"}` },
      ];
      const raw = await callAI(msgs, true);
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { score: 0, accuracy: 0, clarity: 0, confidence: 0, technical: 0, english: 0, strengths: [], weaknesses: ["Could not parse evaluation"], improvements: [], model_answer: "" };
      }
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("interview-ai error:", e);
    return new Response(JSON.stringify({ error: e.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

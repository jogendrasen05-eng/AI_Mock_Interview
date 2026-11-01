import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
];

// Helper to run Gemini requests with automatic fallback
async function generateWithFallback(options) {
  let lastError = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: options.systemInstruction,
        generationConfig: options.generationConfig,
      });

      if (options.chat) {
        const chat = model.startChat({
          history: options.history || [],
          generationConfig: options.generationConfig || {
            maxOutputTokens: 1500,
            temperature: 0.7,
          },
        });
        const result = await chat.sendMessage(options.message);
        const response = await result.response;
        return response.text();
      } else {
        const result = await model.generateContent(options.prompt);
        const response = await result.response;
        return response.text();
      }
    } catch (err) {
      lastError = err;
      console.warn(`Model ${modelName} encountered error: ${err.message}. Trying next fallback...`);
    }
  }
  throw lastError || new Error("All candidate Gemini models failed.");
}

// Mode-specific system instructions for chatbot
const MODE_SYSTEM_PROMPTS = {
  technical: `You are an elite Senior Technical Interviewer and Staff Systems Architect.
Your role:
- Conduct rigorous technical interview preparation, discuss system design architectures, tradeoffs, scalability, caching, load balancing, and database choices.
- When asked technical concepts, explain them clearly with real-world industry examples.
- When evaluating user answers, point out edge cases, single points of failure, bottlenecks, and optimization opportunities.
- Format responses cleanly with concise bullet points and well-commented code/diagrams where relevant.`,

  behavioral: `You are an Executive Leadership & Behavioral Interview Coach specializing in the STAR method (Situation, Task, Action, Result).
Your role:
- Help candidates structure compelling behavioral interview stories for top tech and Fortune 500 companies.
- Prompt them to emphasize their individual contribution, leadership, conflict resolution, metrics, and key lessons.
- When reviewing a story, give a constructive STAR breakdown: analyze which parts were strong and rewrite or refine weaker areas with high-impact action verbs.`,

  resume: `You are an expert Tech Recruiter and Hiring Manager specializing in resume reviews and ATS optimization.
Your role:
- Review resume bullet points, work experience, project descriptions, and professional summaries.
- Enforce the Google XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]".
- Suggest powerful action verbs, eliminate fluff, ensure quantifiable impact, and recommend relevant industry keywords for ATS filtering.`,

  coding: `You are a Principal Software Engineer and Competitive Programming Coach.
Your role:
- Help users master Data Structures & Algorithms (LeetCode/HackerRank style problems).
- Guide step-by-step: Problem Understanding -> Intuition -> Brute Force -> Optimal Approach -> Time & Space Complexity (Big-O).
- If the user provides code, identify bugs, edge cases, and off-by-one errors.
- Always provide clean, idiomatically written, and well-commented code snippets.`,

  general: `You are Interview Sarthi's AI Interview Coach and Preparation Assistant.
Your role:
- Help users prepare for all phases of job interviews: mindset, confidence, elevator pitch, asking questions to the interviewer, salary negotiation, and mock interview tips.
- Maintain an encouraging, sharp, and structured tone.`,
};

// 1. AI Chatbot API Route
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [], mode = "general" } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is missing in server environment." });
    }

    const systemPrompt = MODE_SYSTEM_PROMPTS[mode] || MODE_SYSTEM_PROMPTS.general;
    const geminiHistory = history.map((msg) => ({
      role: msg.role === "ai" ? "model" : "user",
      parts: [{ text: msg.text }],
    }));

    const text = await generateWithFallback({
      chat: true,
      systemInstruction: systemPrompt,
      history: geminiHistory,
      message,
      generationConfig: {
        maxOutputTokens: 1500,
        temperature: 0.7,
      },
    });

    res.json({ reply: text });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ reply: `Gemini API failed: ${error.message || "Please check server logs."}` });
  }
});

// 2. Mock Interview AI Route (Generate questions & evaluate responses)
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
Be fair but honest. Return pure JSON without extra markdown.`;

app.post("/api/interview", async (req, res) => {
  try {
    const { action, topic, history = [], question, answer, resume, difficulty = "Mid-Level" } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is missing in server environment." });
    }

    if (action === "next_question") {
      const resumeContext = resume
        ? `\nCandidate Resume Context:\n${resume.substring(0, 3000)}\n(Generate questions heavily tailored to the skills and experiences found in this resume)`
        : "";

      const prompt = `Topic: ${topic || "General"}\nTarget Experience Level: ${difficulty}${resumeContext}\nPrevious Q&A:\n${
        history.length > 0
          ? history
              .map((h, i) => `${i + 1}. Q: ${h.question}\nA: ${h.answer ?? "(skipped)"}`)
              .join("\n")
          : "(none yet — ask the opening question calibrated for " + difficulty + " candidate)"
      }\n\nAsk the next question.`;

      const out = await generateWithFallback({
        chat: false,
        systemInstruction: SYSTEM_INTERVIEWER,
        prompt,
      });

      return res.json({ question: out.trim() });
    }

    if (action === "hint") {
      const prompt = `Topic: ${topic || "General"}\nQuestion: ${question || ""}\nCandidate needs a helpful, encouraging hint. Provide exactly 1-2 concise guidance sentences without giving away the complete solution.`;

      const out = await generateWithFallback({
        chat: false,
        systemInstruction: "You are an empathetic interviewer helping a candidate think in the right direction. Give a gentle conceptual hint in 1-2 short sentences.",
        prompt,
      });

      return res.json({ hint: out.trim() });
    }

    if (action === "evaluate") {
      const prompt = `Topic: ${topic || "General"}\nQuestion: ${question || ""}\nCandidate Answer: ${answer || "(no answer)"}`;

      const raw = await generateWithFallback({
        chat: false,
        systemInstruction: SYSTEM_EVALUATOR,
        prompt,
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        const cleaned = raw.replace(/^```json/m, "").replace(/^```/m, "").trim();
        parsed = JSON.parse(cleaned);
      }

      return res.json(parsed);
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error) {
    console.error("Interview API Error:", error);
    res.status(500).json({ error: error.message || "Failed to process interview request" });
  }
});

// 3. Email PDF Report Route
app.post("/api/email", async (req, res) => {
  try {
    const { email, pdfBase64, interviewId, topic } = req.body;

    if (!email || !pdfBase64) {
      return res.status(400).json({ error: "Missing email or PDF data" });
    }

    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
      console.error("Missing SMTP credentials");
      return res.status(500).json({ error: "Email configuration missing. Please check your .env file." });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");

    const mailOptions = {
      from: `"Interview Sarthi" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: `Your Interview Performance Report: ${topic || "Mock Interview"}`,
      text: `Hello,\n\nGreat job completing your interview! Please find attached your performance report for the ${topic || "Mock Interview"} track.\n\nBest regards,\nInterview Sarthi Team`,
      attachments: [
        {
          filename: `Interview_Report_${interviewId || "Result"}.pdf`,
          content: base64Data,
          encoding: "base64",
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);

    res.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Email Error:", error);
    res.status(500).json({ error: "Failed to send email." });
  }
});

export default app;

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

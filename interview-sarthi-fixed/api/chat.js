import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();

// Vercel Serverless Function might not need CORS if deployed on the same domain, 
// but we keep it just in case.
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Define the route
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    
    // Check if key exists
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing");
    }

    // Convert our history format to Gemini's format
    const geminiHistory = history.map((msg) => ({
      role: msg.role === "ai" ? "model" : "user",
      parts: [{ text: msg.text }],
    }));

    const chat = model.startChat({
      history: geminiHistory,
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });

    
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ reply: "Gemini API failed. Please check the API key." });
  }
});

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

    // Remove the data URI prefix if it exists
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

// Export the Express API for Vercel
export default app;
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

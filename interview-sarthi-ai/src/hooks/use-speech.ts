import { useCallback, useEffect, useRef, useState } from "react";

// Lightweight Web Speech API wrappers (browser-native TTS + STT).

export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const speak = useCallback((text: string, opts?: { onEnd?: () => void }) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      opts?.onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1;
    u.lang = "en-US";
    // pick a nicer voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => /female|samantha|google us english|aria|jenny/i.test(v.name)) || voices.find((v) => v.lang.startsWith("en"));
    if (preferred) u.voice = preferred;
    u.onstart = () => setSpeaking(true);
    u.onend = () => {
      setSpeaking(false);
      opts?.onEnd?.();
    };
    u.onerror = () => {
      setSpeaking(false);
      opts?.onEnd?.();
    };
    window.speechSynthesis.speak(u);
  }, []);
  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, []);
  return { speak, stop, speaking };
}

export function useSTT() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let final = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      setTranscript((prev) => (final ? prev + final + " " : prev).concat(interim ? "" : ""));
      if (interim) {
        // show interim by appending temporarily
        setTranscript((prev) => prev.split("◊")[0] + (interim ? "◊" + interim : ""));
      }
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
  }, []);

  const start = useCallback(() => {
    if (!recRef.current) return;
    setTranscript("");
    try {
      recRef.current.start();
      setListening(true);
    } catch {
      /* already started */
    }
  }, []);

  const stop = useCallback(() => {
    if (!recRef.current) return;
    try {
      recRef.current.stop();
    } catch {
      /* noop */
    }
    setListening(false);
  }, []);

  const cleanTranscript = transcript.replace(/◊/g, " ");

  return { start, stop, listening, transcript: cleanTranscript, setTranscript, supported, reset: () => setTranscript("") };
}

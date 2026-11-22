"use client";

import { useEffect, useRef, useState } from "react";

/** ブラウザの音声認識（Chrome・Safari など）。ない場合は undefined */
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function createRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  const Constructor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Constructor ? new Constructor() : null;
}

/**
 * マイクのボタン。話した言葉を文字にして onText に渡す（確定した部分だけ）。
 * 音声認識が使えないブラウザでは何も表示しない。
 */
export function VoiceInput({
  onText,
  disabled,
}: {
  onText: (text: string) => void;
  disabled?: boolean;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => {
    setSupported(createRecognition() !== null);
    return () => recognitionRef.current?.stop();
  }, []);

  const start = () => {
    const recognition = createRecognition();
    if (!recognition) return;
    recognition.lang = "ja-JP";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) onTextRef.current(text);
        else pending += text;
      }
      setInterim(pending);
    };
    recognition.onerror = (event) => {
      setProblem(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "マイクの使用が許可されていません。ブラウザの設定でマイクを許可してください。"
          : event.error === "no-speech"
            ? "声が聞き取れませんでした。もう一度お試しください。"
            : "音声入力がうまく動きませんでした。文字で入力してください。"
      );
    };
    recognition.onend = () => {
      setListening(false);
      setInterim("");
    };
    setProblem(null);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setProblem("音声入力を始められませんでした。文字で入力してください。");
    }
  };

  const stop = () => recognitionRef.current?.stop();

  if (!supported) return null;
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={disabled && !listening}
        aria-pressed={listening}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
          listening
            ? "border-up bg-up text-white"
            : "border-line bg-card text-ink hover:border-accent"
        }`}
      >
        <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-full ${listening ? "animate-pulse bg-white" : "bg-up"}`} />
        {listening ? "聞き取り中…（押すと止まります）" : "話して入力する"}
      </button>
      {interim && <p className="text-sm text-ink-3">{interim}</p>}
      {problem && <p className="text-sm text-up">{problem}</p>}
    </div>
  );
}

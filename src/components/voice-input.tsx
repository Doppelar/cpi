"use client";

import { useEffect, useRef, useState } from "react";

/** ブラウザの音声認識（Chrome・Safari など）。ない場合は undefined */
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
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
  /** まだ確定していない聞き取り途中の言葉（止めたときに入力欄へ入れる） */
  const interimRef = useRef("");
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => {
    setSupported(createRecognition() !== null);
    return () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      recognition?.abort();
    };
  }, []);

  const start = () => {
    const recognition = createRecognition();
    if (!recognition) return;
    recognition.lang = "ja-JP";
    recognition.interimResults = true;
    // iPhone の Safari では続けて聞き取るモードが止まりにくいため、話し終えると自動で止まるモードにする
    recognition.continuous = false;
    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return;
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) onTextRef.current(text);
        else pending += text;
      }
      interimRef.current = pending;
      setInterim(pending);
    };
    recognition.onerror = (event) => {
      // 自分で止めたとき（aborted）や、止めたあとの通知はエラーとして出さない
      if (recognitionRef.current !== recognition || event.error === "aborted") return;
      setProblem(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "マイクの使用が許可されていません。ブラウザの設定でマイクを許可してください。"
          : event.error === "no-speech"
            ? "声が聞き取れませんでした。もう一度お試しください。"
            : "音声入力がうまく動きませんでした。文字で入力してください。"
      );
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      // 確定しないまま終わった言葉も、入力欄に入れる
      if (interimRef.current) onTextRef.current(interimRef.current);
      interimRef.current = "";
      recognitionRef.current = null;
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

  /** 押したらすぐ止める：聞き取り途中の言葉を入力欄に入れてから、聞き取りを打ち切る */
  const stop = () => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (interimRef.current) onTextRef.current(interimRef.current);
    interimRef.current = "";
    setListening(false);
    setInterim("");
    try {
      recognition?.abort();
    } catch {
      try {
        recognition?.stop();
      } catch {
        // すでに止まっている
      }
    }
  };

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
        {listening ? "止める" : "話して入力する"}
      </button>
      {listening && (
        <p className="text-sm text-ink-3">
          {interim || "聞き取り中です。話し終えると自動で止まります。"}
        </p>
      )}
      {problem && <p className="text-sm text-up">{problem}</p>}
    </div>
  );
}

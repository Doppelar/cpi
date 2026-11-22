"use client";

import { useEffect, useState } from "react";

/**
 * 「詳しくない方向け」表示の切り替え。
 * html の data-mode="easy" で、やさしい解説（.easy-only）を出す。
 * 選んだ状態はブラウザに覚えておく（layout の先読みスクリプトが最初に反映する）。
 */
export const MODE_STORAGE_KEY = "cpi-explain-mode";

/** 画面が出る前に、覚えている表示を反映するスクリプト（layout の head に置く） */
export const MODE_INIT_SCRIPT = `try{if(localStorage.getItem("${MODE_STORAGE_KEY}")==="easy"){document.documentElement.dataset.mode="easy"}}catch(e){}`;

export function ModeToggle() {
  const [easy, setEasy] = useState(false);

  useEffect(() => {
    setEasy(document.documentElement.dataset.mode === "easy");
  }, []);

  const toggle = () => {
    const next = !easy;
    setEasy(next);
    if (next) {
      document.documentElement.dataset.mode = "easy";
    } else {
      delete document.documentElement.dataset.mode;
    }
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next ? "easy" : "expert");
    } catch {
      // 保存できなくても、表示の切り替えはできる
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={easy}
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
        easy
          ? "border-[#0ca30c] bg-[#0ca30c]/15 text-ink"
          : "border-line bg-card text-ink-2 hover:text-ink"
      }`}
      title="ONにすると、中学生でもわかるやさしい解説を追加で表示します"
    >
      <span
        aria-hidden
        className={`relative inline-block h-4 w-7 rounded-full transition-colors ${
          easy ? "bg-[#0ca30c]" : "bg-[var(--axis)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
            easy ? "left-3.5" : "left-0.5"
          }`}
        />
      </span>
      詳しくない方向け
      <span className="text-xs font-normal">{easy ? "ON" : "OFF"}</span>
    </button>
  );
}

/** やさしい解説の囲み。「詳しくない方向け」が ON のときだけ見える */
export function EasyNote({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="easy-only rounded-xl border-2 border-[#0ca30c]/40 bg-[#0ca30c]/[0.06] p-4 text-[15px] leading-relaxed text-ink">
      <p className="mb-1.5 flex items-center gap-2 font-bold">
        <span className="rounded-full bg-[#0ca30c] px-2 py-0.5 text-xs text-white">
          やさしい解説
        </span>
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </aside>
  );
}

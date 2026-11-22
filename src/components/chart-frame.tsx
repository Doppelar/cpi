"use client";

import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

type Size = { width: number; height: number };

/**
 * グラフを置く枠。幅と高さを自分で測ってグラフに渡す。
 * ResizeObserver がない古いスマホやアプリ内ブラウザでも、
 * 画面の大きさ・向きが変わったときに測り直して描けるようにする。
 */
export function ChartFrame({
  className,
  children,
}: {
  className: string;
  children: (size: Size) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      if (width <= 0 || height <= 0) return;
      setSize((current) =>
        current && current.width === width && current.height === height
          ? current
          : { width, height }
      );
    };
    measure();
    const observer =
      typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    // フォントの読み込みなどで、少し遅れて大きさが決まる場合に備える
    const timers = [100, 500, 1500].map((ms) => window.setTimeout(measure, ms));
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {size ? children(size) : null}
    </div>
  );
}

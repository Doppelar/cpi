/** 内閣府の基調判断を、色つきの札（記号と文字）で表す。色だけに頼らない */
const STYLES: Record<string, { mark: string; className: string }> = {
  改善: { mark: "↗", className: "bg-[#0ca30c]/15 text-[#006300] dark:text-[#5fd35f]" },
  足踏み: { mark: "→", className: "bg-[#fab219]/20 text-[#7a5200] dark:text-[#fab219]" },
  上方への局面変化: {
    mark: "⤴",
    className: "bg-[#0ca30c]/10 text-[#006300] dark:text-[#5fd35f]",
  },
  下方への局面変化: {
    mark: "⤵",
    className: "bg-[#ec835a]/20 text-[#8a3a17] dark:text-[#ec835a]",
  },
  悪化: { mark: "↘", className: "bg-[#d03b3b]/15 text-[#a32626] dark:text-[#e66767]" },
  下げ止まり: { mark: "→", className: "bg-[#fab219]/20 text-[#7a5200] dark:text-[#fab219]" },
};

export function JudgmentBadge({
  label,
  size = "sm",
}: {
  label: string | null;
  size?: "sm" | "lg";
}) {
  if (!label) return null;
  const style = STYLES[label] ?? { mark: "・", className: "bg-surface-2 text-ink" };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold ${style.className} ${
        size === "lg" ? "px-4 py-1.5 text-xl" : "px-2.5 py-0.5 text-sm"
      }`}
    >
      <span aria-hidden>{style.mark}</span>
      {label}
    </span>
  );
}

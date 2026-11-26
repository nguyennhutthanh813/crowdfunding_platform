import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Hiển thị văn bản AI dạng markdown tối giản (in đậm, gạch đầu dòng, xuống dòng) — không dùng innerHTML. */
function inline(text: string, keyBase: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={`${keyBase}-${i}`} className="font-bold text-fg">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={`${keyBase}-${i}`}>{p}</Fragment>
    ),
  );
}

export function AiRichText({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flush = (key: string) => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={key} className="my-1 space-y-1 pl-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-current opacity-50" />
            <span className="min-w-0">{inline(b, `${key}-${i}`)}</span>
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    const bullet = /^([-•*]|\d+[.)])\s+(.*)$/.exec(line);
    if (bullet) {
      bullets.push(bullet[2]);
      return;
    }
    flush(`ul-${idx}`);
    if (!line) return;
    blocks.push(
      <p key={`p-${idx}`} className="my-1 first:mt-0 last:mb-0">
        {inline(line.replace(/^#+\s*/, ""), `p-${idx}`)}
      </p>,
    );
  });
  flush("ul-end");

  return <div className={cn("text-sm leading-relaxed", className)}>{blocks}</div>;
}

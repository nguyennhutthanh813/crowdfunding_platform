"use client";

import React from "react";

interface StoryMarkdownProps {
  content: string;
}

export function parseInlineText(text: string): React.ReactNode {
  const tokens: React.ReactNode[] = [];
  // Lưu ý: (!\[(.*?)\]\((.*?)\)) phải đứng trước (\[(.*?)\]\((.*?)\)) để ảnh không bị nhận nhầm thành link
  const regex = /(!\[(.*?)\]\((.*?)\)|\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("![") && token.endsWith(")")) {
      const imgMatch = token.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        const alt = imgMatch[1];
        const url = imgMatch[2];
        tokens.push(
          <span key={match.index} className="my-4 block overflow-hidden rounded-xl border border-line bg-canvas-soft">
            <img
              src={url.trim()}
              alt={alt || "Hình ảnh minh họa"}
              className="max-h-[500px] w-full object-cover"
              loading="lazy"
            />
            {alt ? (
              <span className="block border-t border-line/60 bg-white/90 px-3 py-1.5 text-center text-xs text-ink-muted italic">
                {alt}
              </span>
            ) : null}
          </span>,
        );
      }
    } else if (token.startsWith("**") && token.endsWith("**")) {
      tokens.push(
        <strong key={match.index} className="font-bold text-ink">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      tokens.push(
        <em key={match.index} className="italic text-ink-soft">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        tokens.push(
          <a
            key={match.index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-coral underline hover:text-coral-dark"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        tokens.push(token);
      }
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens.length > 0 ? tokens : text;
}

function splitStoryContent(content: string): string[] {
  const lines = content.split("\n");
  const blocks: string[] = [];
  let currentBlock: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join("\n"));
        currentBlock = [];
      }
      continue;
    }

    // 1. Dòng chứa ảnh độc lập
    if (/^!\[.*?\]\(.*?\)/.test(line)) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join("\n"));
        currentBlock = [];
      }
      // Kiểm tra dòng kế tiếp có phải là chú thích ảnh không
      if (i + 1 < lines.length && /^(\*|_|Hình:)/i.test(lines[i + 1].trim())) {
        blocks.push(line + "\n" + lines[i + 1].trim());
        i++;
      } else {
        blocks.push(line);
      }
      continue;
    }

    // 2. Dòng tiêu đề (#, ##, ###)
    if (/^#{1,3}\s/.test(line)) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join("\n"));
        currentBlock = [];
      }
      blocks.push(line);
      continue;
    }

    currentBlock.push(line);
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join("\n"));
  }

  return blocks;
}

export function StoryMarkdown({ content }: StoryMarkdownProps) {
  if (!content) return null;

  const rawBlocks = splitStoryContent(content);

  return (
    <div className="space-y-6 text-[15px] leading-8 text-ink-soft">
      {rawBlocks.map((block, i) => {
        // 1. Markdown Image: ![alt](url) kèm chú thích nếu có
        const imgBlockMatch = block.match(/^!\[(.*?)\]\((.*?)\)(?:\s*\n+([\s\S]*))?$/);
        if (imgBlockMatch) {
          const [, alt, url, captionRaw] = imgBlockMatch;
          const cleanCaption = captionRaw
            ? captionRaw.replace(/^[\s*_]+|[\s*_]+$/g, "").trim()
            : alt;
          return (
            <figure
              key={i}
              className="my-8 overflow-hidden rounded-[20px] border border-line bg-canvas-soft shadow-xs"
            >
              <img
                src={url.trim()}
                alt={alt || cleanCaption || "Hình ảnh minh họa"}
                className="max-h-[540px] w-full object-cover transition duration-300 hover:scale-[1.01]"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLElement).classList.add("opacity-60");
                }}
              />
              {cleanCaption ? (
                <figcaption className="border-t border-line/60 bg-white/95 px-4 py-2.5 text-center text-xs text-ink-muted italic">
                  {cleanCaption}
                </figcaption>
              ) : null}
            </figure>
          );
        }

        // 2. Table: | Col 1 | Col 2 |
        const tableLines = block.split("\n").map((l) => l.trim());
        const isTable =
          tableLines.length >= 2 &&
          tableLines.every((l) => l.startsWith("|") && l.endsWith("|"));
        if (isTable) {
          const headerRow = tableLines[0]
            .split("|")
            .map((c) => c.trim())
            .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
          const bodyRows = tableLines
            .slice(1)
            .filter((l) => !/^\|[\s\-:]+(\|[\s\-:]+)+\|$/.test(l))
            .map((l) =>
              l
                .split("|")
                .map((c) => c.trim())
                .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1),
            );

          return (
            <div
              key={i}
              className="my-6 overflow-x-auto rounded-2xl border border-line bg-white shadow-xs"
            >
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-[#faf9f5]">
                    {headerRow.map((col, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-3 font-bold text-ink"
                      >
                        {parseInlineText(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {bodyRows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="hover:bg-forest/5 transition-colors"
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-4 py-3 text-ink-soft"
                        >
                          {parseInlineText(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        // 3. Heading 1: # Title
        if (block.startsWith("# ")) {
          return (
            <h2
              key={i}
              className="mt-10 mb-4 font-display text-2xl font-extrabold tracking-[-0.035em] text-forest sm:text-3xl"
            >
              {parseInlineText(block.slice(2).trim())}
            </h2>
          );
        }

        // 4. Heading 2: ## Title
        if (block.startsWith("## ")) {
          return (
            <h2
              key={i}
              className="mt-10 mb-4 font-display text-2xl font-extrabold tracking-[-0.03em] text-forest sm:text-[26px]"
            >
              {parseInlineText(block.slice(3).trim())}
            </h2>
          );
        }

        // 5. Heading 3: ### Title
        if (block.startsWith("### ")) {
          return (
            <h3
              key={i}
              className="mt-8 mb-3 font-display text-xl font-extrabold tracking-[-0.025em] text-ink sm:text-[22px]"
            >
              {parseInlineText(block.slice(4).trim())}
            </h3>
          );
        }

        // 6. Blockquote: > Quote
        if (block.startsWith("> ")) {
          return (
            <blockquote
              key={i}
              className="my-6 rounded-r-2xl border-l-4 border-coral bg-coral/5 p-5 text-[15px] italic leading-7 text-ink-soft"
            >
              {parseInlineText(block.slice(2).trim())}
            </blockquote>
          );
        }

        // 7. Unordered List: - item or * item
        const lines = block.split("\n").map((l) => l.trim());
        const isBulletList = lines.every(
          (l) => l.startsWith("- ") || l.startsWith("* "),
        );
        if (isBulletList) {
          return (
            <ul key={i} className="my-5 space-y-2.5 text-[15px] leading-7">
              {lines.map((l, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-coral" />
                  <span>{parseInlineText(l.slice(2))}</span>
                </li>
              ))}
            </ul>
          );
        }

        // 8. Numbered List: 1. item
        const isNumList = lines.every((l) => /^\d+\.\s/.test(l));
        if (isNumList) {
          return (
            <ol key={i} className="my-5 space-y-2.5 text-[15px] leading-7">
              {lines.map((l, idx) => {
                const numMatch = l.match(/^(\d+)\.\s+(.*)$/);
                const num = numMatch ? numMatch[1] : String(idx + 1);
                const text = numMatch ? numMatch[2] : l;
                return (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-coral/10 text-xs font-bold text-coral">
                      {num}
                    </span>
                    <span>{parseInlineText(text)}</span>
                  </li>
                );
              })}
            </ol>
          );
        }

        // 9. Normal paragraph
        return (
          <p key={i} className="text-[15px] leading-8 text-ink-soft">
            {parseInlineText(block)}
          </p>
        );
      })}
    </div>
  );
}


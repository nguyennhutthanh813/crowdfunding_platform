"use client";

import { useMemo, useState } from "react";
import { ArrowRight, GitBranch, Search } from "lucide-react";
import type { RelationshipRow } from "@/server/queries/system";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/primitives";

type RelKindFilter = "ALL" | "1-1" | "1-N" | "N-N" | "SELF";

const KIND_META: Record<RelationshipRow["kind"], { label: string; tone: "emerald" | "sky" | "violet" | "amber" }> = {
  "1-1": { label: "1–1", tone: "emerald" },
  "1-N": { label: "1–N", tone: "sky" },
  "N-N": { label: "N–N", tone: "violet" },
  SELF: { label: "Tự tham chiếu", tone: "amber" },
};

export function RelationsSection({ relationships }: { relationships: RelationshipRow[] }) {
  const [kind, setKind] = useState<RelKindFilter>("ALL");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c = { ALL: relationships.length, "1-1": 0, "1-N": 0, "N-N": 0, SELF: 0 };
    for (const r of relationships) c[r.kind]++;
    return c;
  }, [relationships]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return relationships.filter((r) => {
      if (kind !== "ALL" && r.kind !== kind) return false;
      if (!q) return true;
      return (
        r.fromTable.toLowerCase().includes(q) ||
        r.toTable.toLowerCase().includes(q) ||
        (r.viaTable?.toLowerCase().includes(q) ?? false) ||
        r.note.toLowerCase().includes(q) ||
        r.fkColumns.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [relationships, kind, query]);

  return (
    <div className="space-y-4">
      {/* 4 thẻ tóm tắt thiết kế theo loại quan hệ */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            k: "1-1" as const,
            title: "Quan hệ 1–1",
            desc: "Khoá ngoại trùng khoá chính: tách cấu hình ít đọc (user_settings), đơn giao hàng (shipments), và AI phân tích (comment_analyses).",
          },
          {
            k: "1-N" as const,
            title: "Quan hệ 1–N",
            desc: "Các thực thể cha–con chuẩn hoá: dự án → gói quà, section, lịch sử duyệt; người dùng → địa chỉ, thẻ; pledge → giao dịch.",
          },
          {
            k: "N-N" as const,
            title: "Quan hệ N–N (Kết hợp)",
            desc: "Gồm bảng cầu thuần (saved_projects, comment_likes) và thực thể kết hợp mang payload như pledges, pledge_add_ons, project_members.",
          },
          {
            k: "SELF" as const,
            title: "Tự tham chiếu (Đệ quy)",
            desc: "categories.parent_id (cây thể loại), comments.parent_id (giới hạn 2 cấp bởi trigger), follows (N–N tự tham chiếu users).",
          },
        ].map((card) => (
          <button
            key={card.k}
            type="button"
            onClick={() => setKind(kind === card.k ? "ALL" : card.k)}
            className={cn(
              "card p-4 text-left transition hover:-translate-y-0.5",
              kind === card.k && "ring-2 ring-violet-500 border-violet-500",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <Badge tone={KIND_META[card.k].tone}>{KIND_META[card.k].label}</Badge>
              <span className="font-mono text-xs font-bold text-muted">{counts[card.k]} quan hệ</span>
            </div>
            <div className="mt-2 font-bold text-sm">{card.title}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted">{card.desc}</p>
          </button>
        ))}
      </div>

      {/* Bộ lọc & tìm kiếm */}
      <div className="card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="no-scrollbar flex flex-wrap gap-1.5">
            {(
              [
                ["ALL", "Tất cả"],
                ["1-1", "1–1"],
                ["1-N", "1–N"],
                ["N-N", "N–N"],
                ["SELF", "Tự tham chiếu"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition",
                  kind === k
                    ? "border-violet-500 bg-brand-gradient text-white"
                    : "border-line bg-surface-2/60 text-muted hover:text-fg",
                )}
              >
                {label} ({counts[k]})
              </button>
            ))}
          </div>

          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Lọc theo bảng hoặc cột…"
              className="h-9 w-full rounded-xl border border-line bg-surface-2/60 pl-9 pr-3 text-xs outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Desktop table */}
        <div className="mt-4 hidden max-h-[480px] overflow-auto rounded-xl border border-line md:block">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-surface-2 text-[11px] uppercase tracking-wider text-muted shadow-[0_1px_0_var(--line)]">
              <tr>
                <th className="px-3 py-2.5">Loại</th>
                <th className="px-3 py-2.5">Cặp thực thể</th>
                <th className="px-3 py-2.5">Bảng kết hợp / Cột liên kết</th>
                <th className="px-3 py-2.5">ON DELETE</th>
                <th className="px-3 py-2.5">Lý giải nghiệp vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((r) => {
                const m = KIND_META[r.kind];
                return (
                  <tr key={r.id} className="hover:bg-surface-2/40">
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <Badge tone={m.tone}>{m.label}</Badge>
                    </td>
                    <td className="px-3 py-2.5 font-mono font-semibold whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        {r.fromTable}
                        <ArrowRight className="size-3 text-muted" />
                        {r.toTable}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-muted">
                      {r.viaTable ? (
                        <span className="text-violet-600 dark:text-violet-400">
                          {r.viaTable} ({r.fkColumns.join(", ")})
                        </span>
                      ) : (
                        <span>({r.fkColumns.join(", ")})</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-muted whitespace-nowrap">{r.onDelete}</td>
                    <td className="px-3 py-2.5 text-muted">{r.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked cards */}
        <div className="mt-4 space-y-2.5 md:hidden">
          {filtered.map((r) => {
            const m = KIND_META[r.kind];
            return (
              <div key={r.id} className="rounded-xl border border-line bg-surface-2/40 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={m.tone}>{m.label}</Badge>
                  <span className="font-mono text-[10px] text-muted">ON DELETE {r.onDelete}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono font-bold">
                  <GitBranch className="size-3.5 text-violet-500" />
                  <span>{r.fromTable}</span>
                  <ArrowRight className="size-3 text-muted" />
                  <span>{r.toTable}</span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-muted">
                  {r.viaTable ? `Qua ${r.viaTable}: ` : ""}({r.fkColumns.join(", ")})
                </div>
                <p className="mt-1.5 text-muted">{r.note}</p>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-muted">Không có quan hệ nào khớp từ khoá tìm kiếm.</div>
        )}
      </div>
    </div>
  );
}

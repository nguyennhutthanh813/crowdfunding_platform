"use client";

import { Eye, Layers, Zap } from "lucide-react";
import type { TableSchema } from "@/server/queries/system";
import { CountUp } from "@/components/fx/motion";
import { Badge } from "@/components/ui/primitives";

export function StatsSection({
  tables,
  groups,
  views,
  triggers,
}: {
  tables: TableSchema[];
  groups: { name: string; tables: string[]; color: string }[];
  views: { name: string; sql: string }[];
  triggers: { name: string; table: string; sql: string }[];
}) {
  const tableMap = new Map(tables.map((t) => [t.name, t]));
  const maxRows = Math.max(1, ...tables.map((t) => t.rowCount));

  return (
    <div className="space-y-6">
      {/* Số lượng bản ghi live theo 8 miền */}
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => {
          const groupTables = g.tables.map((n) => tableMap.get(n)).filter((t): t is TableSchema => Boolean(t));
          const sum = groupTables.reduce((s, t) => s + t.rowCount, 0);
          return (
            <div key={g.name} className="card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ background: g.color }} />
                  <h3 className="font-bold text-sm">{g.name}</h3>
                  <span className="text-xs text-muted">({groupTables.length} bảng)</span>
                </div>
                <Badge tone="violet">
                  <CountUp value={sum} /> bản ghi
                </Badge>
              </div>

              <div className="mt-3 space-y-2.5">
                {groupTables.map((t) => {
                  const pct = Math.max(2, Math.round((t.rowCount / maxRows) * 100));
                  return (
                    <div key={t.name} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono font-semibold">{t.name}</span>
                        <span className="shrink-0 font-mono font-bold tabular-nums">
                          <CountUp value={t.rowCount} />
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${t.rowCount === 0 ? 0 : pct}%`, background: g.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Views & Triggers live từ sqlite_master */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-bold text-sm">
              <Eye className="size-4 text-sky-500" /> View phân quyền & thống kê ({views.length})
            </h3>
            <Badge tone="sky">SQL Views</Badge>
          </div>
          <div className="space-y-2">
            {views.map((v) => (
              <details key={v.name} className="rounded-xl border border-line bg-surface-2/40 p-3 text-xs">
                <summary className="cursor-pointer font-mono font-bold">{v.name}</summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-bg p-2.5 font-mono text-[11px] text-muted">
                  {v.sql}
                </pre>
              </details>
            ))}
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-bold text-sm">
              <Zap className="size-4 text-amber-500" /> Trigger bảo vệ toàn vẹn ({triggers.length})
            </h3>
            <Badge tone="amber">Database Triggers</Badge>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {triggers.map((tr) => (
              <details key={tr.name} className="rounded-xl border border-line bg-surface-2/40 p-2.5 text-xs">
                <summary className="flex cursor-pointer items-center justify-between gap-2">
                  <span className="truncate font-mono font-bold">{tr.name}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted ring-1 ring-line">
                    <Layers className="size-2.5" /> {tr.table}
                  </span>
                </summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-bg p-2.5 font-mono text-[11px] text-muted">
                  {tr.sql}
                </pre>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

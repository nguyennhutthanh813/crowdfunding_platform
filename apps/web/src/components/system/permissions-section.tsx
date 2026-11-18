"use client";

import { Fragment, useMemo, useState } from "react";
import { Check, Eye, Lock, Minus, Search, ShieldCheck } from "lucide-react";
import type { PermissionMatrixRow, SystemRoleRow } from "@/server/queries/system";
import { cn } from "@/lib/utils";
import { Badge, RoleBadge } from "@/components/ui/primitives";

type RoleColumnKey = "guest" | "backer" | "creator" | "collaborator" | "admin";

const ROLE_COLUMNS: { key: RoleColumnKey; label: string; badge?: string; sub: string }[] = [
  { key: "guest", label: "Khách", sub: "Chưa đăng nhập" },
  { key: "backer", label: "Backer", badge: "BACKER", sub: "MEMBER" },
  { key: "creator", label: "Creator", badge: "CREATOR", sub: "Chủ dự án" },
  { key: "collaborator", label: "Collaborator", badge: "COLLABORATOR", sub: "Cộng sự" },
  { key: "admin", label: "Admin", badge: "ADMIN", sub: "Quản trị" },
];

export function PermissionsSection({
  roles,
  matrix,
}: {
  roles: SystemRoleRow[];
  matrix: PermissionMatrixRow[];
}) {
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "SYSTEM" | "PROJECT">("ALL");
  const [moduleFilter, setModuleFilter] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [mobileRole, setMobileRole] = useState<RoleColumnKey>("creator");

  const modules = useMemo(() => {
    const seen = new Set<string>();
    for (const r of matrix) seen.add(r.module);
    return [...seen];
  }, [matrix]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return matrix.filter((r) => {
      if (scopeFilter !== "ALL" && r.scope !== scopeFilter) return false;
      if (moduleFilter !== "ALL" && r.module !== moduleFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.module.toLowerCase().includes(q)
      );
    });
  }, [matrix, scopeFilter, moduleFilter, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, PermissionMatrixRow[]>();
    for (const row of filtered) {
      const list = map.get(row.module) ?? [];
      list.push(row);
      map.set(row.module, list);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* 4 vai trò đọc trực tiếp từ bảng roles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {roles.map((r) => (
          <div key={r.code} className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <RoleBadge role={r.code === "MEMBER" ? "BACKER" : r.code} />
              <Badge tone={r.scope === "SYSTEM" ? "emerald" : "amber"}>{r.scope}</Badge>
            </div>
            <div className="mt-2 font-bold text-sm">{r.name}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted">{r.description}</p>
          </div>
        ))}
      </div>

      {/* Bộ lọc ma trận */}
      <div className="card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ["ALL", "Tất cả quyền"],
                ["SYSTEM", "Phạm vi SYSTEM"],
                ["PROJECT", "Phạm vi PROJECT"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setScopeFilter(k)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition",
                  scopeFilter === k
                    ? "border-violet-500 bg-brand-gradient text-white"
                    : "border-line bg-surface-2/60 text-muted hover:text-fg",
                )}
              >
                {label}
              </button>
            ))}

            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              aria-label="Lọc theo phân hệ"
              className="h-8 rounded-full border border-line bg-surface-2/60 px-3 text-xs font-semibold text-fg outline-none focus:border-violet-500"
            >
              <option value="ALL">Mọi phân hệ ({modules.length})</option>
              {modules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm mã quyền hoặc chức năng…"
              className="h-9 w-full rounded-xl border border-line bg-surface-2/60 pl-9 pr-3 text-xs outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Chế độ thẻ chọn vai trò trên màn hình nhỏ (390px) */}
        <div className="mt-4 space-y-3 sm:hidden">
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
            {ROLE_COLUMNS.map((col) => (
              <button
                key={col.key}
                type="button"
                onClick={() => setMobileRole(col.key)}
                className={cn(
                  "shrink-0 rounded-xl border px-3 py-1.5 text-xs font-bold transition",
                  mobileRole === col.key
                    ? "border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-300"
                    : "border-line bg-surface-2/50 text-muted",
                )}
              >
                {col.label}
              </button>
            ))}
          </div>

          {grouped.map(([mod, rows]) => (
            <div key={mod} className="overflow-hidden rounded-xl border border-line">
              <div className="bg-surface-2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted">{mod}</div>
              <div className="divide-y divide-line">
                {rows.map((r) => (
                  <div key={r.code} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
                    <div className="min-w-0">
                      <div className="font-medium leading-snug">{r.name}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-muted">
                        <span>{r.code}</span>
                        <span>· {r.scope}</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <PermissionCell value={r[mobileRole]} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bảng ma trận sticky-header trên >= sm */}
        <div className="mt-4 hidden max-h-[70vh] overflow-auto rounded-xl border border-line sm:block">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-20 bg-surface-2 shadow-[0_1px_0_var(--line)]">
              <tr>
                <th className="sticky left-0 z-30 min-w-[260px] bg-surface-2 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted">
                  Chức năng & Mã quyền (live từ SQLite)
                </th>
                {ROLE_COLUMNS.map((col) => (
                  <th key={col.key} className="min-w-[104px] px-3 py-2.5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {col.badge ? <RoleBadge role={col.badge} /> : <span className="text-xs font-bold">{col.label}</span>}
                      <span className="text-[10px] font-medium text-muted">{col.sub}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {grouped.map(([mod, rows]) => (
                <Fragment key={mod}>
                  <tr className="bg-surface-2/50">
                    <td colSpan={6} className="px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                      {mod} ({rows.length})
                    </td>
                  </tr>
                  {rows.map((r) => (
                    <tr key={r.code} className="hover:bg-surface-2/35">
                      <td className="sticky left-0 z-10 bg-surface px-4 py-2.5">
                        <div className="font-medium text-fg">{r.name}</div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted">{r.code}</span>
                          <span
                            className={cn(
                              "rounded px-1 py-px text-[9px] font-bold",
                              r.scope === "SYSTEM"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                            )}
                          >
                            {r.scope}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <PermissionCell value={r.guest} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <PermissionCell value={r.backer} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <PermissionCell value={r.creator} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <PermissionCell value={r.collaborator} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <PermissionCell value={r.admin} />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {grouped.length === 0 && (
          <div className="py-8 text-center text-sm text-muted">Không có quyền nào khớp bộ lọc.</div>
        )}

        {/* Chú thích (Footnotes) */}
        <div className="mt-4 space-y-1.5 rounded-xl border border-line bg-surface-2/50 p-3.5 text-xs text-muted">
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
            <span>
              <strong className="text-fg">¹</strong> Không góp vốn vào dự án của chính mình hoặc dự án mình được gán làm Collaborator
              (chặn ở tầng RBAC <code className="font-mono">pledgeBlocker()</code> và Trigger{" "}
              <code className="font-mono">trg_pledges_guard</code>). Ở các dự án khác, tài khoản vẫn góp vốn như Backer bình thường.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Eye className="mt-0.5 size-3.5 shrink-0 text-sky-500" />
            <span>
              <strong className="text-fg">² (Chỉ xem)</strong> Collaborator được xem thống kê, biểu đồ và góp ý AI đã lọc (
              <code className="font-mono">stats.view</code>, <code className="font-mono">insight.view</code>), nhưng không chạy dự đoán AI (
              <code className="font-mono">ai.run</code>), không xem danh sách/địa chỉ backer (<code className="font-mono">backer.view</code>) và
              không đăng Update công khai (<code className="font-mono">update.publish</code>).
            </span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
            <span>
              <strong className="text-fg">³ (Duyệt)</strong> Admin xem nội dung dự án chưa công khai trong phạm vi kiểm duyệt (
              <code className="font-mono">admin.project.review</code>), không chỉnh sửa nội dung thay Creator và không góp vốn trên nền tảng.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PermissionCell({ value }: { value: PermissionMatrixRow["collaborator"] | PermissionMatrixRow["admin"] }) {
  if (value === true) {
    return (
      <span
        className="inline-flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        title="Được phép"
      >
        <Check className="size-3.5 stroke-[2.5]" />
      </span>
    );
  }
  if (value === "note") {
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300"
        title="Không góp vốn vào dự án của chính mình hoặc dự án mình làm Collaborator"
      >
        <Check className="size-3 stroke-[2.5]" />
        <sup className="text-amber-600 dark:text-amber-400">1</sup>
      </span>
    );
  }
  if (value === "readonly") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300"
        title="Chỉ xem, không chỉnh sửa hoặc chạy AI"
      >
        <Check className="size-3" /> chỉ xem
      </span>
    );
  }
  if (value === "review_only") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300"
        title="Chỉ xem để thẩm định duyệt"
      >
        <Check className="size-3" /> duyệt
      </span>
    );
  }
  return (
    <span className="inline-flex size-6 items-center justify-center text-muted/45" title="Không có quyền">
      <Minus className="size-3.5" />
    </span>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Database,
  GitFork,
  KeyRound,
  LayoutGrid,
  Link2,
  List,
  Search,
  Sparkles,
  Table2,
  X,
  Zap,
} from "lucide-react";
import type { ForeignKeyGroup, TableSchema } from "@/server/queries/system";
import { cn, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";

interface TableNodeData extends Record<string, unknown> {
  table: TableSchema;
  color: string;
  selected: boolean;
  connected: boolean;
  dimmed: boolean;
  onSelect: (name: string) => void;
}

type ErNode = Node<TableNodeData, "erTable">;

/** Tọa độ bố cục 2D xác định sẵn theo 8 miền nghiệp vụ để tránh chồng chéo và đảm bảo SSR sạch. */
const OVERVIEW_POSITIONS: Record<string, { x: number; y: number }> = {
  // 1. Danh tính & phân quyền (trên trái)
  roles: { x: 0, y: 0 },
  role_permissions: { x: 290, y: 0 },
  permissions: { x: 580, y: 0 },
  user_roles: { x: 0, y: 230 },
  users: { x: 290, y: 220 },
  user_settings: { x: 580, y: 220 },
  sessions: { x: 0, y: 490 },
  addresses: { x: 290, y: 500 },
  payment_methods: { x: 580, y: 490 },

  // 2. Danh mục & 3. Dự án (trên giữa)
  categories: { x: 930, y: 0 },
  projects: { x: 1240, y: 80 },
  project_sections: { x: 1580, y: 0 },
  project_members: { x: 930, y: 260 },
  project_invitations: { x: 930, y: 500 },
  project_reviews: { x: 1580, y: 260 },
  project_status_history: { x: 1580, y: 500 },

  // 4. Phần quà (giữa trái)
  reward_tiers: { x: 120, y: 790 },
  reward_items: { x: 0, y: 1060 },
  add_ons: { x: 540, y: 790 },
  reward_tier_add_ons: { x: 320, y: 1060 },

  // 5. Góp vốn & thanh toán (giữa)
  pledges: { x: 1240, y: 790 },
  pledge_add_ons: { x: 930, y: 1060 },
  payment_transactions: { x: 1260, y: 1120 },
  shipments: { x: 1590, y: 850 },

  // 6. Nội dung & tương tác (phải)
  project_updates: { x: 1980, y: 0 },
  faqs: { x: 2310, y: 0 },
  saved_projects: { x: 2640, y: 0 },
  comments: { x: 1980, y: 280 },
  comment_likes: { x: 2310, y: 240 },
  comment_analyses: { x: 2310, y: 460 },
  follows: { x: 2640, y: 240 },
  notifications: { x: 2640, y: 460 },
  conversations: { x: 1980, y: 760 },
  conversation_participants: { x: 2310, y: 760 },
  messages: { x: 2640, y: 760 },

  // 7. Thống kê & AI (dưới trái)
  project_daily_stats: { x: 120, y: 1360 },
  ai_predictions: { x: 500, y: 1360 },

  // 8. Quản trị (dưới giữa)
  reports: { x: 960, y: 1360 },
  audit_logs: { x: 1290, y: 1360 },
  scheduler_runs: { x: 1620, y: 1360 },
};

function ErTableNode({ data }: NodeProps<ErNode>) {
  const { table, color, selected, connected, dimmed, onSelect } = data;
  const keyCols = table.columns.filter((c) => c.pk > 0 || c.isFk);
  const extraCols = table.columns.filter((c) => c.pk === 0 && !c.isFk).slice(0, Math.max(0, 6 - keyCols.length));
  const previewCols = [...keyCols, ...extraCols].slice(0, 7);
  const hiddenCount = Math.max(0, table.columns.length - previewCols.length);

  return (
    <div
      onClick={() => onSelect(table.name)}
      className={cn(
        "w-[238px] cursor-pointer overflow-hidden rounded-xl border bg-surface text-fg shadow-md transition-all",
        selected
          ? "ring-2 ring-violet-500 border-violet-500 shadow-[0_12px_30px_-10px_rgba(124,92,255,0.55)]"
          : connected
            ? "border-violet-400/70 ring-1 ring-violet-400/40"
            : "border-line hover:border-violet-400/60",
        dimmed && "opacity-35",
      )}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} className="!size-2 !border-surface !bg-violet-500" />
      <Handle type="source" position={Position.Right} isConnectable={false} className="!size-2 !border-surface !bg-emerald-500" />

      <div className="h-1.5 w-full" style={{ background: color }} />
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-2/70 px-2.5 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />
          <span className="truncate font-mono text-xs font-bold">{table.name}</span>
        </div>
        <span className="shrink-0 rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted ring-1 ring-line">
          {formatNumber(table.rowCount)}
        </span>
      </div>

      <div className="divide-y divide-line/60 px-2.5 py-1 text-[11px]">
        {previewCols.map((col) => (
          <div key={col.name} className="flex items-center justify-between gap-1.5 py-1">
            <div className="flex min-w-0 items-center gap-1">
              {col.pk > 0 && <span className="rounded bg-amber-500/15 px-1 text-[9px] font-bold text-amber-600 dark:text-amber-400">PK</span>}
              {col.isFk && <span className="rounded bg-sky-500/15 px-1 text-[9px] font-bold text-sky-600 dark:text-sky-400">FK</span>}
              <span className={cn("truncate font-mono", col.pk > 0 && "font-semibold")}>{col.name}</span>
            </div>
            <span className="shrink-0 font-mono text-[10px] text-muted">{col.pgType.split(" ")[0]}</span>
          </div>
        ))}
        {hiddenCount > 0 && (
          <div className="py-1 text-center text-[10px] font-medium text-muted">
            +{hiddenCount} cột khác · Bấm xem chi tiết
          </div>
        )}
      </div>
    </div>
  );
}

const NODE_TYPES = { erTable: ErTableNode };

function FitViewOnFilter({ trigger }: { trigger: string }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      fitView({ padding: 0.14, duration: 280 });
    });
    return () => cancelAnimationFrame(id);
  }, [fitView, trigger]);
  return null;
}

export function ErdExplorer({
  tables,
  groups,
}: {
  tables: TableSchema[];
  groups: { name: string; tables: string[]; color: string }[];
}) {
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"diagram" | "list">("diagram");
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const syncTheme = () => setIsDark(document.documentElement.classList.contains("dark"));
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const groupColorMap = useMemo(() => new Map(groups.map((g) => [g.name, g.color])), [groups]);
  const tableMap = useMemo(() => new Map(tables.map((t) => [t.name, t])), [tables]);

  const visibleTables = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tables.filter((t) => {
      if (selectedGroup !== "ALL" && t.group !== selectedGroup) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.group.toLowerCase().includes(q) ||
        t.columns.some((c) => c.name.toLowerCase().includes(q))
      );
    });
  }, [tables, selectedGroup, search]);

  const visibleSet = useMemo(() => new Set(visibleTables.map((t) => t.name)), [visibleTables]);

  const connectedToSelected = useMemo(() => {
    const set = new Set<string>();
    if (!selectedTableName) return set;
    set.add(selectedTableName);
    const t = tableMap.get(selectedTableName);
    if (!t) return set;
    for (const fk of t.foreignKeys) set.add(fk.toTable);
    for (const ref of t.referencedBy) set.add(ref.fromTable);
    return set;
  }, [selectedTableName, tableMap]);

  const layoutPositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    if (selectedGroup === "ALL" && !search.trim()) {
      for (const t of visibleTables) {
        map.set(t.name, OVERVIEW_POSITIONS[t.name] ?? { x: (t.groupIndex % 4) * 320, y: Math.floor(t.groupIndex / 4) * 280 });
      }
      return map;
    }
    const cols = visibleTables.length <= 4 ? 2 : 3;
    visibleTables.forEach((t, idx) => {
      map.set(t.name, { x: (idx % cols) * 300, y: Math.floor(idx / cols) * 290 });
    });
    return map;
  }, [visibleTables, selectedGroup, search]);

  const handleSelectTable = useCallback((name: string) => {
    setSelectedTableName(name);
  }, []);

  const computedNodes = useMemo<ErNode[]>(() => {
    return visibleTables.map((t) => {
      const pos = layoutPositions.get(t.name) ?? { x: 0, y: 0 };
      const isSelected = selectedTableName === t.name;
      const isConnected = selectedTableName !== null && connectedToSelected.has(t.name);
      const isDimmed = selectedTableName !== null && !isConnected;
      return {
        id: t.name,
        type: "erTable",
        position: pos,
        initialWidth: 238,
        initialHeight: 220,
        data: {
          table: t,
          color: groupColorMap.get(t.group) ?? "#7C3AED",
          selected: isSelected,
          connected: isConnected,
          dimmed: isDimmed,
          onSelect: handleSelectTable,
        },
      };
    });
  }, [visibleTables, layoutPositions, selectedTableName, connectedToSelected, groupColorMap, handleSelectTable]);

  const computedEdges = useMemo<Edge[]>(() => {
    const edges: Edge[] = [];
    for (const t of visibleTables) {
      for (const fk of t.foreignKeys) {
        if (!visibleSet.has(fk.toTable)) continue;
        const active = selectedTableName !== null && (fk.fromTable === selectedTableName || fk.toTable === selectedTableName);
        const dimmed = selectedTableName !== null && !active;
        const isOneToOne = fk.cardinality === "1-1";
        const isSelf = fk.isSelfRef;
        const stroke = active
          ? "#7C3AED"
          : isOneToOne
            ? "#10B981"
            : isSelf
              ? "#F59E0B"
              : "#64748B";
        edges.push({
          id: `${fk.fromTable}-${fk.toTable}-${fk.id}`,
          source: fk.toTable,
          target: fk.fromTable,
          type: isSelf ? "default" : "smoothstep",
          animated: active,
          label: isSelf ? `${fk.cardinality} (tự tham chiếu)` : fk.cardinality,
          labelStyle: {
            fontSize: 10,
            fontWeight: 700,
            fill: isDark ? "#E2E8F0" : "#1E293B",
          },
          labelShowBg: true,
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4,
          labelBgStyle: {
            fill: isDark ? "#1c1836" : "#ffffff",
            fillOpacity: 0.9,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: stroke,
            width: 16,
            height: 16,
          },
          style: {
            stroke,
            strokeWidth: active ? 2.4 : 1.4,
            opacity: dimmed ? 0.16 : active ? 1 : 0.65,
            strokeDasharray: isOneToOne ? "5 3" : undefined,
          },
        });
      }
    }
    return edges;
  }, [visibleTables, visibleSet, selectedTableName, isDark]);

  const [nodes, setNodes, onNodesChange] = useNodesState<ErNode>(computedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(computedEdges);

  useEffect(() => {
    setNodes((prev) => {
      const prevMap = new Map(prev.map((n) => [n.id, n]));
      return computedNodes.map((n) => {
        const old = prevMap.get(n.id);
        return old?.measured ? { ...n, measured: old.measured } : n;
      });
    });
  }, [computedNodes, setNodes]);

  useEffect(() => {
    setEdges(computedEdges);
  }, [computedEdges, setEdges]);

  const selectedTable = selectedTableName ? tableMap.get(selectedTableName) ?? null : null;

  return (
    <div className="space-y-4">
      {/* Thanh điều khiển lọc miền, tìm kiếm & chuyển chế độ */}
      <div className="card space-y-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm bảng hoặc tên cột…"
              className="h-10 w-full rounded-xl border border-line bg-surface-2/60 pl-9 pr-3 text-sm outline-none transition focus:border-violet-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-line bg-surface-2/70 p-1">
              <button
                type="button"
                onClick={() => setViewMode("diagram")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  viewMode === "diagram" ? "bg-brand-gradient text-white shadow-sm" : "text-muted hover:text-fg",
                )}
              >
                <LayoutGrid className="size-3.5" /> Sơ đồ ERD
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  viewMode === "list" ? "bg-brand-gradient text-white shadow-sm" : "text-muted hover:text-fg",
                )}
              >
                <List className="size-3.5" /> Danh sách ({visibleTables.length})
              </button>
            </div>
            {selectedTableName && (
              <button
                type="button"
                onClick={() => setSelectedTableName(null)}
                className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-fg"
              >
                <X className="size-3.5" /> Bỏ chọn {selectedTableName}
              </button>
            )}
          </div>
        </div>

        {/* Bộ lọc 8 miền theo TABLE_GROUPS */}
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => setSelectedGroup("ALL")}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
              selectedGroup === "ALL"
                ? "border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-300"
                : "border-line bg-surface text-muted hover:text-fg",
            )}
          >
            Tất cả ({tables.length})
          </button>
          {groups.map((g) => {
            const on = selectedGroup === g.name;
            return (
              <button
                key={g.name}
                type="button"
                onClick={() => setSelectedGroup(g.name)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
                  on ? "border-violet-500 bg-violet-500/12 text-fg" : "border-line bg-surface text-muted hover:text-fg",
                )}
              >
                <span className="size-2 rounded-full" style={{ background: g.color }} />
                {g.name} ({g.tables.length})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 bg-slate-500" /> Quan hệ 1–N
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-emerald-500" /> Quan hệ 1–1 (PK/Unique trùng FK)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 bg-amber-500" /> Tự tham chiếu
          </span>
          <span className="inline-flex items-center gap-1">
            <Sparkles className="size-3.5 text-violet-500" /> Bấm vào bất kỳ bảng nào để xem toàn bộ cột, ràng buộc, chỉ mục và trigger
          </span>
        </div>
      </div>

      {/* Khung chính: ReactFlow ERD hoặc Danh sách bảng */}
      {viewMode === "diagram" ? (
        <div className="card relative h-[640px] w-full overflow-hidden">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onPaneClick={() => setSelectedTableName(null)}
              colorMode={isDark ? "dark" : "light"}
              nodesConnectable={false}
              edgesReconnectable={false}
              minZoom={0.18}
              maxZoom={1.6}
              fitView
              fitViewOptions={{ padding: 0.14 }}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} />
              <Controls showInteractive={false} />
              <MiniMap
                pannable
                zoomable
                nodeColor={(n) => (n.data as TableNodeData | undefined)?.color ?? "#7C3AED"}
                className="!rounded-xl !border !border-line !bg-surface/90"
              />
              <FitViewOnFilter trigger={`${selectedGroup}:${search.trim()}`} />
            </ReactFlow>
          </ReactFlowProvider>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTables.map((t) => {
            const color = groupColorMap.get(t.group) ?? "#7C3AED";
            return (
              <button
                key={t.name}
                type="button"
                onClick={() => setSelectedTableName(t.name)}
                className="card flex flex-col justify-between p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-400/60"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
                      <span className="truncate font-mono text-sm font-bold">{t.name}</span>
                    </div>
                    <Badge tone="violet">{formatNumber(t.rowCount)} dòng</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted">{t.group}</div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.columns.slice(0, 6).map((c) => (
                      <span
                        key={c.name}
                        className={cn(
                          "rounded-md border border-line bg-surface-2/60 px-1.5 py-0.5 font-mono text-[11px]",
                          c.pk > 0 && "border-amber-500/40 bg-amber-500/10 font-semibold",
                        )}
                      >
                        {c.name}
                      </span>
                    ))}
                    {t.columns.length > 6 && (
                      <span className="rounded-md px-1.5 py-0.5 text-[11px] text-muted">+{t.columns.length - 6}</span>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 border-t border-line pt-2 text-[11px] text-muted">
                  <span>{t.columns.length} cột</span>
                  <span>{t.foreignKeys.length} FK ra</span>
                  <span>{t.referencedBy.length} FK vào</span>
                  <span>{t.triggers.length} trigger</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Drawer / Modal chi tiết bảng khi bấm node hoặc card */}
      <Dialog
        open={Boolean(selectedTable)}
        onClose={() => setSelectedTableName(null)}
        wide
        title={
          selectedTable ? (
            <div className="flex flex-wrap items-center gap-2">
              <Table2 className="size-5 text-violet-500" />
              <span className="font-mono">{selectedTable.name}</span>
              <Badge tone="violet">{selectedTable.group}</Badge>
              <Badge tone="emerald">{formatNumber(selectedTable.rowCount)} dòng dữ liệu</Badge>
            </div>
          ) : null
        }
        description={
          selectedTable
            ? `Khoá chính: (${selectedTable.primaryKey.join(", ") || "—"}) · ${selectedTable.columns.length} cột · ${selectedTable.foreignKeys.length} khoá ngoại · ${selectedTable.triggers.length} trigger`
            : undefined
        }
      >
        {selectedTable && <TableDetailContent table={selectedTable} onJump={setSelectedTableName} />}
      </Dialog>
    </div>
  );
}

function TableDetailContent({
  table,
  onJump,
}: {
  table: TableSchema;
  onJump: (tableName: string) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Danh sách cột */}
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold">
          <Database className="size-4 text-violet-500" /> Cấu trúc cột (SQLite → PostgreSQL 18)
        </h3>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2">Cột</th>
                <th className="px-3 py-2">Vai trò</th>
                <th className="px-3 py-2">SQLite</th>
                <th className="px-3 py-2">PostgreSQL 18</th>
                <th className="px-3 py-2">Ràng buộc / Mặc định</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {table.columns.map((c) => (
                <tr key={c.name} className="hover:bg-surface-2/40">
                  <td className="px-3 py-2 font-mono font-semibold">{c.name}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {c.pk > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                          <KeyRound className="size-2.5" /> PK
                        </span>
                      )}
                      {c.isFk && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300">
                          <Link2 className="size-2.5" /> FK
                        </span>
                      )}
                      {c.isUnique && c.pk === 0 && (
                        <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300">
                          UQ
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-muted">{c.sqliteType}</td>
                  <td className="px-3 py-2 font-mono text-emerald-600 dark:text-emerald-400">{c.pgType}</td>
                  <td className="px-3 py-2 text-muted">
                    {c.notnull ? "NOT NULL" : "NULL"}
                    {c.defaultValue !== null && <span className="ml-1.5 font-mono text-[10px]">· DEF {c.defaultValue}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Khoá ngoại đi và đến */}
      {(table.foreignKeys.length > 0 || table.referencedBy.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FkList title="Tham chiếu tới bảng khác (FK ra)" items={table.foreignKeys} direction="out" onJump={onJump} />
          <FkList title="Được tham chiếu bởi (FK vào)" items={table.referencedBy} direction="in" onJump={onJump} />
        </div>
      )}

      {/* Chỉ mục & Trigger */}
      {(table.indexes.length > 0 || table.triggers.length > 0) && (
        <div className="space-y-3">
          {table.indexes.length > 0 && (
            <div>
              <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                <GitFork className="size-3.5" /> Chỉ mục ({table.indexes.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {table.indexes.map((ix) => (
                  <div key={ix.name} className="rounded-xl border border-line bg-surface-2/60 px-2.5 py-1.5 text-xs">
                    <span className="font-mono font-semibold">{ix.name}</span>
                    <span className="ml-1.5 text-muted">({ix.columns.join(", ")})</span>
                    {ix.unique && <span className="ml-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">UNIQUE</span>}
                    {ix.partial && <span className="ml-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">PARTIAL</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {table.triggers.length > 0 && (
            <div>
              <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                <Zap className="size-3.5 text-amber-500" /> Trigger bảo vệ trên bảng ({table.triggers.length})
              </h4>
              <div className="space-y-2">
                {table.triggers.map((tr) => (
                  <details key={tr.name} className="rounded-xl border border-line bg-surface-2/50 p-2.5 text-xs">
                    <summary className="cursor-pointer font-mono font-semibold">{tr.name}</summary>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-bg p-2 font-mono text-[11px] text-muted">
                      {tr.sql}
                    </pre>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DDL gốc */}
      <details className="rounded-xl border border-line bg-surface-2/40 p-3 text-xs">
        <summary className="cursor-pointer font-semibold text-muted">Xem câu lệnh DDL CREATE TABLE (SQLite)</summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-bg p-3 font-mono text-[11px] text-muted">
          {table.ddl}
        </pre>
      </details>
    </div>
  );
}

function FkList({
  title,
  items,
  direction,
  onJump,
}: {
  title: string;
  items: ForeignKeyGroup[];
  direction: "out" | "in";
  onJump: (tableName: string) => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/40 p-3">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{title}</div>
      {items.length === 0 ? (
        <div className="text-xs text-muted">Không có</div>
      ) : (
        <ul className="space-y-2 text-xs">
          {items.map((fk) => {
            const target = direction === "out" ? fk.toTable : fk.fromTable;
            return (
              <li key={`${fk.fromTable}-${fk.toTable}-${fk.id}`} className="flex flex-col gap-0.5 rounded-lg bg-surface p-2 ring-1 ring-line">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onJump(target)}
                    className="font-mono font-bold text-violet-600 hover:underline dark:text-violet-400"
                  >
                    {target}
                  </button>
                  <Badge tone={fk.cardinality === "1-1" ? "emerald" : "sky"}>{fk.cardinality}</Badge>
                </div>
                <div className="font-mono text-[11px] text-muted">
                  ({fk.fromColumns.join(", ")}) → {fk.toTable}({fk.toColumns.join(", ")})
                </div>
                <div className="text-[10px] text-muted">ON DELETE {fk.onDelete}</div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

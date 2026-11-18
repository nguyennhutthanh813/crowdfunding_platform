import type { Metadata } from "next";
import {
  Activity,
  Database,
  GitBranch,
  GitCommitHorizontal,
  Layers,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { getSystemOverview } from "@/server/queries/system";
import { ErdExplorer } from "@/components/system/erd-diagram";
import { RelationsSection } from "@/components/system/relations-section";
import { PermissionsSection } from "@/components/system/permissions-section";
import { StatesSection } from "@/components/system/states-section";
import { StatsSection } from "@/components/system/stats-section";
import { Aurora, CountUp, Reveal } from "@/components/fx/motion";
import { Badge } from "@/components/ui/primitives";
import { PageHeader, SectionTitle, StatCard } from "@/components/ui/layout-bits";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thiết kế CSDL & Phân quyền",
  description:
    "Sơ đồ ERD tương tác đọc trực tiếp từ SQLite, phân loại quan hệ 1-1/1-N/N-N, ma trận phân quyền RBAC 2 tầng và máy trạng thái FundViet v3.",
};

const SECTION_LINKS = [
  { href: "#erd", label: "Sơ đồ ERD", icon: Database },
  { href: "#relations", label: "Phân loại quan hệ", icon: GitBranch },
  { href: "#permissions", label: "Ma trận phân quyền", icon: ShieldCheck },
  { href: "#states", label: "Máy trạng thái", icon: GitCommitHorizontal },
  { href: "#stats", label: "Dữ liệu & Trigger", icon: Activity },
];

export default function SystemPage() {
  const data = getSystemOverview();

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 sm:py-10">
      {/* ───────── HERO & KPI ───────── */}
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <Aurora className="opacity-30" />
        <div className="relative space-y-6">
          <PageHeader
            eyebrow={
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-3.5" /> KIẾN TRÚC DỮ LIỆU LIVE · PHIÊN BẢN LƯỢC ĐỒ V{data.meta.schemaVersion}
              </span>
            }
            title="Thiết kế Cơ sở dữ liệu & Phân quyền"
            description="Toàn bộ sơ đồ ERD, quan hệ khoá ngoại, ma trận phân quyền RBAC 2 tầng và số lượng bản ghi dưới đây được đọc trực tiếp từ SQLite (sqlite_master & PRAGMA) tương đương 1-1 với bản PostgreSQL 18."
            actions={
              <div className="flex flex-wrap gap-2">
                <Badge tone="emerald" dot>
                  SQLite WAL + PostgreSQL 18 Parity
                </Badge>
                <Badge tone="violet">100% Quan hệ 3NF/BCNF</Badge>
              </div>
            }
          />

          {/* Mục lục neo nhanh */}
          <nav aria-label="Điều hướng phần hệ thống" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {SECTION_LINKS.map((it) => (
              <a
                key={it.href}
                href={it.href}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface/85 px-3.5 py-2 text-xs font-semibold text-fg backdrop-blur transition hover:border-violet-400/60 hover:bg-violet-500/10"
              >
                <it.icon className="size-3.5 text-violet-500" />
                {it.label}
              </a>
            ))}
          </nav>

          {/* 4 KPI live */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Bảng nghiệp vụ (8 miền)"
              value={<CountUp value={data.meta.totalTables} />}
              sub="Cộng 1 bảng hạ tầng meta"
              icon={<Layers className="size-5" />}
              tone="violet"
            />
            <StatCard
              label="Khoá ngoại quan hệ"
              value={<CountUp value={data.meta.totalForeignKeys} />}
              sub={`${data.relationships.filter((r) => r.kind === "1-1").length} quan hệ 1–1 · ${data.relationships.filter((r) => r.kind === "N-N").length} bảng kết hợp N–N`}
              icon={<GitBranch className="size-5" />}
              tone="sky"
            />
            <StatCard
              label="Trigger & View bảo vệ"
              value={
                <>
                  <CountUp value={data.meta.totalTriggers} /> / <CountUp value={data.meta.totalViews} />
                </>
              }
              sub={`${data.meta.totalTriggers} Trigger · ${data.meta.totalViews} View RBAC & cộng đồng`}
              icon={<Zap className="size-5" />}
              tone="amber"
            />
            <StatCard
              label="Tổng bản ghi hiện tại"
              value={<CountUp value={data.meta.totalRows} />}
              sub="Cập nhật trực tiếp từ CSDL đang chạy"
              icon={<Database className="size-5" />}
              tone="emerald"
            />
          </div>
        </div>
      </section>

      {/* ───────── #erd ───────── */}
      <section id="erd" className="scroll-mt-24">
        <Reveal>
          <SectionTitle
            title="1. Sơ đồ ERD tương tác (40 bảng — 8 miền nghiệp vụ)"
            description="Kéo thả bảng, lọc theo từng miền trong TABLE_GROUPS, hoặc bấm vào một bảng bất kỳ để mở chi tiết cột (SQLite → PostgreSQL 18), khoá ngoại, chỉ mục và trigger."
          />
          <ErdExplorer tables={data.tables} groups={data.groups} />
        </Reveal>
      </section>

      {/* ───────── #relations ───────── */}
      <section id="relations" className="scroll-mt-24">
        <Reveal>
          <SectionTitle
            title="2. Phân loại quan hệ thực thể (1–1, 1–N, N–N, Tự tham chiếu)"
            description="Trích xuất trực tiếp từ PRAGMA foreign_key_list và PRAGMA index_list — tự động nhận diện quan hệ 1–1 khi cột khoá ngoại trùng khoá chính hoặc chỉ mục duy nhất toàn phần."
          />
          <RelationsSection relationships={data.relationships} />
        </Reveal>
      </section>

      {/* ───────── #permissions ───────── */}
      <section id="permissions" className="scroll-mt-24">
        <Reveal>
          <SectionTitle
            title="3. Ma trận phân quyền RBAC 2 tầng (Live từ CSDL)"
            description="Đọc trực tiếp từ 3 bảng roles, permissions, role_permissions — tách biệt phạm vi SYSTEM (toàn nền tảng) và PROJECT (theo từng dự án)."
          />
          <PermissionsSection roles={data.roles} matrix={data.permissionMatrix} />
        </Reveal>
      </section>

      {/* ───────── #states ───────── */}
      <section id="states" className="scroll-mt-24">
        <Reveal>
          <SectionTitle
            title="4. Máy trạng thái nghiệp vụ (State Machines)"
            description="Các chuyển tiếp hợp lệ được bảo vệ trực tiếp bởi Trigger tầng CSDL (trg_projects_status_flow, trg_pledges_status_flow)."
          />
          <StatesSection />
        </Reveal>
      </section>

      {/* ───────── #stats ───────── */}
      <section id="stats" className="scroll-mt-24">
        <Reveal>
          <SectionTitle
            title="5. Thống kê bản ghi thực tế, SQL Views & Triggers"
            description="Số lượng dòng hiện có trong từng bảng của tệp SQLite đang chạy kèm định nghĩa View và Trigger."
          />
          <StatsSection
            tables={data.tables}
            groups={data.groups}
            views={data.views}
            triggers={data.triggers}
          />
        </Reveal>
      </section>
    </div>
  );
}

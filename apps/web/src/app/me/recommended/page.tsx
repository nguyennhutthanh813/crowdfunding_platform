import Image from "next/image";
import { Sparkles } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { hasSystemPerm } from "@/server/rbac/rbac";
import { recommendations, savedIds } from "@/server/queries/me";
import { AdminOnlyNotice } from "@/components/me/admin-only-notice";
import { ProjectCard } from "@/components/project/project-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/layout-bits";
import { Badge, Card } from "@/components/ui/primitives";

export const metadata = { title: "Gợi ý cho bạn" };

export default async function MyRecommendedPage() {
  const v = await requireViewer("/me/recommended");
  if (!hasSystemPerm(v, "recommendation.view")) {
    return <AdminOnlyNotice area="Gợi ý dự án" />;
  }

  const { items, coldStart, topCategories } = recommendations(v.id, 12);
  const saved = savedIds(v.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Khám phá · FR17"
        title="Đề xuất dành cho bạn"
        description="Hệ thống tính điểm minh bạch dựa trên thể loại bạn yêu thích, creator bạn theo dõi và xu hướng cộng đồng."
      />

      {/* Affinity summary & transparent formula */}
      <Card className="relative overflow-hidden p-4 sm:p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-violet-500/15 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <Image
            src="/v3/brand/ai-orb.webp"
            alt="Gợi ý thông minh"
            width={68}
            height={68}
            className="shrink-0 rounded-2xl border border-line"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold">
                <Sparkles className="size-4 text-violet-500" />
                {coldStart ? "Khởi đầu theo xu hướng thịnh hành" : "Thể loại bạn quan tâm nhất"}
              </span>
              {topCategories.map((c) => (
                <Badge key={c.name} tone="violet">
                  {c.name} · điểm {c.weight}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted">
              {coldStart
                ? "Bạn chưa có lịch sử góp vốn hay lưu dự án, nên danh sách ưu tiên các dự án tăng trưởng nhanh và được nhiều người ủng hộ."
                : "Trọng số gợi ý: 45% sở thích thể loại · 20% creator đang theo dõi · 20% đà tăng 7 ngày · 10% độ phổ biến · 5% sắp kết thúc."}
            </p>
          </div>
        </div>
      </Card>

      {items.length === 0 ? (
        <EmptyState
          title="Chưa có gợi ý mới"
          description="Bạn đã góp vốn hoặc tham gia hết các dự án đang mở phù hợp rồi!"
          action={<ButtonLink href="/explore">Xem toàn bộ dự án</ButtonLink>}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.project.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5 px-1">
                <div className="flex flex-wrap gap-1">
                  {item.reasons.map((reason) => (
                    <Badge key={reason} tone="emerald">
                      {reason}
                    </Badge>
                  ))}
                </div>
                <span className="text-[11px] font-bold tabular-nums text-muted" title="Điểm phù hợp">
                  {Math.round(item.score * 100)}đ
                </span>
              </div>
              <ProjectCard p={item.project} saved={saved.has(item.project.id)} className="flex-1" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

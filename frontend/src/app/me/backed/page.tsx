import { CheckCircle2, Clock, HandCoins, Truck } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { hasSystemPerm } from "@/server/rbac/rbac";
import { myPledges } from "@/server/queries/me";
import { AdminOnlyNotice } from "@/components/me/admin-only-notice";
import { PledgeCard } from "@/components/me/pledge-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/layout-bits";
import { PaginationBar } from "@/components/ui/pagination";
import { LinkTabs } from "@/components/ui/tabs";
import { formatCompactVnd } from "@/lib/utils";

export const metadata = { title: "Lịch sử góp vốn" };

const VALID_FILTERS = new Set(["AUTHORIZED", "CAPTURED", "VOIDED", "CANCELLED"]);
const BACKED_PAGE_SIZE = 10;

export default async function MyBackedPage(props: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const v = await requireViewer("/me/backed");
  if (!hasSystemPerm(v, "pledge.history.view")) {
    return <AdminOnlyNotice area="Lịch sử góp vốn" />;
  }

  const sp = await props.searchParams;
  const upper = (sp.status ?? "").toUpperCase();
  const active = VALID_FILTERS.has(upper) ? upper : "all";

  const pledges = await myPledges();
  const filtered = active === "all" ? pledges : pledges.filter((p) => p.status === active);
  const pages = Math.max(1, Math.ceil(filtered.length / BACKED_PAGE_SIZE));
  const curPage = Math.max(1, Math.min(Math.floor(Number(sp.page) || 1), pages));
  const paged = filtered.slice((curPage - 1) * BACKED_PAGE_SIZE, curPage * BACKED_PAGE_SIZE);

  const countBy = (st: string) => pledges.filter((p) => p.status === st).length;
  const activeTotal = pledges
    .filter((p) => ["AUTHORIZED", "CAPTURED", "CAPTURE_FAILED"].includes(p.status))
    .reduce((s, p) => s + p.total_amount, 0);
  const deliveredCount = pledges.filter((p) => p.ship_status === "DELIVERED").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Góp vốn"
        title="Lịch sử góp vốn"
        description="Theo dõi khoản giữ chỗ, thanh toán khi đạt mục tiêu và tình trạng giao quà."
        actions={
          <ButtonLink href="/explore" variant="outline" size="sm">
            Khám phá thêm
          </ButtonLink>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Tổng vốn đang giữ / đã góp"
          value={formatCompactVnd(activeTotal)}
          sub={`${pledges.length} lượt góp vốn`}
          icon={<HandCoins className="size-5" />}
          tone="emerald"
        />
        <StatCard
          label="Đang giữ chỗ (chưa trừ tiền)"
          value={countBy("AUTHORIZED")}
          sub="Có thể đổi hoặc huỷ trước hạn"
          icon={<Clock className="size-5" />}
          tone="sky"
        />
        <StatCard
          label="Đã giao quà thành công"
          value={deliveredCount}
          sub={`${countBy("CAPTURED")} đơn đã thanh toán`}
          icon={deliveredCount > 0 ? <CheckCircle2 className="size-5" /> : <Truck className="size-5" />}
          tone="violet"
        />
      </div>

      <LinkTabs
        id="backed-status"
        param="status"
        active={active}
        items={[
          { key: "all", label: "Tất cả", count: pledges.length },
          { key: "AUTHORIZED", label: "Đang giữ chỗ", count: countBy("AUTHORIZED") },
          { key: "CAPTURED", label: "Đã thanh toán", count: countBy("CAPTURED") },
          { key: "VOIDED", label: "Không trừ tiền", count: countBy("VOIDED") },
          { key: "CANCELLED", label: "Đã huỷ", count: countBy("CANCELLED") },
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title={active === "all" ? "Bạn chưa góp vốn dự án nào" : "Không có khoản góp vốn nào ở trạng thái này"}
          description="Khi bạn góp vốn cho một dự án, thông tin gói quà và trạng thái thanh toán sẽ hiển thị tại đây."
          action={<ButtonLink href="/explore">Khám phá dự án ngay</ButtonLink>}
        />
      ) : (
        <div className="space-y-4">
          {paged.map((p) => (
            <PledgeCard key={p.id} p={p} />
          ))}
          <PaginationBar
            basePath="/me/backed"
            page={curPage}
            pages={pages}
            total={filtered.length}
            params={active === "all" ? {} : { status: active }}
            itemLabel="lượt góp vốn"
          />
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, CreditCard, QrCode, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { requireSystemPerm } from "@/server/auth/session";
import { adminTransactionsBundle } from "@/server/queries/admin";
import { TX_KIND_META, TX_STATUS_META } from "@/components/admin/admin-helpers";
import { PaginationBar } from "@/components/admin/pagination-bar";
import { TransactionRowActions } from "@/components/admin/transaction-actions";
import { CountUp } from "@/components/fx/motion";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { EmptyState, PageHeader, SectionTitle, StatCard } from "@/components/ui/layout-bits";
import { Badge, PledgeStatusBadge, ProjectStatusBadge } from "@/components/ui/primitives";
import { formatCompactVnd, formatDate, formatVnd } from "@/lib/utils";

export const metadata = { title: "Quản trị giao dịch & VNPAY" };

const firstParam = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] ?? "" : v ?? "");

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSystemPerm("admin.transaction.view", "/admin/transactions");
  const sp = await searchParams;
  const kind = firstParam(sp.kind).trim();
  const status = firstParam(sp.status).trim();
  const provider = firstParam(sp.provider).trim();
  const q = firstParam(sp.q).trim();
  const project = firstParam(sp.project).trim();
  const from = firstParam(sp.from).trim();
  const to = firstParam(sp.to).trim();
  const page = Number(firstParam(sp.page)) || 1;

  const { txData, summary, projectOptions } = await adminTransactionsBundle({
    kind,
    status,
    provider,
    q,
    project,
    from,
    to,
    page,
  });
  const { totalsByKind, vnpayOrders } = txData;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quản trị tài chính & Đối soát VNPAY"
        title="Sổ giao dịch & Đối soát thanh toán"
        description="Quản lý toàn bộ giao dịch ký quỹ (AUTHORIZE), quyết toán (CAPTURE), giải phóng (VOID), hoàn tiền VNPAY (REFUND) và xử lý các khoản thu lỗi."
      />

      {/* Tổng hợp 4 loại giao dịch */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          tone="sky"
          label="Ký quỹ giữ chỗ (AUTHORIZE)"
          value={<CountUp value={totalsByKind.AUTHORIZE.amount} format="compact" />}
          sub={`${totalsByKind.AUTHORIZE.count} giao dịch · ${formatVnd(totalsByKind.AUTHORIZE.amount)}`}
          icon={<CreditCard className="size-5" />}
        />
        <StatCard
          tone="emerald"
          label="Đã quyết toán (CAPTURE)"
          value={<CountUp value={totalsByKind.CAPTURE.amount} format="compact" />}
          sub={`${totalsByKind.CAPTURE.count} giao dịch${totalsByKind.CAPTURE.failed ? ` (${totalsByKind.CAPTURE.failed} lỗi chờ xử lý)` : ""}`}
          icon={<ArrowDownLeft className="size-5" />}
        />
        <StatCard
          tone="violet"
          label="Giải phóng (VOID)"
          value={<CountUp value={totalsByKind.VOID.amount} format="compact" />}
          sub={`${totalsByKind.VOID.count} giao dịch · ${formatVnd(totalsByKind.VOID.amount)}`}
          icon={<ArrowUpRight className="size-5" />}
        />
        <StatCard
          tone="amber"
          label="Hoàn tiền VNPAY (REFUND)"
          value={<CountUp value={totalsByKind.REFUND.amount} format="compact" />}
          sub={`${totalsByKind.REFUND.count} giao dịch · ${formatVnd(totalsByKind.REFUND.amount)}`}
          icon={<RotateCcw className="size-5" />}
        />
      </div>

      {/* Bộ lọc mở rộng */}
      <form method="GET" action="/admin/transactions" className="card space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Tìm mã FV-..., mã VNP..., tên hoặc @username Backer..."
              className="pl-10"
            />
          </div>
          <Select name="provider" defaultValue={provider} aria-label="Cổng thanh toán">
            <option value="">Mọi cổng thanh toán</option>
            <option value="VNPAY">Cổng VNPAY</option>
            <option value="FUNDVIET_PAY">Thẻ Token hoá (FundViet Pay)</option>
          </Select>
          <Select name="project" defaultValue={project} aria-label="Dự án">
            <option value="">Tất cả dự án</option>
            {projectOptions.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[160px_160px_155px_155px_auto]">
          <Select name="kind" defaultValue={kind} aria-label="Loại giao dịch">
            <option value="">Mọi nghiệp vụ</option>
            <option value="AUTHORIZE">AUTHORIZE (Ký quỹ)</option>
            <option value="CAPTURE">CAPTURE (Thu tiền)</option>
            <option value="VOID">VOID (Giải phóng)</option>
            <option value="REFUND">REFUND (Hoàn tiền)</option>
          </Select>
          <Select name="status" defaultValue={status} aria-label="Trạng thái">
            <option value="">Mọi kết quả</option>
            <option value="SUCCEEDED">Thành công</option>
            <option value="FAILED">Thất bại</option>
          </Select>
          <Input type="date" name="from" defaultValue={from} aria-label="Từ ngày" />
          <Input type="date" name="to" defaultValue={to} aria-label="Đến ngày" />
          <div className="flex justify-end gap-2">
            <Button type="submit" variant="primary" size="md" className="flex-1 sm:flex-none">
              Lọc dữ liệu
            </Button>
            {(kind || status || provider || q || project || from || to) && (
              <ButtonLink href="/admin/transactions" variant="outline" size="md">
                Xoá lọc
              </ButtonLink>
            )}
          </div>
        </div>
      </form>

      {/* Danh sách giao dịch */}
      {txData.rows.length === 0 ? (
        <EmptyState title="Không có giao dịch khớp bộ lọc" description="Thử mở rộng khoảng ngày hoặc xoá điều kiện tìm kiếm." />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {txData.rows.map((r) => {
              const km = TX_KIND_META[r.kind] ?? { label: r.kind, tone: "neutral" as const, hint: "" };
              const sm = TX_STATUS_META[r.status] ?? { label: r.status, tone: "neutral" as const };
              return (
                <div key={r.id} className="card space-y-2.5 p-4 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={r.provider === "VNPAY" ? "sky" : "slate"}>{r.provider}</Badge>
                      <Badge tone={km.tone}>{km.label}</Badge>
                      <Badge tone={sm.tone}>{sm.label}</Badge>
                    </div>
                    <span className="font-extrabold tabular-nums">{formatVnd(r.amount)}</span>
                  </div>
                  <Link href={`/p/${r.slug}`} className="block font-bold hover:text-violet-600">
                    {r.title}
                  </Link>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                    <span>
                      <span className="font-mono font-bold text-fg">{r.code}</span> · {r.backer} (@{r.backer_username})
                    </span>
                    <PledgeStatusBadge status={r.pledge_status} />
                  </div>
                  {r.message && <p className="text-xs text-muted">{r.message}</p>}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5 text-[11px] text-muted">
                    <span>{formatDate(r.created_at, true)}</span>
                    <TransactionRowActions row={r} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="card hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2/60 text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Cổng &amp; Nghiệp vụ</th>
                  <th className="px-4 py-3">Mã pledge &amp; Backer</th>
                  <th className="px-4 py-3">Dự án</th>
                  <th className="px-4 py-3 text-right">Số tiền</th>
                  <th className="px-4 py-3">Tham chiếu cổng</th>
                  <th className="px-4 py-3 text-right">Quản trị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {txData.rows.map((r) => {
                  const km = TX_KIND_META[r.kind] ?? { label: r.kind, tone: "neutral" as const, hint: "" };
                  const sm = TX_STATUS_META[r.status] ?? { label: r.status, tone: "neutral" as const };
                  return (
                    <tr key={r.id} className="transition hover:bg-surface-2/40">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{formatDate(r.created_at, true)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={r.provider === "VNPAY" ? "sky" : "slate"}>
                            {r.provider === "VNPAY" ? `VNPAY${r.bank_code ? ` · ${r.bank_code}` : ""}` : "TOKEN"}
                          </Badge>
                          <span title={km.hint}>
                            <Badge tone={km.tone}>{r.kind}</Badge>
                          </span>
                          <Badge tone={sm.tone}>{sm.label}</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold">{r.code}</span>
                          <PledgeStatusBadge status={r.pledge_status} />
                        </div>
                        <div className="mt-0.5 text-muted">
                          {r.backer} (@{r.backer_username})
                        </div>
                      </td>
                      <td className="max-w-[220px] px-4 py-3">
                        <Link href={`/p/${r.slug}`} className="block truncate font-semibold hover:text-violet-600">
                          {r.title}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-extrabold tabular-nums">
                        {formatVnd(r.amount)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        <div className="max-w-[240px] truncate">{r.message || "—"}</div>
                        <div className="font-mono text-[10px]">
                          {r.vnp_txn_ref ? `${r.vnp_txn_ref} · ` : ""}
                          {r.provider_ref ? `#${r.provider_ref}` : ""}
                          {r.vnp_response_code ? ` (Mã ${r.vnp_response_code})` : ""}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <TransactionRowActions row={r} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <PaginationBar
            basePath="/admin/transactions"
            page={txData.page}
            pages={txData.pages}
            total={txData.total}
            params={{ kind, status, provider, q, project, from, to }}
            itemLabel="giao dịch"
          />
        </>
      )}

      {/* Nhật ký phiên cổng thanh toán VNPAY Sandbox */}
      {vnpayOrders.length > 0 && (
        <section className="space-y-4">
          <SectionTitle
            title={
              <span className="flex items-center gap-2">
                <QrCode className="size-5 text-sky-500" /> Nhật ký phiên cổng VNPAY Sandbox gần đây
              </span>
            }
            description="Theo dõi trực tiếp các phiên khởi tạo URL thanh toán VNPAY, mã phản hồi ngân hàng và đối soát chữ ký số HMAC-SHA512."
          />

          <div className="card overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-surface-2/60 font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-2.5">Mã VNPAY (vnp_TxnRef)</th>
                  <th className="px-4 py-2.5">Backer &amp; Dự án</th>
                  <th className="px-4 py-2.5">Ngân hàng / Thẻ</th>
                  <th className="px-4 py-2.5 text-right">Số tiền</th>
                  <th className="px-4 py-2.5">Trạng thái cổng</th>
                  <th className="px-4 py-2.5">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {vnpayOrders.slice(0, 12).map((vo) => (
                  <tr key={vo.id} className="hover:bg-surface-2/40">
                    <td className="px-4 py-2.5 font-mono font-bold">
                      <div>{vo.txn_ref}</div>
                      {vo.pledge_code && <div className="text-[11px] text-violet-600 dark:text-violet-400">→ {vo.pledge_code}</div>}
                    </td>
                    <td className="max-w-xs px-4 py-2.5">
                      <div className="font-semibold text-fg">
                        {vo.backer} (@{vo.backer_username})
                      </div>
                      <Link href={`/p/${vo.slug}`} className="block truncate text-muted hover:text-violet-600">
                        {vo.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-bold">
                        {vo.bank_code} ({vo.pay_channel})
                      </div>
                      {vo.card_mask && <div className="font-mono text-[11px] text-muted">{vo.card_mask}</div>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-extrabold tabular-nums">
                      {formatVnd(vo.amount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          tone={
                            vo.status === "PAID"
                              ? "emerald"
                              : vo.status === "PENDING"
                                ? "amber"
                                : vo.status === "CANCELLED"
                                  ? "slate"
                                  : "rose"
                          }
                        >
                          {vo.status}
                        </Badge>
                        {vo.vnp_response_code && (
                          <span className="font-mono text-[11px] text-muted">Mã {vo.vnp_response_code}</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                      {formatDate(vo.paid_at ?? vo.created_at, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tổng hợp tiền theo dự án */}
      <section className="space-y-4">
        <SectionTitle
          title={
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-500" /> Đối soát dòng tiền theo dự án
            </span>
          }
          description="Tổng số tiền đang ký quỹ giữ chỗ, đã quyết toán, giải phóng, hoàn tiền và lỗi thu trên từng dự án."
        />

        {/* Mobile summary cards */}
        <div className="space-y-3 md:hidden">
          {summary.map((s) => (
            <div key={s.slug} className="card space-y-2.5 p-4 text-xs">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/p/${s.slug}`} className="font-bold hover:text-violet-600">
                  {s.title}
                </Link>
                <ProjectStatusBadge status={s.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2/60 p-2.5">
                <div>
                  <span className="text-muted">Đang giữ: </span>
                  <b className="text-sky-600 dark:text-sky-400">{formatCompactVnd(s.held)}</b>
                </div>
                <div>
                  <span className="text-muted">Đã thu: </span>
                  <b className="text-emerald-600 dark:text-emerald-400">{formatCompactVnd(s.captured)}</b>
                </div>
                <div>
                  <span className="text-muted">Giải phóng: </span>
                  <b>{formatCompactVnd(s.voided)}</b>
                </div>
                <div>
                  <span className="text-muted">Hoàn tiền: </span>
                  <b className="text-amber-600 dark:text-amber-400">{formatCompactVnd(s.refunded ?? 0)}</b>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop summary table */}
        <div className="card hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-2/60 text-xs font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Dự án</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Mục tiêu</th>
                <th className="px-4 py-3 text-right">Đang giữ (AUTH)</th>
                <th className="px-4 py-3 text-right">Đã thu (CAP)</th>
                <th className="px-4 py-3 text-right">Hoàn tiền (REF)</th>
                <th className="px-4 py-3 text-right">Giải phóng (VOID)</th>
                <th className="px-4 py-3 text-right">Lỗi / Huỷ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {summary.map((s) => (
                <tr key={s.slug} className="transition hover:bg-surface-2/40">
                  <td className="max-w-xs px-4 py-3">
                    <Link href={`/p/${s.slug}`} className="block truncate font-bold hover:text-violet-600">
                      {s.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <ProjectStatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted">{formatVnd(s.goal_amount)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-sky-600 dark:text-sky-400">{formatVnd(s.held)}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {formatVnd(s.captured)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                    {formatVnd(s.refunded ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted">{formatVnd(s.voided)}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted">
                    {s.failed > 0 && <span className="font-semibold text-rose-500">{formatCompactVnd(s.failed)} lỗi · </span>}
                    {formatCompactVnd(s.cancelled)} huỷ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

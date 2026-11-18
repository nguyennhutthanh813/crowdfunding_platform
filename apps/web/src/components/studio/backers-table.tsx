"use client";

import { useMemo, useState } from "react";
import { Download, MapPin, Search, Users } from "lucide-react";
import type { BackerRow } from "@/server/queries/studio";
import { buttonClass } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/layout-bits";
import { Badge, PledgeStatusBadge } from "@/components/ui/primitives";
import { COUNTRY_NAMES, flagOf, formatDate, formatVnd } from "@/lib/utils";

export function BackersTable({
  slug,
  backers,
}: {
  slug: string;
  backers: BackerRow[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return backers.filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.username.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.tier ?? "").toLowerCase().includes(q) ||
        (b.ship_province ?? "").toLowerCase().includes(q)
      );
    });
  }, [backers, query, statusFilter]);

  const activeTotal = useMemo(
    () => backers.filter((b) => ["AUTHORIZED", "CAPTURED", "CAPTURE_FAILED"].includes(b.status)).reduce((s, b) => s + b.total_amount, 0),
    [backers],
  );

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <Users className="size-5 text-violet-500" /> Danh sách Backer &amp; Địa chỉ giao hàng
          </h3>
          <p className="mt-0.5 text-sm text-muted">
            Tổng {backers.length} lượt góp vốn · Tổng giá trị hiệu lực: <b className="text-fg">{formatVnd(activeTotal)}</b>
          </p>
        </div>

        <a href={`/studio/${slug}/backers.csv`} className={buttonClass("outline", "sm")}>
          <Download className="size-4" /> Xuất CSV (UTF-8)
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo mã pledge, tên backer, mức quà, tỉnh thành…"
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-56">
          <option value="ALL">Tất cả trạng thái</option>
          <option value="AUTHORIZED">Đang giữ chỗ</option>
          <option value="CAPTURED">Đã thanh toán</option>
          <option value="CAPTURE_FAILED">Trừ tiền lỗi</option>
          <option value="VOIDED">Không trừ tiền</option>
          <option value="CANCELLED">Đã huỷ</option>
          <option value="REFUNDED">Đã hoàn tiền</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          compact
          title="Không có backer nào phù hợp"
          description={backers.length === 0 ? "Chiến dịch chưa có người góp vốn nào." : "Thử thay đổi từ khoá hoặc bộ lọc trạng thái."}
        />
      ) : (
        <>
          {/* Mobile stacked cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((b) => (
              <div key={b.id} className="card space-y-2.5 p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-xs text-muted">{b.code}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-bold">
                      <span>{b.name}</span>
                      <span className="text-xs font-normal text-muted">@{b.username}</span>
                      {b.is_anonymous === 1 && <Badge tone="slate">Ẩn danh công khai</Badge>}
                    </div>
                  </div>
                  <PledgeStatusBadge status={b.status} />
                </div>

                <div className="rounded-xl bg-surface-2/60 p-2.5 text-xs">
                  <div className="font-semibold text-fg">{b.tier || "Góp không nhận quà"}</div>
                  {b.add_ons && <div className="mt-0.5 text-muted">Add-on: {b.add_ons}</div>}
                  <div className="mt-1 flex items-center justify-between border-t border-line pt-1.5">
                    <span className="text-muted">{formatDate(b.created_at, true)}</span>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatVnd(b.total_amount)}
                    </span>
                  </div>
                </div>

                {b.ship_address && (
                  <div className="flex items-start gap-1.5 text-xs text-muted">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      <b className="text-fg">{b.ship_recipient}</b> · {b.ship_phone} — {b.ship_address}
                      {b.ship_province ? `, ${b.ship_province}` : ""}
                    </span>
                  </div>
                )}
                {b.note && <div className="text-xs italic text-muted">Ghi chú: “{b.note}”</div>}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-surface-2/60 text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Mã &amp; Ngày</th>
                    <th className="px-4 py-3 font-semibold">Backer</th>
                    <th className="px-4 py-3 font-semibold">Mức quà &amp; Add-on</th>
                    <th className="px-4 py-3 font-semibold">Số tiền</th>
                    <th className="px-4 py-3 font-semibold">Trạng thái</th>
                    <th className="px-4 py-3 font-semibold">Giao hàng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((b) => (
                    <tr key={b.id} className="align-top transition hover:bg-surface-2/30">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-bold">{b.code}</div>
                        <div className="mt-0.5 text-xs text-muted">{formatDate(b.created_at, true)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">
                          {flagOf(b.country_code)} {b.name}
                        </div>
                        <div className="text-xs text-muted">
                          @{b.username} · {COUNTRY_NAMES[b.country_code] ?? b.country_code}
                        </div>
                        {b.is_anonymous === 1 && (
                          <Badge tone="slate" className="mt-1">
                            Ẩn danh công khai
                          </Badge>
                        )}
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <div className="font-medium">{b.tier || "Không nhận quà"}</div>
                        {b.add_ons && <div className="mt-0.5 text-xs text-muted">Add-on: {b.add_ons}</div>}
                        {b.note && <div className="mt-1 text-xs italic text-muted">“{b.note}”</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatVnd(b.total_amount)}
                        </div>
                        {b.shipping_amount > 0 && (
                          <div className="text-[11px] text-muted">gồm ship {formatVnd(b.shipping_amount)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <PledgeStatusBadge status={b.status} />
                      </td>
                      <td className="max-w-xs px-4 py-3 text-xs">
                        {b.ship_address ? (
                          <div>
                            <div className="font-semibold">
                              {b.ship_recipient} · {b.ship_phone}
                            </div>
                            <div className="text-muted">
                              {b.ship_address}
                              {b.ship_province ? `, ${b.ship_province}` : ""}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted">Quà số / không cần giao</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

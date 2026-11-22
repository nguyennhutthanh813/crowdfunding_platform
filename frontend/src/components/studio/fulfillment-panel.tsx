"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, MapPin, PackageCheck, PartyPopper, Rocket, Truck } from "lucide-react";
import type { ShipmentRow } from "@/server/queries/studio";
import { advanceFulfillmentAction, bulkShipAction, updateShipmentAction } from "@/server/actions/studio";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Input, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/layout-bits";
import { Badge } from "@/components/ui/primitives";
import { SHIPMENT_STATUS } from "@/lib/status";
import { formatDate } from "@/lib/utils";

const CARRIERS = ["GHN", "GHTK", "Viettel Post", "J&T Express", "Ninja Van"];

export function FulfillmentPanel({
  projectId,
  status,
  shipments,
  digitalCount,
}: {
  projectId: string;
  status: string;
  shipments: ShipmentRow[];
  digitalCount: number;
}) {
  const [filter, setFilter] = useState("ALL");

  const stats = useMemo(() => {
    const prep = shipments.filter((s) => s.status === "PREPARING").length;
    const shipped = shipments.filter((s) => s.status === "SHIPPED").length;
    const delivered = shipments.filter((s) => s.status === "DELIVERED").length;
    return { prep, shipped, delivered, total: shipments.length };
  }, [shipments]);

  const filtered = useMemo(
    () => (filter === "ALL" ? shipments : shipments.filter((s) => s.status === filter)),
    [shipments, filter],
  );

  if (!["SUCCESS", "FULFILLING", "COMPLETED"].includes(status)) {
    return (
      <EmptyState
        title="Chưa tới giai đoạn giao quà"
        description="Khi chiến dịch kết thúc thành công (đạt mục tiêu và đã thu tiền người ủng hộ), bạn có thể tạo danh sách giao hàng và cập nhật mã vận đơn tại đây."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Phase Transition Card */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Truck className="size-5 text-violet-500" /> Điều phối sản xuất &amp; giao quà
            </h3>
            <p className="mt-1 text-sm text-muted">
              {status === "SUCCESS" && "Chiến dịch đã trừ tiền thành công. Nhấn Bắt đầu giao quà để tạo danh sách vận chuyển cho các đơn vật lý."}
              {status === "FULFILLING" && `Đang giao ${stats.total} đơn vật lý (${stats.delivered} đã giao) · ${digitalCount} đơn quà số đã hoàn tất tự động.`}
              {status === "COMPLETED" && "Tất cả phần quà của chiến dịch đã được giao hoàn tất!"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {status === "SUCCESS" && (
              <>
                <ActionForm action={advanceFulfillmentAction}>
                  <input type="hidden" name="project_id" value={projectId} />
                  <input type="hidden" name="to" value="FULFILLING" />
                  <SubmitButton pendingText="Đang khởi tạo…">
                    <Rocket className="size-4" /> Bắt đầu giao quà
                  </SubmitButton>
                </ActionForm>
                <ActionForm action={advanceFulfillmentAction} confirm="Đánh dấu hoàn tất luôn (dành cho dự án chỉ có quà số)?">
                  <input type="hidden" name="project_id" value={projectId} />
                  <input type="hidden" name="to" value="COMPLETED" />
                  <SubmitButton variant="outline">Hoàn thành ngay</SubmitButton>
                </ActionForm>
              </>
            )}

            {status === "FULFILLING" && (
              <ActionForm
                action={advanceFulfillmentAction}
                confirm="Xác nhận chuyển dự án sang trạng thái Hoàn thành?"
              >
                <input type="hidden" name="project_id" value={projectId} />
                <input type="hidden" name="to" value="COMPLETED" />
                <SubmitButton variant="success" pendingText="Đang hoàn tất…">
                  <PartyPopper className="size-4" /> Hoàn tất dự án
                </SubmitButton>
              </ActionForm>
            )}
          </div>
        </div>

        {/* Summary Counters */}
        {shipments.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-surface-2/60 p-3">
              <div className="text-xs text-muted">Đang chuẩn bị</div>
              <div className="mt-1 text-xl font-extrabold text-amber-600 dark:text-amber-400">{stats.prep}</div>
            </div>
            <div className="rounded-xl bg-surface-2/60 p-3">
              <div className="text-xs text-muted">Đang giao</div>
              <div className="mt-1 text-xl font-extrabold text-sky-600 dark:text-sky-400">{stats.shipped}</div>
            </div>
            <div className="rounded-xl bg-surface-2/60 p-3">
              <div className="text-xs text-muted">Đã giao</div>
              <div className="mt-1 text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.delivered}</div>
            </div>
            <div className="rounded-xl bg-surface-2/60 p-3">
              <div className="text-xs text-muted">Quà số / không giao</div>
              <div className="mt-1 text-xl font-extrabold">{digitalCount}</div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Ship Actions */}
      {status === "FULFILLING" && (stats.prep > 0 || stats.shipped > 0) && (
        <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold">Cập nhật nhanh hàng loạt &amp; thông báo người ủng hộ:</div>
          <div className="flex flex-wrap gap-2">
            {stats.prep > 0 && (
              <ActionForm action={bulkShipAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="project_id" value={projectId} />
                <input type="hidden" name="to" value="SHIPPED" />
                <Select name="carrier" className="h-9 w-36 text-xs">
                  <option value="">Giữ nguyên hãng</option>
                  {CARRIERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
                <SubmitButton variant="secondary" size="sm">
                  <Truck className="size-3.5" /> Giao {stats.prep} đơn đang chuẩn bị
                </SubmitButton>
              </ActionForm>
            )}
            {stats.prep + stats.shipped > 0 && (
              <ActionForm
                action={bulkShipAction}
                confirm="Đánh dấu tất cả đơn chưa giao xong thành Đã giao?"
              >
                <input type="hidden" name="project_id" value={projectId} />
                <input type="hidden" name="to" value="DELIVERED" />
                <SubmitButton variant="outline" size="sm">
                  <PackageCheck className="size-3.5" /> Đánh dấu tất cả Đã giao
                </SubmitButton>
              </ActionForm>
            )}
          </div>
        </div>
      )}

      {/* Shipments Filter & List */}
      {shipments.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-bold">Danh sách vận đơn ({filtered.length})</h4>
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-48">
              <option value="ALL">Tất cả ({shipments.length})</option>
              <option value="PREPARING">Đang chuẩn bị ({stats.prep})</option>
              <option value="SHIPPED">Đang giao ({stats.shipped})</option>
              <option value="DELIVERED">Đã giao ({stats.delivered})</option>
            </Select>
          </div>

          <div className="space-y-3">
            {filtered.map((s) => {
              const sm = SHIPMENT_STATUS[s.status];
              return (
                <div key={s.pledge_id} className="card p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-muted">{s.code}</span>
                        <span className="font-bold">{s.name}</span>
                        <Badge tone={sm.tone} dot>
                          {sm.label}
                        </Badge>
                      </div>
                      <div className="text-xs font-semibold text-violet-600 dark:text-violet-300">
                        {s.tier || "Quà tặng"}
                      </div>
                      {s.ship_address && (
                        <div className="flex items-start gap-1.5 text-xs text-muted">
                          <MapPin className="mt-0.5 size-3.5 shrink-0" />
                          <span>
                            <b className="text-fg">{s.ship_recipient}</b> · {s.ship_phone} — {s.ship_address}
                            {s.ship_province ? `, ${s.ship_province}` : ""}
                          </span>
                        </div>
                      )}
                      {(s.shipped_at || s.delivered_at) && (
                        <div className="text-[11px] text-muted">
                          {s.shipped_at && `Gửi lúc ${formatDate(s.shipped_at, true)}`}
                          {s.delivered_at && ` · Giao lúc ${formatDate(s.delivered_at, true)}`}
                        </div>
                      )}
                    </div>

                    <ActionForm action={updateShipmentAction} className="grid gap-2 sm:grid-cols-[135px_130px_145px_auto]">
                      <input type="hidden" name="project_id" value={projectId} />
                      <input type="hidden" name="pledge_id" value={s.pledge_id} />
                      <Select name="status" defaultValue={s.status} className="h-9 text-xs">
                        <option value="PREPARING">Đang chuẩn bị</option>
                        <option value="SHIPPED">Đang giao</option>
                        <option value="DELIVERED">Đã giao</option>
                      </Select>
                      <Input name="carrier" defaultValue={s.carrier ?? ""} placeholder="Đơn vị VC (GHN)" className="h-9 text-xs" />
                      <Input name="tracking_code" defaultValue={s.tracking_code ?? ""} placeholder="Mã vận đơn" className="h-9 text-xs font-mono" />
                      <SubmitButton size="sm" variant="secondary">
                        <CheckCircle2 className="size-3.5" /> Lưu
                      </SubmitButton>
                    </ActionForm>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

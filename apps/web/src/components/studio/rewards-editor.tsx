"use client";

import { useState } from "react";
import { Gift, Lock, PackagePlus, Pencil, Plus, Power, Trash2, Truck, X } from "lucide-react";
import type { AddOnRow, TierRow } from "@/server/queries/studio";
import {
  deleteAddOnAction,
  deleteTierAction,
  saveAddOnAction,
  saveTierAction,
  toggleTierActiveAction,
} from "@/server/actions/studio";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/primitives";
import { cn, formatVnd } from "@/lib/utils";

export function RewardsEditor({
  projectId,
  tiers,
  addOns,
}: {
  projectId: string;
  tiers: TierRow[];
  addOns: AddOnRow[];
}) {
  const [tierModal, setTierModal] = useState<{ open: boolean; editing: TierRow | null }>({ open: false, editing: null });
  const [addOnModal, setAddOnModal] = useState<{ open: boolean; editing: AddOnRow | null }>({ open: false, editing: null });
  const activeTiers = tiers.filter((t) => t.is_active === 1).length;

  return (
    <div className="space-y-6">
      {/* Tiers Section */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <Gift className="size-5 text-violet-500" /> Các mức quà (Reward Tiers)
              </h3>
              <Badge tone={activeTiers >= 1 ? "emerald" : "amber"}>{activeTiers} gói đang bật</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              Nên có 4–7 mức quà (bao gồm 1 gói vào cửa ≤ 200.000đ). Giá sẽ khoá khi đã có người chọn.
            </p>
          </div>
          <Button size="sm" onClick={() => setTierModal({ open: true, editing: null })}>
            <Plus className="size-4" /> Thêm mức quà
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {tiers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface-2/40 p-8 text-center md:col-span-2">
              <p className="text-sm text-muted">Chưa có mức quà nào. Hãy tạo ít nhất 1 mức quà để gửi duyệt dự án.</p>
              <Button size="sm" className="mt-3" onClick={() => setTierModal({ open: true, editing: null })}>
                <Plus className="size-4" /> Tạo mức quà đầu tiên
              </Button>
            </div>
          ) : (
            tiers.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "flex flex-col justify-between rounded-2xl border border-line bg-surface-2/30 p-4 transition",
                  t.is_active === 0 && "opacity-65",
                )}
              >
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatVnd(t.amount)}
                        </span>
                        <Badge tone={t.is_active ? "emerald" : "slate"}>{t.is_active ? "Đang mở" : "Tạm tắt"}</Badge>
                        {t.claimed_count > 0 && (
                          <Badge tone="amber" className="gap-1">
                            <Lock className="size-3" /> Khoá giá
                          </Badge>
                        )}
                      </div>
                      <h4 className="mt-1 font-bold">{t.title}</h4>
                    </div>
                  </div>

                  {t.description && <p className="mt-1.5 text-sm text-muted">{t.description}</p>}

                  {t.items.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs">
                      {t.items.map((it, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-violet-500" />
                          <span className="font-semibold">×{it.quantity}</span> {it.name}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                    <span className="rounded-lg bg-surface px-2 py-1">Dự kiến giao: {t.estimated_delivery}</span>
                    <span className="rounded-lg bg-surface px-2 py-1">
                      Suất: {t.claimed_count}
                      {t.quantity_limit ? `/${t.quantity_limit}` : " (không giới hạn)"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-1">
                      <Truck className="size-3" />
                      {t.ships_physical ? `Giao hàng (${t.shipping_fee ? formatVnd(t.shipping_fee) : "Miễn phí"})` : "Quà số / không giao"}
                    </span>
                    {t.add_on_ids.length > 0 && (
                      <span className="rounded-lg bg-violet-500/10 px-2 py-1 text-violet-700 dark:text-violet-300">
                        {t.add_on_ids.length} add-on kèm theo
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-1.5 border-t border-line pt-3">
                  <Button variant="ghost" size="xs" onClick={() => setTierModal({ open: true, editing: t })}>
                    <Pencil className="size-3.5" /> Sửa
                  </Button>
                  <ActionForm action={toggleTierActiveAction}>
                    <input type="hidden" name="project_id" value={projectId} />
                    <input type="hidden" name="tier_id" value={t.id} />
                    <SubmitButton variant="ghost" size="xs">
                      <Power className="size-3.5" /> {t.is_active ? "Tạm tắt" : "Bật lại"}
                    </SubmitButton>
                  </ActionForm>
                  <ActionForm action={deleteTierAction} confirm="Xoá mức quà này?">
                    <input type="hidden" name="project_id" value={projectId} />
                    <input type="hidden" name="tier_id" value={t.id} />
                    <SubmitButton
                      variant="ghost"
                      size="xs"
                      disabled={t.pledge_count > 0}
                      className="text-rose-500 hover:bg-rose-500/10"
                    >
                      <Trash2 className="size-3.5" /> {t.pledge_count > 0 ? "Đã có pledge" : "Xoá"}
                    </SubmitButton>
                  </ActionForm>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add-ons Section */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <PackagePlus className="size-5 text-emerald-500" /> Add-on mua kèm
            </h3>
            <p className="mt-1 text-sm text-muted">
              Sản phẩm bổ sung cho phép backer mua thêm sau khi chọn một mức quà vật lý hoặc tương thích.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setAddOnModal({ open: true, editing: null })}>
            <Plus className="size-4" /> Thêm add-on
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {addOns.length === 0 ? (
            <p className="text-sm text-muted sm:col-span-2 lg:col-span-3">Chưa có add-on nào (tuỳ chọn).</p>
          ) : (
            addOns.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "flex flex-col justify-between rounded-2xl border border-line bg-surface-2/30 p-4",
                  a.is_active === 0 && "opacity-65",
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{formatVnd(a.price)}</span>
                    <Badge tone={a.is_active ? "emerald" : "slate"}>{a.is_active ? "Đang bán" : "Tắt"}</Badge>
                  </div>
                  <h4 className="mt-1 font-bold">{a.title}</h4>
                  {a.description && <p className="mt-1 text-xs text-muted">{a.description}</p>}
                  <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] text-muted">
                    <span className="rounded-md bg-surface px-2 py-0.5">
                      Đã bán: {a.sold_count}
                      {a.stock !== null ? `/${a.stock}` : ""}
                    </span>
                    <span className="rounded-md bg-surface px-2 py-0.5">Tối đa {a.max_per_pledge}/đơn</span>
                    <span className="rounded-md bg-surface px-2 py-0.5">Gắn với {a.tier_ids.length} mức quà</span>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-1 border-t border-line pt-2.5">
                  <Button variant="ghost" size="xs" onClick={() => setAddOnModal({ open: true, editing: a })}>
                    <Pencil className="size-3.5" /> Sửa
                  </Button>
                  <ActionForm action={deleteAddOnAction} confirm="Xoá add-on này?">
                    <input type="hidden" name="project_id" value={projectId} />
                    <input type="hidden" name="add_on_id" value={a.id} />
                    <SubmitButton variant="ghost" size="xs" className="text-rose-500 hover:bg-rose-500/10">
                      <Trash2 className="size-3.5" />
                    </SubmitButton>
                  </ActionForm>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tier Dialog */}
      <Dialog
        open={tierModal.open}
        onClose={() => setTierModal({ open: false, editing: null })}
        title={tierModal.editing ? "Chỉnh sửa mức quà" : "Thêm mức quà mới"}
        wide
      >
        {tierModal.open && (
          <TierFormBody
            key={tierModal.editing?.id ?? "new-tier"}
            projectId={projectId}
            initial={tierModal.editing}
            addOns={addOns}
            onDone={() => setTierModal({ open: false, editing: null })}
          />
        )}
      </Dialog>

      {/* Add-on Dialog */}
      <Dialog
        open={addOnModal.open}
        onClose={() => setAddOnModal({ open: false, editing: null })}
        title={addOnModal.editing ? "Chỉnh sửa add-on" : "Thêm add-on mới"}
      >
        {addOnModal.open && (
          <AddOnFormBody
            key={addOnModal.editing?.id ?? "new-addon"}
            projectId={projectId}
            initial={addOnModal.editing}
            tiers={tiers}
            onDone={() => setAddOnModal({ open: false, editing: null })}
          />
        )}
      </Dialog>
    </div>
  );
}

function TierFormBody({
  projectId,
  initial,
  addOns,
  onDone,
}: {
  projectId: string;
  initial: TierRow | null;
  addOns: AddOnRow[];
  onDone: () => void;
}) {
  const [shipsPhysical, setShipsPhysical] = useState(initial ? initial.ships_physical === 1 : true);
  const [items, setItems] = useState<{ name: string; quantity: number }[]>(
    initial?.items?.length ? initial.items : [{ name: "", quantity: 1 }],
  );
  const priceLocked = Boolean(initial && initial.claimed_count > 0);
  const [defaultMonth] = useState(
    () => initial?.estimated_delivery || new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 7),
  );

  return (
    <ActionForm action={saveTierAction} onSuccess={onDone} className="space-y-4">
      <input type="hidden" name="project_id" value={projectId} />
      {initial && <input type="hidden" name="tier_id" value={initial.id} />}
      <input type="hidden" name="items_json" value={JSON.stringify(items)} />
      <input type="hidden" name="sync_add_ons" value="1" />
      <input type="hidden" name="is_active" value={initial?.is_active === 0 ? "0" : "1"} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên mức quà" required>
          <Input name="title" defaultValue={initial?.title ?? ""} placeholder="Ví dụ: Early Bird – Máy pha cà phê" required />
        </Field>
        <Field
          label="Số tiền (VND)"
          required
          hint={priceLocked ? "Đã có backer chọn nên giá được khoá" : "Tối thiểu 10.000đ"}
        >
          {priceLocked && <input type="hidden" name="amount" value={initial?.amount} />}
          <Input
            name={priceLocked ? "_amount_locked" : "amount"}
            type="number"
            min={10000}
            step={1000}
            defaultValue={initial?.amount ?? 250000}
            disabled={priceLocked}
            required
          />
        </Field>
      </div>

      <Field label="Mô tả quyền lợi">
        <Textarea name="description" defaultValue={initial?.description ?? ""} rows={2} placeholder="Mô tả ngắn những gì backer nhận được…" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Dự kiến giao (YYYY-MM)" required>
          <Input name="estimated_delivery" type="month" defaultValue={defaultMonth} required />
        </Field>
        <Field label="Giới hạn suất" hint="Để trống nếu không giới hạn">
          <Input
            name="quantity_limit"
            type="number"
            min={Math.max(1, initial?.claimed_count ?? 1)}
            defaultValue={initial?.quantity_limit ?? ""}
            placeholder="Không giới hạn"
          />
        </Field>
        <Field label="Phí giao hàng (VND)" hint={shipsPhysical ? "0đ = miễn phí ship" : "Quà số không tính phí ship"}>
          <Input
            name="shipping_fee"
            type="number"
            min={0}
            step={1000}
            defaultValue={shipsPhysical ? initial?.shipping_fee ?? 0 : 0}
            disabled={!shipsPhysical}
          />
        </Field>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface-2/40 p-3">
        <input
          type="checkbox"
          name="ships_physical"
          checked={shipsPhysical}
          onChange={(e) => setShipsPhysical(e.target.checked)}
          className="size-4 accent-violet-600"
        />
        <span className="text-sm font-semibold">Có giao quà vật lý (cần địa chỉ giao hàng tại Việt Nam)</span>
      </label>

      {/* Reward items list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Danh sách vật phẩm trong gói (tuỳ chọn)</span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setItems((prev) => [...prev, { name: "", quantity: 1 }])}
          >
            <Plus className="size-3.5" /> Thêm món
          </Button>
        </div>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={it.name}
                onChange={(e) =>
                  setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, name: e.target.value } : row)))
                }
                placeholder={`Tên vật phẩm #${idx + 1}`}
                className="flex-1"
              />
              <Input
                type="number"
                min={1}
                value={it.quantity}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((row, i) => (i === idx ? { ...row, quantity: Math.max(1, Number(e.target.value) || 1) } : row)),
                  )
                }
                className="w-20"
              />
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                aria-label="Xoá món"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {addOns.length > 0 && (
        <div className="space-y-2">
          <span className="block text-sm font-semibold">Add-on được phép mua kèm với mức quà này</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {addOns.map((a) => (
              <label key={a.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3 py-2 text-sm hover:bg-surface-2">
                <input
                  type="checkbox"
                  name="add_on_ids"
                  value={a.id}
                  defaultChecked={initial?.add_on_ids.includes(a.id)}
                  className="size-4 accent-violet-600"
                />
                <span className="min-w-0 flex-1 truncate font-medium">{a.title}</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatVnd(a.price)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Huỷ
        </Button>
        <SubmitButton pendingText="Đang lưu…">{initial ? "Lưu mức quà" : "Tạo mức quà"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

function AddOnFormBody({
  projectId,
  initial,
  tiers,
  onDone,
}: {
  projectId: string;
  initial: AddOnRow | null;
  tiers: TierRow[];
  onDone: () => void;
}) {
  return (
    <ActionForm action={saveAddOnAction} onSuccess={onDone} className="space-y-4">
      <input type="hidden" name="project_id" value={projectId} />
      {initial && <input type="hidden" name="add_on_id" value={initial.id} />}
      <input type="hidden" name="sync_tiers" value="1" />

      <Field label="Tên add-on" required>
        <Input name="title" defaultValue={initial?.title ?? ""} placeholder="Ví dụ: Dây đeo thay thế, Túi chống sốc" required />
      </Field>

      <Field label="Mô tả">
        <Textarea name="description" defaultValue={initial?.description ?? ""} rows={2} placeholder="Mô tả ngắn sản phẩm mua kèm" />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Giá bán (VND)" required>
          <Input name="price" type="number" min={1000} step={1000} defaultValue={initial?.price ?? 150000} required />
        </Field>
        <Field label="Tồn kho" hint="Trống = không giới hạn">
          <Input name="stock" type="number" min={initial?.sold_count ?? 0} defaultValue={initial?.stock ?? ""} />
        </Field>
        <Field label="Tối đa / đơn">
          <Input name="max_per_pledge" type="number" min={1} max={99} defaultValue={initial?.max_per_pledge ?? 5} />
        </Field>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
        <input type="checkbox" name="is_active" defaultChecked={initial ? initial.is_active === 1 : true} className="size-4 accent-violet-600" />
        Đang kích hoạt cho phép mua kèm
      </label>

      {tiers.length > 0 && (
        <div className="space-y-2">
          <span className="block text-sm font-semibold">Áp dụng cho các mức quà</span>
          <div className="max-h-40 space-y-1.5 overflow-y-auto">
            {tiers.map((t) => (
              <label key={t.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3 py-2 text-sm hover:bg-surface-2">
                <input
                  type="checkbox"
                  name="tier_ids"
                  value={t.id}
                  defaultChecked={initial ? initial.tier_ids.includes(t.id) : true}
                  className="size-4 accent-violet-600"
                />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <span className="text-xs font-semibold text-muted">{formatVnd(t.amount)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Huỷ
        </Button>
        <SubmitButton pendingText="Đang lưu…">{initial ? "Lưu add-on" : "Thêm add-on"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

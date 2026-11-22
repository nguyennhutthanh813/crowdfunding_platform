"use client";

import { useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  KeyRound,
  Lock,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  addCardAction,
  changePasswordAction,
  deleteAddressAction,
  deleteCardAction,
  saveAddressAction,
  setDefaultAddressAction,
  setDefaultCardAction,
  updateAccountAction,
  updatePreferencesAction,
  updateProfileAction,
} from "@/server/actions/me";
import type { ActiveSessionInfo, TwoFactorStatusInfo } from "@/server/queries/me";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea, Toggle } from "@/components/ui/form";
import { ImageUploadButton } from "@/components/ui/image-upload";
import { Badge, Card, Divider } from "@/components/ui/primitives";
import { SafeAvatar } from "./safe-media";
import { SecurityTwoFactorPanel } from "./security-2fa-panel";
import { COUNTRY_NAMES, cn } from "@/lib/utils";

const AVATAR_PRESETS = [
  { label: "Mặc định", url: "" },
  { label: "Người ủng hộ", url: "/v3/roles/backer.webp" },
  { label: "Chủ dự án", url: "/v3/roles/creator.webp" },
  { label: "Cộng tác viên", url: "/v3/roles/collaborator.webp" },
  { label: "Trợ lý AI", url: "/v3/brand/ai-orb.webp" },
];

const VN_PROVINCES = [
  "Hà Nội",
  "TP. Hồ Chí Minh",
  "Đà Nẵng",
  "Hải Phòng",
  "Cần Thơ",
  "Huế",
  "Đà Lạt",
  "Nha Trang",
  "Bình Dương",
  "Đồng Nai",
  "Quảng Ninh",
  "Nghệ An",
  "Thanh Hoá",
  "Bắc Ninh",
  "Hưng Yên",
  "Khánh Hoà",
  "Lâm Đồng",
  "Quảng Nam",
  "Thừa Thiên Huế",
  "Bà Rịa - Vũng Tàu",
  "Long An",
  "Tiền Giang",
  "Kiên Giang",
];

export function ProfileSettingsForm({
  user,
}: {
  user: {
    display_name: string;
    bio: string;
    country_code: string;
    province: string | null;
    avatar_url: string | null;
  };
}) {
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url ?? "");
  const [displayName, setDisplayName] = useState(user.display_name);

  return (
    <Card className="p-5 sm:p-6">
      <ActionForm action={updateProfileAction} className="space-y-5">
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-2/50 p-4 sm:flex-row sm:items-center">
          <SafeAvatar name={displayName || user.display_name} src={avatarUrl || null} size={64} />
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-bold">Ảnh đại diện</div>
              <ImageUploadButton folder="avatars" label="Tải ảnh từ máy tính" onUploaded={setAvatarUrl} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AVATAR_PRESETS.map((p) => {
                const active = avatarUrl === p.url;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setAvatarUrl(p.url)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                      active
                        ? "border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-300"
                        : "border-line bg-surface text-muted hover:text-fg",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <Field
          label="Đường dẫn ảnh đại diện (tuỳ chọn)"
          hint="Tải ảnh trực tiếp từ thiết bị bằng nút phía trên hoặc chọn mẫu có sẵn."
        >
          <Input
            name="avatar_url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://... (liên kết ảnh đại diện)"
          />
        </Field>

        <Field label="Tên hiển thị" required>
          <Input
            name="display_name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            minLength={2}
            maxLength={60}
            required
          />
        </Field>

        <Field label="Giới thiệu bản thân" hint="Tối đa 500 ký tự — hiển thị trên trang hồ sơ công khai.">
          <Textarea
            name="bio"
            defaultValue={user.bio}
            maxLength={500}
            placeholder="Bạn quan tâm lĩnh vực nào, đang sáng tạo dự án gì?"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quốc gia">
            <Select name="country_code" defaultValue={user.country_code}>
              {Object.entries(COUNTRY_NAMES).map(([code, label]) => (
                <option key={code} value={code}>
                  {label} ({code})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tỉnh / Thành phố">
            <Input
              name="province"
              defaultValue={user.province ?? ""}
              list="profile-provinces"
              placeholder="Hà Nội, TP. Hồ Chí Minh…"
            />
            <datalist id="profile-provinces">
              {VN_PROVINCES.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
        </div>

        <div className="flex justify-end">
          <SubmitButton pendingText="Đang lưu…">Lưu hồ sơ</SubmitButton>
        </div>
      </ActionForm>
    </Card>
  );
}

export function AccountSettingsForms({
  user,
  sessionsCount,
  twoFactor,
  sessionList,
}: {
  user: { username: string; email: string; email_verified_at: string | null };
  sessionsCount: number;
  twoFactor: TwoFactorStatusInfo;
  sessionList: ActiveSessionInfo[];
}) {
  return (
    <div className="space-y-5">
      <SecurityTwoFactorPanel
        email={user.email}
        emailVerifiedAt={user.email_verified_at}
        twoFactor={twoFactor}
        sessionList={sessionList}
      />

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold">Thông tin đăng nhập</h3>
            <p className="text-xs text-muted">Cập nhật tên đăng nhập (URL hồ sơ) và email liên hệ.</p>
          </div>
          {user.email_verified_at && (
            <Badge tone="emerald">
              <CheckCircle2 className="size-3" /> Email đã xác minh
            </Badge>
          )}
        </div>

        <ActionForm action={updateAccountAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tên đăng nhập" required hint="Dùng cho trang /u/username (3–30 ký tự)">
              <Input name="username" defaultValue={user.username} pattern="^[a-zA-Z0-9_.]{3,30}$" required />
            </Field>
            <Field label="Email" required>
              <Input name="email" type="email" defaultValue={user.email} required />
            </Field>
          </div>
          <div className="flex justify-end">
            <SubmitButton pendingText="Đang cập nhật…">Cập nhật tài khoản</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-violet-500" />
            <div>
              <h3 className="text-base font-bold">Đổi mật khẩu</h3>
              <p className="text-xs text-muted">
                Hiện có <b>{sessionsCount}</b> phiên đăng nhập đang hoạt động. Đổi mật khẩu sẽ tự thu hồi các phiên trên thiết bị khác.
              </p>
            </div>
          </div>
        </div>

        <ActionForm action={changePasswordAction} resetOnSuccess className="space-y-4">
          <Field label="Mật khẩu hiện tại" required>
            <Input name="currentPassword" type="password" autoComplete="current-password" required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mật khẩu mới" required hint="Tối thiểu 8 ký tự">
              <Input name="newPassword" type="password" minLength={8} autoComplete="new-password" required />
            </Field>
            <Field label="Nhập lại mật khẩu mới" required>
              <Input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required />
            </Field>
          </div>
          <div className="flex justify-end">
            <SubmitButton variant="secondary" pendingText="Đang đổi…">
              Đổi mật khẩu
            </SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}

export function PreferencesSettingsForm({
  settings,
}: {
  settings: {
    notify_new_project: number;
    notify_project_update: number;
    notify_comment_reply: number;
    notify_message: number;
    hide_backed_projects: number;
  };
}) {
  return (
    <Card className="p-5 sm:p-6">
      <ActionForm action={updatePreferencesAction} className="space-y-4">
        <div>
          <h3 className="text-base font-bold">Thông báo</h3>
          <p className="text-xs text-muted">Chọn loại thông báo bạn muốn nhận trong hệ thống.</p>
        </div>

        <div className="space-y-2.5">
          <Toggle
            name="notify_new_project"
            defaultChecked={Boolean(settings.notify_new_project)}
            label="Dự án mới từ chủ dự án đang theo dõi"
            description="Nhận thông báo khi chủ dự án bạn theo dõi mở chiến dịch mới."
          />
          <Toggle
            name="notify_project_update"
            defaultChecked={Boolean(settings.notify_project_update)}
            label="Bản tin tiến độ dự án"
            description="Thông báo khi dự án bạn góp vốn hoặc đã lưu đăng bản tin mới."
          />
          <Toggle
            name="notify_comment_reply"
            defaultChecked={Boolean(settings.notify_comment_reply)}
            label="Trả lời bình luận"
            description="Thông báo khi chủ dự án hoặc cộng đồng trả lời bình luận của bạn."
          />
          <Toggle
            name="notify_message"
            defaultChecked={Boolean(settings.notify_message)}
            label="Tin nhắn nội bộ"
            description="Nhận thông báo khi có tin nhắn mới trong hộp thư."
          />
        </div>

        <Divider />

        <div>
          <h3 className="text-base font-bold">Quyền riêng tư</h3>
          <p className="mt-0.5 text-xs text-muted">Kiểm soát hiển thị trên trang hồ sơ công khai.</p>
        </div>

        <Toggle
          name="hide_backed_projects"
          defaultChecked={Boolean(settings.hide_backed_projects)}
          label="Ẩn danh sách dự án đã góp vốn trên hồ sơ công khai"
          description="Khi bật, khách xem /u/username của bạn sẽ không thấy các dự án bạn đã ủng hộ."
        />

        <div className="flex justify-end pt-2">
          <SubmitButton pendingText="Đang lưu…">Lưu tuỳ chọn</SubmitButton>
        </div>
      </ActionForm>
    </Card>
  );
}

export interface AddressItem {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  line1: string;
  ward: string;
  district: string;
  province: string;
  is_default: number;
}

export function AddressesSection({ addresses }: { addresses: AddressItem[] }) {
  const [editing, setEditing] = useState<AddressItem | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold">Sổ địa chỉ giao hàng (Việt Nam)</h3>
          <p className="text-xs text-muted">Địa chỉ nhận phần quà vật lý trên toàn lãnh thổ Việt Nam.</p>
        </div>
        <Button type="button" size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-4" /> Thêm địa chỉ
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">
          Bạn chưa lưu địa chỉ giao hàng nào. Thêm địa chỉ để góp vốn nhanh hơn.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <Card
              key={a.id}
              className={cn(
                "flex flex-col justify-between gap-3 p-4",
                a.is_default === 1 && "border-violet-500/40 bg-violet-500/[0.03]",
              )}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold">
                    <MapPin className="size-4 text-violet-500" /> {a.label}
                  </span>
                  {a.is_default === 1 && <Badge tone="violet">Mặc định</Badge>}
                </div>
                <div className="text-sm font-semibold">
                  {a.recipient_name} · {a.phone}
                </div>
                <div className="text-xs text-muted leading-relaxed">
                  {[a.line1, a.ward, a.district, a.province].filter(Boolean).join(", ")} · Việt Nam
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
                {a.is_default === 0 && (
                  <ActionForm action={setDefaultAddressAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <SubmitButton variant="secondary" size="xs" pendingText="Đang đặt…">
                      Đặt mặc định
                    </SubmitButton>
                  </ActionForm>
                )}
                <Button type="button" variant="outline" size="xs" onClick={() => setEditing(a)}>
                  <Pencil className="size-3" /> Sửa
                </Button>
                <ActionForm action={deleteAddressAction} confirm="Bạn chắc chắn muốn xoá địa chỉ này?">
                  <input type="hidden" name="id" value={a.id} />
                  <SubmitButton variant="ghost" size="xs" className="text-rose-600 hover:bg-rose-500/10" pendingText="Đang xoá…">
                    <Trash2 className="size-3" /> Xoá
                  </SubmitButton>
                </ActionForm>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? "Cập nhật địa chỉ giao hàng" : "Thêm địa chỉ giao hàng (Việt Nam)"}
        description="Địa chỉ dùng để giao phần quà vật lý khi dự án đạt mục tiêu."
      >
        <AddressFormBody
          key={editing?.id ?? "new"}
          initial={editing}
          onSuccess={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      </Dialog>
    </div>
  );
}

function AddressFormBody({ initial, onSuccess }: { initial: AddressItem | null; onSuccess: () => void }) {
  return (
    <ActionForm action={saveAddressAction} onSuccess={onSuccess} className="space-y-3.5">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nhãn địa chỉ" required>
          <Input name="label" defaultValue={initial?.label ?? "Nhà riêng"} placeholder="Nhà riêng / Công ty" required />
        </Field>
        <Field label="Số điện thoại" required>
          <Input name="phone" defaultValue={initial?.phone ?? ""} placeholder="0901234567" required />
        </Field>
      </div>
      <Field label="Tên người nhận" required>
        <Input name="recipient_name" defaultValue={initial?.recipient_name ?? ""} placeholder="Nguyễn Minh Anh" required />
      </Field>
      <Field label="Số nhà, tên đường" required>
        <Input name="line1" defaultValue={initial?.line1 ?? ""} placeholder="123 Lê Lợi" required />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Phường / Xã">
          <Input name="ward" defaultValue={initial?.ward ?? ""} placeholder="Phường 1" />
        </Field>
        <Field label="Quận / Huyện">
          <Input name="district" defaultValue={initial?.district ?? ""} placeholder="Quận 1" />
        </Field>
        <Field label="Tỉnh / Thành phố" required>
          <Input name="province" defaultValue={initial?.province ?? ""} list="addr-provinces" placeholder="TP. Hồ Chí Minh" required />
          <datalist id="addr-provinces">
            {VN_PROVINCES.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-xs font-medium">
        <input
          type="checkbox"
          name="is_default"
          defaultChecked={initial ? initial.is_default === 1 : true}
          className="size-4 accent-violet-600"
        />
        Đặt làm địa chỉ giao hàng mặc định
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <SubmitButton size="sm" pendingText="Đang lưu…">
          {initial ? "Lưu thay đổi" : "Thêm địa chỉ"}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export interface CardItem {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  holder_name: string;
  is_default: number;
  used: number;
  active_use: number;
}

const BRAND_CARD_STYLE: Record<string, string> = {
  VISA: "from-indigo-600 via-violet-600 to-purple-700",
  MASTERCARD: "from-amber-500 via-orange-500 to-rose-600",
  JCB: "from-emerald-600 via-teal-600 to-cyan-700",
  NAPAS: "from-sky-600 via-blue-600 to-indigo-700",
};

export function CardsSection({ cards }: { cards: CardItem[] }) {
  const [cardNumber, setCardNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [expMonth, setExpMonth] = useState("12");
  const [expYear, setExpYear] = useState("2029");

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-4 text-xs">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="space-y-1">
          <div className="font-bold text-fg">Bảo mật thẻ thanh toán an toàn</div>
          <p className="text-muted">
            Hệ thống không lưu số thẻ đầy đủ — chỉ lưu mã bảo mật đại diện và 4 số cuối. Khi góp vốn, thẻ chỉ uỷ quyền giữ chỗ và chỉ thanh toán khi dự án đạt mục tiêu.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Card key={c.id} className="overflow-hidden p-4 space-y-3">
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-lg",
                BRAND_CARD_STYLE[c.brand] ?? BRAND_CARD_STYLE.VISA,
              )}
            >
              <div className="flex items-center justify-between text-xs font-bold tracking-wider opacity-90">
                <span>{c.brand}</span>
                {c.is_default === 1 && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">Mặc định</span>}
              </div>
              <div className="mt-4 font-mono text-lg font-bold tracking-[0.18em]">•••• •••• •••• {c.last4}</div>
              <div className="mt-4 flex items-end justify-between text-[11px] opacity-90">
                <span className="truncate font-semibold">{c.holder_name}</span>
                <span className="font-mono">
                  {String(c.exp_month).padStart(2, "0")}/{String(c.exp_year).slice(-2)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted">
                {c.used > 0 ? (
                  <span className="inline-flex items-center gap-1" title="Thẻ gắn với giao dịch góp vốn được giữ lại để đối soát">
                    <Lock className="size-3" /> Gắn {c.used} giao dịch {c.active_use > 0 ? `(${c.active_use} đang giữ chỗ)` : ""}
                  </span>
                ) : (
                  <span>Chưa có giao dịch</span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {c.is_default === 0 && (
                  <ActionForm action={setDefaultCardAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <SubmitButton variant="secondary" size="xs" pendingText="Đang đặt…">
                      Đặt mặc định
                    </SubmitButton>
                  </ActionForm>
                )}
                <ActionForm action={deleteCardAction} confirm={`Xoá thẻ ${c.brand} •••• ${c.last4}?`}>
                  <input type="hidden" name="id" value={c.id} />
                  <SubmitButton variant="ghost" size="xs" className="text-rose-600 hover:bg-rose-500/10" pendingText="Đang xoá…">
                    <Trash2 className="size-3" /> Xoá
                  </SubmitButton>
                </ActionForm>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-violet-500" />
            <h3 className="text-base font-bold">Liên kết thẻ mới</h3>
          </div>
        </div>

        <ActionForm
          action={addCardAction}
          resetOnSuccess
          onSuccess={() => {
            setCardNumber("");
            setHolderName("");
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Số thẻ" required hint="Hỗ trợ thẻ VISA / MasterCard / JCB / NAPAS">
              <Input
                name="cardNumber"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="Nhập số thẻ thanh toán"
                required
              />
            </Field>
            <Field label="Tên chủ thẻ (không dấu)" required>
              <Input
                name="holderName"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="LE MINH ANH"
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:max-w-xs">
            <Field label="Tháng hết hạn" required>
              <Input
                name="expMonth"
                type="number"
                min={1}
                max={12}
                value={expMonth}
                onChange={(e) => setExpMonth(e.target.value)}
                required
              />
            </Field>
            <Field label="Năm hết hạn" required>
              <Input
                name="expYear"
                type="number"
                min={2025}
                max={2099}
                value={expYear}
                onChange={(e) => setExpYear(e.target.value)}
                required
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium">
            <input type="checkbox" name="is_default" defaultChecked={cards.length === 0} className="size-4 accent-violet-600" />
            Đặt làm thẻ thanh toán mặc định
          </label>

          <div className="flex justify-end">
            <SubmitButton size="sm" pendingText="Đang thêm…">
              <Plus className="size-4" /> Thêm thẻ
            </SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}

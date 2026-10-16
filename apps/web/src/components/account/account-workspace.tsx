"use client";

import {
  Bell,
  Check,
  Compass,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Save,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { FormEvent, useState } from "react";
import type { SessionResult, UserRole } from "@/lib/api";
import { defaultNotificationPreferences } from "@/lib/auth/notification-preferences";
import { InterestPreferences } from "@/components/account/interest-preferences";
import { useAuth } from "@/components/auth/auth-provider";
import { useQueryTab } from "@/hooks/use-query-tab";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { roleDescriptions, roleLabels } from "@/lib/auth/roles";

const tabs = [
  { id: "profile", label: "Hồ sơ", icon: UserRound },
  { id: "interests", label: "Sở thích", icon: Compass },
  { id: "roles", label: "Vai trò & quyền", icon: UsersRound },
  { id: "notifications", label: "Thông báo", icon: Bell },
  { id: "security", label: "Bảo mật", icon: LockKeyhole },
] as const;

type AccountTab = (typeof tabs)[number]["id"];
const accountTabIds = tabs.map((tab) => tab.id);

const allRoles: UserRole[] = ["BACKER", "CREATOR", "COLLABORATOR", "ADMIN"];

async function saveAccountAction(
  action: string,
  payload: Record<string, unknown>,
) {
  return clientRequest<{ data: { message: string; persisted: boolean } }>(
    "/api/v1/me/dashboard",
    {
      method: "POST",
      body: JSON.stringify({ action, payload }),
    },
  );
}

function ProfilePanel() {
  const { session, busy, updateProfile } = useAuth();
  const [name, setName] = useState(session?.user.name ?? "");
  const [headline, setHeadline] = useState(session?.user.headline ?? "");
  const [notice, setNotice] = useState("");

  if (!session) return null;

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    const saved = await updateProfile({ name, headline });
    setNotice(
      saved
        ? "Đã cập nhật hồ sơ tài khoản."
        : "Chưa thể lưu hồ sơ. Bạn kiểm tra lại thông tin nhé.",
    );
  };

  return (
    <div>
      <p className="eyebrow text-coral">Thông tin cá nhân</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold">
        Hồ sơ hiển thị trên Góp
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
        Bạn có thể sửa tên và giới thiệu cho phiên demo đang dùng. Thông tin
        trong dữ liệu mẫu của các dự án chưa được thay đổi theo hồ sơ này.
      </p>

      <form onSubmit={saveProfile} className="mt-7 max-w-2xl space-y-5">
        <div className="flex items-center gap-4 rounded-2xl bg-[#f3f5ec] p-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-forest font-display text-sm font-extrabold text-lime">
            {session.user.initials}
          </span>
          <div>
            <p className="text-sm font-bold">Ảnh đại diện tạm thời</p>
            <p className="mt-1 text-xs text-ink-muted">
              Khi nối phần lưu trữ thật, bạn có thể thay chữ viết tắt bằng ảnh
              đại diện.
            </p>
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-ink-soft">Họ và tên</span>
          <input
            name="full-name"
            minLength={2}
            maxLength={80}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input-field mt-2"
            autoComplete="name"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink-soft">Email</span>
          <input
            name="account-email"
            value={session.user.email}
            className="input-field mt-2 cursor-not-allowed bg-stone-100 text-ink-muted"
            readOnly
            aria-describedby="email-note"
          />
          <span
            id="email-note"
            className="mt-1.5 block text-[11px] text-ink-muted"
          >
            Email đăng nhập chưa thể đổi trong bản trải nghiệm.
          </span>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink-soft">
            Giới thiệu ngắn
          </span>
          <textarea
            name="profile-headline"
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            className="input-field mt-2 min-h-24 resize-y"
            maxLength={120}
          />
          <span className="mt-1.5 block text-right text-[10px] text-ink-muted">
            {headline.length}/120
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="button-dark disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Lưu hồ sơ
          </button>
          <p className="text-xs text-ink-muted" role="status">
            {notice}
          </p>
        </div>
      </form>
    </div>
  );
}

function RolesPanel() {
  const { session, busy, switchRole, activateCreatorRole } = useAuth();
  const [notice, setNotice] = useState("");
  if (!session) return null;

  const activateCreator = async () => {
    setNotice("");
    const activated = await activateCreatorRole();
    if (!activated) setNotice("Chưa thể mở quyền Chủ dự án lúc này.");
  };

  return (
    <div>
      <p className="eyebrow text-coral">Quyền theo tài khoản</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold">
        Vai trò và phạm vi truy cập
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
        Một tài khoản có thể mang nhiều vai trò. Riêng Cộng tác viên chỉ có hiệu
        lực trong chiến dịch đã được mời; quyền Quản trị viên do hệ thống cấp.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {allRoles.map((role) => {
          const enabled = session.user.roles.includes(role);
          const active = session.user.activeRole === role;
          const canRequest =
            role === "CREATOR" && session.user.roles.includes("BACKER");
          return (
            <article
              key={role}
              className={`rounded-2xl border p-5 ${enabled ? "border-forest/18 bg-[#f7f8f2]" : "border-line bg-white"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`grid size-10 place-items-center rounded-xl ${enabled ? "bg-forest text-lime" : "bg-stone-100 text-ink-muted"}`}
                >
                  {enabled ? (
                    <Check className="size-4" />
                  ) : (
                    <KeyRound className="size-4" />
                  )}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${active ? "bg-lime text-forest" : enabled ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-ink-muted"}`}
                >
                  {active ? "Đang sử dụng" : enabled ? "Đã cấp" : "Chưa có"}
                </span>
              </div>
              <h3 className="mt-4 font-display text-lg font-extrabold">
                {roleLabels[role]}
              </h3>
              <p className="mt-2 min-h-12 text-xs leading-5 text-ink-muted">
                {roleDescriptions[role]}
              </p>
              {enabled && !active ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void switchRole(role)}
                  className="button-secondary mt-4 min-h-11 px-4 text-xs"
                >
                  Chuyển sang vai trò này
                </button>
              ) : null}
              {!enabled && canRequest ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void activateCreator()}
                  className="button-dark mt-4 min-h-11 px-4 text-xs"
                >
                  Mở quyền Chủ dự án
                </button>
              ) : null}
              {!enabled && !canRequest ? (
                <p className="mt-4 text-[11px] font-semibold text-ink-muted">
                  {role === "COLLABORATOR"
                    ? "Cần lời mời từ một chủ dự án."
                    : "Chỉ quản trị hệ thống có thể cấp."}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-red-600" role="status">
        {notice}
      </p>
    </div>
  );
}

function NotificationsPanel() {
  const { session, establishSession } = useAuth();
  const [preferences, setPreferences] = useState(() => ({
    ...defaultNotificationPreferences,
    ...session?.previewState?.notificationPreferences,
  }));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const savePreferences = async () => {
    setSaving(true);
    setNotice("");
    try {
      const nextSession = await clientRequest<SessionResult>(
        "/api/v1/auth/session",
        {
          method: "PATCH",
          body: JSON.stringify({ notificationPreferences: preferences }),
        },
      );
      establishSession(nextSession);
      setNotice("Đã lưu lựa chọn trong phiên đăng nhập này.");
    } catch (error) {
      setNotice(
        clientRequestMessage(error, "Chưa thể lưu. Bạn thử lại sau nhé."),
      );
    } finally {
      setSaving(false);
    }
  };

  const options = [
    {
      key: "projectUpdates" as const,
      title: "Cập nhật từ dự án đã ủng hộ",
      detail: "Tiến độ sản xuất, thay đổi lịch giao và bài viết mới.",
      visible: session?.user.roles.includes("BACKER"),
    },
    {
      key: "pledgeStatus" as const,
      title: "Trạng thái cam kết và thanh toán",
      detail: "Giữ tiền, thu tiền, hủy cam kết và giao quà.",
      visible: session?.user.roles.includes("BACKER"),
    },
    {
      key: "recommendations" as const,
      title: "Gợi ý dự án phù hợp",
      detail: "Bản tin chọn lọc dựa trên lượt lưu và lĩnh vực quan tâm.",
      visible: session?.user.roles.includes("BACKER"),
    },
    {
      key: "creatorTasks" as const,
      title: "Công việc trong nhóm dự án",
      detail: "Nhắc phản hồi bình luận, cập nhật và mốc vận hành.",
      visible: session?.user.roles.some(
        (role) => role === "CREATOR" || role === "COLLABORATOR",
      ),
    },
    {
      key: "moderationAlerts" as const,
      title: "Hồ sơ chờ duyệt và cảnh báo cần xử lý",
      detail:
        "Nhắc việc kiểm duyệt dự án và các cảnh báo cần quản trị viên xem xét.",
      visible: session?.user.roles.includes("ADMIN"),
    },
  ].filter((option) => option.visible);

  return (
    <div>
      <p className="eyebrow text-coral">Kênh liên lạc</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold">
        Chọn điều bạn muốn được nhắc
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
        Lựa chọn được giữ khi tải lại trang, đến khi bạn đăng xuất hoặc phiên
        hết hạn. Bản demo chưa gửi email hay thông báo đẩy.
      </p>
      <div className="mt-7 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
        {options.map((option) => (
          <label
            key={option.key}
            className="flex cursor-pointer items-start gap-4 p-4 hover:bg-[#fafbf7] sm:p-5"
          >
            <input
              name={`notification-${option.key}`}
              type="checkbox"
              checked={preferences[option.key]}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  [option.key]: event.target.checked,
                }))
              }
              className="mt-1 size-4 accent-forest"
            />
            <span>
              <span className="block text-sm font-bold">{option.title}</span>
              <span className="mt-1 block text-xs leading-5 text-ink-muted">
                {option.detail}
              </span>
            </span>
          </label>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void savePreferences()}
          className="button-dark disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Lưu thông báo
        </button>
        <p className="text-xs text-ink-muted" role="status">
          {notice}
        </p>
      </div>
    </div>
  );
}

function SecurityPanel() {
  const { session } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  if (!session) return null;

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    if (newPassword.length < 8) {
      setNotice("Mật khẩu mới cần ít nhất 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotice("Hai lần nhập mật khẩu mới chưa khớp.");
      return;
    }
    setSaving(true);
    try {
      const result = await saveAccountAction("CHANGE_PASSWORD", {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice(result.data.message);
    } catch (error) {
      setNotice(
        clientRequestMessage(
          error,
          "Chưa thể đổi mật khẩu. Bạn thử lại sau nhé.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const expiry = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(session.expiresAt));

  return (
    <div>
      <p className="eyebrow text-coral">Phiên và mật khẩu</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold">
        Bảo mật tài khoản
      </h2>
      <div className="mt-7 flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />
        <div>
          <p className="text-sm font-bold text-emerald-900">
            Phiên hiện tại hợp lệ
          </p>
          <p className="mt-1 text-xs leading-5 text-emerald-800/70">
            Hết hạn lúc {expiry}. Bạn có thể đăng xuất trước thời điểm này nếu
            đang dùng máy tính chung.
          </p>
        </div>
      </div>

      <p className="mt-5 max-w-2xl text-sm leading-6 text-ink-muted">
        Đây là biểu mẫu thử, không đổi mật khẩu tài khoản mẫu. Chỉ dùng mật khẩu
        demo; không nhập mật khẩu bạn đang dùng ở dịch vụ khác.
      </p>
      <form onSubmit={changePassword} className="mt-7 max-w-2xl space-y-4">
        <label className="block">
          <span className="text-xs font-bold text-ink-soft">
            Mật khẩu hiện tại
          </span>
          <input
            name="current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="input-field mt-2"
            autoComplete="current-password"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold text-ink-soft">
              Mật khẩu mới
            </span>
            <input
              name="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="input-field mt-2"
              autoComplete="new-password"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-ink-soft">
              Nhập lại mật khẩu
            </span>
            <input
              name="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="input-field mt-2"
              autoComplete="new-password"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="button-dark disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <KeyRound className="size-4" />
            )}
            Kiểm tra biểu mẫu
          </button>
          <p
            className={`text-xs ${notice.includes("Đã") ? "text-emerald-700" : "text-red-600"}`}
            role="status"
          >
            {notice}
          </p>
        </div>
      </form>
    </div>
  );
}

export function AccountWorkspace() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useQueryTab<AccountTab>(
    accountTabIds,
    "profile",
  );
  if (!session) return null;
  const visibleTabs = session.user.roles.includes("BACKER")
    ? tabs
    : tabs.filter((tab) => tab.id !== "interests");
  const visibleActiveTab = visibleTabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : "profile";

  return (
    <div className="container-shell grid min-w-0 gap-6 py-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:py-12">
      <aside className="min-w-0 rounded-[18px] bg-forest p-4 text-white lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-center gap-3 border-b border-white/9 p-3 pb-5">
          <span className="grid size-12 place-items-center rounded-2xl bg-lime font-display text-xs font-extrabold text-forest">
            {session.user.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{session.user.name}</p>
            <p className="mt-1 truncate text-[10px] text-white/45">
              {session.user.email}
            </p>
          </div>
        </div>
        <nav
          className="mt-3 flex gap-2 overflow-x-auto lg:flex-col"
          aria-label="Cài đặt tài khoản"
        >
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = visibleActiveTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-11 shrink-0 cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-xs font-bold transition-colors ${active ? "bg-lime text-forest" : "text-white/62 hover:bg-white/7 hover:text-white"}`}
              >
                <Icon className="size-4" /> {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="surface-card min-w-0 rounded-[20px] p-5 sm:p-8 lg:p-10">
        {visibleActiveTab === "profile" ? <ProfilePanel /> : null}
        {visibleActiveTab === "interests" ? <InterestPreferences /> : null}
        {visibleActiveTab === "roles" ? <RolesPanel /> : null}
        {visibleActiveTab === "notifications" ? <NotificationsPanel /> : null}
        {visibleActiveTab === "security" ? <SecurityPanel /> : null}
      </section>
    </div>
  );
}

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
import { FormEvent, useEffect, useState } from "react";
import type { SessionResult, UserRole } from "@/lib/api";
import { defaultNotificationPreferences } from "@/lib/auth/notification-preferences";
import { InterestPreferences } from "@/components/account/interest-preferences";
import { useAuth } from "@/components/auth/auth-provider";
import { useQueryTab } from "@/hooks/use-query-tab";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { roleDescriptions, roleLabels } from "@/lib/auth/roles";
import { notificationsUpdatedEvent } from "@/hooks/use-unread-notifications";
import Link from "next/link";

const tabs = [
  { id: "profile", label: "Hồ sơ", icon: UserRound },
  { id: "interests", label: "Sở thích", icon: Compass },
  { id: "roles", label: "Vai trò & quyền", icon: UsersRound },
  { id: "notifications", label: "Thông báo", icon: Bell },
  { id: "security", label: "Bảo mật", icon: LockKeyhole },
] as const;

type AccountTab = (typeof tabs)[number]["id"];
const accountTabIds = tabs.map((tab) => tab.id);

const accountRoles: UserRole[] = ["BACKER", "CREATOR"];
type TeamCampaign = { campaignId: string; title: string; accepted: boolean };

function teamCampaignHref(team: TeamCampaign) {
  if (!team.accepted) return "/collaborator#loi-moi";
  return team.campaignId.startsWith("cmp_preview_")
    ? `/collaborator/campaigns/${team.campaignId}/manage`
    : "/collaborator";
}

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

function ProfilePanel({ registeredAccount }: { registeredAccount: boolean }) {
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
        {registeredAccount
          ? "Tên và giới thiệu sẽ được giữ khi bạn đăng nhập lại trên máy này. Nội dung các dự án đã tạo không tự đổi theo hồ sơ."
          : "Bạn có thể sửa tên và giới thiệu trong phiên dùng thử này. Dữ liệu mẫu của các dự án vẫn giữ nguyên."}
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
            Email đăng nhập hiện chưa thể thay đổi.
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
          <span className="mt-1.5 block text-right text-[11px] text-ink-muted">
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

function RolesPanel({ teamCampaigns }: { teamCampaigns: TeamCampaign[] }) {
  const { session, busy, switchRole, activateCreatorRole } = useAuth();
  const [notice, setNotice] = useState("");
  if (!session) return null;
  const visibleAccountRoles = session.user.roles.includes("ADMIN")
    ? [...accountRoles.filter((role) => session.user.roles.includes(role)), "ADMIN" as const]
    : accountRoles;

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
        Bạn dùng một tài khoản để ủng hộ, tạo dự án và tham gia nhóm được mời.
        Quyền cộng tác chỉ áp dụng cho chiến dịch cụ thể.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {visibleAccountRoles.map((role) => {
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
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${active ? "bg-lime text-forest" : enabled ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-ink-muted"}`}
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
            </article>
          );
        })}
      </div>
      {!session.user.roles.includes("ADMIN") ? (
        <section
          className="mt-8 rounded-2xl border border-[#bfd4e7] bg-[#f5f9fc] p-5"
          aria-labelledby="team-role-title"
        >
          <p className="eyebrow text-[#2869ac]">Theo từng chiến dịch</p>
          <h3 id="team-role-title" className="mt-2 font-display text-xl font-extrabold">
            Làm cộng tác viên
          </h3>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Chủ dự án nhập email của bạn trong mục Nhóm. Bạn đăng nhập bằng đúng
            email đó, xem lời mời và tự chấp nhận. Khi chủ thu hồi quyền, bạn
            không còn sửa nội dung của chiến dịch.
          </p>
          {teamCampaigns.length ? (
            <ul className="mt-4 space-y-2">
              {teamCampaigns.map((team) => (
                <li
                  key={team.campaignId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d4e2ed] bg-white p-3"
                >
                  <span className="text-sm font-semibold">
                    {team.title}{" "}
                    <span className="ml-1 text-xs font-normal text-ink-muted">
                      · {team.accepted ? "Đang tham gia" : "Chờ bạn xác nhận"}
                    </span>
                  </span>
                  <Link
                    className="text-sm font-bold text-[#225b86] underline-offset-2 hover:underline"
                    href={teamCampaignHref(team)}
                  >
                    {team.accepted ? "Mở công việc" : "Xem lời mời"}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-[#bfd4e7] bg-white p-4 text-sm text-ink-muted">
              Chưa có lời mời trong tài khoản này. Bạn có thể gửi email đăng
              nhập cho chủ chiến dịch để họ mời.
            </p>
          )}
          <Link
            href="/collaborator#loi-moi"
            className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-[#225b86] underline-offset-2 hover:underline"
          >
            Xem tất cả lời mời và việc nhóm →
          </Link>
        </section>
      ) : (
        <p className="mt-5 text-sm text-ink-muted">
          Quyền Quản trị viên do hệ thống cấp, không mở từ trang đăng ký.
        </p>
      )}
      <p className="mt-4 text-xs text-red-600" role="status">
        {notice}
      </p>
    </div>
  );
}

function NotificationsPanel({ registeredAccount }: { registeredAccount: boolean }) {
  const { session, establishSession } = useAuth();
  const canSeeWork = Boolean(session);
  const [inbox, setInbox] = useState<Array<{
    campaignId: string; commentId: string; assignedAt: string; readAt: string | null;
    campaignTitle: string; question: string; answered: boolean; href: string;
  }>>([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [inboxError, setInboxError] = useState("");
  const [readingId, setReadingId] = useState("");
  const [reloadInbox, setReloadInbox] = useState(0);
  const [preferences, setPreferences] = useState(() => ({
    ...defaultNotificationPreferences,
    ...session?.previewState?.notificationPreferences,
  }));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!canSeeWork) return;
    let active = true;
    void clientRequest<{ data: { items: typeof inbox } }>("/api/v1/notifications")
      .then((result) => {
        if (active) { setInbox(result.data.items); setInboxError(""); }
      })
      .catch((error) => {
        if (active) setInboxError(clientRequestMessage(error, "Chưa tải được việc mới giao. Bạn thử lại nhé."));
      })
      .finally(() => { if (active) setInboxLoading(false); });
    return () => { active = false; };
  }, [canSeeWork, session?.user.id, reloadInbox]);

  const markRead = async (item: (typeof inbox)[number]) => {
    const key = `${item.campaignId}:${item.commentId}`;
    setReadingId(key);
    setInboxError("");
    try {
      const result = await clientRequest<{ data: { readAt: string } }>("/api/v1/notifications", {
        method: "PATCH",
        body: JSON.stringify({ campaignId: item.campaignId, commentId: item.commentId, assignedAt: item.assignedAt }),
      });
      setInbox((current) => current.map((row) => row.campaignId === item.campaignId &&
        row.commentId === item.commentId ? { ...row, readAt: result.data.readAt } : row));
      window.dispatchEvent(new Event(notificationsUpdatedEvent));
    } catch (error) {
      setInboxError(clientRequestMessage(error, "Chưa đánh dấu đã đọc được. Bạn thử lại nhé."));
    } finally {
      setReadingId("");
    }
  };

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
      setNotice(registeredAccount
        ? "Đã lưu lựa chọn cho tài khoản này."
        : "Đã lưu lựa chọn cho phiên đăng nhập hiện tại.");
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
      {canSeeWork && (inbox.length > 0 || session?.user.roles.includes("COLLABORATOR")) ? <section className="mb-9 rounded-2xl border border-[#c8d9ec] bg-[#f4f9fd] p-4 sm:p-5" aria-labelledby="question-inbox-title">
        <p className="eyebrow text-[#2869ac]">Việc trong nhóm</p>
        <h2 id="question-inbox-title" className="mt-2 font-display text-xl font-extrabold">Câu hỏi được giao cho bạn</h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">Mỗi câu hỏi chỉ hiện một lần theo người đang phụ trách. Trả lời trên trang chiến dịch để người ủng hộ cũng đọc được.</p>
        {inboxLoading ? <p role="status" className="mt-4 text-sm text-ink-muted">Đang tải câu hỏi được giao…</p>
          : inboxError ? null : inbox.length ? <ul className="mt-4 space-y-3">{inbox.map((item) => <li key={`${item.campaignId}:${item.commentId}`}
            className="rounded-xl border border-[#c8d9ec] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b className="text-sm text-ink">{item.campaignTitle}</b>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.answered ? "bg-[#e8f2e7] text-[#386446]" : item.readAt ? "bg-[#f0f2f4] text-[#5f6c75]" : "bg-[#e7f2fb] text-[#225b86]"}`}>
                {item.answered ? "Đã có phản hồi" : item.readAt ? "Đã đọc" : "Mới giao"}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-soft">{item.question}</p>
            <p className="mt-2 text-xs text-ink-muted">Giao lúc {new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(item.assignedAt))}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Link className="text-sm font-bold text-[#225b86] underline-offset-2 hover:underline" href={item.href}>Mở câu hỏi →</Link>
              {!item.readAt ? <button type="button" className="min-h-11 text-sm font-semibold text-[#225b86] underline-offset-2 hover:underline disabled:opacity-50"
                disabled={readingId === `${item.campaignId}:${item.commentId}`}
                onClick={() => void markRead(item)}>
                {readingId === `${item.campaignId}:${item.commentId}` ? "Đang lưu…" : "Đánh dấu đã đọc"}
              </button> : null}
            </div>
          </li>)}</ul> : <p className="mt-4 rounded-xl border border-dashed border-[#c8d9ec] bg-white p-4 text-sm text-ink-soft">Hiện chưa có câu hỏi nào giao cho bạn. Khi Chủ dự án giao việc, câu hỏi sẽ hiện ở đây và trên bảng Cộng tác viên.</p>}
        {inboxError ? <div className="mt-3 flex flex-wrap items-center gap-3"><p role="alert" className="text-sm text-red-700">{inboxError}</p>
          <button type="button" className="min-h-11 text-sm font-bold text-[#225b86] underline" onClick={() => { setInboxLoading(true); setReloadInbox((value) => value + 1); }}>Tải lại</button></div> : null}
      </section> : null}
      <p className="eyebrow text-coral">Cài đặt thử</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold">
        Lựa chọn nhắc tin cho sau này
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
        Bạn có thể lưu lựa chọn để thử phần cài đặt. Bản này chưa gửi các tin dưới đây qua email hay thông báo đẩy. Câu hỏi được giao vẫn hiện trong ứng dụng, dù bạn có chọn mục nào ở đây.
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
          Lưu lựa chọn
        </button>
        <p className="text-xs text-ink-muted" role="status">
          {notice}
        </p>
      </div>
    </div>
  );
}

function SecurityPanel({ registeredAccount }: { registeredAccount: boolean }) {
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
      if (result.data.persisted) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
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
        {registeredAccount
          ? "Tài khoản bạn tự đăng ký có thể đổi mật khẩu lưu trong dữ liệu local. Các phiên đã mở ở thiết bị khác chưa được thu hồi."
          : "Tài khoản mẫu có mật khẩu cố định. Hãy đăng ký tài khoản riêng nếu muốn thử đổi mật khẩu."}
      </p>
      {registeredAccount ? <form onSubmit={changePassword} className="mt-7 max-w-2xl space-y-4">
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
            Đổi mật khẩu
          </button>
          <p
            className={`text-xs ${notice.includes("Đã") ? "text-emerald-700" : "text-red-600"}`}
            role="status"
          >
            {notice}
          </p>
        </div>
      </form> : <Link className="button-secondary mt-5" href="/auth?mode=register">Tạo tài khoản riêng</Link>}
    </div>
  );
}

export function AccountWorkspace({ teamCampaigns, registeredAccount }: { teamCampaigns: TeamCampaign[]; registeredAccount: boolean }) {
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
      <aside className="min-w-0 rounded-[18px] border border-line bg-white p-3 text-ink lg:sticky lg:top-24 lg:self-start lg:border-0 lg:bg-forest lg:p-4 lg:text-white">
        <div className="flex items-center gap-3 border-b border-line px-2 pb-3 lg:border-white/9 lg:p-3 lg:pb-5">
          <span className="grid size-12 place-items-center rounded-2xl bg-lime font-display text-xs font-extrabold text-forest">
            {session.user.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{session.user.name}</p>
            <p className="mt-1 truncate text-[11px] text-ink-muted lg:text-white/45">
              {session.user.email}
            </p>
          </div>
        </div>
        <nav
          className="mt-2 grid grid-cols-3 gap-1 lg:mt-3 lg:flex lg:flex-col lg:gap-2"
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
                className={`flex min-h-14 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-1 text-center text-[11px] font-bold transition-colors lg:min-h-12 lg:w-full lg:flex-row lg:justify-start lg:gap-2 lg:px-3 lg:text-left lg:text-xs ${active ? "bg-forest text-white lg:bg-lime lg:text-forest" : "text-ink-muted hover:bg-stone-100 lg:text-white/62 lg:hover:bg-white/7 lg:hover:text-white"}`}
              >
                <Icon className="size-4" /> {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="surface-card min-w-0 rounded-[20px] p-5 sm:p-8 lg:p-10">
        {visibleActiveTab === "profile" ? <ProfilePanel registeredAccount={registeredAccount} /> : null}
        {visibleActiveTab === "interests" ? <InterestPreferences /> : null}
        {visibleActiveTab === "roles" ? <RolesPanel teamCampaigns={teamCampaigns} /> : null}
        {visibleActiveTab === "notifications" ? <NotificationsPanel registeredAccount={registeredAccount} /> : null}
        {visibleActiveTab === "security" ? <SecurityPanel registeredAccount={registeredAccount} /> : null}
      </section>
    </div>
  );
}

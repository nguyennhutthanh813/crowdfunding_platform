"use client";

import {
  Bell,
  Camera,
  Check,
  CheckCircle2,
  Compass,
  KeyRound,
  Link2,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { SessionResult, UserAddress, UserRole } from "@/lib/api";
import { defaultNotificationPreferences } from "@/lib/auth/notification-preferences";
import { InterestPreferences } from "@/components/account/interest-preferences";
import { useAuth } from "@/components/auth/auth-provider";
import { useQueryTab } from "@/hooks/use-query-tab";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { roleDescriptions, roleLabels } from "@/lib/auth/roles";

const tabs = [
  { id: "profile", label: "Hồ sơ", icon: UserRound },
  { id: "addresses", label: "Địa chỉ nhận hàng", icon: MapPin },
  { id: "interests", label: "Sở thích", icon: Compass },
  { id: "roles", label: "Vai trò & quyền", icon: UsersRound },
  { id: "notifications", label: "Thông báo", icon: Bell },
  { id: "security", label: "Bảo mật", icon: LockKeyhole },
] as const;

type AccountTab = (typeof tabs)[number]["id"];
const accountTabIds = tabs.map((tab) => tab.id);

const allRoles: UserRole[] = ["BACKER", "CREATOR", "COLLABORATOR", "ADMIN"];

async function processAndCompressImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Vui lòng chọn tệp định dạng hình ảnh (PNG, JPG, WebP...).");
  }

  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Kích thước tệp quá lớn. Vui lòng chọn ảnh dưới 15MB.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không thể đọc tệp hình ảnh."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Hình ảnh không hợp lệ hoặc bị lỗi."));
      img.onload = () => {
        const targetSize = 256;
        const canvas = document.createElement("canvas");
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Trình duyệt không hỗ trợ xử lý ảnh."));
          return;
        }

        // Cắt vuông tâm ảnh (Center crop)
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(
          img,
          sx,
          sy,
          minDim,
          minDim,
          0,
          0,
          targetSize,
          targetSize,
        );

        // Nén JPEG chất lượng 0.85 (~25KB)
        const compressed = canvas.toDataURL("image/jpeg", 0.85);
        resolve(compressed);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
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

function ProfilePanel() {
  const { session, busy, updateProfile } = useAuth();
  const [name, setName] = useState(session?.user.name ?? "");
  const [headline, setHeadline] = useState(session?.user.headline ?? "");
  const [phone, setPhone] = useState(session?.user.phone ?? "");
  const [location, setLocation] = useState(session?.user.location ?? "");
  const [bio, setBio] = useState(session?.user.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(session?.user.avatarUrl ?? "");
  const [notice, setNotice] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  if (!session) return null;

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setImageError("");
    setIsProcessingImage(true);
    try {
      // 1. Nén ảnh và hiển thị xem trước tức thì
      const compressedDataUrl = await processAndCompressImage(file);
      setAvatarUrl(compressedDataUrl);

      // 2. Tải lên máy chủ để nhận đường dẫn file ảnh tĩnh
      const res = await fetch("/api/v1/upload/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressedDataUrl }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.avatarUrl) {
          setAvatarUrl(data.avatarUrl);
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Lỗi khi xử lý hình ảnh.";
      setImageError(message);
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    const saved = await updateProfile({
      name,
      headline,
      phone,
      location,
      bio,
      avatarUrl,
    });
    setNotice(
      saved
        ? "Đã lưu cập nhật hồ sơ tài khoản thành công."
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
        Cập nhật thông tin chi tiết để kết nối với cộng đồng, giới thiệu bản thân
        và giúp việc nhận quà phần thưởng chiến dịch diễn ra suôn sẻ.
      </p>

      <form onSubmit={saveProfile} className="mt-7 max-w-2xl space-y-6">
        {/* Avatar Section */}
        <div className="rounded-2xl border border-line/60 bg-[#f8f9f4] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Ảnh đại diện
            </span>
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted transition-colors hover:text-forest"
            >
              <Link2 className="size-3" />
              {showUrlInput ? "Ẩn nhập liên kết URL" : "Dán URL ảnh ngoài"}
            </button>
          </div>

          <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            {/* Vùng Avatar tương tác kéo thả / nhấp chuột */}
            <div className="relative shrink-0">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) void handleFileChange(file);
                }}
                className={`group relative size-20 shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 transition-all ${
                  isDragging
                    ? "scale-105 border-forest bg-forest/10"
                    : "border-line/80 hover:border-forest/50 hover:shadow-md"
                }`}
                title="Nhấp hoặc kéo thả ảnh vào đây để đổi ảnh đại diện"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name || "Avatar"}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="grid size-full place-items-center bg-forest font-display text-lg font-extrabold text-lime">
                    {session.user.initials}
                  </span>
                )}

                {/* Lớp phủ Hover Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-forest/75 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {isProcessingImage ? (
                    <LoaderCircle className="size-5 animate-spin text-lime" />
                  ) : (
                    <>
                      <Camera className="size-4 text-lime" />
                      <span className="mt-1 text-[9px] font-bold text-lime">
                        Đổi ảnh
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Huy hiệu Camera ở góc dưới giúp nhận diện tương tác ngay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-xl border-2 border-white bg-forest text-lime shadow-md transition-transform hover:bg-forest/90 active:scale-95"
                title="Đổi ảnh đại diện"
              >
                <Camera className="size-3.5" />
              </button>
            </div>

            {/* Input file ẩn */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileChange(file);
              }}
            />

            {/* Hướng dẫn & Nút xóa */}
            <div className="flex-1 space-y-2.5 text-center sm:text-left">
              <div>
                <p className="text-sm font-bold text-ink">
                  Ảnh đại diện tài khoản
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Nhấp trực tiếp vào ảnh hoặc kéo thả ảnh từ máy tính vào để đổi
                  ảnh mới. Hệ thống tự động cắt vuông và nén tối ưu.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
                {isProcessingImage && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest">
                    <LoaderCircle className="size-3.5 animate-spin" />
                    Đang xử lý và tải ảnh lên...
                  </span>
                )}

                {avatarUrl && !isProcessingImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarUrl("");
                      setImageError("");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="size-3.5" /> Xóa ảnh
                  </button>
                )}
              </div>

              {imageError && (
                <p className="text-xs font-medium text-red-600">{imageError}</p>
              )}

              {/* Ô dán URL (hiện khi bấm "Dán URL ảnh ngoài") */}
              {showUrlInput && (
                <div className="pt-1">
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/my-photo.jpg"
                    className="input-field py-1.5 text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Name & Email */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold text-ink-soft">
              Họ và tên <span className="text-red-500">*</span>
            </span>
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
            <span className="text-xs font-bold text-ink-soft">Email đăng nhập</span>
            <input
              name="account-email"
              value={session.user.email}
              className="input-field mt-2 cursor-not-allowed bg-stone-100 text-ink-muted"
              readOnly
            />
          </label>
        </div>

        {/* Phone & Location */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold text-ink-soft">Số điện thoại</span>
            <input
              name="phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Ví dụ: 0912 345 678"
              className="input-field mt-2"
              autoComplete="tel"
            />
            <span className="mt-1 block text-[11px] text-ink-muted">
              Dùng để xác thực và liên hệ khi giao nhận phần thưởng.
            </span>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-ink-soft">Tỉnh / Thành phố</span>
            <input
              name="location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Ví dụ: TP. Hồ Chí Minh, Hà Nội,..."
              className="input-field mt-2"
            />
            <span className="mt-1 block text-[11px] text-ink-muted">
              Khu vực sinh sống hoặc hoạt động hiện tại.
            </span>
          </label>
        </div>

        {/* Headline */}
        <label className="block">
          <span className="text-xs font-bold text-ink-soft">Giới thiệu ngắn (Headline)</span>
          <input
            name="profile-headline"
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            placeholder="Ví dụ: Người yêu công nghệ xanh & hỗ trợ cộng đồng khởi nghiệp"
            className="input-field mt-2"
            maxLength={120}
          />
          <span className="mt-1 block text-right text-[10px] text-ink-muted">
            {headline.length}/120
          </span>
        </label>

        {/* Bio */}
        <label className="block">
          <span className="text-xs font-bold text-ink-soft">Tiểu sử chi tiết (Bio)</span>
          <textarea
            name="profile-bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Chia sẻ thêm về bản thân, các dự án bạn đã từng tạo hoặc sở thích ủng hộ..."
            className="input-field mt-2 min-h-28 resize-y"
            maxLength={500}
          />
          <span className="mt-1 block text-right text-[10px] text-ink-muted">
            {bio.length}/500
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3 pt-2">
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
          {notice && (
            <p
              className={`text-xs ${
                notice.includes("thành công") ? "text-emerald-700" : "text-amber-700"
              }`}
              role="status"
            >
              {notice}
            </p>
          )}
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

const VIETNAM_PROVINCES = [
  "TP. Hồ Chí Minh",
  "Hà Nội",
  "Đà Nẵng",
  "Hải Phòng",
  "Cần Thơ",
  "An Giang",
  "Bà Rịa - Vũng Tàu",
  "Bắc Giang",
  "Bắc Kạn",
  "Bạc Liêu",
  "Bắc Ninh",
  "Bến Tre",
  "Bình Định",
  "Bình Dương",
  "Bình Phước",
  "Bình Thuận",
  "Cà Mau",
  "Cao Bằng",
  "Đắk Lắk",
  "Đắk Nông",
  "Điện Biên",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Giang",
  "Hà Nam",
  "Hà Tĩnh",
  "Hải Dương",
  "Hậu Giang",
  "Hòa Bình",
  "Hưng Yên",
  "Khánh Hòa",
  "Kiên Giang",
  "Kon Tum",
  "Lai Châu",
  "Lâm Đồng",
  "Lạng Sơn",
  "Lào Cai",
  "Long An",
  "Nam Định",
  "Nghệ An",
  "Ninh Bình",
  "Ninh Thuận",
  "Phú Thọ",
  "Phú Yên",
  "Quảng Bình",
  "Quảng Nam",
  "Quảng Ngãi",
  "Quảng Ninh",
  "Quảng Trị",
  "Sóc Trăng",
  "Sơn La",
  "Tây Ninh",
  "Thái Bình",
  "Thái Nguyên",
  "Thanh Hóa",
  "Thừa Thiên Huế",
  "Tiền Giang",
  "Trà Vinh",
  "Tuyên Quang",
  "Vĩnh Long",
  "Vĩnh Phúc",
  "Yên Bái",
];

function AddressesPanel() {
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  // Form state
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [ward, setWard] = useState("");
  const [line1, setLine1] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const fetchAddresses = async () => {
    try {
      const res = await fetch("/api/v1/me/addresses");
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses ?? []);
      }
    } catch (err) {
      console.warn("Lỗi tải danh sách địa chỉ:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAddresses();
  }, []);

  const resetForm = () => {
    setRecipientName("");
    setPhone("");
    setProvince("");
    setDistrict("");
    setWard("");
    setLine1("");
    setIsDefault(false);
    setEditingAddressId(null);
    setIsAdding(false);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAdding(true);
    setNotice("");
  };

  const handleStartEdit = (addr: UserAddress) => {
    setRecipientName(addr.recipientName);
    setPhone(addr.phone);
    setProvince(addr.province);
    setDistrict(addr.district || "");
    setWard(addr.ward || "");
    setLine1(addr.line1);
    setIsDefault(addr.isDefault);
    setEditingAddressId(addr.id);
    setIsAdding(true);
    setNotice("");
  };

  const handleSaveAddress = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !recipientName.trim() ||
      !phone.trim() ||
      !line1.trim() ||
      !province.trim()
    ) {
      setNotice(
        "Vui lòng điền đầy đủ họ tên, số điện thoại, địa chỉ và tỉnh/thành phố.",
      );
      return;
    }
    setSaving(true);
    setNotice("");

    const payload = {
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      line1: line1.trim(),
      ward: ward.trim() || undefined,
      district: district.trim() || undefined,
      province: province.trim(),
      isDefault,
    };

    try {
      const url = editingAddressId
        ? `/api/v1/me/addresses/${editingAddressId}`
        : "/api/v1/me/addresses";
      const method = editingAddressId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setNotice(
          editingAddressId
            ? "Đã cập nhật địa chỉ thành công."
            : "Đã thêm địa chỉ mới thành công.",
        );
        resetForm();
        await fetchAddresses();
      } else {
        const err = await res.json().catch(() => ({}));
        setNotice(
          err?.error?.message ?? "Chưa thể lưu địa chỉ. Vui lòng thử lại.",
        );
      }
    } catch {
      setNotice("Lỗi kết nối máy chủ khi lưu địa chỉ.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      const res = await fetch(`/api/v1/me/addresses/${addressId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        setAddresses((prev) =>
          prev.map((addr) => ({
            ...addr,
            isDefault: addr.id === addressId,
          })),
        );
      }
    } catch (err) {
      console.warn("Lỗi đặt địa chỉ mặc định:", err);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa địa chỉ này không?")) return;
    try {
      const res = await fetch(`/api/v1/me/addresses/${addressId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAddresses((prev) => prev.filter((addr) => addr.id !== addressId));
      }
    } catch (err) {
      console.warn("Lỗi xóa địa chỉ:", err);
    }
  };

  return (
    <div>
      <datalist id="vietnam-provinces">
        {VIETNAM_PROVINCES.map((prov) => (
          <option key={prov} value={prov} />
        ))}
      </datalist>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-coral">Giao nhận quà tặng</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold">
            Địa chỉ nhận hàng
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
            Quản lý các địa chỉ giao nhận vật phẩm, quà tri ân từ các chiến dịch
            gọi vốn mà bạn đã ủng hộ.
          </p>
        </div>
        {!isAdding && !loading && addresses.length > 0 && (
          <button
            type="button"
            onClick={handleStartAdd}
            className="button-dark flex items-center gap-2 text-xs"
          >
            <Plus className="size-4" /> Thêm địa chỉ mới
          </button>
        )}
      </div>

      {notice && (
        <div
          className={`mt-4 rounded-xl p-3 text-xs ${
            notice.includes("thành công")
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {notice}
        </div>
      )}

      {/* Form thêm / sửa địa chỉ */}
      {isAdding && (
        <form
          onSubmit={handleSaveAddress}
          className="mt-6 space-y-4 rounded-2xl border border-line bg-[#f8f9f4] p-5 sm:p-6"
        >
          <div className="flex items-center justify-between border-b border-line/60 pb-2">
            <h3 className="font-display text-base font-bold text-ink">
              {editingAddressId ? "Chỉnh sửa địa chỉ nhận hàng" : "Thêm địa chỉ giao nhận mới"}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-ink-muted hover:text-ink"
            >
              Hủy bỏ
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-ink-soft">
                Họ và tên người nhận <span className="text-red-500">*</span>
              </span>
              <input
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="input-field mt-1.5"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-ink-soft">
                Số điện thoại liên hệ <span className="text-red-500">*</span>
              </span>
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912 345 678"
                className="input-field mt-1.5"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs font-bold text-ink-soft">
                Tỉnh / Thành phố <span className="text-red-500">*</span>
              </span>
              <input
                required
                list="vietnam-provinces"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="Chọn hoặc nhập tỉnh/thành..."
                className="input-field mt-1.5"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-ink-soft">
                Quận / Huyện
              </span>
              <input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Quận 1, Cầu Giấy..."
                className="input-field mt-1.5"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-ink-soft">
                Phường / Xã
              </span>
              <input
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                placeholder="Phường Bến Nghé..."
                className="input-field mt-1.5"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-bold text-ink-soft">
              Địa chỉ chi tiết (Số nhà, tên đường, tòa nhà){" "}
              <span className="text-red-500">*</span>
            </span>
            <input
              required
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              placeholder="Số 123 Đường Lê Lợi, Tòa nhà Sun..."
              className="input-field mt-1.5"
            />
          </label>

          <label className="flex cursor-pointer items-center gap-2 pt-1">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-line text-forest focus:ring-forest"
            />
            <span className="text-xs font-semibold text-ink">
              Đặt làm địa chỉ nhận hàng mặc định
            </span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="button-dark text-xs disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {editingAddressId ? "Cập nhật địa chỉ" : "Lưu địa chỉ"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-xs font-bold text-ink-muted hover:text-ink"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Danh sách địa chỉ */}
      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-ink-muted">
            <LoaderCircle className="mr-2 size-6 animate-spin" />
            <span className="text-sm">Đang tải danh sách địa chỉ...</span>
          </div>
        ) : addresses.length === 0 ? (
          !isAdding && (
            <div className="rounded-2xl border border-dashed border-line bg-[#fafbf7] p-8 text-center">
              <MapPin className="mx-auto mb-2 size-8 text-ink-muted/50" />
              <p className="text-sm font-bold text-ink">
                Chưa có địa chỉ nhận hàng nào
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Thêm địa chỉ để sẵn sàng nhận các phần quà và vật phẩm khi ủng hộ
                dự án.
              </p>
              <button
                type="button"
                onClick={handleStartAdd}
                className="button-dark mt-4 inline-flex items-center gap-2 text-xs"
              >
                <Plus className="size-3.5" /> Thêm địa chỉ mới
              </button>
            </div>
          )
        ) : (
          addresses.map((address) => {
            const fullAddress = [
              address.line1,
              address.ward,
              address.district,
              address.province,
            ]
              .filter(Boolean)
              .join(", ");

            return (
              <div
                key={address.id}
                className={`relative rounded-2xl border p-4 transition-all sm:p-5 ${
                  address.isDefault
                    ? "border-forest/30 bg-[#f7f9f2] shadow-sm"
                    : "border-line bg-white hover:border-forest/20"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-ink sm:text-base">
                        {address.recipientName}
                      </span>
                      <span className="text-xs text-ink-muted">|</span>
                      <span className="text-xs font-medium text-ink-soft">
                        {address.phone}
                      </span>
                      {address.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-forest px-2.5 py-0.5 text-[10px] font-bold text-lime">
                          <CheckCircle2 className="size-3" /> Mặc định
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-ink-soft">
                      {fullAddress}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!address.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(address.id)}
                        className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-ink-muted transition-colors hover:border-forest hover:text-forest"
                      >
                        Đặt làm mặc định
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(address)}
                      className="rounded-lg p-1.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-forest"
                      title="Chỉnh sửa địa chỉ"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(address.id)}
                      className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Xóa địa chỉ"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
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
          {session.user.avatarUrl ? (
            <img
              src={session.user.avatarUrl}
              alt={session.user.name}
              className="size-12 rounded-2xl object-cover border border-white/10"
            />
          ) : (
            <span className="grid size-12 place-items-center rounded-2xl bg-lime font-display text-xs font-extrabold text-forest">
              {session.user.initials}
            </span>
          )}
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
        {visibleActiveTab === "addresses" ? <AddressesPanel /> : null}
        {visibleActiveTab === "interests" ? <InterestPreferences /> : null}
        {visibleActiveTab === "roles" ? <RolesPanel /> : null}
        {visibleActiveTab === "notifications" ? <NotificationsPanel /> : null}
        {visibleActiveTab === "security" ? <SecurityPanel /> : null}
      </section>
    </div>
  );
}

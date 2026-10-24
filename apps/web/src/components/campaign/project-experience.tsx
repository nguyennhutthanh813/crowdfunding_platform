"use client";

import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CircleDashed,
  Clock3,
  Edit2,
  Eye,
  EyeOff,
  Heart,
  Mail,
  MessageCircle,
  PackageCheck,
  Quote,
  Reply,
  Rocket,
  Send,
  ShieldCheck,
  ThumbsUp,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { NotifyButton } from "@/components/notify-button";
import { Modal } from "@/components/ui/modal";
import type {
  CampaignComment,
  CampaignDetail,
  CommentBadge,
  RewardTier,
  SessionResult,
  UserRole,
} from "@/lib/api";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { getEffectivePreviewState } from "@/lib/auth/preview-state";
import { formatNumber, formatVnd } from "@/lib/format";

const tabs = [
  { id: "Story", label: "Câu chuyện" },
  { id: "Rewards", label: "Gói ủng hộ" },
  { id: "Creator", label: "Chủ dự án" },
  { id: "FAQ", label: "Hỏi đáp" },
  { id: "Updates", label: "Cập nhật" },
  { id: "Comments", label: "Bình luận" },
  { id: "Community", label: "Cộng đồng" },
] as const;
type Tab = (typeof tabs)[number]["id"];

function readInitialTab(value?: string): Tab {
  return (
    tabs.find((item) => item.id.toLowerCase() === value?.toLowerCase())?.id ??
    "Story"
  );
}

const badgeLabels: Record<CommentBadge, string> = {
  CREATOR: "Chủ dự án",
  COLLABORATOR: "Cộng tác viên",
  SUPERBACKER: "Ủng hộ tích cực",
  BACKER: "Người ủng hộ",
  ADMIN: "Quản trị viên",
};
const badgeTones: Record<CommentBadge, string> = {
  CREATOR: "bg-forest text-white",
  COLLABORATOR: "bg-[#e8edce] text-[#536227]",
  SUPERBACKER: "bg-[#fff0e9] text-coral-dark",
  BACKER: "bg-stone-100 text-stone-600",
  ADMIN: "bg-purple-100 text-purple-700",
};

async function saveMemberAction(
  action: string,
  payload: Record<string, unknown>,
) {
  return clientRequest<{ session?: SessionResult }>("/api/v1/me/dashboard", {
    method: "POST",
    body: JSON.stringify({ action, payload }),
  });
}

function getCommentBadge(role: UserRole): CommentBadge {
  if (role === "ADMIN") return "ADMIN";
  if (role === "CREATOR" || role === "COLLABORATOR") return role;
  return "BACKER";
}

function StoryPanel({ campaign }: { campaign: CampaignDetail }) {
  return (
    <div>
      <h2 className="sr-only">Câu chuyện và kế hoạch dự án</h2>
      <p className="font-display text-2xl font-extrabold leading-snug tracking-[-0.035em] sm:text-3xl">
        {campaign.story.lead}
      </p>
      <div className="mt-7 space-y-5 text-[15px] leading-8 text-ink-soft">
        {campaign.story.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {campaign.story.highlights.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-line bg-[#faf9f3] p-5"
          >
            <p className="font-display text-2xl font-extrabold text-coral-dark">
              {item.title}
            </p>
            <p className="mt-2 text-xs leading-5 text-ink-soft">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow text-coral">Kế hoạch sử dụng vốn</p>
            <h3 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.035em]">
              Mỗi khoản tiền sẽ đi vào đâu?
            </h3>
          </div>
          <p className="text-xs text-ink-muted">
            Tổng dự kiến {formatVnd(campaign.goalAmount)}
          </p>
        </div>
        <div className="mt-5 space-y-3">
          {campaign.story.fundingPlan.map((item) => (
            <div
              key={item.label}
              className="grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-[minmax(0,1fr)_110px] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-sm font-bold">{item.label}</p>
                  <span className="font-display text-lg font-extrabold text-coral-dark sm:hidden">
                    {item.percent}%
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-5 text-ink-muted">
                  {item.detail}
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-forest/7">
                  <div
                    className="h-full rounded-full bg-coral"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
              <div className="hidden text-right sm:block">
                <p className="font-display text-2xl font-extrabold text-coral-dark">
                  {item.percent}%
                </p>
                <p className="mt-1 text-[10px] text-ink-muted">
                  {formatVnd(item.amount)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12">
        <p className="eyebrow text-coral">Căn cứ để cộng đồng kiểm tra</p>
        <h3 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.035em]">
          Nhóm đã có gì, còn thiếu gì?
        </h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {campaign.story.evidence.map((item) => {
            const verified = item.status === "VERIFIED";
            const inProgress = item.status === "IN_PROGRESS";
            const Icon = verified
              ? BadgeCheck
              : inProgress
                ? Clock3
                : CircleDashed;
            const label = verified
              ? "Đã đối chiếu"
              : inProgress
                ? "Đang thực hiện"
                : "Đã lên kế hoạch";
            return (
              <article
                key={item.label}
                className="rounded-2xl border border-line bg-[#faf9f3] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <Icon
                    className={`size-5 shrink-0 ${
                      verified
                        ? "text-emerald-600"
                        : inProgress
                          ? "text-amber-600"
                          : "text-ink-muted"
                    }`}
                  />
                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${
                      verified
                        ? "bg-emerald-50 text-emerald-700"
                        : inProgress
                          ? "bg-amber-50 text-amber-700"
                          : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                <p className="mt-4 text-sm font-bold">{item.label}</p>
                <p className="mt-2 text-xs leading-5 text-ink-muted">
                  {item.detail}
                </p>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-12">
        <p className="eyebrow text-coral">Lộ trình thực hiện</p>
        <div className="mt-5 space-y-0">
          {campaign.story.roadmap.map((item, index) => (
            <div key={item.period} className="grid grid-cols-[34px_1fr] gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={`grid size-8 place-items-center rounded-full border ${item.status === "done" ? "border-forest bg-forest text-white" : item.status === "now" ? "border-coral bg-coral text-white" : "border-line bg-white text-ink-muted"}`}
                >
                  {item.status === "done" ? (
                    <Check className="size-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                {index < campaign.story.roadmap.length - 1 ? (
                  <span className="h-16 w-px bg-line" />
                ) : null}
              </div>
              <div className="pb-8">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">
                  {item.period}
                </p>
                <p className="mt-1 font-display font-extrabold">{item.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-10 rounded-[18px] bg-forest p-6 text-white sm:p-8">
        <ShieldCheck className="size-6 text-lime" />
        <h3 className="mt-4 font-display text-xl font-extrabold">
          Rủi ro và thách thức
        </h3>
        <p className="mt-3 text-sm leading-7 text-white/62">
          {campaign.story.risks}
        </p>
      </div>
    </div>
  );
}

function RewardCard({
  reward,
  campaign,
}: {
  reward: RewardTier;
  campaign: CampaignDetail;
}) {
  const remaining = reward.limit ? reward.limit - reward.claimed : null;
  const canPledge = campaign.status === "LIVE";
  return (
    <article
      className={`rounded-[22px] border p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:shadow-lg ${reward.featured ? "border-coral/45 bg-[#fff8f4]" : "border-line bg-white"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {reward.featured ? (
            <span className="rounded-full bg-coral px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              Phổ biến
            </span>
          ) : null}
          <p className="mt-3 font-display text-2xl font-extrabold">
            {formatVnd(reward.amount)}
          </p>
          <h3 className="mt-2 font-display text-lg font-extrabold">
            {reward.title}
          </h3>
        </div>
        <PackageCheck className="size-5 text-coral" />
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-soft">
        {reward.description}
      </p>
      <ul className="mt-4 space-y-2 text-xs text-ink-soft">
        {reward.items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />{" "}
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-[11px] text-ink-muted">
        <span>Giao dự kiến: {reward.estimatedDelivery}</span>
        <span>
          {remaining !== null
            ? `Còn ${remaining}/${reward.limit}`
            : `${reward.claimed} đã chọn`}
        </span>
      </div>
      {canPledge ? (
        <Link
          href={`/pledge/${campaign.slug}?reward=${reward.id}`}
          className="button-dark mt-5 w-full"
        >
          Chọn gói này <ArrowRight className="size-4" />
        </Link>
      ) : (
        <p className="mt-5 rounded-full bg-forest/7 px-4 py-3 text-center text-xs font-bold text-ink-soft">
          {campaign.status === "PRE_LAUNCH"
            ? "Gói dự kiến · chưa nhận ủng hộ"
            : campaign.status === "SUCCESSFUL"
              ? "Gói đã chốt cho người ủng hộ"
              : campaign.status === "FAILED"
                ? "Gói đã hủy cùng chiến dịch"
                : "Chiến dịch đã kết thúc"}
        </p>
      )}
    </article>
  );
}

function RewardsPanel({ campaign }: { campaign: CampaignDetail }) {
  return (
    <div id="rewards">
      <h2 className="font-display text-2xl font-extrabold tracking-[-0.035em]">
        Chọn cách bạn muốn đồng hành
      </h2>
      <p className="mt-3 text-sm leading-6 text-ink-soft">
        {campaign.status === "PRE_LAUNCH"
          ? "Các gói đang được công bố để cộng đồng góp ý trước ngày mở."
          : campaign.status === "LIVE"
            ? "Bạn cũng có thể ủng hộ mà không nhận quà ở bước tiếp theo."
            : "Các gói được giữ lại để cộng đồng đối chiếu sau khi chiến dịch kết thúc."}
      </p>
      <div className="mt-7 grid gap-4">
        {campaign.rewards.map((reward) => (
          <RewardCard key={reward.id} reward={reward} campaign={campaign} />
        ))}
      </div>
    </div>
  );
}

function CreatorPanel({ campaign }: { campaign: CampaignDetail }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, establishSession } = useAuth();
  const [following, setFollowing] = useState(() =>
    session
      ? (getEffectivePreviewState(session).followedCreatorIds ?? []).includes(
          campaign.creator.id,
        )
      : false,
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  // Contact modal state (MSG-01)
  const [contactOpen, setContactOpen] = useState(false);
  const [contactSubject, setContactSubject] = useState("");
  const [contactBody, setContactBody] = useState("");
  const [contactBusy, setContactBusy] = useState(false);
  const [contactNotice, setContactNotice] = useState("");

  const isOwner = Boolean(session && session.user.id === campaign.creator.id);

  const toggleFollowing = async () => {
    if (!session) {
      router.push(`/auth?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!session.user.roles.includes("BACKER")) {
      router.push("/account?tab=roles");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const result = await saveMemberAction("SET_CREATOR_FOLLOW", {
        creatorId: campaign.creator.id,
        following: !following,
      });
      if (result.session) establishSession(result.session);
      setFollowing((value) => !value);
      setNotice(
        following
          ? "Đã bỏ theo dõi chủ dự án."
          : "Bạn sẽ nhận cập nhật mới từ chủ dự án này.",
      );
    } catch (error) {
      setNotice(clientRequestMessage(error, "Chưa thể lưu theo dõi. Bạn thử lại sau nhé."));
    } finally {
      setBusy(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactSubject.trim() || !contactBody.trim()) return;
    if (!session) {
      router.push(`/auth?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (isOwner) {
      setContactNotice("Bạn không thể gửi tin nhắn cho chính mình.");
      return;
    }

    setContactBusy(true);
    setContactNotice("");
    try {
      await saveMemberAction("SEND_MESSAGE", {
        campaignId: campaign.id,
        recipientUserId: campaign.creator.id,
        subject: contactSubject.trim(),
        body: contactBody.trim(),
      });
      setContactSubject("");
      setContactBody("");
      setContactNotice("Tin nhắn đã được gửi thành công đến chủ dự án!");
      setTimeout(() => {
        setContactOpen(false);
        setContactNotice("");
      }, 1500);
    } catch (error) {
      setContactNotice(clientRequestMessage(error, "Chưa thể gửi tin nhắn. Bạn thử lại sau nhé."));
    } finally {
      setContactBusy(false);
    }
  };

  return (
    <div>
      <div className="rounded-[20px] border border-line bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-forest font-display text-xl font-extrabold text-lime">
            {campaign.creator.initials}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-extrabold">
                {campaign.creator.name}
              </h2>
              {campaign.creator.verified ? (
                <BadgeCheck className="size-5 text-coral" />
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {campaign.creator.bio ??
                `Nhóm sáng tạo tại ${campaign.location}, đang phát triển dự án trong lĩnh vực ${campaign.category.toLowerCase()}.`}
            </p>
            <div className="mt-4 flex flex-wrap gap-5 text-xs text-ink-muted">
              <span>
                <strong className="text-ink">
                  {campaign.creator.launchedProjects ?? 1}
                </strong>{" "}
                dự án đã tạo
              </span>
              <span>
                <strong className="text-ink">
                  {campaign.creator.backedProjects ?? 0}
                </strong>{" "}
                dự án đã ủng hộ
              </span>
              <span>
                <strong className="text-ink">
                  {formatNumber(campaign.creator.followers ?? 0)}
                </strong>{" "}
                người theo dõi
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isOwner}
              title={isOwner ? "Bạn là chủ dự án này" : undefined}
              onClick={() => {
                if (!session) {
                  router.push(`/auth?next=${encodeURIComponent(pathname)}`);
                  return;
                }
                setContactOpen(true);
              }}
              className="button-dark"
            >
              <Mail className="size-4" /> Liên hệ Chủ dự án
            </button>
            <button
              type="button"
              disabled={busy}
              aria-pressed={following}
              onClick={() => void toggleFollowing()}
              className={following ? "button-secondary" : "button-primary"}
            >
              {following ? (
                <Check className="size-4" />
              ) : (
                <Heart className="size-4" />
              )}{" "}
              {busy ? "Đang lưu…" : following ? "Đang theo dõi" : "Theo dõi"}
            </button>
          </div>
        </div>
        {notice ? (
          <p
            role={notice.startsWith("Chưa") ? "alert" : "status"}
            className={`mt-4 text-right text-xs ${notice.startsWith("Chưa") ? "text-red-600" : "text-ink-muted"}`}
          >
            {notice}
          </p>
        ) : null}
      </div>

      <Modal
        open={contactOpen}
        title={`Liên hệ ${campaign.creator.name}`}
        description="Gửi tin nhắn trực tiếp đến đội ngũ sáng tạo của chiến dịch này."
        onClose={() => {
          setContactOpen(false);
          setContactNotice("");
        }}
        locked={contactBusy}
      >
        <form onSubmit={handleSendMessage} className="rounded-[18px] border border-coral/25 bg-[#fffaf6] p-4 sm:p-5">
          <div>
            <label htmlFor="contact-subj" className="text-xs font-bold text-ink-soft">
              Chủ đề tin nhắn <span className="text-coral">*</span>
            </label>
            <input
              id="contact-subj"
              type="text"
              value={contactSubject}
              onChange={(e) => setContactSubject(e.target.value)}
              placeholder="Ví dụ: Hỏi về kế hoạch giao quà, chính sách bảo hành..."
              maxLength={180}
              className="input-field mt-1.5"
              required
            />
          </div>
          <div className="mt-4">
            <label htmlFor="contact-body" className="text-xs font-bold text-ink-soft">
              Nội dung trao đổi <span className="text-coral">*</span>
            </label>
            <textarea
              id="contact-body"
              value={contactBody}
              onChange={(e) => setContactBody(e.target.value)}
              placeholder="Nhập nội dung tin nhắn của bạn (tối đa 4000 ký tự)..."
              rows={4}
              maxLength={4000}
              className="input-field mt-1.5 min-h-24 resize-y"
              required
            />
          </div>
          {contactNotice ? (
            <p className={`mt-3 text-xs ${contactNotice.startsWith("Chưa") || contactNotice.startsWith("Bạn") ? "text-red-600" : "text-emerald-700"}`}>
              {contactNotice}
            </p>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setContactOpen(false);
                setContactNotice("");
              }}
              className="button-ghost"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!contactSubject.trim() || !contactBody.trim() || contactBusy}
              className="button-dark"
            >
              <Send className="size-4" /> {contactBusy ? "Đang gửi…" : "Gửi tin nhắn"}
            </button>
          </div>
        </form>
      </Modal>
      <div className="mt-8">
        <p className="eyebrow text-coral">Nhóm dự án</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {campaign.team.map((member) => (
            <div
              key={member.name}
              className="rounded-2xl border border-line bg-white p-4"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-[#e9eddd] text-xs font-bold text-forest">
                {member.initials}
              </span>
              <p className="mt-3 font-display font-bold">{member.name}</p>
              <p className="mt-1 text-xs text-ink-muted">{member.role}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FaqPanel({
  campaign,
  onAsk,
}: {
  campaign: CampaignDetail;
  onAsk: () => void;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold">Câu hỏi thường gặp</h2>
      <div className="mt-6 divide-y divide-line rounded-[18px] border border-line bg-white">
        {campaign.faqs.map((faq, index) => (
          <details key={faq.question} className="group p-5" open={index === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-sm font-extrabold sm:text-base">
              {faq.question}
              <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="mt-3 pr-7 text-sm leading-7 text-ink-soft">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
      <button type="button" onClick={onAsk} className="button-secondary mt-5">
        <MessageCircle className="size-4" /> Gửi câu hỏi mới
      </button>
    </div>
  );
}

function UpdatesPanel({ campaign }: { campaign: CampaignDetail }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold">Nhật ký dự án</h2>
      <div className="mt-6 space-y-4">
        {campaign.updates.map((update, index) => (
          <article
            key={update.id}
            className="rounded-[18px] border border-line bg-white p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-forest font-display text-xs font-bold text-lime">
                #{campaign.updates.length - index}
              </span>
              <span className="text-[11px] text-ink-muted">
                {new Intl.DateTimeFormat("vi-VN", {
                  dateStyle: "medium",
                }).format(new Date(update.publishedAt))}
              </span>
            </div>
            <h3 className="mt-5 font-display text-xl font-extrabold">
              {update.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {update.excerpt}
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
              <MessageCircle className="size-3.5" />
              {update.commentCount} bình luận
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  campaignId,
  isCampaignCreator = false,
  nested = false,
  onDeleteComment,
}: {
  comment: CampaignComment;
  campaignId: string;
  isCampaignCreator?: boolean;
  nested?: boolean;
  onDeleteComment?: (id: string) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuth();
  const [likes, setLikes] = useState(comment.likes);
  const [liked, setLiked] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replies, setReplies] = useState(comment.replies ?? []);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [currentBody, setCurrentBody] = useState(comment.body);
  const [isHidden, setIsHidden] = useState(Boolean(comment.isHidden));
  const [actionBusy, setActionBusy] = useState<"like" | "reply" | "edit" | "delete" | "hide" | null>(null);
  const [notice, setNotice] = useState("");

  const isAuthor = Boolean(
    session && (comment.authorId ? comment.authorId === session.user.id : comment.author === session.user.name),
  );
  const isAdmin = Boolean(session && session.user.roles.includes("ADMIN"));
  const canModerate = isCampaignCreator || isAdmin;
  const canDelete = isAuthor || canModerate;

  const requireMember = () => {
    if (!session) {
      router.push(`/auth?next=${encodeURIComponent(pathname)}`);
      return false;
    }
    return true;
  };

  const toggleLike = async () => {
    if (!requireMember()) return;
    setActionBusy("like");
    setNotice("");
    try {
      await saveMemberAction("LIKE_COMMENT", {
        campaignId,
        commentId: comment.id,
      });
      setLiked(true);
      setLikes((val) => val + 1);
    } catch (error) {
      setNotice(clientRequestMessage(error, "Chưa thể lưu lượt thích."));
    } finally {
      setActionBusy(null);
    }
  };

  const handleSaveEdit = async () => {
    const val = editBody.trim();
    if (!val || val === currentBody) {
      setEditing(false);
      return;
    }
    setActionBusy("edit");
    setNotice("");
    try {
      await saveMemberAction("UPDATE_COMMENT", {
        commentId: comment.id,
        body: val,
      });
      setCurrentBody(val);
      setEditing(false);
      setNotice("Đã cập nhật bình luận.");
    } catch (error) {
      setNotice(clientRequestMessage(error, "Chưa thể lưu chỉnh sửa."));
    } finally {
      setActionBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bình luận này?")) return;
    setActionBusy("delete");
    setNotice("");
    try {
      await saveMemberAction("DELETE_COMMENT", {
        commentId: comment.id,
      });
      onDeleteComment?.(comment.id);
    } catch (error) {
      setNotice(clientRequestMessage(error, "Chưa thể xóa bình luận."));
    } finally {
      setActionBusy(null);
    }
  };

  const handleToggleHide = async () => {
    setActionBusy("hide");
    setNotice("");
    try {
      await saveMemberAction("HIDE_COMMENT", {
        commentId: comment.id,
        isHidden: !isHidden,
        reason: isHidden ? "Bỏ ẩn bình luận" : "Ẩn bình luận vi phạm tiêu chuẩn",
      });
      setIsHidden(!isHidden);
      setNotice(!isHidden ? "Đã ẩn bình luận." : "Đã bỏ ẩn bình luận.");
    } catch (error) {
      setNotice(clientRequestMessage(error, "Chưa thể thay đổi trạng thái ẩn."));
    } finally {
      setActionBusy(null);
    }
  };

  const addReply = async () => {
    const value = replyBody.trim();
    if (!value || !session) return;
    setActionBusy("reply");
    setNotice("");
    try {
      await saveMemberAction("CREATE_COMMENT", {
        campaignId,
        parentId: comment.id,
        parentCommentId: comment.id,
        body: value,
      });
      setReplies((current) => [
        ...current,
        {
          id: `reply-${Date.now()}`,
          author: session.user.name,
          initials: session.user.initials,
          badge: getCommentBadge(session.user.activeRole),
          body: value,
          createdAt: "Vừa xong",
          likes: 0,
        },
      ]);
      setReplyBody("");
      setReplying(false);
    } catch (error) {
      setNotice(clientRequestMessage(error, "Chưa thể gửi trả lời."));
    } finally {
      setActionBusy(null);
    }
  };

  if (isHidden && !canModerate) {
    return null;
  }

  return (
    <article
      className={`${nested ? "ml-7 border-l-2 border-forest/8 pl-5" : ""}`}
    >
      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e8ebe4] text-xs font-bold text-forest">
          {comment.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-sm font-extrabold">
              {comment.author}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeTones[comment.badge]}`}
            >
              {badgeLabels[comment.badge]}
            </span>
            {isHidden ? (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold text-rose-700">
                Đã bị ẩn
              </span>
            ) : null}
            <span className="text-[10px] text-ink-muted">
              {comment.createdAt}
            </span>
          </div>

          {editing ? (
            <div className="mt-2 rounded-2xl bg-[#f6f5f0] p-3">
              <label>
                <span className="sr-only">Nội dung chỉnh sửa</span>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  maxLength={4000}
                  className="input-field min-h-20 resize-y text-xs"
                />
              </label>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={!editBody.trim() || actionBusy === "edit"}
                  onClick={() => void handleSaveEdit()}
                  className="button-dark min-h-9 px-3 text-xs"
                >
                  {actionBusy === "edit" ? "Đang lưu…" : "Lưu thay đổi"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setEditBody(currentBody);
                  }}
                  className="button-ghost min-h-9 px-3 text-xs"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-ink-soft">{currentBody}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] font-bold text-ink-muted">
            <button
              type="button"
              disabled={actionBusy === "like"}
              aria-pressed={liked}
              aria-label={`${liked ? "Đã thích" : "Thích"} bình luận của ${comment.author}. Hiện có ${likes + (liked ? 1 : 0)} lượt thích`}
              onClick={() => void toggleLike()}
              className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 hover:text-coral ${liked ? "text-coral-dark" : ""}`}
            >
              <ThumbsUp className="size-3.5" />
              {likes + (liked ? 1 : 0)}
            </button>
            <button
              type="button"
              aria-expanded={replying}
              aria-label={`Trả lời bình luận của ${comment.author}`}
              onClick={() => {
                if (requireMember()) setReplying((value) => !value);
              }}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 hover:text-coral"
            >
              <Reply className="size-3.5" /> Trả lời
            </button>

            {isAuthor && !editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex min-h-9 cursor-pointer items-center gap-1 text-ink-muted hover:text-coral"
              >
                <Edit2 className="size-3.5" /> Sửa
              </button>
            ) : null}

            {canDelete ? (
              <button
                type="button"
                disabled={actionBusy === "delete"}
                onClick={() => void handleDelete()}
                className="inline-flex min-h-9 cursor-pointer items-center gap-1 text-red-500 hover:text-red-700"
              >
                <Trash2 className="size-3.5" /> Xóa
              </button>
            ) : null}

            {canModerate ? (
              <button
                type="button"
                disabled={actionBusy === "hide"}
                onClick={() => void handleToggleHide()}
                className="inline-flex min-h-9 cursor-pointer items-center gap-1 text-amber-600 hover:text-amber-800"
              >
                {isHidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                {isHidden ? "Bỏ ẩn" : "Ẩn"}
              </button>
            ) : null}
          </div>

          {replying ? (
            <div className="mt-4 rounded-2xl bg-[#f6f5f0] p-3">
              <label>
                <span className="sr-only">Nội dung trả lời</span>
                <textarea
                  name={`reply-${comment.id}`}
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  maxLength={4000}
                  className="input-field min-h-20 resize-y text-xs"
                  placeholder={`Trả lời ${comment.author}…`}
                />
              </label>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={!replyBody.trim() || actionBusy === "reply"}
                  onClick={() => void addReply()}
                  className="button-dark min-h-9 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="size-3.5" />
                  {actionBusy === "reply" ? "Đang gửi…" : "Gửi trả lời"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReplying(false);
                    setReplyBody("");
                  }}
                  className="button-ghost min-h-9 px-3 text-xs"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : null}
          {notice ? (
            <p className="mt-3 text-[11px] text-red-600" role="alert">
              {notice}
            </p>
          ) : null}
        </div>
      </div>
      {replies.length ? (
        <div className="mt-5 space-y-5">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              campaignId={campaignId}
              isCampaignCreator={isCampaignCreator}
              onDeleteComment={(id) => setReplies((r) => r.filter((item) => item.id !== id))}
              nested
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function CommentsPanel({
  campaign,
  initialIntent = "comment",
}: {
  campaign: CampaignDetail;
  initialIntent?: "comment" | "question";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuth();
  const [composerOpen, setComposerOpen] = useState(
    initialIntent === "question",
  );
  const [composerMode, setComposerMode] = useState<"comment" | "question">(
    initialIntent,
  );
  const [body, setBody] = useState("");
  const [comments, setComments] = useState(campaign.comments);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const addComment = async () => {
    const value = body.trim();
    if (!value || !session) return;
    setBusy(true);
    setNotice("");
    try {
      await saveMemberAction(
        composerMode === "question" ? "ASK_QUESTION" : "CREATE_COMMENT",
        { campaignId: campaign.id, body: value },
      );
      setComments((current) => [
        {
          id: `local-${Date.now()}`,
          author: session.user.name,
          initials: session.user.initials,
          badge: getCommentBadge(session.user.activeRole),
          body: value,
          createdAt: "Vừa xong",
          likes: 0,
        },
        ...current,
      ]);
      setBody("");
      setComposerOpen(false);
      setNotice(
        composerMode === "question"
          ? "Câu hỏi đã được gửi đến nhóm dự án."
          : "Bình luận của bạn đã được đăng.",
      );
    } catch (error) {
      setNotice(clientRequestMessage(error, "Chưa thể gửi nội dung. Bản bạn đang viết vẫn được giữ lại."));
    } finally {
      setBusy(false);
    }
  };

  const openComposer = () => {
    if (!session) {
      router.push(`/auth?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (
      !session.user.roles.some((role) =>
        ["BACKER", "CREATOR", "COLLABORATOR"].includes(role),
      )
    ) {
      router.push("/account?tab=roles");
      return;
    }
    setComposerMode("comment");
    setNotice("");
    setComposerOpen((value) => !value);
  };

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-extrabold">
            Cộng đồng thảo luận
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Nhãn vai trò giúp nhận ra phản hồi chính thức từ nhóm dự án.
          </p>
        </div>
        <button type="button" onClick={openComposer} className="button-dark">
          Viết bình luận
        </button>
      </div>
      <Modal
        open={composerOpen}
        title={composerMode === "question" ? "Hỏi nhóm dự án" : "Viết bình luận"}
        description="Nội dung sẽ hiển thị cùng tên và vai trò hiện tại của bạn trong cộng đồng chiến dịch."
        onClose={() => {
          setComposerOpen(false);
          setNotice("");
        }}
        locked={busy}
      >
        <div className="rounded-[18px] border border-coral/25 bg-[#fffaf6] p-4 sm:p-5">
          <label
            htmlFor="new-comment"
            className="text-xs font-bold text-ink-soft"
          >
            {composerMode === "question"
              ? "Câu hỏi gửi đến nhóm dự án"
              : "Bình luận của bạn"}
          </label>
          <textarea
            id="new-comment"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="input-field mt-2 min-h-28 resize-y"
            placeholder={
              composerMode === "question"
                ? "Bạn muốn hỏi điều gì trước khi ủng hộ?"
                : "Chia sẻ góp ý hoặc trao đổi cùng cộng đồng…"
            }
          />
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setComposerOpen(false);
                setNotice("");
              }}
              className="button-ghost min-h-11 px-4"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={!body.trim() || busy}
              onClick={() => void addComment()}
              className="button-dark min-h-11 px-4 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="size-4" />
              {busy
                ? "Đang gửi…"
                : composerMode === "question"
                  ? "Gửi câu hỏi"
                  : "Đăng bình luận"}
            </button>
          </div>
        </div>
      </Modal>
      {notice ? (
        <p
          role={notice.startsWith("Chưa") ? "alert" : "status"}
          className={`mt-4 text-xs ${notice.startsWith("Chưa") ? "text-red-600" : "text-emerald-700"}`}
        >
          {notice}
        </p>
      ) : null}
      <div className="mt-6 divide-y divide-line rounded-[18px] border border-line bg-white px-5">
        {comments.map((comment) => (
          <div key={comment.id} className="py-6">
            <CommentItem
              comment={comment}
              campaignId={campaign.id}
              isCampaignCreator={session?.user.id === campaign.creator.id}
              onDeleteComment={(id) =>
                setComments((current) => current.filter((c) => c.id !== id))
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CommunityPanel({ campaign }: { campaign: CampaignDetail }) {
  const max = Math.max(
    1,
    ...campaign.community.topCities.map((city) => city.backers),
  );
  const hasCityBackers = campaign.community.topCities.some(
    (city) => city.backers > 0,
  );
  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold">
        Cộng đồng của chiến dịch
      </h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="rounded-[18px] bg-forest p-6 text-white">
          <Users className="size-5 text-lime" />
          <p className="mt-4 font-display text-4xl font-extrabold">
            {formatNumber(campaign.backerCount)}
          </p>
          <p className="mt-1 text-xs text-white/48">
            {campaign.status === "PRE_LAUNCH"
              ? "người đã cam kết (chưa mở)"
              : "người đang cùng đồng hành"}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/7 p-3">
              <p className="font-display text-xl font-extrabold text-lime">
                {hasCityBackers
                  ? `${campaign.community.newBackerPercent}%`
                  : "—"}
              </p>
              <p className="text-[10px] text-white/45">Người mới</p>
            </div>
            <div className="rounded-xl bg-white/7 p-3">
              <p className="font-display text-xl font-extrabold text-lime">
                {hasCityBackers
                  ? `${campaign.community.returningBackerPercent}%`
                  : "—"}
              </p>
              <p className="text-[10px] text-white/45">Quay lại</p>
            </div>
          </div>
        </div>
        <div className="rounded-[18px] border border-line bg-white p-6">
          <p className="eyebrow text-coral">Thành phố nổi bật</p>
          {hasCityBackers ? (
            <div className="mt-5 space-y-4">
              {campaign.community.topCities.map((city) => (
                <div key={city.name}>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold">{city.name}</span>
                    <span className="text-ink-muted">{city.backers}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-forest/7">
                    <div
                      className="h-full rounded-full bg-coral"
                      style={{ width: `${(city.backers / max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-line bg-[#faf9f3] p-5">
              <p className="text-xs font-bold">
                Chưa có số liệu theo thành phố
              </p>
              <p className="mt-2 text-[11px] leading-5 text-ink-muted">
                Biểu đồ sẽ xuất hiện khi chiến dịch bắt đầu nhận cam kết ủng hộ.
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-line bg-[#faf9f3] p-5">
        <Quote className="size-5 shrink-0 text-coral" />
        <p className="text-sm leading-6 text-ink-soft">
          Số liệu cộng đồng chỉ hiển thị tổng hợp theo thành phố; không làm lộ
          địa chỉ hay thông tin cá nhân của người ủng hộ.
        </p>
      </div>
    </div>
  );
}

function TabContent({
  tab,
  campaign,
  commentIntent,
  onAskQuestion,
}: {
  tab: Tab;
  campaign: CampaignDetail;
  commentIntent: "comment" | "question";
  onAskQuestion: () => void;
}) {
  if (tab === "Story") return <StoryPanel campaign={campaign} />;
  if (tab === "Rewards") return <RewardsPanel campaign={campaign} />;
  if (tab === "Creator") return <CreatorPanel campaign={campaign} />;
  if (tab === "FAQ")
    return <FaqPanel campaign={campaign} onAsk={onAskQuestion} />;
  if (tab === "Updates") return <UpdatesPanel campaign={campaign} />;
  if (tab === "Comments")
    return <CommentsPanel campaign={campaign} initialIntent={commentIntent} />;
  return <CommunityPanel campaign={campaign} />;
}

export function ProjectExperience({
  campaign,
  initialTab,
}: {
  campaign: CampaignDetail;
  initialTab?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>(() => readInitialTab(initialTab));
  const [commentIntent, setCommentIntent] = useState<"comment" | "question">(
    "comment",
  );
  const isPreLaunch = campaign.status === "PRE_LAUNCH";
  const canPledge = campaign.status === "LIVE";

  const changeTab = (nextTab: Tab) => {
    if (nextTab === "Comments") setCommentIntent("comment");
    setTab(nextTab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", nextTab.toLowerCase());
    window.history.replaceState(
      null,
      "",
      `${pathname}?${params.toString()}#noi-dung-du-an`,
    );
  };

  const askQuestion = () => {
    if (!session) {
      router.push(`/auth?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (
      !session.user.roles.some((role) =>
        ["BACKER", "CREATOR", "COLLABORATOR"].includes(role),
      )
    ) {
      router.push("/account?tab=roles");
      return;
    }
    setCommentIntent("question");
    setTab("Comments");
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "comments");
    window.history.replaceState(
      null,
      "",
      `${pathname}?${params.toString()}#noi-dung-du-an`,
    );
  };

  return (
    <section
      id="noi-dung-du-an"
      className="scroll-mt-32 border-t border-line bg-canvas pb-20"
    >
      <div className="sticky top-17 z-30 border-b border-line bg-canvas">
        <div className="container-shell overflow-x-auto">
          <div
            className="flex min-w-max gap-7"
            role="tablist"
            aria-label="Nội dung dự án"
          >
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => changeTab(item.id)}
                className={`relative cursor-pointer py-4 text-xs font-bold transition-colors duration-200 ${tab === item.id ? "text-coral-dark" : "text-ink-muted hover:text-ink"}`}
              >
                {item.label}
                {tab === item.id ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-coral" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="container-shell grid gap-10 pt-10 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="min-w-0">
          <TabContent
            tab={tab}
            campaign={campaign}
            commentIntent={commentIntent}
            onAskQuestion={askQuestion}
          />
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-38 rounded-[18px] border border-line bg-white p-5">
            <div className="flex items-center gap-2">
              <Rocket className="size-4 text-coral" />
              <p className="eyebrow text-coral">
                {isPreLaunch ? "Gói dự kiến" : "Đồng hành ngay"}
              </p>
            </div>
            <h3 className="mt-4 font-display text-xl font-extrabold">
              {campaign.rewards[1]?.title ?? campaign.rewards[0].title}
            </h3>
            <p className="mt-2 font-display text-2xl font-extrabold text-coral-dark">
              {formatVnd((campaign.rewards[1] ?? campaign.rewards[0]).amount)}
            </p>
            <ul className="mt-4 space-y-2 text-xs text-ink-soft">
              {(campaign.rewards[1] ?? campaign.rewards[0]).items.map(
                (item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="size-3.5 text-emerald-600" />
                    {item}
                  </li>
                ),
              )}
            </ul>
            <div className="mt-5">
              {isPreLaunch ? (
                <NotifyButton campaignId={campaign.id} fullWidth />
              ) : canPledge ? (
                <Link
                  href={`/pledge/${campaign.slug}?reward=${(campaign.rewards[1] ?? campaign.rewards[0]).id}`}
                  className="button-primary w-full"
                >
                  Chọn gói này <ArrowRight className="size-4" />
                </Link>
              ) : (
                <p className="rounded-[12px] bg-forest px-4 py-3 text-center text-xs font-bold text-white">
                  {campaign.status === "SUCCESSFUL"
                    ? "Đang thực hiện và giao quà"
                    : campaign.status === "FAILED"
                      ? "Đã kết thúc · không thu tiền"
                      : "Chiến dịch đã kết thúc"}
                </p>
              )}
            </div>
            <p className="mt-3 text-center text-[10px] leading-4 text-ink-muted">
              {isPreLaunch
                ? "Đăng ký nhắc có thể tắt bất cứ lúc nào."
                : canPledge
                  ? "Bạn có thể kiểm tra lại toàn bộ chi phí trước khi xác nhận."
                  : campaign.status === "SUCCESSFUL"
                    ? "Xem tab Cập nhật để theo dõi tiến độ mới nhất."
                    : campaign.status === "FAILED"
                      ? "Mọi cam kết đã được hủy theo All-or-Nothing."
                      : "Trang được giữ lại để cộng đồng đối chiếu."}
            </p>
          </div>
        </aside>
      </div>
      {isPreLaunch || canPledge ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white p-3 lg:hidden">
          <div className="container-shell flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-ink-muted">
                {isPreLaunch ? "Gói dự kiến từ" : "Gói ủng hộ từ"}
              </p>
              <p className="font-display text-sm font-extrabold">
                {formatVnd(campaign.rewards[0].amount)}
              </p>
            </div>
            {isPreLaunch ? (
              <div className="min-w-42">
                <NotifyButton campaignId={campaign.id} fullWidth />
              </div>
            ) : (
              <Link
                href={`/pledge/${campaign.slug}`}
                className="button-primary min-w-42"
              >
                Ủng hộ dự án
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

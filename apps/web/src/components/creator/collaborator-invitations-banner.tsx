"use client";

import {
  AlertCircle,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  LoaderCircle,
  MessageSquare,
  Newspaper,
  UserCheck,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";

export interface PendingInvitationItem {
  id: string;
  campaignId: string;
  campaignTitle: string;
  campaignSlug: string;
  inviterName: string;
  role?: string;
  canPostUpdates?: boolean;
  canReplyComments?: boolean;
  canViewAiDashboard?: boolean;
  createdAt?: string;
}

export interface CollaboratorInvitationsBannerProps {
  initialInvitations: PendingInvitationItem[];
}

export function CollaboratorInvitationsBanner({
  initialInvitations,
}: CollaboratorInvitationsBannerProps) {
  const router = useRouter();
  const [invitations, setInvitations] =
    useState<PendingInvitationItem[]>(initialInvitations);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  if (invitations.length === 0 && !notice) {
    return null;
  }

  const handleRespond = async (
    item: PendingInvitationItem,
    action: "ACCEPT" | "DECLINE",
  ) => {
    setProcessingId(item.campaignId);
    setNotice(null);

    try {
      await clientRequest("/api/v1/creator/operations", {
        method: "POST",
        body: JSON.stringify({
          action: "RESPOND_INVITATION",
          payload: {
            campaignId: item.campaignId,
            action,
          },
        }),
      });

      setInvitations((prev) =>
        prev.filter((inv) => inv.campaignId !== item.campaignId),
      );

      if (action === "ACCEPT") {
        setNotice({
          tone: "success",
          message: `Đã đồng ý tham gia "${item.campaignTitle}". Bạn đã được cấp quyền cộng tác viên và chiến dịch sẽ xuất hiện trong không gian quản lý của bạn!`,
        });
        setTimeout(() => {
          router.refresh();
        }, 1200);
      } else {
        setNotice({
          tone: "success",
          message: `Đã từ chối lời mời cộng tác cho dự án "${item.campaignTitle}".`,
        });
      }
    } catch (err) {
      setNotice({
        tone: "error",
        message: clientRequestMessage(
          err,
          "Chưa thể xử lý phản hồi lời mời. Vui lòng thử lại sau.",
        ),
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="mb-6 space-y-4">
      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`flex items-start gap-2.5 rounded-2xl border p-4 text-xs font-semibold shadow-xs ${
            notice.tone === "error"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {notice.tone === "error" ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          )}
          <span className="flex-1">{notice.message}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-stone-400 hover:text-stone-700"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {invitations.length > 0 && (
        <div className="overflow-hidden rounded-[22px] border-2 border-indigo-200/90 bg-gradient-to-br from-indigo-50/70 via-white to-amber-50/40 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-xs">
                <UserCheck className="size-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-extrabold tracking-tight text-indigo-950">
                    Lời mời cộng tác dự án
                  </h3>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-black text-indigo-800">
                    {invitations.length} lời mời
                  </span>
                </div>
                <p className="text-xs text-indigo-900/80">
                  Bạn được mời tham gia hỗ trợ vận hành các chiến dịch dưới đây. Hãy chọn đồng ý để tham gia ngay.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 divide-y divide-indigo-100/80 rounded-xl border border-indigo-100 bg-white shadow-xs">
            {invitations.map((inv) => {
              const isProcessing = processingId === inv.campaignId;

              return (
                <div
                  key={inv.id || inv.campaignId}
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-display text-sm font-extrabold text-ink">
                        {inv.campaignSlug ? (
                          <Link
                            href={`/campaigns/${inv.campaignSlug}`}
                            target="_blank"
                            className="hover:text-forest hover:underline"
                          >
                            {inv.campaignTitle}
                          </Link>
                        ) : (
                          inv.campaignTitle
                        )}
                      </h4>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        <Clock className="size-3 text-amber-600" />
                        Chờ bạn đồng ý
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-ink-muted">
                      Chủ dự án:{" "}
                      <strong className="text-ink font-semibold">
                        {inv.inviterName || "Chủ dự án"}
                      </strong>
                    </p>

                    {/* Permissions list */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="text-ink-muted font-medium mr-1">
                        Quyền hạn được giao:
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-bold ${
                          inv.canPostUpdates ?? true
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-stone-200 bg-stone-50 text-stone-400 line-through"
                        }`}
                      >
                        <Newspaper className="size-3" />
                        Đăng bài cập nhật
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-bold ${
                          inv.canReplyComments ?? true
                            ? "border-blue-200 bg-blue-50 text-blue-800"
                            : "border-stone-200 bg-stone-50 text-stone-400 line-through"
                        }`}
                      >
                        <MessageSquare className="size-3" />
                        Trả lời bình luận
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-bold ${
                          inv.canViewAiDashboard ?? true
                            ? "border-purple-200 bg-purple-50 text-purple-800"
                            : "border-stone-200 bg-stone-50 text-stone-400 line-through"
                        }`}
                      >
                        <BarChart3 className="size-3" />
                        Xem báo cáo AI
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRespond(inv, "DECLINE")}
                      className="button-ghost min-h-9 px-3.5 text-xs font-bold text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                    >
                      {isProcessing ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <X className="size-3.5" />
                      )}
                      <span>Từ chối</span>
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRespond(inv, "ACCEPT")}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-forest px-4 text-xs font-bold text-lime shadow-xs hover:bg-forest-dark disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                      <span>Đồng ý tham gia</span>
                    </button>
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


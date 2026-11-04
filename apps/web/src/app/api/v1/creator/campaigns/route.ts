import { NextResponse } from "next/server";
import { mockCategories } from "@/lib/api/mock/relational-store";
import { getServerPlatformPreviewState, writePlatformPreviewCookie } from "@/lib/auth/platform-preview-cookie";
import { requireSession } from "@/lib/auth/require-session";
import { buildCampaignDraftSnapshot } from "@/lib/creator/draft-preview";
import { isPreviewCampaignId, previewCampaignStatus } from "@/lib/creator/preview-campaigns";
import { localDbEnabled } from "@/lib/local-db/database";
import type { LocalCampaignEventInput } from "@/lib/local-db/database";

function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function reviewProblem(draft: NonNullable<ReturnType<typeof buildCampaignDraftSnapshot>["value"]>) {
  const fields = draft.draft;
  if ((fields.title?.length ?? 0) < 10 || (fields.blurb?.length ?? 0) < 30) {
    return "Cần tên chiến dịch ít nhất 10 ký tự và mô tả ngắn ít nhất 30 ký tự.";
  }
  if (!mockCategories.some((item) => item.name === fields.category)) {
    return "Hãy chọn một danh mục có trong biểu mẫu.";
  }
  if (Number(fields.goal) < 10_000_000 || !Number.isSafeInteger(Number(fields.goal))) {
    return "Mục tiêu gọi vốn phải từ 10 triệu đồng.";
  }
  if (Number(fields.duration) < 15 || Number(fields.duration) > 60) {
    return "Thời gian gọi vốn cần từ 15 đến 60 ngày.";
  }
  if ((fields.story?.length ?? 0) < 100 || (fields.risks?.length ?? 0) < 50) {
    return "Cần bổ sung câu chuyện ít nhất 100 ký tự và rủi ro ít nhất 50 ký tự.";
  }
  if (!draft.rewards?.length || draft.rewards.some((reward) =>
    reward.title.length < 3 || Number(reward.amount) < 50_000 ||
    Number(reward.limit) < 1 || !/^(0[1-9]|1[0-2])\/\d{4}$/.test(reward.delivery)
  )) {
    return "Cần ít nhất một gói ủng hộ có tên, mức từ 50.000 đ, số lượng và tháng giao hợp lệ.";
  }
  if (draft.addOns?.some((item) => item.title.length < 3 || Number(item.amount) < 1)) {
    return "Phần bổ sung cần có tên và giá hợp lệ.";
  }
  if (fields.shippingFee === undefined || !/^\d+$/.test(fields.shippingFee)) {
    return "Hãy nhập phí giao hàng bằng số không âm.";
  }
  if (draft.collaborators?.some((item) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email))) {
    return "Email cộng tác viên chưa hợp lệ.";
  }
  return null;
}

export async function POST(request: Request) {
  const access = await requireSession(["CREATOR"]);
  if (access.response) return access.response;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Dữ liệu gửi lên chưa đúng định dạng JSON.");
  }
  const body = objectValue(rawBody);
  if (!body) return apiError(422, "INVALID_BODY", "Nội dung gửi lên chưa hợp lệ.");
  const action = body.action;
  if (action !== "CREATE" && action !== "SAVE" && action !== "SUBMIT" && action !== "LAUNCH" && action !== "REPLY_MESSAGE") {
    return apiError(400, "INVALID_ACTION", "Thao tác chiến dịch chưa hợp lệ.");
  }

  const platform = await getServerPlatformPreviewState();
  const ownerId = access.session!.user.id;
  const campaignId = action === "CREATE"
    ? `cmp_preview_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`
    : typeof body.campaignId === "string" ? body.campaignId : "";
  if (!isPreviewCampaignId(campaignId)) {
    return apiError(404, "CAMPAIGN_NOT_FOUND", "Không tìm thấy hồ sơ chiến dịch mới.");
  }
  if (!localDbEnabled() && action === "CREATE" && Object.keys(platform.campaignDrafts).length >= 4) {
    return apiError(409, "PREVIEW_DRAFT_LIMIT", "Trình duyệt đã có bốn bản nháp mẫu. Hãy giữ lại nội dung; bản demo chưa có kho dữ liệu dài hạn để tạo thêm.");
  }
  const existing = platform.campaignDrafts[campaignId];
  if (action !== "CREATE" && (!existing || existing.ownerId !== ownerId)) {
    return apiError(404, "CAMPAIGN_NOT_FOUND", "Hồ sơ không tồn tại hoặc không thuộc tài khoản này.");
  }
  if (action !== "CREATE" && action !== "LAUNCH" && action !== "REPLY_MESSAGE" && previewCampaignStatus(campaignId, platform) !== "DRAFT") {
    return apiError(409, "CAMPAIGN_LOCKED", "Hồ sơ đang xét duyệt hoặc đã được duyệt nên chưa thể chỉnh/gửi lại.");
  }

  if (action === "LAUNCH") {
    if (previewCampaignStatus(campaignId, platform) !== "PRE_LAUNCH") {
      return apiError(409, "CAMPAIGN_NOT_READY", "Chỉ hồ sơ đã được duyệt mới có thể mở gọi vốn.");
    }
    platform.campaignStatuses[campaignId] = "LIVE";
    platform.campaignLaunchAt = { ...(platform.campaignLaunchAt ?? {}), [campaignId]: new Date().toISOString() };
    const response = NextResponse.json({ data: { campaignId, status: "LIVE" }, meta: { source: "preview" } });
    return writePlatformPreviewCookie(response, platform, {
      campaignId, actorUserId: ownerId, actorRole: "CREATOR", eventType: "LAUNCH",
      stage: "FUNDING", visibility: "PUBLIC", title: "Mở chiến dịch gọi vốn",
      detail: "Trang dự án bắt đầu nhận cam kết mẫu; chưa kết nối thanh toán thật.",
    }) ?? response;
  }

  if (action === "REPLY_MESSAGE") {
    if (previewCampaignStatus(campaignId, platform) !== "LIVE") {
      return apiError(409, "CAMPAIGN_NOT_LIVE", "Chỉ chiến dịch đang gọi vốn mới trả lời tin nhắn trong bản demo.");
    }
    const messageId = typeof body.messageId === "string" ? body.messageId : "";
    const replyBody = typeof body.body === "string" ? body.body.trim() : "";
    const original = platform.messages.find((item) =>
      item.id === messageId && item.campaignId === campaignId && item.recipientId === ownerId);
    if (!original) return apiError(404, "MESSAGE_NOT_FOUND", "Không thấy tin nhắn này trong hộp thư chiến dịch.");
    if (replyBody.length < 3 || replyBody.length > 240) {
      return apiError(422, "MESSAGE_INVALID", "Nội dung trả lời cần từ 3 đến 240 ký tự.");
    }
    const reply = {
      id: `reply_${crypto.randomUUID().slice(0, 8)}`, campaignId,
      senderId: ownerId, senderName: access.session!.user.name,
      senderInitials: access.session!.user.initials,
      recipientId: original.senderId, recipientName: original.senderName,
      subject: `Phản hồi: ${original.subject}`.slice(0, 80),
      body: replyBody, sentAt: "Vừa xong",
    };
    platform.messages = [reply, ...platform.messages].slice(0, localDbEnabled() ? undefined : 12);
    const response = NextResponse.json({ data: { campaignId, messageId: reply.id }, meta: { source: "preview" } });
    return writePlatformPreviewCookie(response, platform, {
      campaignId, actorUserId: ownerId, actorRole: "CREATOR", eventType: "REPLY_MESSAGE",
      stage: "FUNDING", visibility: "INVOLVED", title: "Chủ dự án trả lời người ủng hộ",
      detail: original.subject, refId: reply.id,
    }) ?? response;
  }

  if (action === "SUBMIT") {
    const problem = reviewProblem(existing!);
    if (problem) return apiError(422, "CAMPAIGN_INCOMPLETE", problem);

    const priorReview = platform.submittedReviews.find((item) => item.campaignId === campaignId);
    const reviewId = priorReview?.id ?? `preview_review_${campaignId}`;
    platform.submittedReviews = [
      {
        id: reviewId,
        campaignId,
        title: existing!.draft.title!,
        creator: access.session!.user.name,
        submittedAt: "Vừa gửi trong bản dùng thử",
        category: existing!.draft.category!,
        completeness: 100,
        status: "PENDING" as const,
        submissionVersion: (priorReview?.submissionVersion ?? 0) + 1,
        assignedTo: "Chưa phân công",
        reviewDueAt: "Trong 24 giờ",
        documentCount: 3 + (existing!.rewards?.length ?? 0) + (existing!.addOns?.length ?? 0),
        checks: [
          { label: "Thông tin chiến dịch", status: "PASS" as const, detail: "Đã đủ trường bắt buộc để gửi duyệt, chưa xác minh nội dung thực tế." },
          { label: "Gói ủng hộ", status: "PASS" as const, detail: `${existing!.rewards?.length ?? 0} gói và ${existing!.addOns?.length ?? 0} phần bổ sung được khai báo.` },
          { label: "Kiểm tra thủ công", status: "WARN" as const, detail: "Quản trị viên cần đọc câu chuyện, rủi ro và lịch giao trước khi quyết định." },
        ],
      },
      ...platform.submittedReviews.filter((item) => item.campaignId !== campaignId),
    ].slice(0, localDbEnabled() ? undefined : 4);
    delete platform.reviewDecisions[reviewId];
    delete platform.reviewFeedback[reviewId];
  } else {
    const result = buildCampaignDraftSnapshot(
      body,
      existing,
      campaignId,
      ownerId,
    );
    if (result.error) return apiError(422, "CAMPAIGN_DRAFT_INVALID", result.error);
    platform.campaignDrafts = { ...platform.campaignDrafts, [campaignId]: result.value! };
  }

  const response = NextResponse.json(
    { data: { campaignId, status: previewCampaignStatus(campaignId, platform) }, meta: { source: "preview" } },
    { status: action === "CREATE" ? 201 : 200 },
  );
  const saved = platform.campaignDrafts[campaignId];
  const fieldNames: Record<string, string> = {
    title: "tên", blurb: "mô tả ngắn", category: "danh mục", goal: "mục tiêu",
    duration: "thời hạn", location: "địa điểm", story: "câu chuyện",
    risks: "rủi ro", shippingFee: "phí giao", hasVideo: "video",
  };
  const changed = action === "SAVE" && saved
    ? Object.entries(saved.draft)
        .filter(([key, value]) => JSON.stringify(existing?.draft[key as keyof typeof saved.draft]) !== JSON.stringify(value))
        .map(([key]) => fieldNames[key] ?? key)
    : [];
  if (action === "SAVE" && saved && existing) {
    if (JSON.stringify(existing.rewards) !== JSON.stringify(saved.rewards)) changed.push("gói ủng hộ");
    if (JSON.stringify(existing.addOns) !== JSON.stringify(saved.addOns)) changed.push("phần bổ sung");
  }
  const version = platform.submittedReviews.find((item) => item.campaignId === campaignId)?.submissionVersion;
  const event: LocalCampaignEventInput = {
    campaignId,
    actorUserId: ownerId,
    actorRole: "CREATOR",
    eventType: action === "CREATE" ? "CREATE_CAMPAIGN" : action === "SAVE" ? "SAVE_DRAFT" : "SUBMIT_REVIEW",
    stage: action === "SUBMIT" ? "REVIEW" : "PREPARATION",
    visibility: "TEAM",
    title: action === "CREATE" ? "Tạo hồ sơ chiến dịch"
      : action === "SAVE" ? "Lưu chỉnh sửa bản nháp" : `Gửi hồ sơ xét duyệt lần ${version ?? 1}`,
    detail: action === "CREATE" ? `Hồ sơ “${saved?.draft.title || "Chưa đặt tên"}” được tạo bởi chủ dự án.`
      : action === "SAVE" ? (changed.length ? `Đã cập nhật: ${changed.join(", ")}.` : "Lưu lại bản nháp, nội dung chính không đổi.")
        : `Hồ sơ đã gửi lần ${version ?? 1}; quản trị viên sẽ đọc và phản hồi.`,
    refId: action === "SUBMIT" ? platform.submittedReviews.find((item) => item.campaignId === campaignId)?.id : undefined,
  };
  return writePlatformPreviewCookie(response, platform, event) ?? response;
}

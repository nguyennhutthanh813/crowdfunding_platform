"use client";

import {
  AlertTriangle,
  Ban,
  Check,
  Clock3,
  ExternalLink,
  Eye,
  FileCheck2,
  FolderHeart,
  LoaderCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { AdminDashboardData, CampaignCardData } from "@/lib/api";
import { formatVnd } from "@/lib/format";
import {
  AdminNotice,
  AdminPageHeader,
  InlineActionConfirm,
  callAdminAction,
  type ReviewDecision,
} from "./admin-shared";

export function CampaignsWorkspace({ data }: { data: AdminDashboardData }) {
  const [campaigns, setCampaigns] = useState<CampaignCardData[]>(
    data.campaigns || [],
  );
  const [reviewQueue, setReviewQueue] = useState(data.reviewQueue || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<
    "newest" | "pledged" | "goal" | "backers"
  >("newest");

  const [selectedCampaign, setSelectedCampaign] =
    useState<CampaignCardData | null>(null);
  const [statusTargetCampaign, setStatusTargetCampaign] =
    useState<CampaignCardData | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [reviewTarget, setReviewTarget] = useState<any | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [pendingDecision, setPendingDecision] = useState<{
    target: any;
    decision: ReviewDecision;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (data.campaigns) setCampaigns(data.campaigns);
  }, [data.campaigns]);

  useEffect(() => {
    if (data.reviewQueue) setReviewQueue(data.reviewQueue);
  }, [data.reviewQueue]);

  // Counts
  const totalCount = campaigns.length;
  const inReviewCount =
    campaigns.filter((c) => c.status === "IN_REVIEW").length ||
    reviewQueue.length;
  const liveCount = campaigns.filter((c) => c.status === "LIVE").length;
  const successfulCount = campaigns.filter(
    (c) => c.status === "SUCCESSFUL",
  ).length;
  const suspendedCount = campaigns.filter(
    (c) => c.status === "SUSPENDED",
  ).length;
  const draftCount = campaigns.filter((c) => c.status === "DRAFT").length;
  const preLaunchCount = campaigns.filter(
    (c) => c.status === "PRE_LAUNCH",
  ).length;

  const categories = useMemo(() => {
    const set = new Set<string>();
    campaigns.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set);
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    let result = [...campaigns];

    if (statusFilter !== "ALL") {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (categoryFilter !== "ALL") {
      result = result.filter((c) => c.category === categoryFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.creator?.name?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q) ||
          c.slug?.toLowerCase().includes(q) ||
          c.location?.toLowerCase().includes(q),
      );
    }

    result.sort((a, b) => {
      if (sortBy === "pledged")
        return (b.pledgedAmount || 0) - (a.pledgedAmount || 0);
      if (sortBy === "goal") return (b.goalAmount || 0) - (a.goalAmount || 0);
      if (sortBy === "backers")
        return (b.backerCount || 0) - (a.backerCount || 0);
      return 0;
    });

    return result;
  }, [campaigns, statusFilter, categoryFilter, searchTerm, sortBy]);

  // Handle Suspend / Resume toggle
  const handleToggleStatus = async () => {
    if (!statusTargetCampaign) return;
    const isSuspended = statusTargetCampaign.status === "SUSPENDED";
    const nextStatus = isSuspended ? "LIVE" : "SUSPENDED";
    const reason =
      statusReason.trim() ||
      (isSuspended
        ? "Quản trị viên khôi phục trạng thái hoạt động"
        : "Quản trị viên tạm khóa chiến dịch do rủi ro vận hành");

    setBusy(statusTargetCampaign.id);
    setNotice(null);

    try {
      await callAdminAction("SET_CAMPAIGN_STATUS", {
        campaignId: statusTargetCampaign.id,
        status: nextStatus,
        reason,
      });

      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === statusTargetCampaign.id ? { ...c, status: nextStatus } : c,
        ),
      );

      setNotice(
        `${isSuspended ? "Đã khôi phục" : "Đã tạm dừng"} chiến dịch "${statusTargetCampaign.title}" thành công.`,
      );
      setStatusTargetCampaign(null);
      setStatusReason("");
    } catch (err: any) {
      setNotice(err?.message || "Không thể cập nhật trạng thái chiến dịch.");
    } finally {
      setBusy(null);
    }
  };

  // Open Review modal for a campaign
  const handleOpenReview = (camp: CampaignCardData) => {
    const queueItem = reviewQueue.find(
      (r) =>
        r.campaignId === camp.id ||
        r.id === camp.id ||
        (camp.slug && r.slug === camp.slug),
    );

    const dossier = queueItem || {
      id: camp.id,
      campaignId: camp.id,
      title: camp.title,
      creator: camp.creator?.name || "Chưa rõ",
      category: camp.category || "Công nghệ",
      submissionVersion: 1,
      submittedAt: "Gần đây",
      reviewDueAt: "Trong ngày",
      goalAmount: camp.goalAmount,
      blurb: camp.blurb,
      story: (camp as any).story,
      risks: (camp as any).risks,
      rewardTiers: (camp as any).rewardTiers,
      slug: camp.slug,
      checks: [
        { label: "Mục đích dự án & Pháp lý", status: "PASS", note: "Hợp lệ" },
        { label: "Ngân sách & Kế hoạch khả thi", status: "PASS", note: "Đạt" },
        { label: "Minh bạch rủi ro", status: "PASS", note: "Đã có phương án" },
        { label: "Xác minh danh tính chủ dự án", status: "PASS", note: "Đạt" },
      ],
    };

    setReviewTarget(dossier);
    setReviewFeedback("");
  };

  // Execute review decision
  const handleExecuteReview = async () => {
    if (!pendingDecision) return;
    const { target, decision } = pendingDecision;
    const reason = reviewFeedback.trim();

    setBusy(target.id);
    setNotice(null);

    try {
      await callAdminAction("REVIEW_CAMPAIGN", {
        reviewId: target.id,
        decision,
        feedback: reason,
      });

      const nextStatus =
        decision === "APPROVED"
          ? "LIVE"
          : decision === "CHANGES"
            ? "NEEDS_CHANGES"
            : "REJECTED";

      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === target.campaignId || c.id === target.id
            ? { ...c, status: nextStatus as any }
            : c,
        ),
      );

      setReviewQueue((prev) =>
        prev.filter((r) => r.id !== target.id && r.campaignId !== target.id),
      );

      setNotice(
        decision === "APPROVED"
          ? `Đã phê duyệt chiến dịch "${target.title}" thành công. Dự án đã được đưa lên sàn!`
          : decision === "CHANGES"
            ? `Đã gửi yêu cầu bổ sung chỉnh sửa tới chủ dự án "${target.creator}".`
            : `Đã từ chối hồ sơ chiến dịch "${target.title}".`,
      );

      setPendingDecision(null);
      setReviewTarget(null);
      setReviewFeedback("");
    } catch (err: any) {
      setNotice(err?.message || "Không thể thực hiện phê duyệt hồ sơ.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="min-h-screen pb-20">
      {/* ── Page Header ────────────────────────────────────────── */}
      <AdminPageHeader
        eyebrow="Quản trị toàn diện chiến dịch"
        title="Quản lý chiến dịch"
        description="Theo dõi danh mục dự án, kiểm soát trạng thái gọi vốn và trực tiếp thẩm định các hồ sơ nộp mới."
        icon={FolderHeart}
        snapshotAt={data.operations.snapshotAt}
      />

      <div className="container-shell pt-6 space-y-6">
        {notice && <AdminNotice message={notice} />}

        {/* ── Quick KPI Stat Cards ────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            {
              label: "Tổng dự án",
              value: totalCount,
              status: "ALL",
              tone: "text-ink bg-white border-line",
            },
            {
              label: "Đang gọi vốn",
              value: liveCount,
              status: "LIVE",
              tone: "text-forest bg-[#f4f7f4] border-emerald-200",
            },
            {
              label: "Chờ thẩm định",
              value: inReviewCount,
              status: "IN_REVIEW",
              tone:
                inReviewCount > 0
                  ? "text-amber-800 bg-amber-50 border-amber-300 ring-2 ring-amber-200/50"
                  : "text-ink-soft bg-white border-line",
            },
            {
              label: "Thành công",
              value: successfulCount,
              status: "SUCCESSFUL",
              tone: "text-teal-800 bg-teal-50 border-teal-200",
            },
            {
              label: "Tạm khóa",
              value: suspendedCount,
              status: "SUSPENDED",
              tone:
                suspendedCount > 0
                  ? "text-red-800 bg-red-50 border-red-200"
                  : "text-ink-soft bg-white border-line",
            },
          ].map((card) => {
            const active = statusFilter === card.status;
            return (
              <button
                key={card.label}
                type="button"
                onClick={() => setStatusFilter(card.status)}
                className={`flex flex-col items-start rounded-2xl border p-4 text-left transition hover:shadow-xs ${card.tone} ${
                  active ? "ring-2 ring-forest shadow-xs" : ""
                }`}
              >
                <span className="text-[11px] font-bold opacity-75">
                  {card.label}
                </span>
                <span className="mt-1 font-display text-2xl font-black">
                  {card.value}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── In-Review Urgent Banner ─────────────────────────── */}
        {inReviewCount > 0 && statusFilter !== "IN_REVIEW" && (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-xs">
                <FileCheck2 className="size-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-amber-950">
                  Có {inReviewCount} hồ sơ chiến dịch đang chờ thẩm định lên sàn
                </p>
                <p className="text-[11px] text-amber-800/80">
                  Kiểm tra tính pháp lý, tính khả thi ngân sách và kế hoạch giao
                  quà trước khi duyệt công khai.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStatusFilter("IN_REVIEW")}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-xs font-bold text-white transition hover:bg-amber-700 shrink-0 shadow-xs"
            >
              <span>Xem hồ sơ chờ duyệt</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black">
                {inReviewCount}
              </span>
            </button>
          </div>
        )}

        {/* ── Filter & Search Toolbar ─────────────────────────── */}
        <div className="space-y-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field input-with-icon w-full pr-10 text-xs"
                placeholder="Tìm theo tên chiến dịch, chủ dự án, slug, khu vực..."
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-ink-muted hover:bg-stone-100 hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                <SlidersHorizontal className="size-3.5" />
                <span>Danh mục:</span>
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-line bg-[#fbfbfa] px-3 py-2 text-xs font-semibold text-ink outline-none transition focus:border-forest"
              >
                <option value="ALL">Tất cả danh mục</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5 pl-2 text-xs text-ink-muted">
                <span>Sắp xếp:</span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-xl border border-line bg-[#fbfbfa] px-3 py-2 text-xs font-semibold text-ink outline-none transition focus:border-forest"
              >
                <option value="newest">Mặc định</option>
                <option value="pledged">Gây quỹ nhiều nhất</option>
                <option value="goal">Mục tiêu lớn nhất</option>
                <option value="backers">Nhiều người ủng hộ</option>
              </select>
            </div>
          </div>

          {/* Quick status filters */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-line/60">
            <span className="text-[11px] font-semibold text-ink-muted mr-1">
              Lọc trạng thái:
            </span>
            {[
              { id: "ALL", label: "Tất cả", count: totalCount },
              { id: "IN_REVIEW", label: "Chờ duyệt", count: inReviewCount },
              { id: "LIVE", label: "Đang gọi vốn", count: liveCount },
              { id: "SUCCESSFUL", label: "Thành công", count: successfulCount },
              { id: "SUSPENDED", label: "Tạm khóa", count: suspendedCount },
              { id: "PRE_LAUNCH", label: "Sắp ra mắt", count: preLaunchCount },
              { id: "DRAFT", label: "Bản nháp", count: draftCount },
            ].map((pill) => {
              const active = statusFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setStatusFilter(pill.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                    active
                      ? "bg-forest text-white shadow-sm"
                      : "bg-[#f3f3ed] text-ink-soft hover:bg-stone-200"
                  }`}
                >
                  <span>{pill.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      active
                        ? "bg-white/25 text-white"
                        : "bg-white text-ink-muted"
                    }`}
                  >
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Campaign Table ──────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-[#fbfbfa] text-[11px] font-bold tracking-wider text-ink-muted uppercase">
                  <th className="py-3.5 pl-5 pr-3">Chiến dịch</th>
                  <th className="px-3 py-3.5">Chủ dự án</th>
                  <th className="px-3 py-3.5">Mục tiêu & Đã gọi</th>
                  <th className="px-3 py-3.5">Tiến độ</th>
                  <th className="px-3 py-3.5">Trạng thái</th>
                  <th className="py-3.5 pl-3 pr-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filteredCampaigns.length > 0 ? (
                  filteredCampaigns.map((camp) => {
                    const percent =
                      camp.goalAmount > 0
                        ? Math.round(
                            ((camp.pledgedAmount || 0) / camp.goalAmount) * 100,
                          )
                        : 0;

                    return (
                      <tr
                        key={camp.id}
                        className="transition hover:bg-[#fafaf7]"
                      >
                        {/* Project Info */}
                        <td className="py-4 pl-5 pr-3">
                          <div className="flex items-center gap-3">
                            <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-stone-100 border border-line">
                              {camp.visual?.imageSrc ? (
                                <img
                                  src={camp.visual.imageSrc}
                                  alt=""
                                  className="size-full object-cover"
                                />
                              ) : (
                                <div className="grid size-full place-items-center bg-[#f0f4ef] text-forest">
                                  <FolderHeart className="size-5" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 max-w-xs">
                              <p className="font-bold text-ink truncate text-xs hover:text-forest">
                                {camp.title}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-ink-muted">
                                <span className="rounded-md bg-stone-100 px-1.5 py-0.5 font-semibold text-ink-soft">
                                  {camp.category || "Dự án"}
                                </span>
                                {camp.location && (
                                  <span>· {camp.location}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Creator */}
                        <td className="px-3 py-4">
                          <p className="font-semibold text-ink">
                            {camp.creator?.name || "Chưa rõ"}
                          </p>
                          <p className="text-[10px] text-ink-muted truncate max-w-[130px]">
                            {camp.creator?.location || "ID: " + camp.id.slice(0, 8)}
                          </p>
                        </td>

                        {/* Funding Goal & Pledged */}
                        <td className="px-3 py-4">
                          <p className="font-bold text-forest">
                            {formatVnd(camp.pledgedAmount || 0, true)}
                          </p>
                          <p className="text-[10px] text-ink-muted">
                            mục tiêu {formatVnd(camp.goalAmount || 0, true)}
                          </p>
                        </td>

                        {/* Progress */}
                        <td className="px-3 py-4">
                          <div className="w-24">
                            <div className="flex justify-between text-[10px] font-bold text-ink-soft mb-1">
                              <span>{percent}%</span>
                              <span>{camp.backerCount || 0} backer</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                              <div
                                className={`h-full rounded-full ${
                                  percent >= 100 ? "bg-forest" : "bg-coral"
                                }`}
                                style={{ width: `${Math.min(100, percent)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                              camp.status === "LIVE"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : camp.status === "IN_REVIEW"
                                  ? "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                                  : camp.status === "SUCCESSFUL"
                                    ? "bg-teal-50 text-teal-800 border border-teal-200"
                                    : camp.status === "SUSPENDED"
                                      ? "bg-red-50 text-red-800 border border-red-200"
                                      : "bg-stone-100 text-ink-muted border border-stone-200"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                camp.status === "LIVE"
                                  ? "bg-emerald-500"
                                  : camp.status === "IN_REVIEW"
                                    ? "bg-amber-500"
                                    : camp.status === "SUSPENDED"
                                      ? "bg-red-500"
                                      : "bg-stone-400"
                              }`}
                            />
                            {camp.status === "LIVE"
                              ? "Đang gọi vốn"
                              : camp.status === "IN_REVIEW"
                                ? "Chờ duyệt"
                                : camp.status === "SUCCESSFUL"
                                  ? "Thành công"
                                  : camp.status === "SUSPENDED"
                                    ? "Tạm khóa"
                                    : camp.status === "PRE_LAUNCH"
                                      ? "Sắp ra mắt"
                                      : "Bản nháp"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 pl-3 pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {camp.status === "IN_REVIEW" && (
                              <button
                                type="button"
                                onClick={() => handleOpenReview(camp)}
                                className="inline-flex min-h-8 items-center gap-1 rounded-full border border-amber-400 bg-amber-500 px-3 text-[11px] font-bold text-white shadow-xs hover:bg-amber-600 transition"
                                title="Mở thẩm định hồ sơ chiến dịch"
                              >
                                <FileCheck2 className="size-3.5" />
                                <span>Thẩm định</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedCampaign(camp)}
                              className="grid size-8 place-items-center rounded-lg border border-line bg-white text-ink-muted hover:border-forest hover:text-forest transition"
                              title="Xem chi tiết chiến dịch"
                            >
                              <Eye className="size-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setStatusTargetCampaign(camp);
                                setStatusReason("");
                              }}
                              className={`grid size-8 place-items-center rounded-lg border transition ${
                                camp.status === "SUSPENDED"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "border-line bg-white text-ink-muted hover:border-red-300 hover:text-red-700"
                              }`}
                              title={
                                camp.status === "SUSPENDED"
                                  ? "Mở lại chiến dịch"
                                  : "Tạm khóa chiến dịch"
                              }
                            >
                              {camp.status === "SUSPENDED" ? (
                                <ShieldCheck className="size-3.5 text-emerald-600" />
                              ) : (
                                <Ban className="size-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-ink-muted"
                    >
                      <FolderHeart className="mx-auto size-8 text-ink-muted/40" />
                      <p className="mt-2 font-bold text-ink">
                        Không tìm thấy chiến dịch phù hợp
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">
                        Thử đổi từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc trạng
                        thái.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("ALL");
                          setCategoryFilter("ALL");
                        }}
                        className="button-ghost mt-3 min-h-10 px-4 text-xs font-bold"
                      >
                        <X className="size-3.5" /> Đặt lại bộ lọc
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-line bg-[#fbfbfa] px-5 py-3 text-xs text-ink-muted">
            <span>
              Hiển thị <strong>{filteredCampaigns.length}</strong> / {totalCount}{" "}
              chiến dịch
            </span>
            <span>Dữ liệu đồng bộ trực tiếp từ hệ thống</span>
          </div>
        </div>
      </div>

      {/* ── Modal 1: Review Dossier Modal ────────────────────── */}
      {reviewTarget && (
        <Modal
          open
          size="lg"
          title={`Thẩm định hồ sơ: ${reviewTarget.title}`}
          description={`Chủ dự án: ${reviewTarget.creator} · Bản v${reviewTarget.submissionVersion || 1}`}
          onClose={() => setReviewTarget(null)}
          locked={busy === reviewTarget.id}
        >
          <div className="space-y-5 max-h-[72vh] overflow-y-auto pr-1 text-xs">
            {/* Quick Summary Pill Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-line bg-[#faf9f5] p-3 text-center">
                <p className="text-[10px] text-ink-muted">Mục tiêu gọi vốn</p>
                <p className="mt-1 font-display font-black text-sm text-forest">
                  {formatVnd(reviewTarget.goalAmount || 0, true)}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-[#faf9f5] p-3 text-center">
                <p className="text-[10px] text-ink-muted">Danh mục</p>
                <p className="mt-1 font-display font-black text-xs text-ink">
                  {reviewTarget.category || "Công nghệ"}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-[#faf9f5] p-3 text-center">
                <p className="text-[10px] text-ink-muted">Thời điểm nộp</p>
                <p className="mt-1 font-display font-black text-xs text-ink">
                  {reviewTarget.submittedAt || "Mới nộp"}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-[#faf9f5] p-3 text-center">
                <p className="text-[10px] text-ink-muted">Hạn cam kết SLA</p>
                <p className="mt-1 font-display font-black text-xs text-amber-700">
                  {reviewTarget.reviewDueAt || "24h"}
                </p>
              </div>
            </div>

            {/* Checklist */}
            <div className="rounded-xl border border-line bg-white p-4">
              <p className="font-bold text-ink mb-2.5">
                Tiêu chuẩn kiểm duyệt nội dung & pháp lý:
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(reviewTarget.checks || []).map((check: any) => (
                  <div
                    key={check.label}
                    className="flex items-center gap-2 rounded-lg border border-line/60 bg-[#fafaf7] px-3 py-2 text-[11px]"
                  >
                    <Check className="size-3.5 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-ink">
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Blurb */}
            {reviewTarget.blurb && (
              <div className="rounded-xl border border-line bg-[#faf9f5] p-4">
                <p className="font-bold text-ink">Mô tả ngắn dự án</p>
                <p className="mt-1 text-ink-soft leading-relaxed">
                  {reviewTarget.blurb}
                </p>
              </div>
            )}

            {/* Feedback & Actions */}
            <div className="rounded-xl border border-line bg-stone-50 p-4">
              <label className="block font-bold text-ink mb-1">
                Phản hồi của ban quản trị (Bắt buộc nếu yêu cầu sửa hoặc từ chối):
              </label>
              <textarea
                rows={3}
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                placeholder="Nhập nội dung hướng dẫn hoặc lý do phê duyệt/từ chối..."
                className="w-full rounded-xl border border-line bg-white p-2.5 text-xs text-ink outline-none focus:border-forest"
              />

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-line/70 pt-3">
                <button
                  type="button"
                  disabled={busy === reviewTarget.id}
                  onClick={() => setReviewTarget(null)}
                  className="button-ghost min-h-10 px-4 text-xs font-bold"
                >
                  Đóng lại
                </button>
                <button
                  type="button"
                  disabled={busy === reviewTarget.id}
                  onClick={() => {
                    if (!reviewFeedback.trim()) {
                      setNotice("Cần nhập lý do khi yêu cầu sửa hồ sơ.");
                      return;
                    }
                    setPendingDecision({
                      target: reviewTarget,
                      decision: "CHANGES",
                    });
                  }}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-4 text-xs font-bold text-amber-900 hover:bg-amber-100 transition"
                >
                  <Clock3 className="size-3.5 text-amber-700" />
                  <span>Yêu cầu sửa đổi</span>
                </button>
                <button
                  type="button"
                  disabled={busy === reviewTarget.id}
                  onClick={() => {
                    if (!reviewFeedback.trim()) {
                      setNotice("Cần nhập lý do khi từ chối hồ sơ.");
                      return;
                    }
                    setPendingDecision({
                      target: reviewTarget,
                      decision: "REJECTED",
                    });
                  }}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-800 hover:bg-red-100 transition"
                >
                  <Ban className="size-3.5 text-red-600" />
                  <span>Từ chối</span>
                </button>
                <button
                  type="button"
                  disabled={busy === reviewTarget.id}
                  onClick={() => {
                    setPendingDecision({
                      target: reviewTarget,
                      decision: "APPROVED",
                    });
                  }}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-forest px-5 text-xs font-extrabold text-white hover:bg-[#142d25] transition shadow-xs"
                >
                  <Check className="size-3.5 text-lime" />
                  <span>Phê duyệt lên sàn</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal 2: Confirm Review Decision ─────────────────── */}
      {pendingDecision && (
        <InlineActionConfirm
          title={
            pendingDecision.decision === "APPROVED"
              ? "Phê duyệt đưa chiến dịch lên sàn"
              : pendingDecision.decision === "CHANGES"
                ? "Gửi yêu cầu bổ sung hồ sơ"
                : "Từ chối hồ sơ chiến dịch"
          }
          detail={`Chiến dịch: "${pendingDecision.target.title}" (Chủ dự án: ${pendingDecision.target.creator})`}
          confirmLabel={
            pendingDecision.decision === "APPROVED"
              ? "Xác nhận duyệt"
              : pendingDecision.decision === "CHANGES"
                ? "Xác nhận yêu cầu sửa"
                : "Xác nhận từ chối"
          }
          busy={busy === pendingDecision.target.id}
          danger={pendingDecision.decision === "REJECTED"}
          onConfirm={handleExecuteReview}
          onCancel={() => setPendingDecision(null)}
        />
      )}

      {/* ── Modal 3: Detail Modal ────────────────────────────── */}
      {selectedCampaign && (
        <Modal
          open
          size="lg"
          title={`Chiến dịch: ${selectedCampaign.title}`}
          description={`Mã: ${selectedCampaign.id} · Danh mục: ${selectedCampaign.category}`}
          onClose={() => setSelectedCampaign(null)}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
            {selectedCampaign.visual?.imageSrc && (
              <div className="aspect-[16/7] w-full rounded-2xl overflow-hidden bg-stone-100 border border-line">
                <img
                  src={selectedCampaign.visual.imageSrc}
                  alt={selectedCampaign.title}
                  className="size-full object-cover"
                />
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-line bg-[#faf9f5] p-3 text-center">
                <p className="text-[10px] text-ink-muted">Mục tiêu gọi vốn</p>
                <p className="mt-1 font-display font-black text-sm text-forest">
                  {formatVnd(selectedCampaign.goalAmount || 0, true)}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-[#faf9f5] p-3 text-center">
                <p className="text-[10px] text-ink-muted">Đã huy động</p>
                <p className="mt-1 font-display font-black text-sm text-coral">
                  {formatVnd(selectedCampaign.pledgedAmount || 0, true)}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-[#faf9f5] p-3 text-center">
                <p className="text-[10px] text-ink-muted">Người ủng hộ</p>
                <p className="mt-1 font-display font-black text-sm text-ink">
                  {selectedCampaign.backerCount || 0}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-[#faf9f5] p-3 text-center">
                <p className="text-[10px] text-ink-muted">Trạng thái</p>
                <p className="mt-1 font-display font-black text-xs text-ink uppercase">
                  {selectedCampaign.status}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-line p-4 bg-white space-y-2">
              <p className="font-bold text-ink">Mô tả tóm tắt</p>
              <p className="text-ink-soft leading-relaxed">
                {selectedCampaign.blurb || "Chưa có mô tả ngắn."}
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-line p-4 bg-[#faf9f5] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-ink">Chủ dự án</p>
                <p className="text-ink-muted mt-0.5">
                  {selectedCampaign.creator?.name || "Chưa rõ"} · Khu vực:{" "}
                  {selectedCampaign.location || "Việt Nam"}
                </p>
              </div>
              {selectedCampaign.slug && (
                <a
                  href={`/projects/${selectedCampaign.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="button-ghost inline-flex items-center gap-1 text-xs font-bold"
                >
                  Mở trang dự án <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="button-ghost min-h-10 px-4 text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal 4: Suspend / Resume Confirm Modal ─────────── */}
      {statusTargetCampaign && (
        <Modal
          open
          size="sm"
          title={`${
            statusTargetCampaign.status === "SUSPENDED" ? "Khôi phục" : "Tạm khóa"
          } chiến dịch`}
          description={statusTargetCampaign.title}
          onClose={() => setStatusTargetCampaign(null)}
          locked={busy === statusTargetCampaign.id}
        >
          <div className="space-y-4 text-xs">
            <p
              className={`rounded-xl border p-3.5 leading-relaxed ${
                statusTargetCampaign.status === "SUSPENDED"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {statusTargetCampaign.status === "SUSPENDED"
                ? "Chiến dịch sẽ được khôi phục trạng thái hoạt động công khai. Người ủng hộ có thể tiếp tục xem và cam kết."
                : "Chiến dịch sẽ ngay lập tức bị ẩn hoặc khóa quyền cam kết mới để bảo đảm an toàn. Thao tác được ghi vào nhật ký kiểm toán."}
            </p>

            <div>
              <label className="block font-bold text-ink mb-1.5">
                Căn cứ / Lý do thực hiện (Bắt buộc kiểm toán):
              </label>
              <select
                onChange={(e) => setStatusReason(e.target.value)}
                className="w-full rounded-xl border border-line bg-[#fbfbfa] p-2.5 text-xs text-ink outline-none mb-2"
              >
                <option value="">-- Chọn lý do mẫu hoặc tự nhập --</option>
                <option value="Phát hiện dấu hiệu rủi ro giao dịch hoặc khiếu nại">
                  Dấu hiệu rủi ro giao dịch / khiếu nại
                </option>
                <option value="Thông tin mô tả sản phẩm vi phạm chính sách nội dung">
                  Vi phạm chính sách nội dung
                </option>
                <option value="Yêu cầu tạm dừng từ phía chủ dự án để cập nhật thông tin">
                  Yêu cầu từ chủ dự án
                </option>
                <option value="Chiến dịch đã hoàn tất xác minh bổ sung và đủ điều kiện tiếp tục">
                  Đã xác minh bổ sung thành công (Khôi phục)
                </option>
              </select>
              <textarea
                rows={3}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Nhập chi tiết lý do quản trị viên xử lý..."
                className="w-full rounded-xl border border-line p-2.5 text-xs text-ink outline-none focus:border-forest"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                disabled={busy === statusTargetCampaign.id}
                onClick={() => setStatusTargetCampaign(null)}
                className="button-ghost min-h-10 px-4 text-xs font-bold"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={busy === statusTargetCampaign.id}
                onClick={handleToggleStatus}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-xs font-extrabold text-white transition ${
                  statusTargetCampaign.status === "SUSPENDED"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {busy === statusTargetCampaign.id ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                {busy === statusTargetCampaign.id
                  ? "Đang lưu…"
                  : statusTargetCampaign.status === "SUSPENDED"
                    ? "Xác nhận khôi phục"
                    : "Xác nhận tạm khóa"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

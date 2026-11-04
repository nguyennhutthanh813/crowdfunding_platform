"use client";

import {
  BadgeDollarSign,
  Ban,
  ChevronRight,
  History,
  LoaderCircle,
  Save,
  Settings2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import type { AdminDashboardData } from "@/lib/api";
import {
  AdminNotice,
  AdminPageHeader,
  InlineActionConfirm,
  adminRequestError,
  callAdminAction,
} from "./admin-shared";

export function SettingsWorkspace({ data }: { data: AdminDashboardData }) {
  const initialFee = (data.operations.platformFeePercent ?? 5).toFixed(1);
  const managedCampaign = data.operations.managedCampaign;
  const [fee, setFee] = useState(initialFee);
  const [savedFee, setSavedFee] = useState(initialFee);
  const [campaignSuspended, setCampaignSuspended] = useState(
    managedCampaign?.status === "SUSPENDED",
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [campaignConfirming, setCampaignConfirming] = useState(false);
  const [audit, setAudit] = useState([
    "06/09 14:20 · adm_01 duyệt ORBIT One",
    "05/09 09:10 · hệ thống tạo cảnh báo FRA-001",
  ]);

  const feeNumber = Number(fee);
  const feeInvalid =
    fee.trim() === "" ||
    !Number.isFinite(feeNumber) ||
    feeNumber < 0 ||
    feeNumber > 20;

  const saveFee = async () => {
    if (feeInvalid) {
      setNotice("Mức phí cần nằm trong khoảng từ 0% đến 20%.");
      return;
    }
    setBusy("fee");
    setNotice(null);
    try {
      await callAdminAction("UPDATE_PLATFORM_FEE", {
        percent: Number(fee),
        appliesTo: "NEW_CAMPAIGNS",
      });
      setSavedFee(fee);
      setAudit((rows) => [`Vừa xong · cập nhật phí ${fee}%`, ...rows]);
      setNotice("Đã lưu mức phí mới thành công.");
    } catch (error) {
      setNotice(
        adminRequestError(
          error,
          "Chưa thể lưu mức phí. Bạn vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const toggleCampaign = async () => {
    if (!reason.trim() || !managedCampaign) return;
    setBusy("campaign");
    setNotice(null);
    const next = !campaignSuspended;
    try {
      await callAdminAction("SET_CAMPAIGN_STATUS", {
        campaignId: managedCampaign.id,
        status: next ? "SUSPENDED" : "LIVE",
        reason,
      });
      setCampaignSuspended(next);
      setAudit((rows) => [
        `Vừa xong · ${next ? "khóa" : "mở"} ${managedCampaign.title}`,
        ...rows,
      ]);
      setReason("");
      setNotice(next ? "Đã khóa chiến dịch." : "Đã khôi phục chiến dịch.");
    } catch (error) {
      setNotice(
        adminRequestError(
          error,
          "Chưa thể cập nhật chiến dịch. Bạn vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(null);
      setCampaignConfirming(false);
    }
  };

  return (
    <section className="min-h-screen pb-20">
      <AdminPageHeader
        eyebrow="Cấu hình vận hành"
        title="Cấu hình & nhật ký"
        description="Thay đổi cấu hình có phản hồi rõ, lịch sử lưu vết chi tiết ai đã làm gì và vào thời điểm nào."
        icon={Settings2}
        snapshotAt={data.operations.snapshotAt}
      />

      <div className="container-shell pt-6 space-y-6">
        {notice && <AdminNotice message={notice} />}

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-2xl border border-line bg-white p-6 shadow-xs">
            <p className="eyebrow text-coral flex items-center gap-1.5 font-bold">
              <BadgeDollarSign className="size-4" /> Phí nền tảng
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold text-ink">
              Cấu hình phí nền tảng
            </h2>
            <p className="mt-2 text-xs leading-5 text-ink-muted">
              Chỉ chiến dịch tạo sau thời điểm hiệu lực nhận mức phí mới; chiến
              dịch cũ giữ nguyên mức phí đã chốt lúc tạo.
            </p>

            <label className="mt-6 block">
              <span className="text-xs font-bold text-ink-soft">
                Phần trăm phí nền tảng (%)
              </span>
              <div className="relative mt-2">
                <input
                  name="platform-fee-percent"
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  value={fee}
                  onChange={(event) => setFee(event.target.value)}
                  className="input-field pr-12 text-lg font-bold"
                  aria-invalid={feeInvalid}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-ink-muted">
                  %
                </span>
              </div>
            </label>

            <div className="mt-4 rounded-xl bg-[#f2f6e8] p-3 text-[11px] text-[#566c27]">
              Mức đang áp dụng: <strong>{savedFee}%</strong> · hiệu lực cho chiến
              dịch mới
            </div>

            {feeInvalid && (
              <p className="mt-2 text-xs font-semibold text-red-700">
                Nhập một số từ 0 đến 20. Có thể dùng một chữ số thập phân.
              </p>
            )}

            <button
              type="button"
              disabled={busy === "fee" || feeInvalid || fee === savedFee}
              onClick={() => void saveFee()}
              className="button-dark mt-5 inline-flex items-center gap-2"
            >
              {busy === "fee" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              <span>Lưu cấu hình phí</span>
            </button>
          </article>

          {managedCampaign && (
            <article className="rounded-2xl border border-line bg-white p-6 shadow-xs">
              <p className="eyebrow text-coral flex items-center gap-1.5 font-bold">
                <ShieldAlert className="size-4" /> Khóa khẩn cấp mẫu
              </p>
              <h2 className="mt-2 font-display text-2xl font-extrabold text-ink">
                Khóa hoặc khôi phục chiến dịch
              </h2>
              <p className="mt-1 text-xs text-ink-muted">
                Chỉ dùng khi có rủi ro rõ ràng. Mọi thao tác được ghi vào nhật ký kiểm toán.
              </p>
              <div className="mt-6 rounded-2xl border border-line p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-ink">
                      {managedCampaign.title}
                    </p>
                    <p className="mt-1 text-[10px] text-ink-muted">
                      Điểm rủi ro {managedCampaign.riskScore} ·{" "}
                      {managedCampaign.relatedAlerts} cảnh báo liên quan
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${
                      campaignSuspended
                        ? "bg-red-50 text-red-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {campaignSuspended ? "ĐÃ KHÓA" : "ĐANG HOẠT ĐỘNG"}
                  </span>
                </div>
                <label className="mt-4 block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Lý do bắt buộc
                  </span>
                  <textarea
                    name="campaign-status-reason"
                    value={reason}
                    onChange={(event) => {
                      setReason(event.target.value);
                      setCampaignConfirming(false);
                    }}
                    className="input-field mt-2 min-h-20 resize-y text-xs"
                    placeholder="Nêu căn cứ và phạm vi xử lý…"
                    required
                  />
                </label>
                <button
                  type="button"
                  disabled={!reason.trim() || busy === "campaign"}
                  onClick={() => setCampaignConfirming(true)}
                  className="button-secondary mt-3 inline-flex items-center gap-1.5"
                >
                  {busy === "campaign" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : campaignSuspended ? (
                    <ShieldCheck className="size-4" />
                  ) : (
                    <Ban className="size-4" />
                  )}
                  <span>
                    {campaignSuspended
                      ? "Khôi phục chiến dịch"
                      : "Khóa chiến dịch"}
                  </span>
                </button>
                <p className="mt-2 text-[10px] leading-4 text-ink-muted">
                  Hệ thống sẽ hỏi lại trước khi thay đổi trạng thái công khai.
                </p>
                {campaignConfirming && (
                  <InlineActionConfirm
                    title={
                      campaignSuspended
                        ? "Khôi phục chiến dịch này?"
                        : "Khóa chiến dịch này?"
                    }
                    detail={`Căn cứ sẽ lưu vào nhật ký: “${reason.trim()}”`}
                    confirmLabel={
                      campaignSuspended
                        ? "Xác nhận khôi phục"
                        : "Xác nhận khóa"
                    }
                    danger={!campaignSuspended}
                    busy={busy === "campaign"}
                    onConfirm={() => void toggleCampaign()}
                    onCancel={() => setCampaignConfirming(false)}
                  />
                )}
              </div>
            </article>
          )}

          <article className="rounded-2xl bg-forest p-6 text-white shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow text-lime flex items-center gap-1.5 font-bold">
                  <History className="size-4" /> Nhật ký hệ thống
                </p>
                <h2 className="mt-2 font-display text-xl font-extrabold text-white">
                  Thao tác quản trị gần nhất
                </h2>
              </div>
              <ChevronRight className="size-5 text-white/35" />
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {audit.slice(0, 4).map((entry) => (
                <div
                  key={entry}
                  className="rounded-xl border border-white/8 bg-white/6 px-4 py-3 text-[11px] text-white/70"
                >
                  {entry}
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}


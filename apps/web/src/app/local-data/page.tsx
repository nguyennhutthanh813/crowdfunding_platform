import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Database, GitBranch, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ResetLocalData } from "@/components/local-db/reset-local-data";
import { LocalCampaignBrowser } from "@/components/local-db/local-campaign-browser";
import { getServerSession } from "@/lib/auth/server-session";
import { inspectLocalDatabase, localDbEnabled } from "@/lib/local-db/database";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dữ liệu thử trên máy" };

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "—";
}

const statusLabels: Record<string, string> = {
  DRAFT: "Bản nháp", IN_REVIEW: "Đang xét duyệt", PRE_LAUNCH: "Đã duyệt, chưa mở",
  LIVE: "Đang gọi vốn", APPROVED: "Đã duyệt", CHANGES: "Cần bổ sung",
  REJECTED: "Từ chối", PENDING: "Chờ xét duyệt", AUTHORIZED: "Đã ghi cam kết mẫu",
};

function status(value: unknown) {
  const raw = text(value);
  return statusLabels[raw] ?? raw;
}

function date(value: unknown) {
  if (typeof value !== "string") return "Chưa có thao tác mới";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export default async function LocalDataPage() {
  if (!localDbEnabled()) notFound();
  const session = await getServerSession();
  if (!session?.user.roles.includes("ADMIN")) redirect("/auth");
  const db = inspectLocalDatabase();
  const total = db.tables.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 text-[#14372d] sm:px-8 sm:py-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#a43d2c]"><Database className="size-4" /> Góc kiểm tra dữ liệu · chỉ trên máy nhóm</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Theo dấu dữ liệu chiến dịch</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#53645a]">
            Mỗi chiến dịch có chủ sở hữu, trạng thái, gói quà và các cam kết liên quan. Các thao tác mới
            được lưu trên máy nên đổi vai trò vẫn theo tiếp được. Đây là mô phỏng, không có thanh toán thật.
          </p>
        </div>
        <Link href="/admin" className="rounded-xl bg-[#15382e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#285546]">Về khu quản trị</Link>
      </div>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4" aria-label="Tình trạng dữ liệu">
        <div className="rounded-2xl border border-[#dce4d9] bg-white p-4 sm:p-5"><p className="text-sm text-[#607469]">Chiến dịch</p><p className="mt-1 text-2xl font-bold sm:text-3xl">{db.campaigns.length}</p><p className="mt-1 text-xs text-[#6e8174]">Một chủ có thể có nhiều hồ sơ</p></div>
        <div className="rounded-2xl border border-[#dce4d9] bg-white p-4 sm:p-5"><p className="text-sm text-[#607469]">Thao tác mới</p><p className="mt-1 text-2xl font-bold sm:text-3xl">{db.tables.find((item) => item.name === "campaign_events")?.count ?? 0}</p><p className="mt-1 text-xs text-[#6e8174]">Không tính lịch sử seed</p></div>
        <div className="col-span-2 rounded-2xl border border-[#dce4d9] bg-white p-4 sm:col-span-1 sm:p-5"><p className="flex items-center gap-2 text-sm text-[#607469]"><ShieldCheck className="size-4" /> Quan hệ khóa ngoại lỗi</p><p className={`mt-1 text-2xl font-bold sm:text-3xl ${db.foreignKeyErrors.length ? "text-rose-700" : "text-emerald-700"}`}>{db.foreignKeyErrors.length}</p><p className="mt-1 text-xs text-[#6e8174]">{db.tables.length} bảng dữ liệu · {total} bản ghi</p></div>
      </section>

      <section className="mb-8 rounded-[20px] border border-[#dce4d9] bg-white p-5 sm:p-6" aria-labelledby="campaign-index">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#54785b]"><GitBranch className="size-4" /> Đi theo mã chiến dịch</p><h2 id="campaign-index" className="mt-1 text-xl font-bold">Một hồ sơ, nhiều người cùng tiếp sức</h2></div>
          <p className="text-xs text-[#687d70]">Chọn chiến dịch để xem lộ trình và ai vừa thao tác</p>
        </div>
        <LocalCampaignBrowser campaigns={db.campaigns.map((row) => ({
          id: text(row.id), title: text(row.title), owner: text(row.owner),
          status: text(row.status), source: text(row.source),
          eventCount: Number(row.eventCount ?? 0),
          lastEventAt: typeof row.lastEventAt === "string" ? row.lastEventAt : null,
          memberCount: Number(row.memberCount ?? 0), rewardCount: Number(row.rewardCount ?? 0),
          reviewCount: Number(row.reviewCount ?? 0), pledgeCount: Number(row.pledgeCount ?? 0),
        }))} />
      </section>

      <section className="mb-8 rounded-[20px] border border-[#dce4d9] bg-white p-5 sm:p-6" aria-labelledby="recent-events">
        <h2 id="recent-events" className="text-xl font-bold">Vừa diễn ra trên máy</h2>
        {db.recentEvents.length ? <ol className="mt-4 space-y-0 border-l-2 border-[#cfdfcf] pl-5">{db.recentEvents.map((row) => (
          <li key={text(row.id)} className="relative pb-5 last:pb-0"><span className="absolute -left-[27px] top-1 size-3 rounded-full bg-[#477755] ring-2 ring-white" /><Link href={`/campaigns/${encodeURIComponent(text(row.campaignId))}/timeline`} className="text-sm font-bold hover:underline">{text(row.title)}</Link><p className="mt-1 text-xs text-[#64796a]">{text(row.actor)} · {text(row.campaignTitle)} · {date(row.createdAt)}</p></li>
        ))}</ol> : <p className="mt-3 rounded-xl bg-[#f7f8f3] p-4 text-sm text-[#607469]">Chưa có thao tác mới. Bạn có thể gửi một hồ sơ xét duyệt hoặc thử cam kết để thấy dòng hoạt động xuất hiện.</p>}
      </section>

      <section className="mb-8 rounded-[20px] border border-[#dce4d9] bg-white p-5 sm:p-6" aria-labelledby="recent-comments">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#54785b]">Cùng một chiến dịch, nhiều người trao đổi</p>
            <h2 id="recent-comments" className="mt-1 text-xl font-bold">Bình luận vừa thử</h2>
          </div>
          <p className="text-xs text-[#687d70]">Lượt thích ở đây chỉ tính phần phát sinh trên máy</p>
        </div>
        {db.recentComments.length ? <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {db.recentComments.map((row) => <li key={text(row.id)}
            className="min-w-0 rounded-xl border border-[#e3e9dd] bg-[#fafbf7] p-4">
            <p className="text-xs font-semibold text-[#5c755f]">
              {row.parentId ? "Trả lời" : "Bình luận mới"} · {text(row.author)}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#264437]">{text(row.body)}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#e3e9dd] pt-3 text-xs">
              <Link href={`/projects/${encodeURIComponent(text(row.campaignSlug))}?tab=comments#noi-dung-du-an`}
                className="font-semibold text-[#9b3e2d] underline-offset-2 hover:underline">
                {text(row.campaignTitle)} ↗
              </Link>
              <span className="text-[#607469]">{text(row.newLikes)} lượt thích mới</span>
            </div>
          </li>)}
        </ul> : <p className="mt-4 rounded-xl bg-[#f7f8f3] p-4 text-sm text-[#607469]">
          Chưa có bình luận mới. Đăng nhập tài khoản Người ủng hộ rồi viết ở tab Bình luận của một chiến dịch.
        </p>}
      </section>

      <section className="mb-8 rounded-[20px] border border-[#dce4d9] bg-white p-5 sm:p-6" aria-labelledby="question-assignments">
        <p className="text-xs font-bold uppercase tracking-wider text-[#54785b]">Câu hỏi → người phụ trách → phản hồi</p>
        <h2 id="question-assignments" className="mt-1 text-xl font-bold">Phân công câu hỏi trên máy</h2>
        <p className="mt-2 text-sm text-[#607469]">Mỗi dòng nối một câu hỏi với một cộng tác viên thuộc đúng chiến dịch. Sau khi trả lời, phản hồi vẫn xem được trên trang công khai.</p>
        {db.recentQuestionAssignments.length ? <ul className="mt-4 grid gap-3 md:grid-cols-2">{db.recentQuestionAssignments.map((row) => <li key={text(row.commentId)} className="rounded-xl border border-[#e3e9dd] bg-[#fafbf7] p-4">
          <p className="text-sm font-semibold text-[#264437]">{text(row.question)}</p>
          <p className="mt-2 text-xs text-[#607469]">Giao cho {text(row.assignee)} · {date(row.assignedAt)} · {row.readAt ? `Đã đọc ${date(row.readAt)}` : "Chưa đọc"}</p>
          <Link href={`/projects/${encodeURIComponent(text(row.campaignSlug))}?tab=comments#noi-dung-du-an`}
            className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[#9b3e2d] underline-offset-2 hover:underline">{text(row.campaignTitle)} ↗</Link>
        </li>)}</ul> : <p className="mt-4 rounded-xl bg-[#f7f8f3] p-4 text-sm text-[#607469]">Chưa có câu hỏi được giao. Hãy tạo một chiến dịch, mời cộng tác viên và nhận câu hỏi từ Người ủng hộ.</p>}
      </section>

      <section className="mb-8 rounded-[20px] border border-[#dce4d9] bg-white p-5 sm:p-6" aria-labelledby="campaign-media">
        <h2 id="campaign-media" className="text-xl font-bold">Ảnh minh họa gắn với hồ sơ mới</h2>
        <p className="mt-2 text-sm text-[#607469]">Ảnh được chọn trong bản nháp và nối bằng mã chiến dịch. Đây là tài nguyên demo, không phải bằng chứng đã làm ra sản phẩm.</p>
        {db.recentCampaignMedia.length ? <ul className="mt-4 grid gap-3 md:grid-cols-2">{db.recentCampaignMedia.map((row) => <li key={text(row.id)} className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-xl border border-[#e3e9dd] bg-[#fafbf7] p-3">
          <Image src={text(row.url)} alt={text(row.altText)} width={88} height={80} className="h-20 w-[88px] rounded-lg object-cover" />
          <div className="min-w-0"><Link href={`/campaigns/${encodeURIComponent(text(row.campaignId))}/timeline`} className="text-sm font-semibold text-[#264437] underline-offset-2 hover:underline">{text(row.campaignTitle)} ↗</Link>
            <p className="mt-1 text-xs leading-5 text-[#607469]">{status(row.campaignStatus)}</p></div>
          <div className="col-span-2 min-w-0 text-xs leading-5 text-[#607469]">
            <p>Mã hồ sơ: <code className="break-all">{text(row.campaignId)}</code></p>
            <p className="mt-1">{text(row.altText)}</p>
            <code className="mt-1 block break-all text-[11px] text-[#64796a]">{text(row.url)}</code>
          </div>
        </li>)}</ul> : <p className="mt-4 rounded-xl bg-[#f7f8f3] p-4 text-sm text-[#607469]">Chưa có hồ sơ nào chọn ảnh minh họa từ thư viện mẫu.</p>}
      </section>

      <section className="mb-8 rounded-2xl border border-[#dce4d9] bg-white p-5 sm:p-6">
        <h2 className="text-xl font-bold">Thử một vòng liên kết giữa các vai trò</h2>
        <ol className="mt-4 grid gap-3 text-sm leading-6 text-[#40564a] sm:grid-cols-2">
          <li><b>1. Chủ dự án:</b> đăng nhập Hoàng Linh, vào <Link className="underline" href="/creator/campaigns/new">Tạo chiến dịch mới</Link>, lưu nháp rồi gửi xét duyệt.</li>
          <li><b>2. Quản trị:</b> đổi sang Khánh An, mở <Link className="underline" href="/admin">hàng chờ</Link> và gửi yêu cầu sửa.</li>
          <li><b>3. Chủ dự án:</b> quay lại Hoàng Linh, xem trạng thái và góp ý ngay trên hồ sơ.</li>
          <li><b>4. Người ủng hộ:</b> đăng nhập Minh Anh, cam kết thử với ORBIT One; kiểm tra lại sổ ủng hộ và số liệu ở khu Chủ dự án.</li>
        </ol>
        <p className="mt-4 text-sm text-[#7a4a35]">File trên máy: <code>{db.file}</code>. Nên sao chép file này trước khi đặt lại nếu muốn giữ kịch bản thử.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-[#dce4d9] bg-white p-5 sm:p-6">
          <h2 className="text-xl font-bold">Cấu trúc đang lưu</h2>
          <p className="mt-2 text-xs leading-5 text-[#607469]">Mở danh sách khi cần đối chiếu với ERD. SQLite có thêm <code>local_meta</code> và <code>platform_state</code> để giữ phiên bản, trạng thái; hai bảng hạ tầng này không nằm trong danh sách dữ liệu bên dưới. PostgreSQL production chưa được nối.</p>
          <details className="mt-4"><summary className="min-h-11 cursor-pointer rounded-xl border border-[#dce4d9] px-4 py-3 text-sm font-bold">Xem {db.tables.length} bảng dữ liệu và số dòng</summary>
          <div className="mt-4 grid gap-x-5 gap-y-2 text-sm min-[430px]:grid-cols-2">
            {db.tables.map((item) => <div key={item.name} className="flex justify-between gap-2 border-b border-[#edf0e9] py-1"><code className="break-all text-xs">{item.name}</code><b>{item.count}</b></div>)}
          </div></details>
        </section>
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#dce4d9] bg-white p-5 sm:p-6">
            <h2 className="text-xl font-bold">Hồ sơ mới đã lưu</h2>
            {db.previewCampaigns.length ? <ul className="mt-3 space-y-3 text-sm">{db.previewCampaigns.map((row) =>
              <li key={text(row.id)} className="border-b border-[#edf0e9] pb-3"><b>{text(row.title)}</b><p className="text-[#607469]">{text(row.owner)} · {status(row.status)} · {Number(row.goalAmount ?? 0).toLocaleString("vi-VN")} đ</p></li>)}</ul>
              : <p className="mt-3 text-sm text-[#607469]">Chưa có hồ sơ mới. Bạn có thể tạo từ khu Chủ dự án.</p>}
          </section>
          <section className="rounded-2xl border border-[#dce4d9] bg-white p-5 sm:p-6">
            <h2 className="text-xl font-bold">Xét duyệt và cam kết vừa thử</h2>
            {db.recentReviews.length ? <ul className="mt-3 space-y-2 text-sm">{db.recentReviews.map((row) => <li key={text(row.id)}><b>{text(row.title)}</b> · {status(row.decision)}{row.feedback ? <p className="text-[#607469]">{text(row.feedback)}</p> : null}</li>)}</ul>
              : <p className="mt-3 text-sm text-[#607469]">Chưa có hồ sơ mới được gửi duyệt.</p>}
            {db.recentPledges.length ? <ul className="mt-4 space-y-2 border-t border-[#edf0e9] pt-3 text-sm">{db.recentPledges.map((row) => <li key={text(row.id)}>{text(row.backer)} → {text(row.title)} · <b>{Number(row.amount ?? 0).toLocaleString("vi-VN")} đ</b></li>)}</ul>
              : <p className="mt-3 text-sm text-[#607469]">Chưa có cam kết mới.</p>}
          </section>
          <section className="rounded-2xl border border-[#ebd3cf] bg-[#fffaf8] p-5 sm:p-6">
            <h2 className="text-lg font-bold">Làm lại từ đầu</h2>
            <p className="my-3 text-sm text-[#6b5a54]">Chỉ xóa phần bạn đã thao tác trong bản local; dữ liệu mẫu ban đầu không bị xóa.</p>
            <ResetLocalData />
          </section>
        </div>
      </div>
    </div>
  );
}

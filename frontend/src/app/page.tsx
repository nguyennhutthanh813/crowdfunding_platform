import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Brain, CalendarClock, CreditCard, HandCoins, MessageSquareHeart, Rocket, ShieldCheck, Sparkles, Target, TrendingUp } from "lucide-react";
import { getViewer } from "@/server/auth/session";
import { getHomeFeed, listPublicProjects } from "@/server/queries/projects";
import { ProjectCard } from "@/components/project/project-card";
import { LiveTicker } from "@/components/project/live-ticker";
import { Aurora, CountUp, Magnetic, Reveal, TiltCard } from "@/components/fx/motion";
import { Gauge } from "@/components/fx/gauge";
import { ParticleField } from "@/components/fx/particles";
import { ButtonLink } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/layout-bits";

export default async function HomePage() {
  const [viewer, home, endingRes] = await Promise.all([
    getViewer(),
    getHomeFeed(),
    listPublicProjects({ status: "LIVE", sort: "ending", limit: 4 }),
  ]);
  const { stats, categories, trending, upcoming, recent: ticker, saved } = home;
  const ending = endingRes.rows;
  const successRate = stats.ended ? Math.round((stats.success / stats.ended) * 100) : 0;

  return (
    <div>
      {/* ───────── HERO ───────── */}
      <section className="relative isolate mx-auto max-w-[1600px] overflow-hidden bg-[#0b0918] text-white sm:mx-3 sm:rounded-[2rem]">
        <Aurora />
        <ParticleField />
        <div className="grid-bg absolute inset-0 opacity-30 [--line:rgba(255,255,255,0.06)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-violet-200 backdrop-blur">
                <Sparkles className="size-3.5 text-amber-300" /> Gọi vốn cộng đồng · có AI dự đoán thành công
              </span>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-5 text-4xl font-black leading-[1.08] tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Biến ý tưởng Việt thành <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-emerald-300 bg-clip-text text-transparent">hiện thực</span> — cùng cộng đồng.
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-5 max-w-xl text-base text-violet-100/80 sm:text-lg">
                Góp vốn cho dự án bạn tin, nhận lại chính sản phẩm khi dự án thành công. <b className="text-white">Không đạt mục tiêu — không mất một đồng.</b>
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Magnetic><ButtonLink href="/explore" size="lg">Khám phá dự án <ArrowRight className="size-5" /></ButtonLink></Magnetic>
                <Magnetic><ButtonLink href={viewer ? "/studio/new" : "/register?next=/studio/new"} size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                  <Rocket className="size-5" /> Bắt đầu dự án
                </ButtonLink></Magnetic>
              </div>
            </Reveal>
            <Reveal delay={0.32}>
              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
                {[
                  { k: "Đã được góp", v: <CountUp value={stats.raised} format="compact" />, s: "VND" },
                  { k: "Người ủng hộ", v: <CountUp value={stats.backers} />, s: "lượt tham gia" },
                  { k: "Tỉ lệ thành công", v: <CountUp value={successRate} format="percent" />, s: `${stats.success} dự án` },
                ].map((x) => (
                  <div key={x.k} className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                    <dt className="text-[11px] font-medium text-violet-200/70">{x.k}</dt>
                    <dd className="mt-1 text-xl font-black sm:text-2xl">{x.v}</dd>
                    <dd className="text-[11px] text-violet-200/60">{x.s}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
          <Reveal delay={0.2} className="relative">
            <div className="absolute inset-8 rounded-full bg-violet-500/30 blur-3xl" />
            <TiltCard max={6} className="rounded-[2rem]">
              <Image src="/v3/brand/hero.webp" alt="Tên lửa đồng xu bay lên từ hộp quà — minh hoạ gọi vốn cộng đồng" width={1376} height={768} priority
                className="relative animate-float rounded-[2rem] border border-white/10 shadow-[0_40px_120px_-30px_rgba(124,92,255,0.7)]" />
            </TiltCard>
          </Reveal>
        </div>
      </section>

      <LiveTicker items={ticker} />

      <div className="mx-auto max-w-7xl space-y-20 px-4 pt-14 sm:px-6">
        {/* ───────── THỂ LOẠI ───────── */}
        <section>
          <SectionTitle title="Khám phá theo thể loại" description="Từ nghệ thuật, truyện tranh đến công nghệ — chọn lĩnh vực bạn yêu thích." />
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-8">
            {categories.map((c, i) => (
              <Reveal key={c.id} delay={i * 0.04} className="snap-start">
                <Link href={`/explore?category=${c.slug}`} className="group card flex w-32 flex-col items-center gap-2 p-3 text-center transition hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(109,74,255,0.5)] sm:w-auto">
                  <div className="relative size-20 overflow-hidden rounded-2xl" style={{ background: `${c.color}14` }}>
                    {c.image_url && <Image src={c.image_url} alt="" fill sizes="80px" className="object-cover transition duration-500 group-hover:scale-110" />}
                  </div>
                  <div className="text-sm font-bold leading-tight">{c.name}</div>
                  <div className="text-[11px] text-muted">{c.live_count} đang chạy</div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ───────── ĐANG GỌI VỐN ───────── */}
        <section>
          <SectionTitle
            title={<span className="flex items-center gap-2"><TrendingUp className="size-5 text-emerald-500" /> Đang gọi vốn nổi bật</span>}
            description="Xếp theo số tiền nhận được trong 7 ngày gần nhất."
            action={<ButtonLink href="/explore" variant="ghost" size="sm">Xem tất cả <ArrowRight className="size-4" /></ButtonLink>}
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {trending.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 0.06}><ProjectCard p={p} saved={saved.has(p.id)} priority={i < 3} /></Reveal>
            ))}
          </div>
        </section>

        {/* ───────── SẮP MỞ & SẮP KẾT THÚC ───────── */}
        <section className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionTitle title={<span className="flex items-center gap-2"><CalendarClock className="size-5 text-sky-500" /> Sắp mở — xem trước</span>} description="Lưu lại để được báo ngay khi mở góp vốn." />
            <div className="grid gap-4 sm:grid-cols-2">
              {upcoming.map((p) => <ProjectCard key={p.id} p={p} saved={saved.has(p.id)} />)}
            </div>
          </div>
          <div>
            <SectionTitle title={<span className="flex items-center gap-2"><Target className="size-5 text-rose-500" /> Sắp kết thúc</span>} description="Những ngày cuối — mỗi lượt góp đều quyết định." />
            <div className="grid gap-4 sm:grid-cols-2">
              {ending.slice(0, upcoming.length > 2 ? 4 : 2).map((p) => <ProjectCard key={p.id} p={p} saved={saved.has(p.id)} />)}
            </div>
          </div>
        </section>

        {/* ───────── CÁCH HOẠT ĐỘNG ───────── */}
        <section id="how" className="scroll-mt-24">
          <div className="card relative overflow-hidden p-6 sm:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-violet-500/15 blur-3xl" />
            <SectionTitle title="Cách hoạt động: Đạt mục tiêu mới thu tiền" description="Minh bạch cho cả người góp vốn lẫn người tạo dự án." />
            <ol className="relative grid gap-6 md:grid-cols-4">
              <div className="absolute left-0 right-0 top-7 hidden h-0.5 bg-gradient-to-r from-violet-500 via-sky-500 to-emerald-500 md:block" />
              {[
                { icon: HandCoins, t: "Chọn mức quà", d: "Chọn mức ủng hộ (hoặc góp không nhận quà), thêm quà kèm, nhập địa chỉ giao trong nước." },
                { icon: CreditCard, t: "Giữ chỗ, chưa trừ tiền", d: "Nhập thẻ — hệ thống chỉ giữ chỗ. Bạn có thể đổi / huỷ trước khi chiến dịch kết thúc." },
                { icon: ShieldCheck, t: "Chốt khi hết hạn", d: "Đạt mục tiêu → trừ tiền tự động. Không đạt → giải phóng, không ai mất tiền." },
                { icon: BadgeCheck, t: "Nhận quà & cập nhật", d: "Chủ dự án đăng cập nhật tiến độ, giao quà và cập nhật mã vận đơn cho bạn." },
              ].map((s, i) => (
                <Reveal key={s.t} delay={i * 0.1} className="relative">
                  <div className="relative z-10 grid size-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-[0_10px_30px_-10px_rgba(109,74,255,0.8)]"><s.icon className="size-6" /></div>
                  <div className="mt-4 text-xs font-bold text-violet-600 dark:text-violet-400">Bước {i + 1}</div>
                  <h3 className="mt-1 font-bold">{s.t}</h3>
                  <p className="mt-1 text-sm text-muted">{s.d}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ───────── AI ───────── */}
        <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#0f0c22] p-6 text-white sm:p-10">
          <Aurora className="opacity-70" />
          <div className="relative grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold"><Brain className="size-3.5" /> FundViet AI</span>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Biết trước khả năng thành công — trước cả khi mở chiến dịch.</h2>
              <ul className="mt-6 space-y-4 text-violet-100/85">
                <li className="flex gap-3"><TrendingUp className="mt-0.5 size-5 shrink-0 text-emerald-300" /><span><b className="text-white">Dự đoán % thành công</b> từ mục tiêu, thời lượng, mức quà, nội dung và tốc độ gọi vốn theo từng ngày.</span></li>
                <li className="flex gap-3"><Sparkles className="mt-0.5 size-5 shrink-0 text-amber-300" /><span><b className="text-white">Gợi ý điều chỉnh</b> kèm mức % cải thiện ước tính — biết sửa gì trước.</span></li>
                <li className="flex gap-3"><MessageSquareHeart className="mt-0.5 size-5 shrink-0 text-pink-300" /><span><b className="text-white">Lọc góp ý cộng đồng</b>: tự phân loại câu hỏi, góp ý, vấn đề và soạn sẵn câu trả lời.</span></li>
              </ul>
            </div>
            <div className="relative flex justify-center">
              <Image src="/v3/brand/ai-orb.webp" alt="" width={420} height={420} className="animate-float rounded-[2rem] opacity-90" />
              <div className="glass absolute bottom-2 left-1/2 w-64 -translate-x-1/2 rounded-3xl border border-white/10 p-4 text-fg">
                <Gauge value={78} size={210} />
              </div>
            </div>
          </div>
        </section>

        {/* ───────── CTA ───────── */}
        <section className="text-center">
          <Reveal>
            <Image src="/v3/brand/launch.webp" alt="" width={160} height={160} className="mx-auto animate-float rounded-3xl" />
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Ý tưởng của bạn xứng đáng được bắt đầu.</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">Wizard 5 bước, AI chấm điểm trước khi gửi duyệt, đặt ngày mở và trang xem trước cho cộng đồng.</p>
            <div className="mt-6 flex justify-center gap-3">
              <ButtonLink href={viewer ? "/studio/new" : "/register?next=/studio/new"} size="lg"><Rocket className="size-5" /> Tạo dự án ngay</ButtonLink>
            </div>
          </Reveal>
        </section>
      </div>
    </div>
  );
}

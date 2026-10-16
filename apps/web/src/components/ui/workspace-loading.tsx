import {
  HeartHandshake,
  Rocket,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

const variants = {
  backer: {
    icon: HeartHandshake,
    eyebrow: "Không gian Người ủng hộ",
    title: "Đang mở sổ cam kết của bạn…",
    shell: "bg-[#fbf4e8]",
    iconBox: "bg-[#ffe3bc] text-[#8b542e]",
  },
  creator: {
    icon: Rocket,
    eyebrow: "Không gian Chủ dự án",
    title: "Đang tổng hợp nhịp chiến dịch…",
    shell: "bg-[#edf1e4]",
    iconBox: "bg-forest text-lime",
  },
  collaborator: {
    icon: UsersRound,
    eyebrow: "Không gian Cộng tác viên",
    title: "Đang lấy danh sách việc được giao…",
    shell: "bg-[#edf6fb]",
    iconBox: "bg-[#28658f] text-white",
  },
  admin: {
    icon: ShieldCheck,
    eyebrow: "Không gian Quản trị viên",
    title: "Đang chốt dữ liệu ca vận hành…",
    shell: "bg-[#20232c] text-white",
    iconBox: "bg-white/10 text-lime",
  },
} as const;

export function WorkspaceLoading({
  role,
}: {
  role: keyof typeof variants;
}) {
  const config = variants[role];
  const Icon = config.icon;
  const dark = role === "admin";

  return (
    <section
      className={`min-h-[75vh] border-b border-line py-10 sm:py-14 ${config.shell}`}
      aria-label={config.title}
      aria-live="polite"
    >
      <div className="container-shell">
        <div className="flex items-center gap-3">
          <span
            className={`grid size-11 place-items-center rounded-xl ${config.iconBox}`}
          >
            <Icon className="size-5" />
          </span>
          <div>
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.14em] ${dark ? "text-lime" : "text-coral-dark"}`}
            >
              {config.eyebrow}
            </p>
            <h1 className="mt-1 font-display text-xl font-extrabold sm:text-2xl">
              {config.title}
            </h1>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className={`h-24 rounded-2xl ${dark ? "bg-white/7" : "shimmer-line"}`}
            />
          ))}
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div
            className={`h-80 rounded-[22px] ${dark ? "bg-white/7" : "shimmer-line"}`}
          />
          <div
            className={`h-80 rounded-[22px] ${dark ? "bg-white/7" : "shimmer-line"}`}
          />
        </div>
      </div>
    </section>
  );
}

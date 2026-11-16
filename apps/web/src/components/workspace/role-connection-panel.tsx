import {
  ArrowRight,
  BadgeCheck,
  CircleDashed,
  Database,
  HandCoins,
  ShieldCheck,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { UserRole } from "@/lib/api/contracts";

export type RoleConnectionStep = {
  actor: string;
  title: string;
  detail: string;
  kind: "person" | "money" | "team" | "admin" | "system" | "campaign";
  state: "done" | "current" | "next";
};

type RoleConnectionPanelProps = {
  role: UserRole;
  eyebrow: string;
  title: string;
  description: string;
  recordCode: string;
  steps: RoleConnectionStep[];
  action: { label: string; href: string };
};

const stepIcons: Record<RoleConnectionStep["kind"], LucideIcon> = {
  person: UserRound,
  money: HandCoins,
  team: UsersRound,
  admin: ShieldCheck,
  system: Database,
  campaign: BadgeCheck,
};

const theme = {
  BACKER: {
    shell:
      "border-emerald-200 bg-surface text-ink shadow-card",
    eyebrow: "text-[#047857]",
    muted: "text-ink-soft",
    record: "border-emerald-200 bg-[#ECFDF5] text-[#047857]",
    item: "border-line bg-canvas-soft",
    done: "bg-emerald-100 text-[#047857]",
    current: "bg-[#047857] text-white",
    next: "bg-slate-100 text-slate-600",
    action: "text-[#047857] hover:text-[#065F46]",
    line: "text-emerald-400",
  },
  CREATOR: {
    shell:
      "border-[#065F46] bg-[#064E3B] text-white shadow-card",
    eyebrow: "text-[#A7F3D0]",
    muted: "text-white/75",
    record: "border-white/15 bg-white/10 text-[#A7F3D0]",
    item: "border-white/10 bg-white/5",
    done: "bg-[#A7F3D0] text-[#064E3B]",
    current: "bg-[#7C3AED] text-white",
    next: "bg-white/10 text-white/75",
    action: "text-[#A7F3D0] hover:text-white",
    line: "text-white/45",
  },
  COLLABORATOR: {
    shell:
      "border-sky-200 bg-surface text-ink shadow-card",
    eyebrow: "text-[#0284C7]",
    muted: "text-ink-soft",
    record: "border-sky-200 bg-sky-50 text-[#0284C7]",
    item: "border-line bg-canvas-soft",
    done: "bg-sky-100 text-[#0284C7]",
    current: "bg-[#047857] text-white",
    next: "bg-slate-100 text-slate-600",
    action: "text-[#0284C7] hover:text-[#047857]",
    line: "text-sky-400",
  },
  ADMIN: {
    shell:
      "border-slate-800 bg-[#0F172A] text-white shadow-card",
    eyebrow: "text-rose-300",
    muted: "text-slate-300",
    record: "border-white/12 bg-white/8 text-rose-200",
    item: "border-white/10 bg-white/5",
    done: "bg-slate-700 text-white",
    current: "bg-[#E11D48] text-white",
    next: "bg-white/8 text-slate-300",
    action: "text-rose-300 hover:text-white",
    line: "text-slate-500",
  },
} satisfies Record<
  UserRole,
  Record<
    | "shell"
    | "eyebrow"
    | "muted"
    | "record"
    | "item"
    | "done"
    | "current"
    | "next"
    | "action"
    | "line",
    string
  >
>;

const stateLabels: Record<RoleConnectionStep["state"], string> = {
  done: "Đã qua",
  current: "Đang diễn ra",
  next: "Bước kế tiếp",
};

export function RoleConnectionPanel({
  role,
  eyebrow,
  title,
  description,
  recordCode,
  steps,
  action,
}: RoleConnectionPanelProps) {
  const styles = theme[role];
  const headingId = `role-connection-${role.toLocaleLowerCase()}`;

  return (
    <section
      aria-labelledby={headingId}
      className={`overflow-hidden rounded-[20px] border ${styles.shell}`}
    >
      <div className="flex flex-col justify-between gap-4 border-b border-current/10 p-5 sm:flex-row sm:items-end sm:p-6">
        <div className="max-w-3xl">
          <p className={`text-[11px] font-extrabold uppercase tracking-[0.1em] ${styles.eyebrow}`}>
            {eyebrow}
          </p>
          <h2
            id={headingId}
            className="mt-2 font-display text-xl font-extrabold tracking-[-0.035em] sm:text-2xl"
          >
            {title}
          </h2>
          <p className={`mt-2 text-xs leading-6 ${styles.muted}`}>
            {description}
          </p>
        </div>
        <span
          className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-[9px] border px-3 py-2 font-mono text-[11px] font-bold ${styles.record}`}
        >
          <CircleDashed className="size-3.5" /> {recordCode}
        </span>
      </div>

      <ol className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = stepIcons[step.kind];
          return (
            <li
              key={`${step.actor}-${step.title}`}
              className={`relative min-w-0 rounded-[14px] border p-4 ${styles.item}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-[9px] ${styles[step.state]}`}
                >
                  <Icon className="size-4" />
                </span>
                <span className={`flex items-center gap-2 text-[11px] font-bold ${styles.muted}`}>
                  {stateLabels[step.state]}
                  {index < steps.length - 1 ? (
                    <ArrowRight className={`size-3.5 ${styles.line}`} />
                  ) : null}
                </span>
              </div>
              <p className={`mt-4 text-[11px] font-extrabold uppercase tracking-[0.08em] ${styles.muted}`}>
                {step.actor}
              </p>
              <p className="mt-1 text-sm font-extrabold leading-5">
                {step.title}
              </p>
              <p className={`mt-2 text-xs leading-5 ${styles.muted}`}>
                {step.detail}
              </p>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col justify-between gap-2 border-t border-current/10 px-5 py-3 text-[11px] sm:flex-row sm:items-center sm:px-6">
        <p className={styles.muted}>
          Cùng một hồ sơ được chuyển tiếp giữa các vai trò, không phải nhập lại thông tin.
        </p>
        <Link
          href={action.href}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 font-extrabold ${styles.action}`}
        >
          {action.label} <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}

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
      "border-[#dfc19f] bg-[#fffaf2] text-[#3f2a22] shadow-[0_12px_32px_rgba(104,66,44,0.06)]",
    eyebrow: "text-[#9b5d3e]",
    muted: "text-[#856f64]",
    record: "border-[#dfc19f] bg-white text-[#7b4d37]",
    item: "border-[#ead7c2] bg-white",
    done: "bg-[#f2dfc8] text-[#734a35]",
    current: "bg-[#a83f2a] text-white",
    next: "bg-[#f1eee8] text-[#5f5751]",
    action: "text-[#8c4b32] hover:text-[#bd4c31]",
    line: "text-[#c79b71]",
  },
  CREATOR: {
    shell:
      "border-[#294b40] bg-[#15352b] text-white shadow-[0_16px_38px_rgba(14,42,33,0.12)]",
    eyebrow: "text-lime",
    muted: "text-white/72",
    record: "border-white/12 bg-white/7 text-[#e6f3b7]",
    item: "border-white/10 bg-white/6",
    done: "bg-[#d7eb73] text-forest",
    current: "bg-[#f5a07c] text-[#4d2117]",
    next: "bg-white/9 text-white/72",
    action: "text-lime hover:text-white",
    line: "text-white/45",
  },
  COLLABORATOR: {
    shell:
      "border-[#b8d4eb] bg-[#edf6fd] text-[#173958] shadow-[0_14px_34px_rgba(23,61,101,0.07)]",
    eyebrow: "text-[#2869ac]",
    muted: "text-[#526f89]",
    record: "border-[#bad5ea] bg-white text-[#315f89]",
    item: "border-[#c9deee] bg-white",
    done: "bg-[#cfeafa] text-[#174d75]",
    current: "bg-[#173d65] text-white",
    next: "bg-[#e5eef5] text-[#4b6378]",
    action: "text-[#1e6092] hover:text-[#173958]",
    line: "text-[#86b8da]",
  },
  ADMIN: {
    shell:
      "border-[#343741] bg-[#20232c] text-white shadow-[0_16px_38px_rgba(20,22,28,0.13)]",
    eyebrow: "text-[#ff9da2]",
    muted: "text-white/70",
    record: "border-white/10 bg-white/6 text-white/78",
    item: "border-white/8 bg-white/5",
    done: "bg-[#454a57] text-white",
    current: "bg-[#bd3038] text-white",
    next: "bg-white/7 text-white/72",
    action: "text-[#ffadb1] hover:text-white",
    line: "text-white/48",
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
          <p className={`text-[10px] font-extrabold uppercase tracking-[0.12em] ${styles.eyebrow}`}>
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
          className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-[9px] border px-3 py-2 font-mono text-[9px] font-bold ${styles.record}`}
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
                <span className={`flex items-center gap-2 text-[9px] font-bold ${styles.muted}`}>
                  {stateLabels[step.state]}
                  {index < steps.length - 1 ? (
                    <ArrowRight className={`size-3.5 ${styles.line}`} />
                  ) : null}
                </span>
              </div>
              <p className={`mt-4 text-[9px] font-extrabold uppercase tracking-[0.1em] ${styles.muted}`}>
                {step.actor}
              </p>
              <p className="mt-1 text-sm font-extrabold leading-5">
                {step.title}
              </p>
              <p className={`mt-2 text-[11px] leading-5 ${styles.muted}`}>
                {step.detail}
              </p>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col justify-between gap-2 border-t border-current/10 px-5 py-3 text-[10px] sm:flex-row sm:items-center sm:px-6">
        <p className={styles.muted}>
          Cùng một mã dữ liệu được đối chiếu ở các không gian, không nhập lại số bằng tay.
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

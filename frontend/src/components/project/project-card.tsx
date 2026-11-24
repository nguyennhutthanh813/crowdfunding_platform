import Image from "next/image";
import Link from "next/link";
import { Clock, Users } from "lucide-react";
import type { ProjectCardData } from "@/server/queries/projects";
import { TiltCard } from "@/components/fx/motion";
import { FundingBar } from "@/components/ui/funding-bar";
import { Avatar, ProjectStatusBadge } from "@/components/ui/primitives";
import { SaveButton } from "./social-buttons";
import { cn, formatCompactVnd, formatDate, percentOf, timeLeft } from "@/lib/utils";

export function ProjectCard({ p, saved = false, showSave = true, priority, className }: { p: ProjectCardData; saved?: boolean; showSave?: boolean; priority?: boolean; className?: string }) {
  const pct = percentOf(p.pledged_amount, p.goal_amount);
  const left = timeLeft(p.end_at);
  const scheduled = p.status === "SCHEDULED";
  const ended = ["SUCCESS", "FAILED", "FULFILLING", "COMPLETED"].includes(p.status);
  return (
    <TiltCard className={cn("group h-full rounded-[1.25rem]", className)} max={5}>
      <Link href={`/p/${p.slug}`} className="card flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-[0_24px_60px_-24px_rgba(109,74,255,0.45)]">
        <div className="relative aspect-[16/10] overflow-hidden">
          {p.cover_url && (
            <Image src={p.cover_url} alt={p.title} fill priority={priority} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 group-hover:scale-110" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
          <div className="absolute left-3 top-3 flex items-center gap-1.5">
            <span className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-sm" style={{ background: p.category_color }}>{p.category_name}</span>
          </div>
          {showSave && <div className="absolute right-3 top-3"><SaveButton projectId={p.id} saved={saved} /></div>}
          {(scheduled || ended || p.status === "LIVE") && (
            <div className="absolute bottom-3 left-3">
              <ProjectStatusBadge
                status={p.status}
                className="bg-surface/95 shadow-sm ring-1 ring-black/10 backdrop-blur-md"
              />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Avatar name={p.creator_name} src={p.creator_avatar} size={22} />
            <span className="truncate font-medium">{p.creator_name}</span>
          </div>
          <div>
            <h3 className="line-clamp-2 font-bold leading-snug tracking-tight transition-colors group-hover:text-violet-600 dark:group-hover:text-violet-400">{p.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{p.blurb}</p>
          </div>
          <div className="mt-auto space-y-2.5">
            {scheduled ? (
              <div className="rounded-xl bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-700 dark:text-sky-300">
                Mở góp vốn ngày {formatDate(p.start_at)}
              </div>
            ) : (
              <>
                <FundingBar percent={pct} size="sm" />
                <div className="flex items-end justify-between gap-2 text-sm">
                  <div>
                    <div className="font-extrabold text-emerald-600 dark:text-emerald-400">{formatCompactVnd(p.pledged_amount)}</div>
                    <div className="text-[11px] text-muted">{pct}% của {formatCompactVnd(p.goal_amount)}</div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1"><Users className="size-3.5" />{p.backers_count}</span>
                    <span className="flex items-center gap-1"><Clock className="size-3.5" />{ended ? "Đã kết thúc" : left.label.replace("Còn ", "")}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Link>
    </TiltCard>
  );
}

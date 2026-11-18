import { notFound, redirect } from "next/navigation";
import { requireViewer } from "@/server/auth/session";
import {
  checklistOf,
  getStudioProject,
  listCategoriesForStudio,
  listSections,
  livePrediction,
  reviewHistory,
  rewardsData,
  studioAccess,
} from "@/server/queries/studio";
import { WizardShell } from "@/components/studio/wizard";

export const metadata = { title: "Thiết lập dự án · Studio" };

export default async function StudioSetupPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const viewer = await requireViewer(`/studio/${slug}/setup`);
  if (viewer.systemRoles.includes("ADMIN")) redirect(`/admin/reviews/${slug}`);

  const project = getStudioProject(slug);
  if (!project) notFound();

  const access = studioAccess(viewer.id, project.id);
  if (!access.role) notFound();
  if (!access.perms.includes("project.edit")) redirect(`/studio/${slug}`);
  if (!["DRAFT", "REJECTED"].includes(project.status)) redirect(`/studio/${slug}`);

  const stepRaw = typeof sp.step === "string" ? Number(sp.step) : 1;
  const initialStep = Number.isFinite(stepRaw) ? Math.min(5, Math.max(1, Math.round(stepRaw))) : 1;

  const categories = listCategoriesForStudio();
  const sections = listSections(project.id);
  const rewards = rewardsData(project.id);
  const checklist = checklistOf(project.id);
  const prediction = livePrediction(project.id);
  const reviews = reviewHistory(project.id);

  return (
    <WizardShell
      mode="edit"
      categories={categories}
      initialStep={initialStep}
      project={project}
      sections={sections}
      tiers={rewards.tiers}
      addOns={rewards.addOns}
      checklist={checklist}
      prediction={prediction}
      latestReview={reviews[0] ?? null}
    />
  );
}

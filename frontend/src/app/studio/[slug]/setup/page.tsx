import { notFound, redirect } from "next/navigation";
import { requireViewer } from "@/server/auth/session";
import { getStudioSetupBundle } from "@/server/queries/studio";
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

  const bundle = await getStudioSetupBundle(slug);
  if (!bundle || !bundle.access.role) notFound();
  if (!bundle.access.perms.includes("project.edit")) redirect(`/studio/${slug}`);
  if (!["DRAFT", "REJECTED"].includes(bundle.project.status)) redirect(`/studio/${slug}`);

  const stepRaw = typeof sp.step === "string" ? Number(sp.step) : 1;
  const initialStep = Number.isFinite(stepRaw) ? Math.min(5, Math.max(1, Math.round(stepRaw))) : 1;

  const { project, categories, sections, rewards, checklist, prediction, reviews } = bundle;

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

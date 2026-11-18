import { requireSystemPerm } from "@/server/auth/session";
import { listCategoriesForStudio } from "@/server/queries/studio";
import { WizardShell } from "@/components/studio/wizard";

export const metadata = { title: "Tạo dự án mới · Studio" };

export default async function NewStudioProjectPage() {
  await requireSystemPerm("project.create", "/studio/new");
  const categories = await listCategoriesForStudio();

  return <WizardShell mode="create" categories={categories} initialStep={1} />;
}

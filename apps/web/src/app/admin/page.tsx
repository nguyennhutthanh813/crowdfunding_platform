import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;

  if (tab === "users") {
    redirect("/admin/users");
  }
  if (tab === "fraud") {
    redirect("/admin/fraud");
  }
  if (tab === "settings") {
    redirect("/admin/settings");
  }

  redirect("/admin/campaigns");
}

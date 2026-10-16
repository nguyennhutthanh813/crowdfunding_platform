import { RoleGate } from "@/components/auth/role-gate";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGate allowedRoles={["BACKER"]}>{children}</RoleGate>;
}

import { RoleGate } from "@/components/auth/role-gate";

export default function PledgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGate allowedRoles={["BACKER"]}>
      <div className="workspace-backer">{children}</div>
    </RoleGate>
  );
}

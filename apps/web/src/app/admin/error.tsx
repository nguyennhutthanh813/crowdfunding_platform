"use client";

import { WorkspaceError } from "@/components/ui/workspace-error";

export default function AdminError({ reset }: { reset: () => void }) {
  return <WorkspaceError role="admin" reset={reset} />;
}

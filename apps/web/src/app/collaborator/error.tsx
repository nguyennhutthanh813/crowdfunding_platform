"use client";

import { WorkspaceError } from "@/components/ui/workspace-error";

export default function CollaboratorError({ reset }: { reset: () => void }) {
  return <WorkspaceError role="collaborator" reset={reset} />;
}

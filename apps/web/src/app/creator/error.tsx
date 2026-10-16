"use client";

import { WorkspaceError } from "@/components/ui/workspace-error";

export default function CreatorError({ reset }: { reset: () => void }) {
  return <WorkspaceError role="creator" reset={reset} />;
}

"use client";

import { WorkspaceError } from "@/components/ui/workspace-error";

export default function BackerError({ reset }: { reset: () => void }) {
  return <WorkspaceError role="backer" reset={reset} />;
}

"use client";

import { useEffect } from "react";
import { WorkspaceError } from "@/components/ui/workspace-error";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin Workspace Error Boundary caught:", error);
  }, [error]);

  return <WorkspaceError role="admin" reset={reset} />;
}

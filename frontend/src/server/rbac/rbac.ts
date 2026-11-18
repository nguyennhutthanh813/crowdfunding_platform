export type ProjectRole = "CREATOR" | "COLLABORATOR";

export interface Viewer {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  status: "ACTIVE" | "LOCKED";
  systemRoles: string[];
  systemPerms: Set<string>;
}

export interface SerializedViewer {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  status: "ACTIVE" | "LOCKED";
  systemRoles: string[];
  systemPerms: string[];
}

export const PUBLIC_STATUSES = ["SCHEDULED", "LIVE", "SUCCESS", "FAILED", "FULFILLING", "COMPLETED"] as const;

export function deserializeViewer(raw: SerializedViewer | null | undefined): Viewer | null {
  if (!raw) return null;
  return {
    ...raw,
    systemPerms: new Set(raw.systemPerms ?? []),
  };
}

export function hasSystemPerm(viewer: Viewer | null, perm: string): boolean {
  return Boolean(viewer && viewer.status === "ACTIVE" && viewer.systemPerms.has(perm));
}

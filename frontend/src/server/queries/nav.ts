import "server-only";
import { cache } from "react";
import { apiGet } from "../api";

export interface NavContext {
  viewer: {
    id: string;
    name: string;
    username: string;
    email: string;
    avatar: string | null;
    isAdmin: boolean;
    isMember: boolean;
    creatorOf: number;
    collaboratorOf: number;
    backedCount: number;
  } | null;
  unread: number;
  unreadMessages?: number;
  notifications: {
    id: string;
    title: string;
    body: string;
    link: string | null;
    read_at: string | null;
    created_at: string;
    type: string;
  }[];
  searchIndex: { title: string; slug: string; category: string; status: string }[];
}

export const getNavContext = cache(async (): Promise<NavContext> => {
  const res = await apiGet<{ ok?: boolean; ctx?: NavContext }>("/nav");
  return (
    res.ctx ?? {
      viewer: null,
      unread: 0,
      unreadMessages: 0,
      notifications: [],
      searchIndex: [],
    }
  );
});

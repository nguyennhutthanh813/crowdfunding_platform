"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SessionResult, UserRole } from "@/lib/api";
import { clientRequest } from "@/lib/api/client-request";
import { roleDestinations } from "@/lib/auth/roles";
import { useAuthStore } from "@/store/auth-store";

type AuthStatus = "loading" | "guest" | "authenticated";

type AuthSyncMessage =
  | { type: "LOGOUT"; timestamp: number }
  | { type: "LOGIN"; session: SessionResult; timestamp: number }
  | { type: "SESSION_UPDATE"; session: SessionResult; timestamp: number };

const AUTH_CHANNEL_NAME = "gop_auth_channel";
const AUTH_STORAGE_KEY = "gop_auth_sync_event";

function isProtectedPath(path: string): boolean {
  return (
    path.startsWith("/creator") ||
    path.startsWith("/admin") ||
    path.startsWith("/account") ||
    path.startsWith("/onboarding") ||
    path.startsWith("/pledge")
  );
}

function broadcastAuthEvent(message: {
  type: "LOGOUT" | "LOGIN" | "SESSION_UPDATE";
  session?: SessionResult;
}) {
  if (typeof window === "undefined") return;

  const payload: AuthSyncMessage = {
    ...message,
    timestamp: Date.now(),
  } as AuthSyncMessage;

  // 1. BroadcastChannel API (hiện đại, hỗ trợ tất cả các tab đang mở)
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      channel.postMessage(payload);
      channel.close();
    }
  } catch {
    // Bỏ qua lỗi trong môi trường hạn chế
  }

  // 2. Storage event fallback (bắn sự kiện storage sang các tab khác)
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Bỏ qua lỗi storage
  }
}

interface AuthContextValue {
  session: SessionResult | null;
  status: AuthStatus;
  busy: boolean;
  establishSession: (session: SessionResult) => void;
  switchRole: (role: UserRole) => Promise<boolean>;
  activateCreatorRole: () => Promise<boolean>;
  updateProfile: (profile: {
    name: string;
    headline: string;
    phone?: string;
    location?: string;
    bio?: string;
    avatarUrl?: string;
  }) => Promise<boolean>;
  signOut: (destination?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function updateSession(payload: Record<string, unknown>) {
  return clientRequest<SessionResult>("/api/v1/auth/session", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function AuthProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: SessionResult | null;
}) {
  const router = useRouter();
  const [session, setSession] = useState<SessionResult | null>(initialSession);
  const [status, setStatus] = useState<AuthStatus>(
    initialSession ? "authenticated" : "guest",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) {
      useAuthStore.getState().setAuth(
        {
          id: session.user.id,
          email: session.user.email,
          displayName: session.user.name,
          avatarUrl: null,
          roles: session.user.roles,
        },
        {
          accessToken: session.tokens?.accessToken ?? session.sessionId,
          refreshToken: session.tokens?.refreshToken ?? session.sessionId,
        },
      );
    } else {
      useAuthStore.getState().logout();
    }
  }, [session]);

  // Lắng nghe sự kiện đăng xuất / đăng nhập đồng bộ từ các tab khác
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleSyncMessage = (data: AuthSyncMessage) => {
      if (!data || typeof data !== "object") return;

      if (data.type === "LOGOUT") {
        setSession(null);
        setStatus("guest");
        useAuthStore.getState().logout();

        // Nếu tab này đang ở một trang riêng tư yêu cầu quyền đăng nhập, điều hướng về /auth
        if (isProtectedPath(window.location.pathname)) {
          router.push(
            `/auth?reason=logged_out&next=${encodeURIComponent(
              window.location.pathname,
            )}`,
          );
        } else {
          router.refresh();
        }
      } else if (data.type === "LOGIN" && data.session) {
        setSession(data.session);
        setStatus("authenticated");
        router.refresh();
      } else if (data.type === "SESSION_UPDATE" && data.session) {
        setSession(data.session);
        router.refresh();
      }
    };

    // 1. BroadcastChannel API (cho các tab hiện đại cùng origin)
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
        channel.onmessage = (event) => {
          handleSyncMessage(event.data);
        };
      }
    } catch {
      // Bỏ qua lỗi trong môi trường sandbox
    }

    // 2. Storage event listener (tương thích đa trình duyệt)
    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTH_STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue) as AuthSyncMessage;
          handleSyncMessage(parsed);
        } catch {
          // Bỏ qua lỗi parse
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    // 3. Tab visibility / focus re-check khi người dùng chuyển tab quay lại
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        try {
          const raw = localStorage.getItem(AUTH_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as AuthSyncMessage;
            if (parsed.type === "LOGOUT" && session) {
              setSession(null);
              setStatus("guest");
              useAuthStore.getState().logout();
              if (isProtectedPath(window.location.pathname)) {
                router.push(
                  `/auth?reason=logged_out&next=${encodeURIComponent(
                    window.location.pathname,
                  )}`,
                );
              } else {
                router.refresh();
              }
            }
          }
        } catch {
          // Bỏ qua lỗi storage
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      channel?.close();
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [router, session]);

  const establishSession = useCallback((nextSession: SessionResult) => {
    setSession(nextSession);
    setStatus("authenticated");
    broadcastAuthEvent({ type: "LOGIN", session: nextSession });
  }, []);

  const switchRole = useCallback(
    async (role: UserRole) => {
      setBusy(true);
      try {
        const nextSession = await updateSession({ activeRole: role });
        setSession(nextSession);
        setStatus("authenticated");
        broadcastAuthEvent({ type: "SESSION_UPDATE", session: nextSession });
        router.push(roleDestinations[role]);
        router.refresh();
        return true;
      } catch {
        return false;
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  const activateCreatorRole = useCallback(async () => {
    setBusy(true);
    try {
      const nextSession = await updateSession({ grantRole: "CREATOR" });
      setSession(nextSession);
      setStatus("authenticated");
      broadcastAuthEvent({ type: "SESSION_UPDATE", session: nextSession });
      router.push(roleDestinations.CREATOR);
      router.refresh();
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }, [router]);

  const updateProfile = useCallback(
    async (profile: {
      name: string;
      headline: string;
      phone?: string;
      location?: string;
      bio?: string;
      avatarUrl?: string;
    }) => {
      setBusy(true);
      try {
        const nextSession = await updateSession({ profile });
        setSession(nextSession);
        setStatus("authenticated");
        broadcastAuthEvent({ type: "SESSION_UPDATE", session: nextSession });
        return true;
      } catch {
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const signOut = useCallback(
    async (destination = "/") => {
      setBusy(true);
      try {
        await clientRequest<{ success: boolean }>("/api/v1/auth/session", {
          method: "DELETE",
        });
      } finally {
        broadcastAuthEvent({ type: "LOGOUT" });
        setSession(null);
        setStatus("guest");
        setBusy(false);
        router.push(destination);
        router.refresh();
      }
    },
    [router],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      status,
      busy,
      establishSession,
      switchRole,
      activateCreatorRole,
      updateProfile,
      signOut,
    }),
    [
      activateCreatorRole,
      busy,
      establishSession,
      session,
      signOut,
      status,
      switchRole,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phải được dùng bên trong AuthProvider");
  }
  return context;
}

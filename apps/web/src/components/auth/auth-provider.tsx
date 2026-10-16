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
          accessToken: session.sessionId,
          refreshToken: session.sessionId,
        },
      );
    } else {
      useAuthStore.getState().logout();
    }
  }, [session]);

  const establishSession = useCallback((nextSession: SessionResult) => {
    setSession(nextSession);
    setStatus("authenticated");
  }, []);

  const switchRole = useCallback(
    async (role: UserRole) => {
      setBusy(true);
      try {
        const nextSession = await updateSession({ activeRole: role });
        setSession(nextSession);
        setStatus("authenticated");
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
    async (profile: { name: string; headline: string }) => {
      setBusy(true);
      try {
        const nextSession = await updateSession({ profile });
        setSession(nextSession);
        setStatus("authenticated");
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

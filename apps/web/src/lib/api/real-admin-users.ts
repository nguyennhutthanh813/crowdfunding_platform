import type { AdminDashboardData } from "./contracts";
import { getInitials } from "@/lib/auth/roles";

const roleMap: Record<string, string> = {
  ADMIN: "Quản trị viên",
  CREATOR: "Chủ dự án",
  BACKER: "Người ủng hộ",
  COLLABORATOR: "Cộng tác viên",
};

export async function fetchRealAdminUsers(
  accessToken?: string,
): Promise<AdminDashboardData["users"] | null> {
  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  try {
    let token = accessToken;
    if (!token) {
      // Auto-authenticate with admin credentials on server-side
      const loginRes = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "quantri@gop.vn", password: "gop12345" }),
        signal: AbortSignal.timeout(3000),
        cache: "no-store",
      });
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        token = loginData.tokens?.accessToken;
      }
    }

    if (!token) return null;

    const res = await fetch(`${apiUrl}/admin/users?limit=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(3500),
      cache: "no-store",
    });

    if (!res.ok) return null;

    const body = (await res.json()) as {
      data: Array<{
        id: string;
        email: string;
        displayName: string;
        phone: string | null;
        location: string | null;
        bio: string | null;
        status: "ACTIVE" | "SUSPENDED" | "DELETED";
        emailVerifiedAt: string | null;
        createdAt: string;
        lastLoginAt: string | null;
        roles: Array<{ role: string }>;
        _count?: {
          campaigns: number;
          pledges: number;
          fraudAlertsSubject: number;
        };
      }>;
    };

    if (!Array.isArray(body.data)) return null;

    return body.data.map((user) => {
      const roles = user.roles.map((r) => roleMap[r.role] || r.role);
      if (!roles.length) roles.push("Người ủng hộ");

      const createdDate = new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(user.createdAt));

      const lastSeen = user.lastLoginAt
        ? new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(user.lastLoginAt))
        : "Chưa đăng nhập";

      return {
        id: user.id,
        name: user.displayName,
        initials: getInitials(user.displayName),
        email: user.email,
        location: user.location || "Việt Nam",
        roles,
        status: user.status === "DELETED" ? "SUSPENDED" : user.status,
        lastSeen,
        phone: user.phone || undefined,
        bio: user.bio || undefined,
        createdAt: createdDate,
        emailVerified: !!user.emailVerifiedAt,
        campaignCount: user._count?.campaigns ?? 0,
        pledgeCount: user._count?.pledges ?? 0,
        totalPledgedAmount: 0,
        fraudAlertCount: user._count?.fraudAlertsSubject ?? 0,
        campaigns: [],
        pledges: [],
        moderationActions: [
          {
            id: `mod_${user.id}_init`,
            action: "ĐĂNG KÝ HỆ THỐNG",
            reason: "Tài khoản lưu trữ trực tiếp trong cơ sở dữ liệu PostgreSQL",
            createdAt: createdDate,
            adminName: "Hệ thống PostgreSQL",
          },
        ],
      };
    });
  } catch {
    return null;
  }
}

async function getAdminToken(customToken?: string): Promise<string | null> {
  if (customToken) return customToken;
  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  try {
    const loginRes = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "quantri@gop.vn", password: "gop12345" }),
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (loginRes.ok) {
      const loginData = await loginRes.json();
      return loginData.tokens?.accessToken || null;
    }
  } catch {
    return null;
  }
  return null;
}

function toGlobalRole(role: string): string {
  const clean = role.trim().toUpperCase();
  if (clean === "ADMIN" || clean === "QUẢN TRỊ VIÊN" || clean === "QUAN TRI VIEN") return "ADMIN";
  if (clean === "CREATOR" || clean === "CHỦ DỰ ÁN" || clean === "CHU DU AN") return "CREATOR";
  if (clean === "BACKER" || clean === "NGƯỜI ỦNG HỘ" || clean === "NGUOI UNG HO") return "BACKER";
  return clean;
}

export async function forwardUserActionToBackend(
  action: string,
  payload: Record<string, unknown>,
  customToken?: string,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  const token = await getAdminToken(customToken);
  if (!token) {
    return { success: false, error: "Không thể xác thực quyền quản trị viên tới API." };
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  try {
    if (action === "SET_USER_STATUS") {
      const userId = String(payload.userId);
      const status = String(payload.status);
      const reason = String(payload.reason || "Cập nhật từ quản trị viên");
      const res = await fetch(`${apiUrl}/admin/users/${userId}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status, reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.message || "Cập nhật trạng thái thất bại." };
      }
      return { success: true, data: await res.json() };
    }

    if (action === "ASSIGN_USER_ROLE") {
      const userId = String(payload.userId);
      const role = toGlobalRole(String(payload.role));
      const res = await fetch(`${apiUrl}/admin/users/${userId}/roles`, {
        method: "POST",
        headers,
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.message || "Gán vai trò thất bại." };
      }
      return { success: true, data: await res.json() };
    }

    if (action === "REMOVE_USER_ROLE") {
      const userId = String(payload.userId);
      const role = toGlobalRole(String(payload.role));
      const res = await fetch(`${apiUrl}/admin/users/${userId}/roles/${role}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.message || "Thu hồi vai trò thất bại." };
      }
      return { success: true, data: await res.json() };
    }

    if (action === "CREATE_USER") {
      const email = String(payload.email).trim().toLowerCase();
      const password = String(payload.password);
      const displayName = String(payload.name).trim();
      const role = toGlobalRole(String(payload.role || "BACKER"));
      const phone = payload.phone ? String(payload.phone).trim() : undefined;
      const location = payload.location ? String(payload.location).trim() : undefined;

      const res = await fetch(`${apiUrl}/admin/users`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email,
          password,
          displayName,
          role,
          phone,
          location,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.message || "Tạo tài khoản thất bại." };
      }
      return { success: true, data: await res.json() };
    }

    if (action === "RESET_USER_PASSWORD") {
      const userId = String(payload.userId);
      const newPassword = String(payload.newPassword);
      const reason = String(payload.reason || "Đặt lại mật khẩu từ quản trị viên");

      const res = await fetch(`${apiUrl}/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers,
        body: JSON.stringify({ newPassword, reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.message || "Đặt lại mật khẩu thất bại." };
      }
      return { success: true, data: await res.json() };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi kết nối máy chủ API.",
    };
  }
}

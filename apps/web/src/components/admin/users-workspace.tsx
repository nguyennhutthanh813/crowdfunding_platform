"use client";

import {
  Ban,
  Check,
  Coins,
  Copy,
  ExternalLink,
  Eye,
  FolderHeart,
  History,
  KeyRound,
  LoaderCircle,
  Search,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  UserPlus,
  UserRoundCog,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { AdminDashboardData } from "@/lib/api";
import { formatVnd } from "@/lib/format";
import {
  AdminNotice,
  AdminPageHeader,
  adminRequestError,
  callAdminAction,
} from "./admin-shared";

export function UsersWorkspace({ data }: { data: AdminDashboardData }) {
  const [users, setUsers] = useState<AdminDashboardData["users"]>(data.users);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters & Search
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<
    "newest" | "lastSeen" | "name" | "campaigns" | "pledges"
  >("newest");

  // Modals state
  const [selectedUser, setSelectedUser] = useState<
    (typeof users)[number] | null
  >(null);
  const [detailTab, setDetailTab] = useState<
    "overview" | "roles" | "campaigns" | "pledges" | "moderation"
  >("overview");

  const [statusTargetUser, setStatusTargetUser] = useState<
    (typeof users)[number] | null
  >(null);
  const [statusReason, setStatusReason] = useState("");

  const [roleTargetUser, setRoleTargetUser] = useState<
    (typeof users)[number] | null
  >(null);
  const [selectedRoleToToggle, setSelectedRoleToToggle] = useState<string>("");
  const [roleReason, setRoleReason] = useState("");
  const [selectedCollaboratorCampaignId, setSelectedCollaboratorCampaignId] =
    useState("");

  const [resetTargetUser, setResetTargetUser] = useState<
    (typeof users)[number] | null
  >(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetReason, setResetReason] = useState("");
  const [copiedPassword, setCopiedPassword] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Người ủng hộ",
    phone: "",
    location: "TP. Hồ Chí Minh",
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Metric counts
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.status === "ACTIVE").length;
  const suspendedCount = users.filter((u) => u.status === "SUSPENDED").length;
  const reviewingCount = users.filter((u) => u.status === "REVIEWING").length;
  const creatorCount = users.filter((u) =>
    u.roles.includes("Chủ dự án"),
  ).length;
  const adminCount = users.filter((u) =>
    u.roles.includes("Quản trị viên"),
  ).length;

  // Filtered & sorted users
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search
    const keyword = query.trim().toLocaleLowerCase("vi");
    if (keyword) {
      result = result.filter((user) =>
        `${user.name} ${user.email} ${user.location} ${user.phone ?? ""} ${user.roles.join(" ")} ${user.status}`
          .toLocaleLowerCase("vi")
          .includes(keyword),
      );
    }

    // Role filter
    if (roleFilter !== "ALL") {
      result = result.filter((user) => user.roles.includes(roleFilter));
    }

    // Status filter
    if (statusFilter !== "ALL") {
      result = result.filter((user) => user.status === statusFilter);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, "vi");
      }
      if (sortBy === "campaigns") {
        return (b.campaignCount ?? 0) - (a.campaignCount ?? 0);
      }
      if (sortBy === "pledges") {
        return (b.totalPledgedAmount ?? 0) - (a.totalPledgedAmount ?? 0);
      }
      if (sortBy === "lastSeen") {
        return a.lastSeen.localeCompare(b.lastSeen, "vi");
      }
      return 0;
    });

    return result;
  }, [users, query, roleFilter, statusFilter, sortBy]);

  // Derived campaigns for the currently viewed user
  const userOwnedCampaigns = useMemo(() => {
    if (!selectedUser) return [];
    if (selectedUser.campaigns && selectedUser.campaigns.length > 0) {
      return selectedUser.campaigns;
    }
    const matched = (data.campaigns || []).filter(
      (c) =>
        c.creator?.id === selectedUser.id ||
        (c as any).creatorId === selectedUser.id ||
        (Boolean(c.creator?.name && selectedUser.name) &&
          c.creator.name.trim().toLowerCase() ===
            selectedUser.name.trim().toLowerCase()),
    );
    return matched.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      status: c.status,
      goalAmount: c.goalAmount,
      pledgedAmount: c.pledgedAmount,
      backerCount: c.backerCount,
      createdAt: c.launchDate,
      memberRole: "Chủ dự án",
    }));
  }, [selectedUser, data.campaigns]);

  const userCollaboratedCampaigns = useMemo(() => {
    if (!selectedUser) return [];
    return (selectedUser.campaignMembers || []).filter(
      (m) => m.role === "Cộng tác viên" || (m as any).role === "COLLABORATOR",
    );
  }, [selectedUser]);

  // Handlers
  const handleOpenUserDetail = async (user: (typeof users)[number]) => {
    setSelectedUser(user);
    setDetailTab("overview");

    try {
      const res: any = await callAdminAction("GET_USER_DETAIL", {
        userId: user.id,
      });
      if (res?.data) {
        const d = res.data;
        const roleMap: Record<string, string> = {
          ADMIN: "Quản trị viên",
          CREATOR: "Chủ dự án",
          BACKER: "Người ủng hộ",
          COLLABORATOR: "Cộng tác viên",
        };
        const mappedRoles = Array.isArray(d.roles)
          ? d.roles.map((r: any) => roleMap[r.role] || r.role)
          : user.roles;
        if (!mappedRoles.length) mappedRoles.push("Người ủng hộ");

        const mappedCampaigns = (d.campaigns || []).map((camp: any) => {
          const pledgedAmount = (camp.pledges || []).reduce(
            (sum: number, p: any) => sum + Number(p.totalAmount ?? 0),
            0,
          );
          const campDate = camp.createdAt
            ? new Intl.DateTimeFormat("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).format(new Date(camp.createdAt))
            : user.createdAt;

          return {
            id: camp.id,
            title: camp.title,
            slug: camp.slug,
            status: camp.status,
            goalAmount: Number(camp.goalAmount ?? 0),
            pledgedAmount,
            backerCount: camp._count?.pledges ?? 0,
            createdAt: campDate,
            memberRole: "Chủ dự án",
          };
        });

        const mappedMemberships = (d.campaignMembers || []).map((cm: any) => {
          const joinDate = cm.joinedAt
            ? new Intl.DateTimeFormat("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).format(new Date(cm.joinedAt))
            : user.createdAt;

          return {
            role: cm.role === "COLLABORATOR" ? "Cộng tác viên" : "Chủ sở hữu",
            campaignId: cm.campaign?.id || cm.campaignId,
            campaignTitle: cm.campaign?.title || cm.campaignTitle,
            campaignSlug: cm.campaign?.slug || cm.campaignSlug,
            campaignStatus: cm.campaign?.status || cm.campaignStatus,
            joinedAt: joinDate,
          };
        });

        const mappedPledges = (d.pledges || []).map((p: any) => ({
          id: p.id,
          amount: Number(p.totalAmount ?? 0),
          status: p.status,
          pledgedAt: p.pledgedAt
            ? new Intl.DateTimeFormat("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).format(new Date(p.pledgedAt))
            : "Hôm nay",
          campaignTitle: p.campaign?.title ?? "Chiến dịch gây quỹ",
          campaignSlug: p.campaign?.slug ?? "",
        }));

        const mappedMods = (d.moderationActions || []).map((m: any) => ({
          id: m.id,
          action: m.action,
          reason: m.reason || "Thao tác quản trị hệ thống",
          createdAt: m.createdAt
            ? new Intl.DateTimeFormat("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).format(new Date(m.createdAt))
            : "Vừa xong",
          adminName: m.admin?.displayName ?? "Ban quản trị",
        }));

        const updatedUser = {
          ...user,
          roles: mappedRoles,
          campaignCount: mappedCampaigns.length,
          campaigns: mappedCampaigns,
          campaignMembers: mappedMemberships,
          pledges: mappedPledges,
          pledgeCount: d._count?.pledges ?? mappedPledges.length,
          moderationActions: mappedMods.length
            ? mappedMods
            : user.moderationActions,
        };

        setSelectedUser((current) =>
          current?.id === user.id ? updatedUser : current,
        );
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? updatedUser : u)),
        );
      }
    } catch {
      // Keep baseline user data
    }
  };

  const handleToggleStatus = async () => {
    if (!statusTargetUser) return;
    const nextStatus: "ACTIVE" | "SUSPENDED" =
      statusTargetUser.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    const reason =
      statusReason.trim() ||
      (nextStatus === "ACTIVE"
        ? "Quản trị viên mở khóa tài khoản"
        : "Quản trị viên tạm khóa tài khoản");

    setBusy(statusTargetUser.id);
    setNotice(null);

    try {
      await callAdminAction("SET_USER_STATUS", {
        userId: statusTargetUser.id,
        status: nextStatus,
        reason,
      });

      const updatedUsers = users.map((u) => {
        if (u.id === statusTargetUser.id) {
          const mod = {
            id: `mod_${Date.now()}`,
            action:
              nextStatus === "ACTIVE"
                ? "MỞ KHÓA TÀI KHOẢN"
                : "TẠM KHÓA TÀI KHOẢN",
            reason,
            createdAt: "Vừa xong",
            adminName: "Bạn (Quản trị viên)",
          };
          return {
            ...u,
            status: nextStatus,
            moderationActions: [mod, ...(u.moderationActions ?? [])],
          };
        }
        return u;
      });

      setUsers(updatedUsers);
      if (selectedUser?.id === statusTargetUser.id) {
        setSelectedUser(
          updatedUsers.find((u) => u.id === statusTargetUser.id) ?? null,
        );
      }

      setNotice(
        nextStatus === "ACTIVE"
          ? `Đã mở khóa tài khoản cho ${statusTargetUser.name}.`
          : `Đã tạm khóa tài khoản của ${statusTargetUser.name}.`,
      );
      setStatusTargetUser(null);
      setStatusReason("");
    } catch (error) {
      setNotice(
        adminRequestError(
          error,
          "Chưa thể cập nhật trạng thái tài khoản. Vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const handleToggleRole = async (targetRole: string) => {
    if (!roleTargetUser) return;
    const hasRole = roleTargetUser.roles.includes(targetRole);
    const action = hasRole ? "REMOVE_USER_ROLE" : "ASSIGN_USER_ROLE";
    const reason =
      roleReason.trim() ||
      (hasRole
        ? `Thu hồi vai trò ${targetRole}`
        : `Cấp bổ sung vai trò ${targetRole}`);

    setBusy(roleTargetUser.id);
    setNotice(null);

    try {
      await callAdminAction(action, {
        userId: roleTargetUser.id,
        role: targetRole,
        reason,
      });

      const updatedRoles = hasRole
        ? roleTargetUser.roles.filter((r) => r !== targetRole)
        : [...roleTargetUser.roles, targetRole];

      const updatedUsers = users.map((u) => {
        if (u.id === roleTargetUser.id) {
          const mod = {
            id: `mod_${Date.now()}`,
            action: hasRole
              ? `THU HỒI VAI TRÒ ${targetRole.toUpperCase()}`
              : `CẤP VAI TRÒ ${targetRole.toUpperCase()}`,
            reason,
            createdAt: "Vừa xong",
            adminName: "Bạn (Quản trị viên)",
          };
          return {
            ...u,
            roles: updatedRoles.length ? updatedRoles : ["Người ủng hộ"],
            moderationActions: [mod, ...(u.moderationActions ?? [])],
          };
        }
        return u;
      });

      setUsers(updatedUsers);
      const newActiveUser =
        updatedUsers.find((u) => u.id === roleTargetUser.id) ?? null;
      setRoleTargetUser(newActiveUser);
      if (selectedUser?.id === roleTargetUser.id) {
        setSelectedUser(newActiveUser);
      }

      setNotice(
        hasRole
          ? `Đã thu hồi vai trò "${targetRole}" từ ${roleTargetUser.name}.`
          : `Đã cấp vai trò "${targetRole}" cho ${roleTargetUser.name}.`,
      );
      setRoleReason("");
    } catch (error) {
      setNotice(
        adminRequestError(
          error,
          "Chưa thể cập nhật vai trò người dùng. Vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const handleAssignCollaborator = async (
    targetUser: (typeof users)[number],
    campaignId: string,
  ) => {
    if (!targetUser || !campaignId) return;
    const selectedCamp = data.campaigns?.find((c) => c.id === campaignId);
    const campaignTitle = selectedCamp?.title || "Dự án gây quỹ";
    const reason =
      roleReason.trim() ||
      `Quản trị viên phân quyền cộng tác viên cho dự án "${campaignTitle}"`;

    setBusy(targetUser.id);
    setNotice(null);

    try {
      await callAdminAction("ASSIGN_CAMPAIGN_COLLABORATOR", {
        userId: targetUser.id,
        campaignId,
        reason,
      });

      const newMembership = {
        role: "Cộng tác viên",
        campaignId,
        campaignTitle,
        campaignSlug: selectedCamp?.slug || "",
        campaignStatus: selectedCamp?.status || "LIVE",
        joinedAt: "Vừa xong",
      };

      const updatedUsers = users.map((u) => {
        if (u.id === targetUser.id) {
          const mod = {
            id: `mod_${Date.now()}`,
            action: `GÁN CỘNG TÁC VIÊN: ${campaignTitle.toUpperCase()}`,
            reason,
            createdAt: "Vừa xong",
            adminName: "Bạn (Quản trị viên)",
          };
          const existingMembers = u.campaignMembers || [];
          const filtered = existingMembers.filter(
            (m) => m.campaignId !== campaignId,
          );
          return {
            ...u,
            campaignMembers: [newMembership, ...filtered],
            moderationActions: [mod, ...(u.moderationActions ?? [])],
          };
        }
        return u;
      });

      setUsers(updatedUsers);
      const updatedTarget =
        updatedUsers.find((u) => u.id === targetUser.id) ?? null;
      if (roleTargetUser?.id === targetUser.id) {
        setRoleTargetUser(updatedTarget);
      }
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser(updatedTarget);
      }

      setNotice(
        `Đã gán vai trò Cộng tác viên dự án "${campaignTitle}" cho ${targetUser.name}.`,
      );
      setSelectedCollaboratorCampaignId("");
      setRoleReason("");
    } catch (error) {
      setNotice(
        adminRequestError(
          error,
          "Chưa thể gán vai trò cộng tác viên dự án. Vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const handleRemoveCollaborator = async (
    targetUser: (typeof users)[number],
    campaignId: string,
  ) => {
    if (!targetUser || !campaignId) return;
    const targetMember = targetUser.campaignMembers?.find(
      (m) => m.campaignId === campaignId,
    );
    const campaignTitle = targetMember?.campaignTitle || "Dự án gây quỹ";
    const reason =
      roleReason.trim() ||
      `Thu hồi vai trò cộng tác viên dự án "${campaignTitle}"`;

    setBusy(targetUser.id);
    setNotice(null);

    try {
      await callAdminAction("REMOVE_CAMPAIGN_COLLABORATOR", {
        userId: targetUser.id,
        campaignId,
        reason,
      });

      const updatedUsers = users.map((u) => {
        if (u.id === targetUser.id) {
          const mod = {
            id: `mod_${Date.now()}`,
            action: `THU HỒI CỘNG TÁC VIÊN: ${campaignTitle.toUpperCase()}`,
            reason,
            createdAt: "Vừa xong",
            adminName: "Bạn (Quản trị viên)",
          };
          const existingMembers = u.campaignMembers || [];
          return {
            ...u,
            campaignMembers: existingMembers.filter(
              (m) => m.campaignId !== campaignId,
            ),
            moderationActions: [mod, ...(u.moderationActions ?? [])],
          };
        }
        return u;
      });

      setUsers(updatedUsers);
      const updatedTarget =
        updatedUsers.find((u) => u.id === targetUser.id) ?? null;
      if (roleTargetUser?.id === targetUser.id) {
        setRoleTargetUser(updatedTarget);
      }
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser(updatedTarget);
      }

      setNotice(
        `Đã thu hồi vai trò Cộng tác viên dự án "${campaignTitle}" của ${targetUser.name}.`,
      );
      setRoleReason("");
    } catch (error) {
      setNotice(
        adminRequestError(
          error,
          "Chưa thể thu hồi vai trò cộng tác viên dự án. Vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTargetUser) return;
    if (newPassword.length < 8) {
      setNotice("Mật khẩu mới tối thiểu 8 ký tự.");
      return;
    }
    const reason =
      resetReason.trim() || "Đặt lại mật khẩu theo yêu cầu hỗ trợ bảo mật";

    setBusy(resetTargetUser.id);
    setNotice(null);

    try {
      await callAdminAction("RESET_USER_PASSWORD", {
        userId: resetTargetUser.id,
        newPassword,
        reason,
      });

      const updatedUsers = users.map((u) => {
        if (u.id === resetTargetUser.id) {
          const mod = {
            id: `mod_${Date.now()}`,
            action: "ĐẶT LẠI MẬT KHẨU TẠM THỜI",
            reason,
            createdAt: "Vừa xong",
            adminName: "Bạn (Quản trị viên)",
          };
          return {
            ...u,
            moderationActions: [mod, ...(u.moderationActions ?? [])],
          };
        }
        return u;
      });

      setUsers(updatedUsers);
      if (selectedUser?.id === resetTargetUser.id) {
        setSelectedUser(
          updatedUsers.find((u) => u.id === resetTargetUser.id) ?? null,
        );
      }

      setNotice(
        `Đã đặt lại mật khẩu tạm thời cho ${resetTargetUser.name}. Hãy gửi mật khẩu cho người dùng.`,
      );
      setResetTargetUser(null);
      setNewPassword("");
      setResetReason("");
      setCopiedPassword(false);
    } catch (error) {
      setNotice(
        adminRequestError(
          error,
          "Chưa thể đặt lại mật khẩu. Vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createForm.name.trim()) {
      setCreateError("Vui lòng nhập họ và tên.");
      return;
    }
    if (!createForm.email.trim() || !createForm.email.includes("@")) {
      setCreateError("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }
    if (createForm.password.length < 8) {
      setCreateError("Mật khẩu phải từ 8 ký tự trở lên.");
      return;
    }

    setBusy("create");

    try {
      await callAdminAction("CREATE_USER", {
        name: createForm.name.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        role: createForm.role,
        location: createForm.location.trim() || "Việt Nam",
        phone: createForm.phone.trim() || "0900 000 000",
      });

      const parts = createForm.name.trim().split(/\s+/);
      const initials =
        parts.length === 1
          ? parts[0].slice(0, 2).toUpperCase()
          : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();

      const newUser: (typeof users)[number] = {
        id: `usr_${Date.now().toString(36)}`,
        name: createForm.name.trim(),
        initials,
        email: createForm.email.trim().toLowerCase(),
        location: createForm.location.trim() || "Việt Nam",
        phone: createForm.phone.trim() || "0900 000 000",
        roles: [createForm.role],
        status: "ACTIVE",
        lastSeen: "Vừa tạo",
        createdAt: "Hôm nay",
        emailVerified: true,
        campaignCount: 0,
        pledgeCount: 0,
        totalPledgedAmount: 0,
        fraudAlertCount: 0,
        campaigns: [],
        pledges: [],
        moderationActions: [
          {
            id: `mod_${Date.now()}`,
            action: "TẠO TÀI KHOẢN MỚI",
            reason: "Tạo trực tiếp từ trung tâm quản trị viên",
            createdAt: "Vừa xong",
            adminName: "Bạn (Quản trị viên)",
          },
        ],
      };

      setUsers([newUser, ...users]);
      setNotice(`Đã tạo thành công tài khoản cho "${newUser.name}"!`);
      setIsCreateOpen(false);
      setCreateForm({
        name: "",
        email: "",
        password: "",
        role: "Người ủng hộ",
        phone: "",
        location: "TP. Hồ Chí Minh",
      });
    } catch (error) {
      setCreateError(
        adminRequestError(
          error,
          "Chưa thể tạo tài khoản mới. Vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const generateRandomPassword = () => {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  return (
    <section className="min-h-screen pb-20">
      <AdminPageHeader
        eyebrow="Tài khoản & quyền truy cập"
        title="Người dùng & phân quyền"
        description="Tìm tài khoản, đối chiếu vai trò thật và xử lý khóa tài khoản có lý do cùng nhật ký kiểm toán."
        icon={UserRoundCog}
        snapshotAt={data.operations.snapshotAt}
      />

      <div className="container-shell pt-6 space-y-6">
        {/* ── Top Action Row ──────────────────────────────────── */}
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">
              Danh sách tài khoản hệ thống ({totalCount})
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              Kiểm soát tài khoản người dùng, phân quyền vai trò và khóa tài
              khoản khi có vi phạm.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-forest px-5 text-xs font-bold text-white shadow-xs transition hover:bg-[#142d25]"
          >
            <UserPlus className="size-4" />
            <span>Thêm người dùng mới</span>
          </button>
        </div>

        {/* ── Metric Cards ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-2xl border border-line bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Tổng người dùng
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-stone-100 text-ink">
                <Users className="size-3.5" />
              </span>
            </div>
            <p className="mt-2 font-display text-2xl font-black text-ink">
              {totalCount}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              Tài khoản trong hệ thống
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Đang hoạt động
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                <Check className="size-3.5" />
              </span>
            </div>
            <p className="mt-2 font-display text-2xl font-black text-emerald-700">
              {activeCount}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              {Math.round((activeCount / (totalCount || 1)) * 100)}% bình thường
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-red-700">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Đã khóa & Rủi ro
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-red-50 text-red-600">
                <Ban className="size-3.5" />
              </span>
            </div>
            <p className="mt-2 font-display text-2xl font-black text-red-700">
              {suspendedCount + reviewingCount}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              {suspendedCount} bị khóa · {reviewingCount} rủi ro
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-purple-700">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Chủ dự án & QTV
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-purple-50 text-purple-600">
                <Shield className="size-3.5" />
              </span>
            </div>
            <p className="mt-2 font-display text-2xl font-black text-purple-700">
              {creatorCount + adminCount}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              {creatorCount} chủ dự án · {adminCount} QTV
            </p>
          </div>
        </div>

        {notice && <AdminNotice message={notice} />}

        {/* ── Filters & Search Toolbar ────────────────────────── */}
        <div className="space-y-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                name="admin-user-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input-field input-with-icon w-full pr-10 text-xs"
                placeholder="Tìm theo tên hiển thị, email, số điện thoại, vị trí hoặc vai trò…"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-ink-muted hover:bg-stone-100 hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                <SlidersHorizontal className="size-3.5" />
                <span>Trạng thái:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-line bg-[#fbfbfa] px-3 py-2 text-xs font-semibold text-ink outline-none transition focus:border-forest"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="SUSPENDED">Đã tạm khóa</option>
                <option value="REVIEWING">Đang xem xét rủi ro</option>
              </select>

              <div className="flex items-center gap-1.5 pl-2 text-xs text-ink-muted">
                <span>Sắp xếp:</span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-xl border border-line bg-[#fbfbfa] px-3 py-2 text-xs font-semibold text-ink outline-none transition focus:border-forest"
              >
                <option value="newest">Mặc định</option>
                <option value="name">Tên (A-Z)</option>
                <option value="campaigns">Nhiều dự án nhất</option>
                <option value="pledges">Ủng hộ nhiều nhất</option>
                <option value="lastSeen">Hoạt động gần nhất</option>
              </select>
            </div>
          </div>

          {/* Role pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-line/60">
            <span className="text-[11px] font-semibold text-ink-muted mr-1">
              Vai trò:
            </span>
            {[
              { id: "ALL", label: "Tất cả", count: totalCount },
              {
                id: "Quản trị viên",
                label: "Quản trị viên",
                count: adminCount,
              },
              { id: "Chủ dự án", label: "Chủ dự án", count: creatorCount },
              {
                id: "Người ủng hộ",
                label: "Người ủng hộ",
                count: users.filter((u) => u.roles.includes("Người ủng hộ"))
                  .length,
              },
              {
                id: "Cộng tác viên",
                label: "Cộng tác viên",
                count: users.filter((u) => u.roles.includes("Cộng tác viên"))
                  .length,
              },
            ].map((pill) => {
              const active = roleFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setRoleFilter(pill.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                    active
                      ? "bg-forest text-white shadow-sm"
                      : "bg-[#f3f3ed] text-ink-soft hover:bg-stone-200"
                  }`}
                >
                  <span>{pill.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-white text-ink-muted"
                    }`}
                  >
                    {pill.count}
                  </span>
                </button>
              );
            })}

            {(query || roleFilter !== "ALL" || statusFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setRoleFilter("ALL");
                  setStatusFilter("ALL");
                }}
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-coral hover:underline"
              >
                <X className="size-3" /> Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* ── Users Table ─────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-[#f3f3ed] text-[10px] uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-5 py-4 font-bold">Người dùng</th>
                  <th className="px-5 py-4 font-bold">Vai trò & Quyền</th>
                  <th className="px-5 py-4 font-bold">Đóng góp & Dự án</th>
                  <th className="px-5 py-4 font-bold">Trạng thái</th>
                  <th className="px-5 py-4 font-bold">Truy cập cuối</th>
                  <th className="px-5 py-4 text-right font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredUsers.map((user) => {
                  const isAdmin = user.roles.includes("Quản trị viên");
                  const isCreator = user.roles.includes("Chủ dự án");

                  return (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-stone-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleOpenUserDetail(user)}
                            className={`relative grid size-10 shrink-0 place-items-center rounded-xl font-display text-xs font-black shadow-xs transition hover:scale-105 ${
                              isAdmin
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : isCreator
                                  ? "bg-coral/15 text-coral-dark border border-coral/30"
                                  : "bg-[#eef0f3] text-[#343741]"
                            }`}
                          >
                            {user.initials}
                          </button>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => handleOpenUserDetail(user)}
                              className="text-left font-bold text-ink hover:text-coral transition hover:underline flex items-center gap-1.5"
                            >
                              <span className="truncate">{user.name}</span>
                              {user.emailVerified && (
                                <span
                                  title="Đã xác thực email"
                                  className="inline-block text-emerald-600"
                                >
                                  <Check className="size-3 stroke-[3]" />
                                </span>
                              )}
                            </button>
                            <span className="block truncate text-[11px] text-ink-muted">
                              {user.email}
                            </span>
                            {user.phone && (
                              <span className="mt-0.5 block text-[10px] text-ink-muted">
                                📞 {user.phone} · 📍 {user.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {user.roles.map((role) => {
                            const badgeStyle =
                              role === "Quản trị viên"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : role === "Chủ dự án"
                                  ? "bg-coral/10 text-coral-dark border-coral/20"
                                  : role === "Cộng tác viên"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200";

                            return (
                              <span
                                key={role}
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badgeStyle}`}
                              >
                                {role === "Quản trị viên" && (
                                  <Shield className="size-2.5" />
                                )}
                                {role === "Chủ dự án" && (
                                  <FolderHeart className="size-2.5" />
                                )}
                                {role === "Người ủng hộ" && (
                                  <Coins className="size-2.5" />
                                )}
                                {role}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          <span className="block font-semibold text-ink">
                            {user.campaignCount ? (
                              <span className="text-coral-dark font-extrabold">
                                {user.campaignCount} chiến dịch
                              </span>
                            ) : (
                              <span className="text-ink-muted font-normal">
                                Chưa tạo dự án
                              </span>
                            )}
                          </span>
                          <span className="block text-[11px] text-ink-muted">
                            {user.totalPledgedAmount ? (
                              <span>
                                Ủng hộ:{" "}
                                <strong className="text-ink font-bold">
                                  {formatVnd(user.totalPledgedAmount)}
                                </strong>{" "}
                                ({user.pledgeCount} lượt)
                              </span>
                            ) : (
                              "Chưa có lượt ủng hộ"
                            )}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            user.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : user.status === "SUSPENDED"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              user.status === "ACTIVE"
                                ? "bg-emerald-500 animate-pulse"
                                : user.status === "SUSPENDED"
                                  ? "bg-red-500"
                                  : "bg-amber-500"
                            }`}
                          />
                          {user.status === "ACTIVE"
                            ? "Đang hoạt động"
                            : user.status === "SUSPENDED"
                              ? "Đã tạm khóa"
                              : "Đang xem xét"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="block font-medium text-ink-soft">
                          {user.lastSeen}
                        </span>
                        <span className="block text-[10px] text-ink-muted">
                          Tạo ngày: {user.createdAt ?? "Chưa rõ"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenUserDetail(user)}
                            className="grid size-8 place-items-center rounded-lg border border-line bg-white text-ink-muted hover:border-forest hover:text-forest transition"
                            title="Xem hồ sơ chi tiết"
                          >
                            <Eye className="size-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRoleTargetUser(user);
                              setSelectedRoleToToggle("");
                              setRoleReason("");
                            }}
                            className="grid size-8 place-items-center rounded-lg border border-line bg-white text-ink-muted hover:border-purple-300 hover:text-purple-700 transition"
                            title="Phân quyền vai trò"
                          >
                            <UserCog className="size-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setResetTargetUser(user);
                              setNewPassword("");
                              setResetReason("");
                              setCopiedPassword(false);
                            }}
                            className="grid size-8 place-items-center rounded-lg border border-line bg-white text-ink-muted hover:border-amber-300 hover:text-amber-700 transition"
                            title="Đặt lại mật khẩu tạm"
                          >
                            <KeyRound className="size-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={busy === user.id}
                            onClick={() => {
                              setStatusTargetUser(user);
                              setStatusReason("");
                            }}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                              user.status === "SUSPENDED"
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            }`}
                          >
                            {user.status === "SUSPENDED" ? (
                              <>
                                <ShieldCheck className="size-3" />
                                <span>Mở khóa</span>
                              </>
                            ) : (
                              <>
                                <Ban className="size-3" />
                                <span>Khóa</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!filteredUsers.length && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <UserRoundCog className="mx-auto size-8 text-stone-300" />
                      <p className="mt-3 font-bold text-ink">
                        Không tìm thấy tài khoản phù hợp
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">
                        Thử điều chỉnh từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc vai
                        trò / trạng thái.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          setRoleFilter("ALL");
                          setStatusFilter("ALL");
                        }}
                        className="button-ghost mt-3 min-h-10 px-4 text-xs font-bold"
                      >
                        <X className="size-3.5" /> Đặt lại bộ lọc
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-line bg-[#fbfbfa] px-5 py-3 text-xs text-ink-muted">
            <span>
              Hiển thị <strong>{filteredUsers.length}</strong> / {users.length}{" "}
              tài khoản
            </span>
            <span>Cập nhật theo dữ liệu phiên trực tiếp</span>
          </div>
        </div>
      </div>

      {/* ── Modal 1: User Full Detail Drawer / Modal ─────────── */}
      {selectedUser && (
        <Modal
          open
          size="lg"
          title={`Hồ sơ tài khoản: ${selectedUser.name}`}
          description={`ID: ${selectedUser.id} · Tham gia từ: ${selectedUser.createdAt ?? "2025"}`}
          onClose={() => setSelectedUser(null)}
        >
          <div className="space-y-5">
            <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <div className="grid size-12 place-items-center rounded-2xl bg-forest/10 font-display text-base font-black text-forest">
                  {selectedUser.initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-extrabold text-ink">
                      {selectedUser.name}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        selectedUser.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {selectedUser.status === "ACTIVE"
                        ? "Hoạt động"
                        : "Bị khóa"}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">{selectedUser.email}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRoleTargetUser(selectedUser);
                    setSelectedRoleToToggle("");
                    setRoleReason("");
                  }}
                  className="button-ghost min-h-10 px-3 text-xs font-bold"
                >
                  <UserCog className="size-3.5" /> Phân quyền
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetTargetUser(selectedUser);
                    setNewPassword("");
                    setResetReason("");
                  }}
                  className="button-ghost min-h-10 px-3 text-xs font-bold"
                >
                  <KeyRound className="size-3.5" /> Đặt lại mật khẩu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusTargetUser(selectedUser);
                    setStatusReason("");
                  }}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold ${
                    selectedUser.status === "SUSPENDED"
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {selectedUser.status === "SUSPENDED" ? (
                    <>
                      <ShieldCheck className="size-3.5" /> Mở khóa
                    </>
                  ) : (
                    <>
                      <Ban className="size-3.5" /> Khóa tài khoản
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b border-line gap-2 text-xs">
              {[
                { id: "overview", label: "Tổng quan & Liên hệ", icon: Eye },
                {
                  id: "roles",
                  label: `Vai trò (${selectedUser.roles.length + userCollaboratedCampaigns.length})`,
                  icon: Shield,
                },
                {
                  id: "campaigns",
                  label: `Chiến dịch (${userOwnedCampaigns.length + userCollaboratedCampaigns.length})`,
                  icon: FolderHeart,
                },
                {
                  id: "pledges",
                  label: `Lượt ủng hộ (${selectedUser.pledges?.length ?? selectedUser.pledgeCount ?? 0})`,
                  icon: Coins,
                },
                {
                  id: "moderation",
                  label: `Nhật ký kiểm duyệt (${selectedUser.moderationActions?.length ?? 1})`,
                  icon: History,
                },
              ].map((tabItem) => {
                const active = detailTab === tabItem.id;
                const Icon = tabItem.icon;
                return (
                  <button
                    key={tabItem.id}
                    type="button"
                    onClick={() => setDetailTab(tabItem.id as any)}
                    className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 font-bold transition ${
                      active
                        ? "border-forest text-forest"
                        : "border-transparent text-ink-muted hover:text-ink"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{tabItem.label}</span>
                  </button>
                );
              })}
            </div>

            {detailTab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-line bg-stone-50/50 p-4 space-y-2.5 text-xs">
                    <p className="font-bold text-ink">Thông tin cá nhân</p>
                    <div className="flex justify-between border-b border-line/60 pb-1.5">
                      <span className="text-ink-muted">Email</span>
                      <span className="font-semibold text-ink">
                        {selectedUser.email}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-line/60 pb-1.5">
                      <span className="text-ink-muted">Xác thực email</span>
                      <span className="font-semibold text-emerald-700">
                        {selectedUser.emailVerified
                          ? "✓ Đã xác thực"
                          : "Chưa xác thực"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-line/60 pb-1.5">
                      <span className="text-ink-muted">Số điện thoại</span>
                      <span className="font-semibold text-ink">
                        {selectedUser.phone ?? "Chưa có"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-line/60 pb-1.5">
                      <span className="text-ink-muted">Địa chỉ / Vị trí</span>
                      <span className="font-semibold text-ink">
                        {selectedUser.location}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Ngày đăng ký</span>
                      <span className="font-semibold text-ink">
                        {selectedUser.createdAt ?? "2025"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-stone-50/50 p-4 space-y-2.5 text-xs">
                    <p className="font-bold text-ink">Tiểu sử & Giới thiệu</p>
                    <p className="text-ink-soft leading-relaxed italic">
                      "{selectedUser.bio ?? "Người dùng chưa cập nhật tiểu sử."}"
                    </p>
                    <div className="pt-2">
                      <p className="font-bold text-ink mb-1.5">
                        Tóm tắt hoạt động
                      </p>
                      <ul className="space-y-1 text-ink-muted text-[11px]">
                        <li>
                          • Hoạt động gần nhất:{" "}
                          <strong>{selectedUser.lastSeen}</strong>
                        </li>
                        <li>
                          • Tổng tiền cam kết ủng hộ:{" "}
                          <strong className="text-forest font-bold">
                            {formatVnd(selectedUser.totalPledgedAmount ?? 0)}
                          </strong>
                        </li>
                        <li>
                          • Cảnh báo rủi ro gian lận liên quan:{" "}
                          <strong
                            className={
                              selectedUser.fraudAlertCount
                                ? "text-red-700"
                                : "text-emerald-700"
                            }
                          >
                            {selectedUser.fraudAlertCount ?? 0} cảnh báo
                          </strong>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {detailTab === "roles" && (
              <div className="space-y-5 text-xs">
                <div>
                  <h4 className="font-bold text-ink text-sm">
                    Vai trò toàn hệ thống (Global Roles)
                  </h4>
                  <p className="text-ink-muted text-[11px] mt-0.5">
                    Áp dụng trên toàn bộ nền tảng. Quản trị viên có thể cấp hoặc
                    thu hồi quyền quản trị, chủ dự án và người ủng hộ.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    {
                      id: "Quản trị viên",
                      name: "Quản trị viên (ADMIN)",
                      desc: "Toàn quyền kiểm duyệt dự án, quản lý tài khoản và thiết lập cấu hình.",
                      color: "border-purple-200 bg-purple-50/40 text-purple-900",
                    },
                    {
                      id: "Chủ dự án",
                      name: "Chủ dự án (CREATOR)",
                      desc: "Tạo, quản trị chiến dịch gọi vốn, cấu hình gói quà và cập nhật tiến độ.",
                      color: "border-coral/20 bg-coral/5 text-coral-dark",
                    },
                    {
                      id: "Người ủng hộ",
                      name: "Người ủng hộ (BACKER)",
                      desc: "Khám phá dự án, đặt gói cam kết giữ tiền và bình luận trao đổi.",
                      color: "border-blue-200 bg-blue-50/40 text-blue-900",
                    },
                  ].map((roleItem) => {
                    const active = selectedUser.roles.includes(roleItem.id);
                    return (
                      <div
                        key={roleItem.id}
                        className={`rounded-xl border p-3.5 transition flex flex-col justify-between ${roleItem.color}`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-extrabold text-xs">
                              {roleItem.name}
                            </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                active
                                  ? "bg-emerald-600 text-white"
                                  : "bg-stone-200 text-stone-600"
                              }`}
                            >
                              {active ? "ĐÃ CẤP" : "CHƯA CÓ"}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[11px] leading-4 text-ink-muted">
                            {roleItem.desc}
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-line/60 flex justify-end">
                          <button
                            type="button"
                            disabled={busy === selectedUser.id}
                            onClick={() => {
                              setRoleTargetUser(selectedUser);
                              setSelectedRoleToToggle(roleItem.id);
                            }}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                              active
                                ? "border border-red-300 text-red-700 hover:bg-red-50"
                                : "bg-forest text-white hover:bg-[#142d25]"
                            }`}
                          >
                            {active ? "Thu hồi vai trò" : "Cấp vai trò này"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Section: Project Collaborator */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-amber-800" />
                      <h4 className="font-extrabold text-sm text-amber-950">
                        Quyền Cộng tác viên theo dự án (COLLABORATOR)
                      </h4>
                    </div>
                    <p className="mt-1 text-[11px] text-amber-900 leading-relaxed">
                      Quyền Cộng tác viên <strong>không gán chung toàn sàn</strong> mà phải gán theo từng dự án cụ thể. Người được gán có quyền trả lời bình luận, hỗ trợ cập nhật tiến độ chiến dịch và xem tiến độ đóng gói phần thưởng.
                    </p>
                  </div>

                  {/* List of projects user collaborates on */}
                  <div className="space-y-2 pt-1">
                    <p className="font-bold text-xs text-ink">
                      Dự án đang làm cộng tác viên ({userCollaboratedCampaigns.length}):
                    </p>
                    {userCollaboratedCampaigns.length > 0 ? (
                      <div className="space-y-2">
                        {userCollaboratedCampaigns.map((cm) => (
                          <div
                            key={cm.campaignId}
                            className="flex items-center justify-between rounded-lg border border-amber-300/60 bg-white p-3 shadow-xs"
                          >
                            <div>
                              <a
                                href={`/campaigns/${cm.campaignSlug || cm.campaignId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-ink hover:text-forest transition inline-flex items-center gap-1"
                              >
                                {cm.campaignTitle}
                                <ExternalLink className="size-3 text-ink-muted" />
                              </a>
                              <p className="text-[11px] text-ink-muted mt-0.5">
                                Trạng thái:{" "}
                                <span className="font-semibold text-ink-soft">
                                  {cm.campaignStatus}
                                </span>{" "}
                                · Tham gia: {cm.joinedAt}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={busy === selectedUser.id}
                              onClick={() =>
                                handleRemoveCollaborator(
                                  selectedUser,
                                  cm.campaignId,
                                )
                              }
                              className="rounded-lg border border-red-300 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-50 transition"
                            >
                              Gỡ quyền khỏi dự án
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-ink-muted italic bg-white/70 rounded-lg p-2.5 border border-dashed border-amber-300/60">
                        Người dùng này hiện chưa tham gia làm cộng tác viên của dự án nào.
                      </p>
                    )}
                  </div>

                  {/* Form to assign to a project */}
                  <div className="pt-2 border-t border-amber-200/80">
                    <label className="block font-bold text-xs text-amber-950 mb-1.5">
                      Gán người dùng làm cộng tác viên cho dự án mới:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={selectedCollaboratorCampaignId}
                        onChange={(e) =>
                          setSelectedCollaboratorCampaignId(e.target.value)
                        }
                        className="flex-1 rounded-lg border border-amber-300 bg-white p-2 text-xs text-ink outline-none focus:border-forest"
                      >
                        <option value="">
                          -- Chọn chiến dịch cần phân quyền cộng tác viên --
                        </option>
                        {(data.campaigns || [])
                          .filter(
                            (c) =>
                              c.creator?.id !== selectedUser.id &&
                              (c as any).creatorId !== selectedUser.id &&
                              !userCollaboratedCampaigns.some(
                                (m) => m.campaignId === c.id,
                              ),
                          )
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title} ({c.status})
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        disabled={
                          !selectedCollaboratorCampaignId ||
                          busy === selectedUser.id
                        }
                        onClick={() =>
                          handleAssignCollaborator(
                            selectedUser,
                            selectedCollaboratorCampaignId,
                          )
                        }
                        className="rounded-lg bg-forest px-3.5 py-2 text-xs font-bold text-white hover:bg-[#142d25] transition disabled:opacity-50"
                      >
                        {busy === selectedUser.id
                          ? "Đang lưu..."
                          : "+ Gán vào dự án"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {detailTab === "campaigns" && (
              <div className="space-y-4 text-xs">
                {userOwnedCampaigns.length > 0 ||
                userCollaboratedCampaigns.length > 0 ? (
                  <>
                    {userOwnedCampaigns.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-ink">
                            Chiến dịch do người dùng làm Chủ dự án (
                            {userOwnedCampaigns.length})
                          </p>
                          <span className="text-[10px] bg-coral/10 text-coral-dark font-extrabold px-2 py-0.5 rounded-full">
                            Chủ sở hữu
                          </span>
                        </div>
                        <div className="space-y-2.5">
                          {userOwnedCampaigns.map((camp) => (
                            <div
                              key={camp.id}
                              className="flex items-center justify-between rounded-xl border border-line bg-stone-50/50 p-3.5 hover:border-forest/40 transition"
                            >
                              <div className="space-y-1">
                                <a
                                  href={`/campaigns/${camp.slug || camp.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-bold text-ink hover:text-forest transition inline-flex items-center gap-1.5"
                                >
                                  <span>{camp.title}</span>
                                  <ExternalLink className="size-3 text-ink-muted" />
                                </a>
                                <p className="text-[11px] text-ink-muted">
                                  Mục tiêu: {formatVnd(camp.goalAmount)} · Đã gây quỹ:{" "}
                                  <strong className="text-forest font-bold">
                                    {formatVnd(camp.pledgedAmount)}
                                  </strong>{" "}
                                  ({camp.backerCount} người ủng hộ) · Khởi tạo:{" "}
                                  {camp.createdAt}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                  camp.status === "LIVE"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : camp.status === "IN_REVIEW"
                                      ? "bg-amber-100 text-amber-800"
                                      : camp.status === "SUCCESSFUL"
                                        ? "bg-teal-100 text-teal-800"
                                        : "bg-stone-200 text-stone-700"
                                }`}
                              >
                                {camp.status === "LIVE"
                                  ? "Đang gây quỹ"
                                  : camp.status === "IN_REVIEW"
                                    ? "Chờ duyệt"
                                    : camp.status === "DRAFT"
                                      ? "Bản nháp"
                                      : camp.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {userCollaboratedCampaigns.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-line/60">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-ink">
                            Dự án tham gia với vai trò Cộng tác viên (
                            {userCollaboratedCampaigns.length})
                          </p>
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-full">
                            Cộng tác viên
                          </span>
                        </div>
                        <div className="space-y-2.5">
                          {userCollaboratedCampaigns.map((cm) => (
                            <div
                              key={cm.campaignId}
                              className="flex items-center justify-between rounded-xl border border-amber-200/70 bg-amber-50/30 p-3.5"
                            >
                              <div className="space-y-1">
                                <a
                                  href={`/campaigns/${cm.campaignSlug || cm.campaignId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-bold text-ink hover:text-forest transition inline-flex items-center gap-1.5"
                                >
                                  <span>{cm.campaignTitle}</span>
                                  <ExternalLink className="size-3 text-ink-muted" />
                                </a>
                                <p className="text-[11px] text-ink-muted">
                                  Vai trò: <strong>Cộng tác viên dự án</strong> · Tham gia:{" "}
                                  {cm.joinedAt}
                                </p>
                              </div>
                              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                                {cm.campaignStatus}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center text-ink-muted">
                    <FolderHeart className="mx-auto size-6 text-stone-300" />
                    <p className="mt-2 font-bold text-ink">
                      Chưa có chiến dịch nào
                    </p>
                    <p className="text-xs">
                      Người dùng này chưa phát động hoặc tham gia dự án gây quỹ nào.
                    </p>
                  </div>
                )}
              </div>
            )}

            {detailTab === "pledges" && (
              <div className="space-y-3 text-xs">
                {selectedUser.pledges && selectedUser.pledges.length > 0 ? (
                  selectedUser.pledges.map((pledge) => (
                    <div
                      key={pledge.id}
                      className="flex items-center justify-between rounded-xl border border-line bg-stone-50/50 p-3.5"
                    >
                      <div>
                        <p className="font-bold text-ink">
                          {pledge.campaignTitle}
                        </p>
                        <p className="text-[11px] text-ink-muted mt-0.5">
                          Số tiền giữ:{" "}
                          <strong className="text-forest">
                            {formatVnd(pledge.amount)}
                          </strong>{" "}
                          · Thời gian: {pledge.pledgedAt}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-1 text-[10px] font-bold">
                        {pledge.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-ink-muted">
                    <Coins className="mx-auto size-6 text-stone-300" />
                    <p className="mt-2 font-bold text-ink">
                      Chưa có lịch sử ủng hộ
                    </p>
                    <p className="text-xs">
                      Người dùng chưa thực hiện lệnh cam kết đóng góp nào.
                    </p>
                  </div>
                )}
              </div>
            )}

            {detailTab === "moderation" && (
              <div className="space-y-3 text-xs">
                {selectedUser.moderationActions &&
                selectedUser.moderationActions.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedUser.moderationActions.map((mod) => (
                      <div
                        key={mod.id}
                        className="rounded-xl border border-line bg-stone-50/60 p-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-forest">
                            {mod.action}
                          </span>
                          <span className="text-[11px] text-ink-muted">
                            {mod.createdAt}
                          </span>
                        </div>
                        <p className="mt-1 text-ink-soft">{mod.reason}</p>
                        <p className="mt-1 text-[10px] text-ink-muted">
                          Thực hiện bởi: <strong>{mod.adminName}</strong>
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-ink-muted">
                    <History className="mx-auto size-6 text-stone-300" />
                    <p className="mt-2 font-bold text-ink">
                      Chưa có lịch sử xử lý
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Modal 2: Suspend / Unlock Confirmation ─────────── */}
      {statusTargetUser && (
        <Modal
          open
          size="sm"
          title={`${
            statusTargetUser.status === "SUSPENDED" ? "Mở khóa" : "Khóa"
          } tài khoản ${statusTargetUser.name}`}
          description={`Tài khoản: ${statusTargetUser.email}`}
          onClose={() => setStatusTargetUser(null)}
          locked={busy === statusTargetUser.id}
        >
          <div className="space-y-4 text-xs">
            <p
              className={`rounded-xl border p-3.5 leading-relaxed ${
                statusTargetUser.status === "SUSPENDED"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {statusTargetUser.status === "SUSPENDED"
                ? "Người dùng sẽ có thể đăng nhập lại vào hệ thống, tiếp tục vận hành chiến dịch và thực hiện cam kết tài chính."
                : "Người dùng sẽ ngay lập tức bị chấm dứt phiên đăng nhập, không thể bình luận hay thực hiện cam kết mới. Dữ liệu đối soát vẫn được lưu trữ nguyên vẹn."}
            </p>

            <div>
              <label className="block font-bold text-ink mb-1.5">
                Lý do thực hiện (Bắt buộc lưu vết kiểm toán):
              </label>
              <select
                onChange={(e) => setStatusReason(e.target.value)}
                className="w-full rounded-xl border border-line bg-[#fbfbfa] p-2.5 text-xs text-ink outline-none mb-2"
              >
                <option value="">-- Chọn lý do mẫu hoặc tự nhập --</option>
                <option value="Vi phạm chính sách cộng đồng và điều khoản sử dụng">
                  Vi phạm chính sách cộng đồng & điều khoản
                </option>
                <option value="Phát hiện dấu hiệu gian lận thanh toán hoặc rủi ro thẻ">
                  Dấu hiệu gian lận thanh toán hoặc rủi ro
                </option>
                <option value="Spam nội dung hoặc gửi tin nhắn quấy rối thành viên khác">
                  Spam nội dung / quấy rối
                </option>
                <option value="Tài khoản đã hoàn tất xác minh bổ sung và được phục hồi">
                  Đã hoàn tất xác minh bổ sung (Mở khóa)
                </option>
                <option value="Yêu cầu tạm đóng tài khoản từ chính chủ tài khoản">
                  Yêu cầu từ chủ tài khoản
                </option>
              </select>
              <textarea
                rows={3}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Nhập chi tiết căn cứ xử lý tài khoản…"
                className="w-full rounded-xl border border-line p-2.5 text-xs text-ink outline-none focus:border-forest"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                disabled={busy === statusTargetUser.id}
                onClick={() => setStatusTargetUser(null)}
                className="button-ghost min-h-10 px-4 text-xs font-bold"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={busy === statusTargetUser.id}
                onClick={handleToggleStatus}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-xs font-extrabold text-white transition ${
                  statusTargetUser.status === "SUSPENDED"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {busy === statusTargetUser.id ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                {busy === statusTargetUser.id
                  ? "Đang lưu…"
                  : statusTargetUser.status === "SUSPENDED"
                    ? "Xác nhận mở khóa"
                    : "Xác nhận khóa tài khoản"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal 3: Fast Role Management ───────────────────── */}
      {roleTargetUser && (
        <Modal
          open
          size="sm"
          title={`Phân quyền tài khoản: ${roleTargetUser.name}`}
          description={`Email: ${roleTargetUser.email}`}
          onClose={() => setRoleTargetUser(null)}
          locked={busy === roleTargetUser.id}
        >
          <div className="space-y-4 text-xs">
            <p className="text-ink-muted">
              Chọn vai trò bạn muốn cấp thêm hoặc thu hồi từ tài khoản này:
            </p>

            <div className="space-y-2">
              <p className="font-bold text-ink">Vai trò toàn hệ thống:</p>
              {[
                {
                  id: "Quản trị viên",
                  label: "Quản trị viên (ADMIN)",
                  badge: "bg-purple-50 text-purple-700",
                },
                {
                  id: "Chủ dự án",
                  label: "Chủ dự án (CREATOR)",
                  badge: "bg-coral/10 text-coral-dark",
                },
                {
                  id: "Người ủng hộ",
                  label: "Người ủng hộ (BACKER)",
                  badge: "bg-blue-50 text-blue-700",
                },
              ].map((roleOption) => {
                const hasRole = roleTargetUser.roles.includes(roleOption.id);
                return (
                  <div
                    key={roleOption.id}
                    className="flex items-center justify-between rounded-xl border border-line bg-stone-50/60 p-3"
                  >
                    <div>
                      <span className="font-bold text-ink">
                        {roleOption.label}
                      </span>
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${roleOption.badge}`}
                      >
                        {hasRole ? "Đang có quyền" : "Chưa cấp"}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={busy === roleTargetUser.id}
                      onClick={() => handleToggleRole(roleOption.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        hasRole
                          ? "border border-red-200 text-red-700 hover:bg-red-50"
                          : "bg-forest text-white hover:bg-[#142d25]"
                      }`}
                    >
                      {hasRole ? "Gỡ quyền" : "Cấp quyền"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Project Collaborator Section in Fast Modal */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-amber-950">
                <Users className="size-4" />
                <span className="font-bold text-xs">
                  Cộng tác viên dự án (COLLABORATOR)
                </span>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                Quyền Cộng tác viên được phân quyền theo <strong>dự án cụ thể</strong> (không áp dụng chung).
              </p>

              {/* Current Collaborator Projects */}
              {roleTargetUser.campaignMembers &&
              roleTargetUser.campaignMembers.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  <p className="font-semibold text-[11px] text-ink">
                    Dự án đang làm cộng tác viên:
                  </p>
                  <div className="space-y-1.5">
                    {roleTargetUser.campaignMembers.map((cm) => (
                      <div
                        key={cm.campaignId}
                        className="flex items-center justify-between rounded-lg border border-amber-300 bg-white px-2.5 py-1.5"
                      >
                        <span className="font-semibold text-ink truncate max-w-[200px]" title={cm.campaignTitle}>
                          {cm.campaignTitle}
                        </span>
                        <button
                          type="button"
                          disabled={busy === roleTargetUser.id}
                          onClick={() =>
                            handleRemoveCollaborator(
                              roleTargetUser,
                              cm.campaignId,
                            )
                          }
                          className="text-[10px] font-bold text-red-700 hover:underline ml-2"
                        >
                          Gỡ quyền
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-ink-muted italic">
                  Chưa làm cộng tác viên dự án nào.
                </p>
              )}

              {/* Add Collaborator Form */}
              <div className="pt-2 border-t border-amber-200">
                <label className="block text-[11px] font-bold text-amber-950 mb-1">
                  Gán vào dự án:
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedCollaboratorCampaignId}
                    onChange={(e) =>
                      setSelectedCollaboratorCampaignId(e.target.value)
                    }
                    className="flex-1 rounded-lg border border-amber-300 bg-white p-1.5 text-xs text-ink outline-none"
                  >
                    <option value="">-- Chọn dự án --</option>
                    {(data.campaigns || [])
                      .filter(
                        (c) =>
                          c.creator?.id !== roleTargetUser.id &&
                          (c as any).creatorId !== roleTargetUser.id &&
                          !roleTargetUser.campaignMembers?.some(
                            (m) => m.campaignId === c.id,
                          ),
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={
                      !selectedCollaboratorCampaignId ||
                      busy === roleTargetUser.id
                    }
                    onClick={() =>
                      handleAssignCollaborator(
                        roleTargetUser,
                        selectedCollaboratorCampaignId,
                      )
                    }
                    className="rounded-lg bg-forest px-3 py-1.5 text-xs font-bold text-white hover:bg-[#142d25] disabled:opacity-50"
                  >
                    + Gán
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-ink mb-1">
                Lý do thay đổi quyền (Lưu nhật ký kiểm toán):
              </label>
              <input
                type="text"
                value={roleReason}
                onChange={(e) => setRoleReason(e.target.value)}
                placeholder="Ví dụ: Phê duyệt tham gia ban quản trị nền tảng…"
                className="input-field text-xs w-full"
              />
            </div>

            <div className="flex justify-end pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setRoleTargetUser(null)}
                className="button-ghost min-h-10 px-4 text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal 4: Reset Password ─────────────────────────── */}
      {resetTargetUser && (
        <Modal
          open
          size="sm"
          title={`Đặt lại mật khẩu cho ${resetTargetUser.name}`}
          description={`Tài khoản: ${resetTargetUser.email}`}
          onClose={() => setResetTargetUser(null)}
          locked={busy === resetTargetUser.id}
        >
          <div className="space-y-4 text-xs">
            <p className="text-ink-muted">
              Nhập mật khẩu tạm thời mới hoặc bấm nút tạo mật khẩu tự động bên
              dưới. Người dùng sẽ dùng mật khẩu này để đăng nhập lần kế tiếp.
            </p>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-ink">Mật khẩu mới:</label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] font-bold text-coral hover:underline"
                >
                  ⚡ Tạo mật khẩu ngẫu nhiên
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập ít nhất 8 ký tự…"
                  className="input-field text-xs w-full pr-10 font-mono"
                />
                {newPassword && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(newPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink-muted hover:text-ink"
                    title="Sao chép mật khẩu"
                  >
                    <Copy className="size-3.5" />
                  </button>
                )}
              </div>
              {copiedPassword && (
                <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
                  ✓ Đã sao chép vào bộ nhớ tạm!
                </span>
              )}
            </div>

            <div>
              <label className="block font-bold text-ink mb-1.5">
                Lý do đặt lại mật khẩu:
              </label>
              <input
                type="text"
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                placeholder="Ví dụ: Người dùng yêu cầu qua hotline hỗ trợ…"
                className="input-field text-xs w-full"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setResetTargetUser(null)}
                className="button-ghost min-h-10 px-4 text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={busy === resetTargetUser.id || newPassword.length < 8}
                onClick={handleResetPassword}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-forest px-4 text-xs font-bold text-white transition hover:bg-[#142d25] disabled:opacity-50"
              >
                {busy === resetTargetUser.id ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                <span>Xác nhận đổi mật khẩu</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal 5: Create User ────────────────────────────── */}
      {isCreateOpen && (
        <Modal
          open
          size="md"
          title="Tạo tài khoản người dùng mới"
          description="Tài khoản mới sẽ được cấp ngay quyền truy cập và sẵn sàng đăng nhập trên nền tảng."
          onClose={() => setIsCreateOpen(false)}
          locked={busy === "create"}
        >
          <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
            {createError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 font-medium">
                {createError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-bold text-ink mb-1.5">
                  Họ và tên hiển thị *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  placeholder="Ví dụ: Hoàng Hải Đăng"
                  className="input-field text-xs w-full"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1.5">
                  Email đăng nhập *
                </label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  placeholder="email@example.com"
                  className="input-field text-xs w-full"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1.5">
                  Mật khẩu ban đầu (tối thiểu 8 ký tự) *
                </label>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                  placeholder="Nhập mật khẩu an toàn…"
                  className="input-field text-xs w-full font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1.5">
                  Vai trò mặc định *
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, role: e.target.value })
                  }
                  className="w-full rounded-xl border border-line bg-[#fbfbfa] p-2.5 text-xs text-ink outline-none"
                >
                  <option value="Người ủng hộ">Người ủng hộ (BACKER)</option>
                  <option value="Chủ dự án">Chủ dự án (CREATOR)</option>
                  <option value="Quản trị viên">Quản trị viên (ADMIN)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1.5">
                  Số điện thoại liên hệ
                </label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, phone: e.target.value })
                  }
                  placeholder="0901 234 567"
                  className="input-field text-xs w-full"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1.5">
                  Địa điểm / Tỉnh thành
                </label>
                <input
                  type="text"
                  value={createForm.location}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, location: e.target.value })
                  }
                  placeholder="TP. Hồ Chí Minh"
                  className="input-field text-xs w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                disabled={busy === "create"}
                onClick={() => setIsCreateOpen(false)}
                className="button-ghost min-h-10 px-4 text-xs font-bold"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={busy === "create"}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-forest px-5 text-xs font-bold text-white transition hover:bg-[#142d25] disabled:opacity-50"
              >
                {busy === "create" ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <UserPlus className="size-3.5" />
                )}
                <span>Tạo tài khoản ngay</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}


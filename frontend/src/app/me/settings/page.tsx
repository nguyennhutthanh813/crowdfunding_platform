import { Bell, CreditCard, KeyRound, MapPin, User } from "lucide-react";
import { requireSystemPerm } from "@/server/auth/session";
import { hasSystemPerm } from "@/server/rbac/rbac";
import { settingsData } from "@/server/queries/me";
import { AdminOnlyNotice } from "@/components/me/admin-only-notice";
import {
  AccountSettingsForms,
  AddressesSection,
  CardsSection,
  PreferencesSettingsForm,
  ProfileSettingsForm,
} from "@/components/me/settings-forms";
import { PageHeader } from "@/components/ui/layout-bits";
import { LinkTabs, type TabItem } from "@/components/ui/tabs";

export const metadata = { title: "Cài đặt tài khoản" };

export default async function MySettingsPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const v = await requireSystemPerm("account.manage", "/me/settings");
  const canBack = hasSystemPerm(v, "pledge.create");
  const data = await settingsData();

  const sp = await props.searchParams;
  const requested = sp.tab ?? "profile";
  const allowed = new Set(["profile", "account", "notifications", "addresses", "cards"]);
  const activeTab = allowed.has(requested) ? requested : "profile";

  const tabs: TabItem[] = [
    { key: "profile", label: "Hồ sơ", icon: <User className="size-3.5" /> },
    { key: "account", label: "Tài khoản & bảo mật", icon: <KeyRound className="size-3.5" /> },
    { key: "notifications", label: "Thông báo & riêng tư", icon: <Bell className="size-3.5" /> },
  ];
  if (canBack) {
    tabs.push(
      { key: "addresses", label: "Địa chỉ", count: data.addresses.length, icon: <MapPin className="size-3.5" /> },
      { key: "cards", label: "Thẻ thanh toán", count: data.cards.length, icon: <CreditCard className="size-3.5" /> },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tài khoản & Bảo mật"
        title="Cài đặt tài khoản"
        description="Quản lý hồ sơ cá nhân, bảo mật đăng nhập 2FA, tuỳ chọn thông báo, địa chỉ và thẻ thanh toán."
      />

      <LinkTabs id="settings-tabs" param="tab" active={activeTab} items={tabs} />

      {activeTab === "profile" && <ProfileSettingsForm user={data.user} />}
      {activeTab === "account" && (
        <AccountSettingsForms
          user={data.user}
          sessionsCount={data.sessions}
          twoFactor={data.twoFactor}
          sessionList={data.sessionList}
        />
      )}
      {activeTab === "notifications" && <PreferencesSettingsForm settings={data.settings} />}
      {activeTab === "addresses" &&
        (canBack ? <AddressesSection addresses={data.addresses} /> : <AdminOnlyNotice area="Địa chỉ giao hàng" />)}
      {activeTab === "cards" &&
        (canBack ? <CardsSection cards={data.cards} /> : <AdminOnlyNotice area="Thẻ thanh toán" />)}
    </div>
  );
}

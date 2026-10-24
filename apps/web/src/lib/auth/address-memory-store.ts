import type { UserAddress } from "@/lib/api/contracts";

const globalAddressesMap = new Map<string, UserAddress[]>();

export function getMemoryAddresses(
  userId: string,
  _defaultName?: string,
  _defaultPhone?: string,
): UserAddress[] {
  if (!globalAddressesMap.has(userId)) {
    globalAddressesMap.set(userId, []);
  }
  const list = globalAddressesMap.get(userId) || [];
  // Dọn dẹp bỏ địa chỉ mẫu mock (nếu đã lưu từ trước trong bộ nhớ)
  const cleaned = list.filter((a) => !a.id.startsWith("addr_default_"));
  if (cleaned.length !== list.length) {
    globalAddressesMap.set(userId, cleaned);
  }
  return cleaned;
}

export function addMemoryAddress(
  userId: string,
  data: {
    recipientName: string;
    phone: string;
    line1: string;
    ward?: string | null;
    district?: string | null;
    province: string;
    isDefault?: boolean;
    countryCode?: string;
  },
): UserAddress {
  const list = getMemoryAddresses(userId);
  if (data.isDefault) {
    list.forEach((a) => {
      a.isDefault = false;
    });
  }
  const newAddr: UserAddress = {
    id: `addr_${Date.now()}`,
    recipientName: data.recipientName,
    phone: data.phone,
    line1: data.line1,
    ward: data.ward ?? null,
    district: data.district ?? null,
    province: data.province,
    countryCode: data.countryCode || "VN",
    isDefault: Boolean(data.isDefault) || list.length === 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  list.unshift(newAddr);
  globalAddressesMap.set(userId, list);
  return newAddr;
}

export function updateMemoryAddress(
  userId: string,
  addressId: string,
  patch: Partial<UserAddress>,
): UserAddress | null {
  const list = getMemoryAddresses(userId);
  const index = list.findIndex((a) => a.id === addressId);
  if (index === -1) return null;

  if (patch.isDefault) {
    list.forEach((a) => {
      a.isDefault = false;
    });
  }
  list[index] = {
    ...list[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  globalAddressesMap.set(userId, list);
  return list[index];
}

export function deleteMemoryAddress(
  userId: string,
  addressId: string,
): boolean {
  const list = getMemoryAddresses(userId);
  const filtered = list.filter((a) => a.id !== addressId);
  if (filtered.length > 0 && !filtered.some((a) => a.isDefault)) {
    filtered[0].isDefault = true;
  }
  globalAddressesMap.set(userId, filtered);
  return true;
}

export function clearMemoryAddresses(userId: string): void {
  globalAddressesMap.delete(userId);
}

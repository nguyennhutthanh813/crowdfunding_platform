import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const vnd = new Intl.NumberFormat("vi-VN");
export const formatVnd = (n: number) => `${vnd.format(Math.round(n))}đ`;

/** 1.250.000.000 → "1,25 tỷ" · 85.400.000 → "85,4 tr" */
export function formatCompactVnd(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ`;
  if (n >= 1e6) return `${(n / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
  if (n >= 1e3) return `${(n / 1e3).toLocaleString("vi-VN", { maximumFractionDigits: 0 })}k`;
  return vnd.format(n);
}
export const formatNumber = (n: number) => vnd.format(n);

export const percentOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export function formatDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** "3 phút trước", "2 ngày trước", "trong 5 ngày" */
export function timeAgo(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536e6], ["month", 2592e6], ["week", 6048e5], ["day", 864e5], ["hour", 36e5], ["minute", 6e4]];
  for (const [u, ms] of units) if (abs >= ms) return rtf.format(Math.round(diff / ms), u);
  return "vừa xong";
}

/** Thời gian còn lại của chiến dịch: { value, unit, label } */
export function timeLeft(endIso: string | null | undefined, now = Date.now()) {
  if (!endIso) return { value: 0, unit: "ngày", label: "—", ended: true };
  const ms = new Date(endIso).getTime() - now;
  if (ms <= 0) return { value: 0, unit: "ngày", label: "Đã kết thúc", ended: true };
  const days = Math.floor(ms / 864e5);
  if (days >= 1) return { value: days, unit: "ngày", label: `Còn ${days} ngày`, ended: false };
  const hours = Math.floor(ms / 36e5);
  if (hours >= 1) return { value: hours, unit: "giờ", label: `Còn ${hours} giờ`, ended: false };
  return { value: Math.max(1, Math.floor(ms / 6e4)), unit: "phút", label: "Sắp kết thúc", ended: false };
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]?.toUpperCase()).join("");

export const COUNTRY_NAMES: Record<string, string> = {
  VN: "Việt Nam", US: "Hoa Kỳ", JP: "Nhật Bản", KR: "Hàn Quốc", AU: "Úc", DE: "Đức", FR: "Pháp",
  SG: "Singapore", CA: "Canada", GB: "Anh", TW: "Đài Loan",
};
export const flagOf = (cc: string) =>
  cc.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

export function slugify(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

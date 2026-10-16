/**
 * Tiện ích định dạng số/tiền/ngày cho giao diện tiếng Việt.
 * Ported from crowdfunding-ai-platform/src/lib/format.ts
 */

export function formatVnd(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000_000)
      return `${(value / 1_000_000_000).toFixed(2)} tỷ đ`;
    if (value >= 1_000_000) return `${Math.round(value / 1_000_000)} triệu đ`;
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function fundingPercent(pledged: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.max(0, Math.round((pledged / goal) * 100));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

export function formatDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  },
): string {
  return new Intl.DateTimeFormat('vi-VN', options).format(new Date(value));
}

export function formatVietnameseDateTime(value: string | Date): string {
  const moment = new Date(value);
  const date = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(moment);
  const time = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(moment);
  return `${date} lúc ${time}`;
}

/**
 * Compact VND alias — compatible with existing utils.ts formatVND
 */
export { formatVnd as formatVND };

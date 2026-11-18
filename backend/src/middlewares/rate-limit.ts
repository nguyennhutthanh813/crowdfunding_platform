import type { NextFunction, Request, Response } from "express";

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

function clientKey(req: Request): string {
  const fwd = typeof req.headers["x-forwarded-for"] === "string" ? req.headers["x-forwarded-for"].split(",")[0].trim() : "";
  return fwd || req.ip || "unknown";
}

/**
 * Giới hạn số lần gọi theo IP (cửa sổ trượt). Dùng cho các route nhạy cảm như đăng nhập, OTP.
 * Lưu trong bộ nhớ từng instance nên chỉ là lớp chặn cơ bản; khi có Redis có thể thay phần lưu trữ.
 */
export function rateLimit(opts: { name: string; max: number; windowMs: number; message?: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${opts.name}:${clientKey(req)}`;
    const now = Date.now();
    const bucket = buckets.get(key) ?? { hits: [] };
    bucket.hits = bucket.hits.filter((t) => now - t < opts.windowMs);

    if (bucket.hits.length >= opts.max) {
      const retryAfter = Math.max(1, Math.ceil((opts.windowMs - (now - bucket.hits[0])) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        ok: false,
        code: "RATE_LIMITED",
        retryAfter,
        error: opts.message ?? `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${retryAfter} giây.`,
      });
      return;
    }

    bucket.hits.push(now);
    buckets.set(key, bucket);

    // Dọn bộ nhớ thỉnh thoảng để Map không phình mãi
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) {
        if (b.hits.every((t) => now - t >= opts.windowMs)) buckets.delete(k);
      }
    }
    next();
  };
}

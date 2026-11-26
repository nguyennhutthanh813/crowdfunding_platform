import "dotenv/config";

function cleanSecret(val: string | undefined): string {
  return (val ?? "").trim();
}

const vercelHost =
  cleanSecret(process.env.VERCEL_PROJECT_PRODUCTION_URL) || cleanSecret(process.env.VERCEL_URL);
const defaultBackendUrl = vercelHost
  ? `https://${vercelHost.replace(/^https?:\/\//, "")}`
  : `http://localhost:${process.env.PORT || 4000}`;

const frontendUrl = cleanSecret(process.env.FRONTEND_URL) || "http://localhost:3000";
const rawCors = (process.env.CORS_ORIGINS || frontendUrl)
  .split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);
const normalizedFrontend = frontendUrl.replace(/\/+$/, "");
if (normalizedFrontend && !rawCors.includes(normalizedFrontend)) {
  rawCors.push(normalizedFrontend);
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  isVercel: Boolean(process.env.VERCEL),
  frontendUrl: normalizedFrontend,
  backendPublicUrl: (cleanSecret(process.env.BACKEND_PUBLIC_URL) || defaultBackendUrl).replace(/\/+$/, ""),
  corsOrigins: rawCors,

  // Supabase
  supabaseUrl: cleanSecret(process.env.SUPABASE_URL),
  supabasePublishableKey: cleanSecret(process.env.SUPABASE_PUBLISHABLE_KEY),
  databaseUrl: cleanSecret(process.env.DATABASE_URL),

  // JWT & 2FA
  jwtSecret: cleanSecret(process.env.JWT_SECRET) || "fundviet-dev-jwt-secret-change-in-production-64chars",
  jwtRefreshSecret:
    cleanSecret(process.env.JWT_REFRESH_SECRET) || "fundviet-dev-refresh-secret-change-in-production-64chars",
  jwtAccessExpiresIn: cleanSecret(process.env.JWT_ACCESS_EXPIRES_IN) || "2h",
  jwtRefreshExpiresIn: cleanSecret(process.env.JWT_REFRESH_EXPIRES_IN) || "14d",
  totpIssuer: cleanSecret(process.env.TOTP_ISSUER) || "FundViet",

  // VNPAY Sandbox
  vnpTmnCode: cleanSecret(process.env.VNP_TMN_CODE) || "FUNDVIET",
  vnpHashSecret:
    cleanSecret(process.env.VNP_HASH_SECRET) ||
    cleanSecret(process.env.JWT_SECRET) ||
    "FUNDVIETVNPAYSANDBOXSECRETKEY2026HMACSHA512",

  // Cloudinary
  cloudinaryCloudName: cleanSecret(process.env.CLOUDINARY_CLOUD_NAME),
  cloudinaryApiKey: cleanSecret(process.env.CLOUDINARY_API_KEY),
  cloudinaryApiSecret: cleanSecret(process.env.CLOUDINARY_API_SECRET),
  cloudinaryFolder: cleanSecret(process.env.CLOUDINARY_FOLDER) || "fundviet",

  // Gmail SMTP
  smtpHost: cleanSecret(process.env.SMTP_HOST) || "smtp.gmail.com",
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpSecure: (process.env.SMTP_SECURE || "true").toLowerCase() !== "false",
  smtpUser: cleanSecret(process.env.SMTP_USER),
  smtpPass: cleanSecret(process.env.SMTP_PASS).replace(/\s+/g, ""),
  mailFrom: cleanSecret(process.env.MAIL_FROM) || `FundViet <${cleanSecret(process.env.SMTP_USER) || "noreply@fundviet.vn"}>`,

  // LLM (DeepSeek, giao thức tương thích OpenAI)
  llmApiKey: cleanSecret(process.env.DEEPSEEK_API_KEY) || cleanSecret(process.env.LLM_API_KEY),
  llmBaseUrl: (cleanSecret(process.env.DEEPSEEK_BASE_URL) || "https://api.deepseek.com").replace(/\/+$/, ""),
  llmModel: cleanSecret(process.env.DEEPSEEK_MODEL) || "deepseek-chat",
  llmEnabled: (process.env.LLM_ENABLED || "true").toLowerCase() !== "false",
  llmTimeoutMs: Number(process.env.LLM_TIMEOUT_MS || 12000),
};

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.warn("[env] Cảnh báo: chưa đặt JWT_SECRET, đang dùng khoá mặc định. Hãy khai báo biến môi trường trên máy chủ.");
}

export const isPostgresConfigured = () => Boolean(env.databaseUrl && /^postgres(ql)?:\/\//i.test(env.databaseUrl));
export const isCloudinaryConfigured = () =>
  Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret);
export const isSmtpConfigured = () => Boolean(env.smtpHost && env.smtpUser && env.smtpPass);
/** LLM chỉ bật khi có API key, không tắt thủ công và không chạy trong bộ test offline (trừ khi bật LLM_ALLOW_IN_TESTS). */
export const isLlmConfigured = () =>
  Boolean(
    env.llmEnabled &&
      env.llmApiKey &&
      (process.env.FUNDVIET_TEST_SQLITE !== "1" || process.env.LLM_ALLOW_IN_TESTS === "1"),
  );

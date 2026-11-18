import "dotenv/config";

function cleanSecret(val: string | undefined): string {
  return (val ?? "").trim();
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  frontendUrl: cleanSecret(process.env.FRONTEND_URL) || "http://localhost:3000",
  backendPublicUrl: cleanSecret(process.env.BACKEND_PUBLIC_URL) || `http://localhost:${process.env.PORT || 4000}`,
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  // Supabase
  supabaseUrl: cleanSecret(process.env.SUPABASE_URL),
  supabasePublishableKey: cleanSecret(process.env.SUPABASE_PUBLISHABLE_KEY),
  databaseUrl: cleanSecret(process.env.DATABASE_URL),

  // JWT & 2FA
  jwtSecret: cleanSecret(process.env.JWT_SECRET) || "fundviet-dev-jwt-secret-change-in-production-64chars",
  jwtRefreshSecret:
    cleanSecret(process.env.JWT_REFRESH_SECRET) || "fundviet-dev-refresh-secret-change-in-production-64chars",
  jwtAccessExpiresIn: cleanSecret(process.env.JWT_ACCESS_EXPIRES_IN) || "15m",
  jwtRefreshExpiresIn: cleanSecret(process.env.JWT_REFRESH_EXPIRES_IN) || "7d",
  totpIssuer: cleanSecret(process.env.TOTP_ISSUER) || "FundViet",

  // Cloudinary
  cloudinaryCloudName: cleanSecret(process.env.CLOUDINARY_CLOUD_NAME),
  cloudinaryApiKey: cleanSecret(process.env.CLOUDINARY_API_KEY),
  cloudinaryApiSecret: cleanSecret(process.env.CLOUDINARY_API_SECRET),
  cloudinaryFolder: cleanSecret(process.env.CLOUDINARY_FOLDER) || "fundviet",

  // Gmail SMTP (App passwords from Google have spaces every 4 chars — strip spaces automatically)
  smtpHost: cleanSecret(process.env.SMTP_HOST) || "smtp.gmail.com",
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpSecure: (process.env.SMTP_SECURE || "true").toLowerCase() !== "false",
  smtpUser: cleanSecret(process.env.SMTP_USER),
  smtpPass: cleanSecret(process.env.SMTP_PASS).replace(/\s+/g, ""),
  mailFrom: cleanSecret(process.env.MAIL_FROM) || `FundViet <${cleanSecret(process.env.SMTP_USER) || "noreply@fundviet.vn"}>`,
};

export const isPostgresConfigured = () => Boolean(env.databaseUrl && /^postgres(ql)?:\/\//i.test(env.databaseUrl));
export const isCloudinaryConfigured = () =>
  Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret);
export const isSmtpConfigured = () => Boolean(env.smtpHost && env.smtpUser && env.smtpPass);

#!/usr/bin/env node
/**
 * Bộ điều phối Auto-Deploy lên Vercel cho cả Backend (Express) và Frontend (Next.js).
 * Chạy tự động trong GitHub Actions mỗi khi có git push / pull_request, hoặc chạy trực tiếp ở máy local.
 */

import { execFileSync, execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = process.cwd();
const API_BASE = "https://api.vercel.com";

function parseArgs(argv) {
  const out = { target: "auto", env: "production" };
  for (const arg of argv) {
    if (arg.startsWith("--target=")) out.target = arg.slice("--target=".length);
    if (arg.startsWith("--env=")) out.env = arg.slice("--env=".length);
  }
  return out;
}

function parseDotEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const map = {};
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val !== "") map[key] = val;
  }
  return map;
}

async function vercelApi(token, path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Vercel API ${opts.method ?? "GET"} ${path} (${res.status}): ${data?.error?.message ?? JSON.stringify(data)}`);
  }
  return data;
}

async function resolveScope(token) {
  if (process.env.VERCEL_ORG_ID) return process.env.VERCEL_ORG_ID.trim();
  const { user } = await vercelApi(token, "/v2/user");
  return user.defaultTeamId || user.id;
}

function teamQuery(scopeId) {
  return scopeId.startsWith("team_") ? `?teamId=${encodeURIComponent(scopeId)}` : "";
}

async function ensureProject(token, scopeId, name, framework) {
  const qs = teamQuery(scopeId);
  try {
    const existing = await vercelApi(token, `/v9/projects/${encodeURIComponent(name)}${qs}`);
    // Đảm bảo cấu hình chuẩn Node 24.x và tắt SSO wall để gọi API công khai
    if (existing.nodeVersion !== "24.x" || existing.rootDirectory !== null || existing.framework !== framework) {
      return await vercelApi(token, `/v9/projects/${encodeURIComponent(existing.id)}${qs}`, {
        method: "PATCH",
        body: { framework, nodeVersion: "24.x", rootDirectory: null, ssoProtection: null },
      });
    }
    return existing;
  } catch {
    return await vercelApi(token, `/v10/projects${qs}`, {
      method: "POST",
      body: { name, framework, ssoProtection: null },
    });
  }
}

async function getProductionDomain(token, scopeId, projectIdOrName, fallbackSlug) {
  const qs = teamQuery(scopeId);
  try {
    const { domains } = await vercelApi(token, `/v9/projects/${encodeURIComponent(projectIdOrName)}/domains${qs}`);
    const prod = (domains ?? []).find((d) => d.verified !== false && d.name?.endsWith(".vercel.app")) ?? domains?.[0];
    if (prod?.name) return `https://${prod.name}`;
  } catch {
    // fallback bên dưới
  }
  return `https://${fallbackSlug}.vercel.app`;
}

async function upsertProjectEnvs(token, scopeId, projectId, entries) {
  const valid = entries.filter((e) => e.key && e.value !== undefined && String(e.value).trim() !== "");
  if (valid.length === 0) return;
  const qs = scopeId.startsWith("team_")
    ? `?teamId=${encodeURIComponent(scopeId)}&upsert=true`
    : "?upsert=true";
  await vercelApi(token, `/v10/projects/${encodeURIComponent(projectId)}/env${qs}`, {
    method: "POST",
    body: valid.map((e) => ({
      key: e.key,
      value: String(e.value),
      type: e.secret ? "encrypted" : "plain",
      target: ["production", "preview", "development"],
    })),
  });
}

function detectChangedTargets(requestedTarget) {
  if (requestedTarget === "backend") return { backend: true, frontend: false, reason: "Chỉ định thủ công backend" };
  if (requestedTarget === "frontend") return { backend: false, frontend: true, reason: "Chỉ định thủ công frontend" };
  if (requestedTarget === "all") return { backend: true, frontend: true, reason: "Triển khai toàn bộ hệ thống" };

  const before = process.env.GITHUB_EVENT_BEFORE || "";
  const sha = process.env.GITHUB_SHA || "HEAD";
  if (!before || /^0+$/.test(before)) {
    return { backend: true, frontend: true, reason: "Nhánh mới hoặc lần khởi tạo đầu tiên" };
  }

  try {
    const diffOut = execSync(`git diff --name-only ${before} ${sha}`, { cwd: ROOT, encoding: "utf8" }).trim();
    if (!diffOut) return { backend: true, frontend: true, reason: "Không xác định được diff, cập nhật toàn bộ" };
    const files = diffOut.split(/\r?\n/).filter(Boolean);
    const sharedChanged = files.some(
      (f) => f === "package.json" || f === "pnpm-lock.yaml" || f.startsWith(".github/workflows/deploy-vercel") || f.startsWith(".github/scripts/vercel-deploy"),
    );
    if (sharedChanged) {
      return { backend: true, frontend: true, reason: "Thay đổi cấu hình dùng chung ở thư mục gốc" };
    }
    const backend = files.some((f) => f.startsWith("backend/"));
    const frontend = files.some((f) => f.startsWith("frontend/"));
    return {
      backend,
      frontend,
      reason: `Phát hiện ${files.length} tệp thay đổi (backend=${backend}, frontend=${frontend})`,
    };
  } catch {
    return { backend: true, frontend: true, reason: "Fallback cập nhật cả hai dịch vụ" };
  }
}

function stageAppDirectory(srcDir, kind) {
  const dest = join(tmpdir(), `fv-vercel-${kind}-${Date.now()}`);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });

  cpSync(srcDir, dest, {
    recursive: true,
    filter: (source) => {
      const norm = source.replace(/\\/g, "/");
      if (norm.includes("/node_modules") || norm.includes("/.next") || norm.includes("/dist") || norm.includes("/.vercel")) {
        return false;
      }
      if (norm.endsWith("/.env") || norm.endsWith("/.env.local")) return false;
      if (kind === "backend" && (norm.includes("/backend/public") || norm.includes("/backend/.data") || norm.includes("/backend/scripts"))) {
        return false;
      }
      return true;
    },
  });
  return dest;
}

function runVercelCli(cwd, scopeId, projectId, token, isProd) {
  const env = {
    ...process.env,
    VERCEL_TOKEN: token,
    VERCEL_ORG_ID: scopeId,
    VERCEL_PROJECT_ID: projectId,
  };
  const vercelBin = process.platform === "win32" ? "vercel.cmd" : "vercel";
  const targetEnv = isProd ? "production" : "preview";

  console.log(`  → vercel pull (${targetEnv})...`);
  execFileSync(vercelBin, ["pull", "--yes", `--environment=${targetEnv}`], { cwd, env, stdio: "inherit" });

  console.log(`  → vercel build${isProd ? " --prod" : ""}...`);
  execFileSync(vercelBin, ["build", ...(isProd ? ["--prod"] : []), "--yes"], { cwd, env, stdio: "inherit" });

  console.log(`  → vercel deploy --prebuilt${isProd ? " --prod" : ""}...`);
  const stdout = execFileSync(vercelBin, ["deploy", "--prebuilt", ...(isProd ? ["--prod"] : []), "--yes"], {
    cwd,
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  const urls = stdout.trim().split(/\s+/).filter((s) => s.startsWith("https://"));
  return urls[urls.length - 1] || stdout.trim();
}

async function verifyUrl(url, label) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const r = await fetch(url, { redirect: "follow" });
      if (r.status >= 200 && r.status < 400) {
        console.log(`  ✓ Kiểm tra ${label} (${url}) -> HTTP ${r.status}`);
        return true;
      }
    } catch {
      // Thử lại sau cold-start
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.warn(`  ! Không thể xác nhận ngay ${label} (${url}), dịch vụ có thể đang khởi tạo.`);
  return false;
}

function writeSummary(markdown) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    appendFileSync(summaryPath, `${markdown}\n`, "utf8");
  }
}

function writeOutput(key, value) {
  const outPath = process.env.GITHUB_OUTPUT;
  if (outPath && value) {
    appendFileSync(outPath, `${key}=${value}\n`, "utf8");
  }
}

async function triggerDeployHooksIfConfigured(targets) {
  const beHook = (process.env.VERCEL_BACKEND_DEPLOY_HOOK || "").trim();
  const feHook = (process.env.VERCEL_FRONTEND_DEPLOY_HOOK || "").trim();
  let triggered = false;
  if (targets.backend && beHook.startsWith("https://")) {
    await fetch(beHook, { method: "POST" });
    console.log("✓ Đã kích hoạt Vercel Deploy Hook cho Backend.");
    triggered = true;
  }
  if (targets.frontend && feHook.startsWith("https://")) {
    await fetch(feHook, { method: "POST" });
    console.log("✓ Đã kích hoạt Vercel Deploy Hook cho Frontend.");
    triggered = true;
  }
  return triggered;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const isProd = args.env === "production";
  const targets = detectChangedTargets(args.target);
  console.log(`▶ Chế độ Auto-Deploy (${args.env}): ${targets.reason}`);

  if (!targets.backend && !targets.frontend) {
    const msg = "Không có thay đổi trong `backend/` hoặc `frontend/` (chỉ thay đổi tài liệu) — bỏ qua bước deploy.";
    console.log(msg);
    writeSummary(`### ⏭️ Auto-Deploy Vercel\n${msg}`);
    return;
  }

  // Hỗ trợ thêm chế độ Deploy Hook nếu người dùng chỉ cấu hình Webhook URL
  const token = (process.env.VERCEL_TOKEN || "").trim();
  if (!token) {
    const hooked = await triggerDeployHooksIfConfigured(targets);
    if (hooked) {
      writeSummary("### 🚀 Đã kích hoạt Vercel Deploy Hooks thành công!");
      return;
    }
    const guide = [
      "### ⚠️ Chưa cấu hình `VERCEL_TOKEN` trong GitHub Secrets",
      "Luồng Auto-Deploy đã sẵn sàng nhưng cần khoá xác thực để đẩy tự động lên Vercel:",
      "1. Tạo mã token tại **https://vercel.com/account/tokens**.",
      "2. Mở GitHub Repo → **Settings → Secrets and variables → Actions → New repository secret**.",
      "3. Thêm secret tên **`VERCEL_TOKEN`** (giá trị là token vừa tạo).",
      "4. Từ lần `git push` tiếp theo (hoặc nhấn **Re-run jobs**), cả `fundviet-backend` và `fundviet-frontend` sẽ tự động cập nhật ngay lập tức!",
    ].join("\n");
    console.warn(guide);
    writeSummary(guide);
    return;
  }

  const scopeId = await resolveScope(token);
  const backendName = (process.env.VERCEL_BACKEND_PROJECT_NAME || "fundviet-backend").trim();
  const frontendName = (process.env.VERCEL_FRONTEND_PROJECT_NAME || "fundviet-frontend").trim();

  console.log(`▶ Đang đồng bộ cấu hình Project trên Vercel (Scope: ${scopeId})...`);
  const beProject = await ensureProject(token, scopeId, process.env.VERCEL_BACKEND_PROJECT_ID || backendName, "express");
  const feProject = await ensureProject(token, scopeId, process.env.VERCEL_FRONTEND_PROJECT_ID || frontendName, "nextjs");

  // Nạp biến môi trường từ local .env hoặc GitHub Secrets (nếu có) mà không bao giờ in giá trị nhạy cảm ra log
  const localBeEnv = parseDotEnv(join(ROOT, "backend", ".env"));
  const localFeEnv = parseDotEnv(join(ROOT, "frontend", ".env.local"));
  const pick = (key) => process.env[key] || localBeEnv[key] || localFeEnv[key];

  await upsertProjectEnvs(token, scopeId, beProject.id, [
    { key: "JWT_SECRET", value: pick("JWT_SECRET"), secret: true },
    { key: "JWT_REFRESH_SECRET", value: pick("JWT_REFRESH_SECRET"), secret: true },
    { key: "DATABASE_URL", value: pick("DATABASE_URL"), secret: true },
    { key: "SUPABASE_URL", value: pick("SUPABASE_URL") || pick("NEXT_PUBLIC_SUPABASE_URL"), secret: false },
    { key: "SUPABASE_PUBLISHABLE_KEY", value: pick("SUPABASE_PUBLISHABLE_KEY") || pick("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), secret: false },
    { key: "CLOUDINARY_CLOUD_NAME", value: pick("CLOUDINARY_CLOUD_NAME"), secret: false },
    { key: "CLOUDINARY_API_KEY", value: pick("CLOUDINARY_API_KEY"), secret: true },
    { key: "CLOUDINARY_API_SECRET", value: pick("CLOUDINARY_API_SECRET"), secret: true },
    { key: "SMTP_HOST", value: pick("SMTP_HOST"), secret: false },
    { key: "SMTP_PORT", value: pick("SMTP_PORT"), secret: false },
    { key: "SMTP_SECURE", value: pick("SMTP_SECURE"), secret: false },
    { key: "SMTP_USER", value: pick("SMTP_USER"), secret: false },
    { key: "SMTP_PASS", value: pick("SMTP_PASS"), secret: true },
    { key: "MAIL_FROM", value: pick("MAIL_FROM"), secret: false },
  ]);

  let backendDeployUrl = "";
  let backendProdDomain = await getProductionDomain(token, scopeId, beProject.id, beProject.name);

  if (targets.backend) {
    console.log(`\n▶ [1/2] Đang build & deploy Backend (${beProject.name})...`);
    const stagedBe = stageAppDirectory(resolve(ROOT, "backend"), "backend");
    try {
      backendDeployUrl = runVercelCli(stagedBe, scopeId, beProject.id, token, isProd);
      backendProdDomain = await getProductionDomain(token, scopeId, beProject.id, beProject.name);
      console.log(`✓ Backend đã triển khai: ${isProd ? backendProdDomain : backendDeployUrl}`);
    } finally {
      rmSync(stagedBe, { recursive: true, force: true });
    }
  }

  const effectiveBackendUrl = (isProd ? backendProdDomain : backendDeployUrl || backendProdDomain).replace(/\/+$/, "");

  // Luôn đồng bộ URL Backend mới nhất sang Frontend trước khi build Frontend
  await upsertProjectEnvs(token, scopeId, feProject.id, [
    { key: "BACKEND_URL", value: effectiveBackendUrl, secret: false },
    { key: "NEXT_PUBLIC_API_URL", value: `${effectiveBackendUrl}/api/v1`, secret: false },
    { key: "NEXT_PUBLIC_SUPABASE_URL", value: pick("NEXT_PUBLIC_SUPABASE_URL") || pick("SUPABASE_URL"), secret: false },
    {
      key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      value: pick("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || pick("SUPABASE_PUBLISHABLE_KEY"),
      secret: false,
    },
  ]);

  let frontendDeployUrl = "";
  let frontendProdDomain = await getProductionDomain(token, scopeId, feProject.id, feProject.name);

  if (targets.frontend) {
    console.log(`\n▶ [2/2] Đang build & deploy Frontend (${feProject.name})...`);
    const stagedFe = stageAppDirectory(resolve(ROOT, "frontend"), "frontend");
    try {
      // Ghi .env.production cục bộ trong bản tạm để Next.js nhận ngay BACKEND_URL mới nhất trong cùng 1 lần chạy
      writeFileSync(
        join(stagedFe, ".env.production"),
        `BACKEND_URL=${effectiveBackendUrl}\nNEXT_PUBLIC_API_URL=${effectiveBackendUrl}/api/v1\n`,
        "utf8",
      );
      frontendDeployUrl = runVercelCli(stagedFe, scopeId, feProject.id, token, isProd);
      frontendProdDomain = await getProductionDomain(token, scopeId, feProject.id, feProject.name);
      console.log(`✓ Frontend đã triển khai: ${isProd ? frontendProdDomain : frontendDeployUrl}`);
    } finally {
      rmSync(stagedFe, { recursive: true, force: true });
    }
  }

  const effectiveFrontendUrl = (isProd ? frontendProdDomain : frontendDeployUrl || frontendProdDomain).replace(/\/+$/, "");

  // Đồng bộ ngược FRONTEND_URL sang Backend cho CORS & link email OTP
  await upsertProjectEnvs(token, scopeId, beProject.id, [
    { key: "FRONTEND_URL", value: effectiveFrontendUrl, secret: false },
    { key: "BACKEND_PUBLIC_URL", value: effectiveBackendUrl, secret: false },
  ]);

  // Kiểm tra sức khoẻ thực tế sau khi deploy
  if (targets.backend) await verifyUrl(`${effectiveBackendUrl}/api/v1/health`, "Backend Health");
  if (targets.frontend) await verifyUrl(effectiveFrontendUrl, "Frontend Web");

  writeOutput("backend_url", effectiveBackendUrl);
  writeOutput("frontend_url", effectiveFrontendUrl);

  writeSummary(
    [
      `## 🚀 Kết quả Auto-Deploy Vercel (${isProd ? "Production" : "Preview"})`,
      `| Dịch vụ | Trạng thái | Đường dẫn truy cập |`,
      `| :--- | :--- | :--- |`,
      `| **Backend API** (\`${beProject.name}\`) | ${targets.backend ? "✅ Đã cập nhật mới" : "⏭️ Giữ nguyên (không đổi)"} | ${effectiveBackendUrl} ([/api/v1/health](${effectiveBackendUrl}/api/v1/health)) |`,
      `| **Frontend Web** (\`${feProject.name}\`) | ${targets.frontend ? "✅ Đã cập nhật mới" : "⏭️ Giữ nguyên (không đổi)"} | ${effectiveFrontendUrl} |`,
    ].join("\n"),
  );
}

main().catch((err) => {
  console.error("❌ Lỗi triển khai Vercel:", err);
  process.exit(1);
});

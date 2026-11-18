import { env } from "./config/env.js";
import { getDb } from "./db/index.js";
import { createApp } from "./app.js";

const app = createApp();

// Khởi động kết nối DB (Supabase PostgreSQL hoặc SQLite cục bộ tự seed 4 tài khoản chuẩn + dữ liệu dự án)
const db = getDb();

app.listen(env.port, () => {
  console.log(`[fundviet-backend] Đang chạy tại http://localhost:${env.port} (DB: ${db.engine})`);
});

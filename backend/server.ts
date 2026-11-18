import express from "express";
import { env } from "./src/config/env.js";
import { getDb } from "./src/db/index.js";
import { createApp } from "./src/app.js";

void express;
const app = createApp();

if (!env.isVercel) {
  const db = getDb();
  app.listen(env.port, () => {
    console.log(`[fundviet-backend] Đang chạy tại http://localhost:${env.port} (DB: ${db.engine})`);
  });
}

export default app;

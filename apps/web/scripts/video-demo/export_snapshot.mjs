// VACUUM INTO lấy snapshot nhất quán từ DB video đang ở chế độ WAL.
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const sourcePath = resolve(root, ".local-data/gop-video-20261101.sqlite");
const destinationPath = resolve(root, "docs/demo-local/gop-video-snapshot-2026-11-01.sqlite");
if (!existsSync(sourcePath)) throw new Error("Không tìm thấy DB của lần quay.");
if (existsSync(destinationPath)) throw new Error("Snapshot đã có; không ghi đè khi chưa kiểm bản cũ.");

const source = new DatabaseSync(sourcePath);
source.exec(`VACUUM INTO '${destinationPath.replaceAll("'", "''")}'`);
source.close();
const snapshot = new DatabaseSync(destinationPath);
const id = "cmp_preview_278bebc1cd32";
const campaign = snapshot.prepare("select id,status,pledged_amount from campaigns where id=?").get(id);
const pledges = snapshot.prepare("select count(*) as count from pledges where campaign_id=?").get(id);
const events = snapshot.prepare("select count(*) as count from campaign_events where campaign_id=?").get(id);
const foreignKeyErrors = snapshot.prepare("pragma foreign_key_check").all().length;
snapshot.close();
if (campaign?.status !== "LIVE" || campaign.pledged_amount !== 950000 || pledges.count !== 1 || events.count !== 9 || foreignKeyErrors) {
  throw new Error("Snapshot đã xuất nhưng dữ liệu kiểm không khớp; chưa dùng bản này để bàn giao.");
}
console.log(JSON.stringify({ destinationPath, campaign, pledges: pledges.count, events: events.count, foreignKeyErrors }, null, 2));

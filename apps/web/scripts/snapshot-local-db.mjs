import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const destination = process.argv[2];
if (!destination) throw new Error("Cần đường dẫn file SQLite đích.");

const source = path.join(process.cwd(), ".local-data", "gop-mock.sqlite");
const target = path.resolve(destination);
if (!fs.existsSync(source)) throw new Error("Chưa có gop-mock.sqlite để đóng gói.");
if (fs.existsSync(target)) throw new Error("File SQLite đích đã tồn tại; không ghi đè.");
fs.mkdirSync(path.dirname(target), { recursive: true });

const db = new DatabaseSync(source, { readOnly: true });
try {
  if (db.prepare("PRAGMA quick_check").get()?.quick_check !== "ok") {
    throw new Error("SQLite nguồn chưa qua quick_check.");
  }
  if (db.prepare("PRAGMA foreign_key_check").all().length) {
    throw new Error("SQLite nguồn có khóa ngoại không hợp lệ.");
  }
  // VACUUM INTO chụp DB nhất quán, không phải chép rời file WAL đang mở.
  db.exec(`VACUUM INTO '${target.replaceAll("'", "''")}'`);
} finally {
  db.close();
}

const copy = new DatabaseSync(target, { readOnly: true });
try {
  if (copy.prepare("PRAGMA quick_check").get()?.quick_check !== "ok" ||
      copy.prepare("PRAGMA foreign_key_check").all().length) {
    throw new Error("Bản SQLite vừa chụp chưa qua kiểm tra.");
  }
} finally {
  copy.close();
}
console.log(`Đã chụp SQLite local: ${target}`);

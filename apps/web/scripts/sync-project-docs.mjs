import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "docs/project-control");
const publicDir = path.join(root, "public/diagrams/blueprints");
const submissionDir = path.resolve(
  root,
  "../BAI_NOP_TUAN_USE_CASE_ERD_DATABASE/00_CAY_THAM_CHIEU",
);
const write = process.argv.includes("--write");
// Chỉ đồng bộ các bản xuất của tài liệu; không vẽ đè sơ đồ chỉnh tay.
const files = [
  ["04-mock-data-relational-blueprint.md", "04-BLUEPRINT-MOCK-DATA.md"],
  ["05-ke-hoach-hoan-thien-ui-ux.md", "05-KE-HOACH-UI-UX.md"],
  ["06-ma-tran-truy-vet-thuc-thi.md", "06-MA-TRAN-TRUY-VET.md"],
  ["PROGRESS.md", "TIEN-DO.md"],
  ["CONTEXT_CACHE.md", "CONTEXT-CACHE.md", false],
  ["10-kiem-dinh-du-an-va-nguon-goc.md", "10-KIEM-DINH-DU-AN.md"],
  ["11-kiem-dinh-ui-du-lieu-2026-10-14.md", "11-KIEM-DINH-UI-DU-LIEU.md"],
  ["12-tao-chien-dich-moi-2026-10-15.md", "12-TAO-CHIEN-DICH-MOI.md"],
  ["13-kiem-dinh-vong-doi-chien-dich-2026-10-23.md", "13-KIEM-DINH-VONG-DOI-CHIEN-DICH.md"],
  ["14-thao-luan-va-luot-thich-2026-10-25.md", "14-THAO-LUAN-VA-LUOT-THICH.md"],
  ["15-phan-hoi-cong-dong-theo-vai-tro-2026-10-27.md", "15-PHAN-HOI-CONG-DONG-THEO-VAI-TRO.md"],
  ["16-de-doc-va-dia-chi-2026-10-27.md", "16-DE-DOC-VA-DIA-CHI.md"],
  ["17-luot-xay-dung-ui-ux-2026-10-28.md", "17-UI-UX-THEO-LUONG.md"],
  ["18-dang-ky-den-tao-chien-dich-2026-10-29.md", "18-DANG-KY-DEN-TAO-CHIEN-DICH.md"],
  ["19-luong-gui-duyet-va-phan-hoi-2026-10-29.md", "19-LUONG-GUI-DUYET-VA-PHAN-HOI.md"],
  ["20-thong-bao-cau-hoi-2026-10-30.md", "20-THONG-BAO-CAU-HOI.md"],
  ["21-anh-minh-hoa-ho-so-moi-2026-10-31.md", "21-ANH-MINH-HOA-HO-SO-MOI.md"],
  ["22-ghi-dong-thoi-sqlite-local-2026-10-31.md", "22-GHI-DONG-THOI-SQLITE-LOCAL.md"],
  ["images/thao-luan-cong-tac-vien-mobile-2026-10-25.png", "images/thao-luan-cong-tac-vien-mobile-2026-10-25.png"],
  ["images/huong-dan-mobile-2026-10-27.png", "images/huong-dan-mobile-2026-10-27.png"],
  ["images/cam-ket-mobile-2026-10-27.png", "images/cam-ket-mobile-2026-10-27.png"],
  ["images/kham-pha-mobile-2026-10-28.png", "images/kham-pha-mobile-2026-10-28.png"],
  ["images/chu-du-an-mobile-2026-10-28.png", "images/chu-du-an-mobile-2026-10-28.png"],
  ["images/chon-vai-tro-mobile-2026-10-28.png", "images/chon-vai-tro-mobile-2026-10-28.png"],
  ["images/dang-nhap-creator-desktop-2026-10-29.png", "images/dang-nhap-creator-desktop-2026-10-29.png"],
  ["images/mo-vai-tro-creator-mobile-2026-10-29.png", "images/mo-vai-tro-creator-mobile-2026-10-29.png"],
  ["images/tao-chien-dich-mobile-2026-10-29.png", "images/tao-chien-dich-mobile-2026-10-29.png"],
  ["images/tao-ho-so-moi-mobile-2026-10-29.png", "images/tao-ho-so-moi-mobile-2026-10-29.png"],
  ["images/phan-hoi-xet-duyet-mobile-2026-10-29.png", "images/phan-hoi-xet-duyet-mobile-2026-10-29.png"],
  ["images/phan-hoi-xet-duyet-desktop-2026-10-29.png", "images/phan-hoi-xet-duyet-desktop-2026-10-29.png"],
  ["images/thong-bao-moi-mobile-2026-10-30.png", "images/thong-bao-moi-mobile-2026-10-30.png"],
  ["images/thong-bao-cau-hoi-mobile-2026-10-30.png", "images/thong-bao-cau-hoi-mobile-2026-10-30.png"],
  ["images/chon-anh-bep-may-mobile-2026-10-31.png", "images/chon-anh-bep-may-mobile-2026-10-31.png"],
  ["images/bep-may-public-mobile-2026-10-31.png", "images/bep-may-public-mobile-2026-10-31.png"],
  ["images/bep-may-anh-minh-hoa-mobile-2026-10-31.png", "images/bep-may-anh-minh-hoa-mobile-2026-10-31.png"],
  ["images/anh-bep-may-local-data-mobile-2026-10-31.png", "images/anh-bep-may-local-data-mobile-2026-10-31.png"],
  ["images/binh-luan-sau-reload-2026-10-31.png", "images/binh-luan-sau-reload-2026-10-31.png"],
  ["images/binh-luan-xem-them-mobile-2026-10-31.png", "images/binh-luan-xem-them-mobile-2026-10-31.png"],
];
let mismatches = 0;
for (const [filename, submissionName, publish = true] of files) {
  const original = fs.readFileSync(path.join(source, filename));
  const targets = publish ? [path.join(publicDir, filename)] : [];
  if (fs.existsSync(submissionDir))
    targets.push(path.join(submissionDir, submissionName));
  for (const target of targets) {
    if (write) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, original);
    }
    const matches =
      fs.existsSync(target) && fs.readFileSync(target).equals(original);
    console.log(`${matches ? "OK" : "KHÁC"} ${path.relative(root, target)}`);
    if (!matches) mismatches++;
  }
}
// Ghi chú database nằm ở thư mục khác cây tham chiếu, nhưng cũng là bản xuất từ docs/03.
if (fs.existsSync(submissionDir)) {
  const original = fs.readFileSync(path.join(root, "docs/03-database-design.md"));
  const target = path.resolve(root, "../BAI_NOP_TUAN_USE_CASE_ERD_DATABASE/02_ERD_DATABASE/ghi-chu-thiet-ke-database.md");
  if (write) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, original);
  }
  const matches = fs.existsSync(target) && fs.readFileSync(target).equals(original);
  console.log(`${matches ? "OK" : "KHÁC"} ${path.relative(root, target)}`);
  if (!matches) mismatches++;
}
if (mismatches) process.exitCode = 1;

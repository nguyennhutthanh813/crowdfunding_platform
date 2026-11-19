/**
 * Khởi tạo dữ liệu chuẩn hoá FundViet — khởi tạo trước tiên 4 tài khoản chính theo yêu cầu,
 * cùng hệ sinh thái chiến dịch tiếng Việt thực tế ở đầy đủ các giai đoạn vòng đời.
 */
import type { DatabaseSync } from "node:sqlite";
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS } from "./catalog.js";
import { resolveAssetUrl } from "./cloudinary-assets.js";
import { hashPassword, hashFastCommunityPassword } from "../auth/password.js";
import { analyzeComment } from "../services/ai/comments.js";
import { predictSuccess } from "../services/ai/predict.js";
import { buildPredictionInputSync } from "../services/ai/features.js";

const DAY = 86_400_000;
const HOUR = 3_600_000;

// ───────────── tiện ích ─────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const iso = (ms: number) => new Date(ms).toISOString();
const vnDate = (ms: number) => new Date(ms + 7 * HOUR).toISOString().slice(0, 10);
const ym = (ms: number) => new Date(ms).toISOString().slice(0, 7);

type Cell = string | number | null;

export function seedDatabase(db: DatabaseSync, nowDate = new Date()) {
  const NOW = nowDate.getTime();
  const rand = mulberry32(20261118);
  const idRand = mulberry32(99002026);
  const vnpRand = mulberry32(20260519);
  const hex4 = () => Math.floor(idRand() * 0x10000).toString(16).padStart(4, "0");
  const randomUUID = () => `${hex4()}${hex4()}-${hex4()}-4${hex4().slice(1)}-8${hex4().slice(1)}-${hex4()}${hex4()}${hex4()}`;
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const between = (a: number, b: number) => a + rand() * (b - a);
  const int = (a: number, b: number) => Math.floor(between(a, b + 1));
  const shuffle = <T,>(arr: T[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const ins = (table: string, row: Record<string, Cell>) => {
    const cols = Object.keys(row);
    db.prepare(`INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`)
      .run(...cols.map((c) => row[c]));
  };
  const run = (sql: string, ...args: Cell[]) => db.prepare(sql).run(...args);

  // ───────────── 1. Vai trò & quyền ─────────────
  for (const r of ROLES) ins("roles", { code: r.code, scope: r.scope, name: r.name, description: r.description, badge_color: r.badgeColor });
  for (const p of PERMISSIONS) ins("permissions", { code: p.code, scope: p.scope, module: p.module, name: p.name });
  for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const scope = ROLES.find((r) => r.code === role)!.scope;
    for (const perm of perms) ins("role_permissions", { role_code: role, permission_code: perm, scope });
  }

  // ───────────── 2. Thể loại (theo biên bản) ─────────────
  const CATS = [
    ["art", "Nghệ thuật", "Hội hoạ, artbook, điêu khắc, nghệ thuật số", "#EC4899"],
    ["comics", "Truyện tranh", "Truyện tranh, webtoon, minh hoạ", "#F97316"],
    ["crafts", "Thủ công mỹ nghệ", "Gốm, mây tre, sơn mài và làng nghề", "#D97706"],
    ["design", "Thiết kế", "Thiết kế sản phẩm, nội thất, đồ dùng", "#8B5CF6"],
    ["fashion", "Thời trang", "Trang phục, giày dép, phụ kiện", "#F43F5E"],
    ["film", "Phim ảnh", "Phim ngắn, tài liệu, hoạt hình", "#0EA5E9"],
    ["games", "Game", "Board game, video game, thẻ bài", "#10B981"],
    ["tech", "Công nghệ", "Thiết bị thông minh, phần cứng, AI", "#6366F1"],
  ] as const;
  const catId: Record<string, string> = {};
  CATS.forEach(([slug, name, description, color], i) => {
    catId[slug] = `cat_${slug}`;
    ins("categories", { id: catId[slug], name, slug, description, color, image_url: resolveAssetUrl(`/v3/categories/${slug}.webp`), sort_order: i });
  });

  // ───────────── 3. Người dùng (Khởi tạo 4 tài khoản chính đầu tiên) ─────────────
  const COMMUNITY_PW = hashFastCommunityPassword("FundViet@2026!", "fundviet-community-salt");
  const uid: Record<string, string> = {};
  const uEmail: Record<string, string> = {};
  const provinces = ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Huế", "Nha Trang", "Đà Lạt", "Quảng Ninh", "Bình Dương", "Nghệ An", "Thanh Hoá"];
  const createdBase = NOW - 400 * DAY;
  const addUser = (
    key: string,
    u: {
      email: string;
      username: string;
      name: string;
      passwordHash?: string;
      bio?: string;
      country?: string;
      province?: string;
      roles?: string[];
      avatar?: string;
    },
  ) => {
    const id = key.startsWith("usr_") ? key : randomUUID();
    uid[key] = id;
    uEmail[key] = u.email;
    const created = iso(createdBase + rand() * 200 * DAY);
    ins("users", {
      id,
      email: u.email,
      username: u.username,
      password_hash: u.passwordHash ?? COMMUNITY_PW,
      display_name: u.name,
      bio: u.bio ?? "",
      avatar_url: u.avatar ?? null,
      country_code: u.country ?? "VN",
      province: u.province ?? pick(provinces),
      email_verified_at: created,
      created_at: created,
      updated_at: created,
      last_login_at: iso(NOW - rand() * 5 * DAY),
    });
    ins("user_settings", { user_id: id });
    for (const r of u.roles ?? ["MEMBER"]) ins("user_roles", { user_id: id, role_code: r, granted_at: created });
    if (!(u.roles ?? ["MEMBER"]).includes("ADMIN")) {
      ins("payment_methods", {
        id: randomUUID(),
        user_id: id,
        brand: pick(["VISA", "MASTERCARD", "JCB", "NAPAS"]),
        last4: String(int(1000, 9999)),
        exp_month: int(1, 12),
        exp_year: int(2027, 2031),
        holder_name: u.name.toUpperCase(),
        provider_token: `tok_${randomUUID()}`,
        is_default: 1,
      });
      ins("addresses", {
        id: randomUUID(),
        user_id: id,
        recipient_name: u.name,
        phone: `09${int(10000000, 99999999)}`,
        line1: `${int(1, 299)} ${pick(["Nguyễn Trãi", "Lê Lợi", "Trần Hưng Đạo", "Hai Bà Trưng", "Lý Thường Kiệt", "Phan Chu Trinh"])}`,
        ward: `Phường ${int(1, 15)}`,
        district: pick(["Quận 1", "Quận 3", "Ba Đình", "Hoàn Kiếm", "Hải Châu", "Ninh Kiều", "Cầu Giấy"]),
        province: u.province && u.country !== "VN" ? "TP. Hồ Chí Minh" : (u.province ?? pick(provinces)),
        is_default: 1,
      });
    }
    return id;
  };

  // 4 tài khoản chính được tạo đầu tiên theo thông tin bàn giao
  addUser("usr_admin", {
    email: "phuocthinh2248@gmail.com",
    username: "phuocthinh2248",
    passwordHash: hashPassword("phuocthinh2248@Abc"),
    name: "Võ Phước Thịnh",
    roles: ["ADMIN"],
    province: "TP. Hồ Chí Minh",
    bio: "Quản trị hệ thống & kiểm duyệt chất lượng dự án trên FundViet.",
  });
  addUser("usr_linh", {
    email: "nguyennhutthanh813@gmail.com",
    username: "nguyennhutthanh813",
    passwordHash: hashPassword("nguyennhutthanh813@Abc"),
    name: "Nguyễn Nhựt Thanh",
    province: "TP. Hồ Chí Minh",
    bio: "Kỹ sư phần cứng & thiết kế sản phẩm công nghiệp — sáng lập ORBIT Lab.",
  });
  addUser("usr_giahuy", {
    email: "ctv000001@gmail.com",
    username: "ctv000001",
    passwordHash: hashPassword("ctv000001@Abc"),
    name: "Trần Gia Huy",
    province: "TP. Hồ Chí Minh",
    bio: "Điều phối cộng đồng, biên tập bản tin tiến độ & hỗ trợ người ủng hộ.",
  });
  addUser("usr_minhanh", {
    email: "user000001@gmail.com",
    username: "user000001",
    passwordHash: hashPassword("user000001@Abc"),
    name: "Lê Minh Anh",
    province: "Hà Nội",
    bio: "Quan tâm thiết bị công nghệ Việt, đồ thủ công thiết kế và các dự án sáng tạo độc lập.",
  });

  const CREATORS: [string, string, string, string, string][] = [
    ["lachong", "studiolachong.vn@gmail.com", "Studio Lạc Hồng", "Hà Nội", "Studio phát triển board game khai thác chất liệu lịch sử Việt Nam."],
    ["thutrang", "phamthutrang.design@gmail.com", "Phạm Thu Trang", "Huế", "Nhà thiết kế thời trang ứng dụng chất liệu tự nhiên bền vững."],
    ["quocbao", "lequocbao.film@gmail.com", "Lê Quốc Bảo", "TP. Hồ Chí Minh", "Đạo diễn phim tài liệu & điện ảnh độc lập."],
    ["maytre", "nhommaytreviet@gmail.com", "Nhóm Mây Tre Việt", "Hà Nội", "Ứng dụng mây tre và gốm thủ công làng nghề vào không gian sống hiện đại."],
    ["minhkhoa", "vominhkhoa.iot@gmail.com", "Võ Minh Khoa", "Đà Nẵng", "Kỹ sư IoT, thiết bị đeo thông minh và bộ học cụ STEM."],
    ["haiyen", "danghaiyen.art@gmail.com", "Đặng Hải Yến", "Hải Phòng", "Hoạ sĩ minh hoạ và tác giả truyện tranh thiếu nhi."],
    ["thanhtam", "ngothanhtam.art@gmail.com", "Ngô Thanh Tâm", "Cần Thơ", "Nghệ sĩ sơn mài đương đại và ấn phẩm nghệ thuật."],
    ["ducanh", "buiducanh.studio@gmail.com", "Bùi Đức Anh", "TP. Hồ Chí Minh", "Nhà phát triển trò chơi độc lập & thiết kế công nghiệp."],
  ];
  for (const [k, email, name, province, bio] of CREATORS) addUser(`usr_${k}`, { email, username: k, name, province, bio });

  const LAST = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
  const MID = ["Văn", "Thị", "Minh", "Thanh", "Ngọc", "Đức", "Hải", "Quang", "Thu", "Gia", "Bảo", "Khánh", "Anh", ""];
  const FIRST = ["An", "Bình", "Châu", "Dũng", "Giang", "Hà", "Hùng", "Hương", "Khôi", "Lan", "Long", "Mai", "Nam", "Nga", "Phúc", "Quân", "Quỳnh", "Sơn", "Tâm", "Thảo", "Trang", "Trung", "Tú", "Uyên", "Việt", "Vy", "Yến", "Linh", "Phong", "Nhi"];
  const COUNTRIES = ["US", "JP", "KR", "AU", "DE", "FR", "SG", "CA", "GB", "TW"];
  const MAIL_DOMAINS = ["gmail.com", "outlook.com.vn", "yahoo.com"];
  const strip = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
  const backerKeys: string[] = ["usr_minhanh", "usr_giahuy", "usr_linh"];
  const used = new Set<string>();
  for (let i = 0; i < 160; i++) {
    let name = "", username = "";
    do {
      name = [pick(LAST), pick(MID), pick(FIRST)].filter(Boolean).join(" ");
      username = strip(name).replace(/\s+/g, "") + int(10, 999);
    } while (used.has(username));
    used.add(username);
    const overseas = rand() < 0.18;
    const key = `b${i}`;
    addUser(key, { email: `${username}@${pick(MAIL_DOMAINS)}`, username, name, country: overseas ? pick(COUNTRIES) : "VN" });
    backerKeys.push(key);
  }
  for (const [k] of CREATORS) backerKeys.push(`usr_${k}`);

  // ───────────── 4. Dự án ─────────────
  type TierSpec = [title: string, amount: number, ships: boolean, limit?: number, items?: string[]];
  interface ProjSpec {
    slug: string; title: string; blurb: string; cat: string; creator: string; status: string;
    goal: number; days: number; start?: number; ratio?: number; video?: boolean; cover: string;
    tiers: TierSpec[]; addons?: [string, number][]; collabs?: string[]; product: string;
    completed?: "SUMMARY" | "UPDATES" | "THANK_YOU";
  }
  const P: ProjSpec[] = [
    { slug: "orbit-one", title: "ORBIT One – Máy pha cà phê tích hợp AI", cat: "tech", creator: "usr_linh", status: "LIVE", goal: 300_000_000, days: 30, start: -18, ratio: 0.84, video: true, cover: "orbit-one", product: "máy pha cà phê",
      blurb: "Máy pha cà phê học khẩu vị của bạn, tự chỉnh độ xay và nhiệt độ cho từng hạt cà phê Việt.",
      tiers: [["Lời cảm ơn & tên trong sách vàng", 100_000, false], ["ORBIT One – Early Bird", 2_490_000, true, 60, ["Máy ORBIT One", "Bộ lọc thép"]], ["ORBIT One tiêu chuẩn", 2_990_000, true, undefined, ["Máy ORBIT One", "Bộ lọc thép", "Gói cà phê 250g"]], ["ORBIT One Pro – bản nhiều chức năng", 5_990_000, true, 40, ["Máy ORBIT One Pro", "Máy xay rời", "Ứng dụng AI Barista trọn đời"]]],
      addons: [["Hộp 12 viên nén Cầu Đất", 290_000], ["Bình giữ nhiệt ORBIT", 350_000]], collabs: ["usr_giahuy"] },
    { slug: "moc-lamp", title: "Mộc Lamp – Đèn gỗ cảm ứng ánh sáng ấm", cat: "design", creator: "usr_linh", status: "LIVE", goal: 80_000_000, days: 25, start: -20, ratio: 1.32, video: true, cover: "moc-lamp", product: "đèn gỗ",
      blurb: "Đèn bàn gỗ óc chó nguyên khối, chạm để đổi 3 sắc ánh sáng, sạc không dây cho điện thoại.",
      tiers: [["Thiệp cảm ơn viết tay", 80_000, false], ["Mộc Lamp Mini", 690_000, true], ["Mộc Lamp tiêu chuẩn", 1_190_000, true, 120], ["Cặp đèn Mộc Lamp", 2_190_000, true, 50]],
      addons: [["Đế sạc không dây", 250_000]], collabs: ["usr_giahuy"] },
    { slug: "lac-viet", title: "Lạc Việt – Board game hành trình dựng nước", cat: "games", creator: "usr_lachong", status: "LIVE", goal: 150_000_000, days: 35, start: -29, ratio: 0.93, video: true, cover: "lac-viet", product: "bộ board game",
      blurb: "Board game chiến thuật 2–5 người, dẫn dắt bộ lạc qua 18 đời Hùng Vương.",
      tiers: [["Bản in & chơi PDF", 120_000, false], ["Lạc Việt bản tiêu chuẩn", 790_000, true], ["Lạc Việt Deluxe", 1_390_000, true, 200, ["Hộp Deluxe", "Quân cờ gỗ", "Bản mở rộng Văn Lang"]], ["Gói quán cà phê board game", 3_500_000, true, 20]],
      addons: [["Bọc bài cao cấp", 120_000], ["Bản mở rộng Âu Lạc", 390_000]] },
    { slug: "thanh-pho-sau-mua", title: "Thành phố sau mưa – Phim ngắn độc lập", cat: "film", creator: "usr_quocbao", status: "LIVE", goal: 120_000_000, days: 30, start: -10, ratio: 0.38, video: true, cover: "thanh-pho-sau-mua", product: "bộ phim",
      blurb: "Phim ngắn 25 phút về những người trẻ mắc kẹt giữa Sài Gòn trong một đêm mưa lớn.",
      tiers: [["Tên trong phần cảm ơn", 100_000, false], ["Vé xem online sớm", 200_000, false], ["Poster ký tặng + vé xem", 650_000, true], ["Vé buổi công chiếu", 1_500_000, false, 80]] },
    { slug: "hiep-si-pho-co", title: "Hiệp sĩ Phố Cổ – Truyện tranh tập 1", cat: "comics", creator: "usr_haiyen", status: "LIVE", goal: 60_000_000, days: 30, start: -25, ratio: 1.15, cover: "hiep-si-pho-co", product: "cuốn truyện",
      blurb: "Truyện tranh hành động lấy bối cảnh 36 phố phường, nơi một cậu bé bán bánh mì trở thành hiệp sĩ.",
      tiers: [["Bản ebook", 90_000, false], ["Truyện in bìa mềm", 180_000, true], ["Bìa cứng ký tặng", 390_000, true, 300], ["Combo + artbook + sticker", 690_000, true, 150]],
      addons: [["Bộ sticker nhân vật", 50_000]] },
    { slug: "sac-mau-ba-mien", title: "Sắc màu ba miền – Artbook phong cảnh Việt", cat: "art", creator: "usr_thanhtam", status: "LIVE", goal: 70_000_000, days: 40, start: -12, ratio: 0.47, cover: "sac-mau-ba-mien", product: "artbook",
      blurb: "120 trang tranh màu nước về núi rừng Tây Bắc, phố cổ Hội An và chợ nổi miền Tây.",
      tiers: [["Bộ hình nền số", 60_000, false], ["Artbook tiêu chuẩn", 450_000, true], ["Artbook + tranh in A3", 890_000, true, 100]] },
    { slug: "gom-men-lam", title: "Men Lam – Bộ cốc gốm Bát Tràng hiện đại", cat: "crafts", creator: "usr_maytre", status: "LIVE", goal: 50_000_000, days: 30, start: -27, ratio: 0.62, video: true, cover: "gom-men-lam", product: "bộ cốc gốm",
      blurb: "Bộ ấm chén men lam vẽ tay bởi nghệ nhân Bát Tràng, dáng tối giản cho bàn trà hiện đại.",
      tiers: [["Cốc đơn men lam", 250_000, true], ["Bộ 4 cốc", 890_000, true], ["Bộ ấm chén đầy đủ", 1_590_000, true, 60]] },
    { slug: "ao-dai-sen", title: "Sen – Áo dài tối giản cho mỗi ngày", cat: "fashion", creator: "usr_thutrang", status: "LIVE", goal: 90_000_000, days: 30, start: -5, ratio: 0.31, cover: "ao-dai-sen", product: "áo dài",
      blurb: "Áo dài vải lụa tơ tằm pha linen, cắt may tối giản để mặc đi làm mỗi ngày.",
      tiers: [["Khăn lụa thêu sen", 290_000, true], ["Áo dài Sen", 1_490_000, true, 150], ["Áo dài Sen may đo", 2_490_000, true, 40]] },
    { slug: "me-cung-den-long", title: "Mê Cung Đèn Lồng – Game indie giải đố", cat: "games", creator: "usr_ducanh", status: "LIVE", goal: 100_000_000, days: 30, start: -27, ratio: 0.96, video: true, cover: "me-cung-den-long", product: "trò chơi",
      blurb: "Game giải đố ánh sáng trong mê cung đèn lồng Hội An, phát hành trên PC & Switch.",
      tiers: [["Bản game PC", 180_000, false], ["Game + soundtrack + artbook số", 320_000, false], ["Hộp sưu tầm có đèn lồng mini", 1_290_000, true, 100], ["Thiết kế một màn chơi cùng nhóm", 6_000_000, false, 5]] },
    { slug: "balo-mekong", title: "Mekong – Balo chống nước cho dân xê dịch", cat: "fashion", creator: "usr_ducanh", status: "LIVE", goal: 75_000_000, days: 30, start: -14, ratio: 0.72, cover: "balo-mekong", product: "balo",
      blurb: "Balo 28L chống nước hoàn toàn, vải tái chế từ lưới đánh cá vùng Mekong.",
      tiers: [["Túi đeo chéo mini", 390_000, true], ["Balo Mekong 28L", 1_190_000, true], ["Combo balo + túi", 1_490_000, true, 80]] },
    { slug: "robot-ti-hon", title: "Tí Hon – Robot học lập trình cho trẻ em", cat: "tech", creator: "usr_minhkhoa", status: "LIVE", goal: 200_000_000, days: 45, start: -8, ratio: 0.19, video: true, cover: "robot-ti-hon", product: "robot",
      blurb: "Robot lắp ráp giúp trẻ 6–12 tuổi học tư duy lập trình qua trò chơi bằng tiếng Việt.",
      tiers: [["Bộ thẻ lập trình in", 150_000, true], ["Robot Tí Hon", 1_890_000, true], ["Bộ lớp học 5 robot", 8_500_000, true, 20]] },
    { slug: "bep-may", title: "Bếp Mây – Hộp cơm mây tre giữ nhiệt", cat: "crafts", creator: "usr_maytre", status: "SCHEDULED", goal: 40_000_000, days: 30, start: 4, cover: "bep-may", product: "hộp cơm",
      blurb: "Hộp cơm đan mây lót inox giữ nhiệt 4 giờ — thay hộp nhựa dùng một lần.",
      tiers: [["Hộp Bếp Mây đơn", 420_000, true], ["Cặp hộp cho hai người", 790_000, true, 100]] },
    { slug: "loa-tre", title: "Loa Tre – Loa Bluetooth từ tre tự nhiên", cat: "design", creator: "usr_linh", status: "SCHEDULED", goal: 120_000_000, days: 30, start: 9, video: true, cover: "loa-tre", product: "loa",
      blurb: "Loa 20W vỏ tre ép nhiệt, âm trầm ấm, pin 18 giờ và sạc USB-C.",
      tiers: [["Loa Tre Mini", 890_000, true], ["Loa Tre", 1_690_000, true, 200], ["Cặp loa stereo", 3_190_000, true, 60]], collabs: ["usr_giahuy"] },
    { slug: "pulse-band", title: "Pulse Band – Vòng tay sức khoẻ pin 21 ngày", cat: "tech", creator: "usr_minhkhoa", status: "FULFILLING", goal: 180_000_000, days: 30, start: -75, ratio: 1.46, video: true, cover: "pulse-band", product: "vòng tay",
      blurb: "Vòng tay đo nhịp tim, SpO2, giấc ngủ; pin 21 ngày; ứng dụng tiếng Việt.",
      tiers: [["Dây đeo thay thế", 190_000, true], ["Pulse Band", 1_290_000, true], ["Pulse Band cặp đôi", 2_390_000, true, 100]] },
    { slug: "meo-mun-di-hoc", title: "Mèo Mun đi học – Truyện tranh thiếu nhi", cat: "comics", creator: "usr_haiyen", status: "SUCCESS", goal: 35_000_000, days: 30, start: -40, ratio: 1.78, cover: "meo-mun-di-hoc", product: "cuốn truyện",
      blurb: "Bộ 3 tập truyện tranh giúp bé làm quen trường lớp cùng chú mèo Mun.", completed: "THANK_YOU",
      tiers: [["Ebook 3 tập", 80_000, false], ["Bộ 3 tập in màu", 260_000, true], ["Bộ truyện + gấu bông Mun", 590_000, true, 120]] },
    { slug: "bep-nho-khong-rac", title: "Bếp nhỏ không rác – Bộ dụng cụ bếp xanh", cat: "design", creator: "usr_ducanh", status: "SUCCESS", goal: 45_000_000, days: 30, start: -36, ratio: 1.21, cover: "bep-nho-khong-rac", product: "bộ dụng cụ bếp",
      blurb: "Bộ dụng cụ bếp từ tre, xơ dừa và thép không gỉ thay đồ nhựa dùng một lần.", completed: "UPDATES",
      tiers: [["Bộ khăn sáp ong", 190_000, true], ["Bộ bếp xanh cơ bản", 590_000, true], ["Bộ bếp xanh đầy đủ", 990_000, true]] },
    { slug: "nguoi-giu-rung", title: "Người giữ rừng – Phim tài liệu", cat: "film", creator: "usr_quocbao", status: "COMPLETED", goal: 100_000_000, days: 40, start: -150, ratio: 1.24, video: true, cover: "nguoi-giu-rung", product: "bộ phim",
      blurb: "Phim tài liệu 52 phút theo chân kiểm lâm Cúc Phương suốt bốn mùa.", completed: "SUMMARY",
      tiers: [["Xem online trọn đời", 150_000, false], ["DVD bản đặc biệt", 450_000, true], ["Chuyến đi cùng đoàn làm phim", 5_000_000, false, 10]] },
    { slug: "buoc-xanh", title: "Bước Xanh – Giày vải tái chế", cat: "fashion", creator: "usr_thutrang", status: "FAILED", goal: 150_000_000, days: 30, start: -55, ratio: 0.41, cover: "buoc-xanh", product: "đôi giày",
      blurb: "Giày vải canvas tái chế từ chai nhựa, đế cao su thiên nhiên.",
      tiers: [["Dây giày tái chế", 90_000, true], ["Giày Bước Xanh", 990_000, true], ["Cặp giày đôi", 1_790_000, true]] },
    { slug: "than-thoai-viet", title: "Thần Thoại Việt – Game thẻ bài sưu tầm", cat: "games", creator: "usr_lachong", status: "SUSPENDED", goal: 250_000_000, days: 30, start: -9, ratio: 0.12, cover: "than-thoai-viet", product: "bộ thẻ bài",
      blurb: "Game thẻ bài sưu tầm với 200 sinh vật trong thần thoại Việt.",
      tiers: [["Bộ khởi đầu", 290_000, true], ["Hộp 10 gói", 1_490_000, true]] },
    { slug: "son-mai-so", title: "Sơn mài số – Số hoá tranh sơn mài Việt", cat: "art", creator: "usr_thanhtam", status: "PENDING_REVIEW", goal: 60_000_000, days: 30, cover: "son-mai-so", product: "bộ tranh",
      blurb: "Số hoá 50 bức sơn mài kinh điển thành tranh in giclée và NFT-free bản quyền mở.",
      tiers: [["Tranh in A4", 350_000, true], ["Tranh in giclée A2", 1_800_000, true, 50]] },
    { slug: "tarot-dan-gian", title: "Tarot dân gian – Bộ bài tranh Đông Hồ", cat: "art", creator: "usr_thanhtam", status: "DRAFT", goal: 40_000_000, days: 30, cover: "tarot-dan-gian", product: "bộ bài",
      blurb: "78 lá bài vẽ theo phong cách tranh Đông Hồ, in giấy dó.",
      tiers: [["Bộ bài tiêu chuẩn", 490_000, true]] },
    { slug: "chu-cuoi", title: "Chú Cuội – Phim hoạt hình ngắn", cat: "film", creator: "usr_linh", status: "DRAFT", goal: 250_000_000, days: 50, cover: "chu-cuoi", product: "bộ phim",
      blurb: "Phim hoạt hình 3D 12 phút kể lại truyền thuyết chú Cuội cung trăng.",
      tiers: [["Tên trong phần cảm ơn", 200_000, false]] },
    { slug: "non-la-led", title: "Nón lá phát sáng LED", cat: "crafts", creator: "usr_maytre", status: "REJECTED", goal: 30_000_000, days: 20, cover: "non-la-led", product: "nón lá",
      blurb: "Nón lá truyền thống gắn dải LED sạc pin cho lễ hội.",
      tiers: [["Nón lá LED", 390_000, true]] },
    { slug: "ha-noi-36-pho", title: "Lịch 3D Hà Nội 36 phố phường", cat: "design", creator: "usr_ducanh", status: "CANCELLED", goal: 25_000_000, days: 30, cover: "ha-noi-36-pho", product: "cuốn lịch",
      blurb: "Lịch để bàn pop-up 3D, mỗi tháng là một con phố cổ.",
      tiers: [["Lịch 3D", 350_000, true]] },
  ];

  const story = (p: ProjSpec) => [
    ["TEXT", "Câu chuyện", `${p.blurb}\n\nÝ tưởng ${p.title.split("–")[0].trim()} bắt đầu từ một câu hỏi rất đời thường: vì sao người Việt phải chờ hàng ngoại cho những thứ mình hoàn toàn có thể tự làm tốt? Sau hơn một năm thử nghiệm, nhóm đã có mẫu hoàn chỉnh và cần cộng đồng cùng đưa ${p.product} đến tay nhiều người hơn.`],
    ["IMAGE", "", resolveAssetUrl(`/v3/projects/${p.cover}.webp`)],
    ["TEXT", "Điểm đặc biệt", `• Thiết kế và sản xuất tại Việt Nam, kiểm soát chất lượng từng khâu.\n• Vật liệu được chọn để bền, an toàn và thân thiện với môi trường.\n• Mỗi ${p.product} đều có mã định danh, bảo hành và hỗ trợ trực tiếp từ nhóm.\n• Lắng nghe góp ý của backer trong suốt quá trình hoàn thiện.`],
    ["TEXT", "Vì sao cần bạn", `Mục tiêu gọi vốn giúp nhóm đặt sản xuất lô đầu tiên, hoàn thiện khuôn mẫu và chi phí kiểm định. FundViet áp dụng cơ chế All-or-Nothing: bạn chỉ bị trừ tiền khi dự án đạt mục tiêu khi kết thúc chiến dịch.`],
    ["TEXT", "Kế hoạch & tiến độ", `Tháng 1: chốt thiết kế cuối cùng theo góp ý backer.\nTháng 2: sản xuất lô đầu và kiểm tra chất lượng.\nTháng 3: đóng gói, giao hàng toàn quốc và cập nhật mã vận đơn cho từng backer.`],
    ["TEXT", "Đội ngũ", `Nhóm gồm những người trẻ đam mê ${p.product}, từng làm việc ở các xưởng sản xuất và studio trong nước. Chúng mình cam kết cập nhật tiến độ hằng tuần trong mục Updates.`],
  ] as const;

  const pid: Record<string, string> = {};
  const tierIds: Record<string, { id: string; amount: number; ships: boolean; limit?: number; fee: number }[]> = {};
  const addonIds: Record<string, { id: string; price: number }[]> = {};
  const projectMeta: Record<string, { start: number; end: number; spec: ProjSpec; created: number }> = {};
  let pledgeSeq = 1000;

  const history = (projectId: string, from: string | null, to: string, actor: string | null, at: number, reason = "") =>
    ins("project_status_history", { id: randomUUID(), project_id: projectId, from_status: from, to_status: to, actor_id: actor, reason, created_at: iso(at) });
  const admin = uid.usr_admin;

  for (const p of P) {
    const id = `prj_${p.slug.replace(/-/g, "_")}`;
    pid[p.slug] = id;
    const hasDates = !["DRAFT", "PENDING_REVIEW", "REJECTED", "CANCELLED"].includes(p.status);
    const start = hasDates ? NOW + (p.start ?? 0) * DAY : 0;
    const end = hasDates ? start + p.days * DAY : 0;
    const created = (hasDates ? start : NOW) - int(20, 60) * DAY;
    projectMeta[p.slug] = { start, end, spec: p, created };
    const initial = ["SCHEDULED", "DRAFT", "PENDING_REVIEW", "REJECTED", "CANCELLED"].includes(p.status) ? (p.status === "CANCELLED" ? "DRAFT" : p.status) : "LIVE";
    ins("projects", {
      id, creator_id: uid[p.creator], category_id: catId[p.cat], title: p.title, slug: p.slug, blurb: p.blurb,
      cover_url: resolveAssetUrl(`/v3/projects/${p.cover}.webp`), video_url: p.video ? "https://www.youtube.com/embed/aqz-KE-bpKQ" : null,
      goal_amount: p.goal, duration_days: p.days, start_at: hasDates ? iso(start) : null, end_at: hasDates ? iso(end) : null,
      status: initial, is_preview_public: 1,
      risks: p.status === "DRAFT" ? "" : "Rủi ro lớn nhất là chậm tiến độ sản xuất do nguyên liệu. Nhóm đã ký trước với hai nhà cung cấp dự phòng và để dư 3 tuần trong kế hoạch giao hàng; mọi thay đổi sẽ được thông báo qua Updates.",
      completed_display: p.completed ?? "SUMMARY",
      completed_message: p.completed ? "Cảm ơn hơn trăm người bạn đã cùng biến ý tưởng thành hiện thực. Hẹn gặp lại ở dự án tiếp theo!" : null,
      submitted_at: p.status === "DRAFT" ? null : iso(created + 5 * DAY),
      approved_at: hasDates ? iso(created + 7 * DAY) : null,
      launched_at: hasDates && p.status !== "SCHEDULED" ? iso(start) : null,
      created_at: iso(created), updated_at: iso(created),
    });
    // Nội dung campaign
    story(p).forEach(([kind, heading, body], i) =>
      ins("project_sections", { id: randomUUID(), project_id: id, kind, heading, body: kind === "TEXT" ? body : "", media_url: kind === "TEXT" ? null : body, sort_order: i }));
    if (p.video) ins("project_sections", { id: randomUUID(), project_id: id, kind: "VIDEO", heading: "Video giới thiệu", body: "", media_url: "https://www.youtube.com/embed/aqz-KE-bpKQ", sort_order: 10 });

    // Phần quà
    tierIds[p.slug] = [];
    p.tiers.forEach(([title, amount, ships, limit, items], i) => {
      const tid = randomUUID();
      const fee = ships ? pick([25_000, 30_000, 35_000]) : 0;
      ins("reward_tiers", {
        id: tid, project_id: id, title, amount, description: ships ? `Nhận ${title.toLowerCase()} giao tận nhà trong nước.` : "Quà số, gửi qua email.",
        estimated_delivery: ym((end || NOW + 60 * DAY) + int(1, 3) * 30 * DAY), quantity_limit: limit ?? null,
        ships_physical: ships ? 1 : 0, shipping_fee: fee, sort_order: i,
      });
      (items ?? [title]).forEach((name, j) => ins("reward_items", { id: randomUUID(), tier_id: tid, name, quantity: 1, sort_order: j }));
      tierIds[p.slug].push({ id: tid, amount, ships, limit, fee });
    });
    addonIds[p.slug] = [];
    for (const [title, price] of p.addons ?? []) {
      const aid = randomUUID();
      ins("add_ons", { id: aid, project_id: id, title, price, description: `Mua kèm ${title.toLowerCase()}.`, max_per_pledge: 5 });
      addonIds[p.slug].push({ id: aid, price });
      for (const t of tierIds[p.slug].filter((t) => t.ships)) ins("reward_tier_add_ons", { tier_id: t.id, add_on_id: aid, project_id: id });
    }
    // Thành viên
    for (const c of p.collabs ?? []) {
      ins("project_members", { project_id: id, user_id: uid[c], role_code: "COLLABORATOR", invited_by: uid[p.creator], joined_at: iso(created + 2 * DAY) });
      ins("project_invitations", {
        id: randomUUID(), project_id: id, email: uEmail[c], invitee_id: uid[c], invited_by: uid[p.creator],
        status: "ACCEPTED", token: randomUUID(), expires_at: iso(created + 9 * DAY), created_at: iso(created + DAY), responded_at: iso(created + 2 * DAY),
      });
    }
    // Lịch sử duyệt
    history(id, null, "DRAFT", uid[p.creator], created);
    if (p.status !== "DRAFT") history(id, "DRAFT", "PENDING_REVIEW", uid[p.creator], created + 5 * DAY);
    if (p.status === "REJECTED") {
      ins("project_reviews", { id: randomUUID(), project_id: id, reviewer_id: admin, decision: "REJECTED", note: "Sản phẩm dùng pin lithium gắn trên nón cần chứng nhận an toàn điện; vui lòng bổ sung giấy kiểm định trước khi gửi lại.", created_at: iso(created + 6 * DAY) });
      history(id, "PENDING_REVIEW", "REJECTED", admin, created + 6 * DAY, "Thiếu chứng nhận an toàn điện");
    }
    if (p.status === "CANCELLED") {
      history(id, "DRAFT", "CANCELLED", uid[p.creator], created + 3 * DAY, "Creator dừng dự án để làm lại thiết kế");
      run(`UPDATE projects SET status='CANCELLED' WHERE id=?`, id);
    }
    if (hasDates) {
      ins("project_reviews", { id: randomUUID(), project_id: id, reviewer_id: admin, decision: "APPROVED", note: "Đủ thông tin, phần quà hợp lệ.", created_at: iso(created + 7 * DAY) });
      if (p.slug === "orbit-one") {
        ins("project_reviews", { id: randomUUID(), project_id: id, reviewer_id: admin, decision: "CHANGES_REQUESTED", note: "Bổ sung thông số điện áp và chính sách bảo hành.", created_at: iso(created + 6 * DAY) });
      }
      history(id, "PENDING_REVIEW", p.status === "SCHEDULED" ? "SCHEDULED" : "SCHEDULED", admin, created + 7 * DAY, "Duyệt, hẹn ngày mở");
      if (p.status !== "SCHEDULED") history(id, "SCHEDULED", "LIVE", null, start, "Bộ lập lịch mở chiến dịch");
    }
  }

  // ───────────── 5. Góp vốn ─────────────
  const cardOf = (userId: string) => (db.prepare(`SELECT id FROM payment_methods WHERE user_id = ? AND is_default = 1`).get(userId) as { id: string }).id;
  const addrOf = (userId: string) => db.prepare(`SELECT * FROM addresses WHERE user_id = ? AND is_default = 1`).get(userId) as Record<string, string>;
  const memberOf = (projectId: string) => new Set((db.prepare(`SELECT user_id FROM project_members WHERE project_id = ?`).all(projectId) as { user_id: string }[]).map((r) => r.user_id));
  const sampleTime = (start: number, windowEnd: number) => {
    const u = rand();
    const f = u < 0.35 ? (u / 0.35) * 0.2 : u < 0.8 ? 0.2 + ((u - 0.35) / 0.45) * 0.6 : 0.8 + ((u - 0.8) / 0.2) * 0.2;
    return start + f * (windowEnd - start);
  };
  const FORCED: Record<string, string[]> = {
    "orbit-one": ["usr_minhanh"], "lac-viet": ["usr_minhanh", "usr_linh"], "pulse-band": ["usr_minhanh"],
    "nguoi-giu-rung": ["usr_minhanh"], "buoc-xanh": ["usr_minhanh"], "me-cung-den-long": ["usr_minhanh", "usr_giahuy"],
    "hiep-si-pho-co": ["usr_giahuy", "usr_linh"], "meo-mun-di-hoc": ["usr_minhanh"], "balo-mekong": ["usr_linh"],
  };
  const pledgesByProject: Record<string, { id: string; backer: string; at: number; total: number; tier?: string; ships: boolean }[]> = {};

  for (const p of P) {
    const meta = projectMeta[p.slug];
    if (!meta.start || p.status === "SCHEDULED" || !p.ratio) continue;
    const id = pid[p.slug];
    const members = memberOf(id);
    const windowEnd = Math.min(NOW - HOUR, meta.end - HOUR);
    const target = p.ratio * p.goal;
    const candidates = [...(FORCED[p.slug] ?? []), ...shuffle(backerKeys.filter((k) => !(FORCED[p.slug] ?? []).includes(k)))]
      .map((k) => uid[k]).filter((u) => !members.has(u));
    const tiers = tierIds[p.slug];
    const rows: { backer: string; at: number; tierIdx: number | null; bonus: number; addons: { id: string; q: number; price: number }[] }[] = [];
    let sum = 0;
    const claimed = tiers.map(() => 0);
    for (const backer of candidates) {
      if (sum >= target) break;
      let tierIdx: number | null = null;
      if (rand() > 0.07) {
        const weights = tiers.map((t, i) => (t.limit && claimed[i] >= t.limit ? 0 : 1 / Math.sqrt(t.amount / 100_000)) * (i === 0 ? 0.6 : 1));
        // ưu tiên gói "chính" để số tiền hợp lý
        const totalW = weights.reduce((a, b) => a + b, 0);
        let r = rand() * totalW;
        tierIdx = weights.findIndex((w) => (r -= w) <= 0);
        if (tierIdx < 0) tierIdx = tiers.length - 1;
        // nếu còn thiếu nhiều, đẩy về gói đắt hơn
        if (target - sum > p.goal * 0.3 && rand() < 0.45) tierIdx = Math.min(tiers.length - 1, tierIdx + 1);
        if (tiers[tierIdx].limit && claimed[tierIdx] >= tiers[tierIdx].limit!) continue;
        claimed[tierIdx]++;
      }
      const bonus = tierIdx === null ? pick([50_000, 100_000, 200_000, 500_000]) : rand() < 0.15 ? pick([20_000, 50_000, 100_000]) : 0;
      const addons = tierIdx !== null && tiers[tierIdx].ships && rand() < 0.25
        ? addonIds[p.slug].filter(() => rand() < 0.6).map((a) => ({ id: a.id, q: int(1, 2), price: a.price }))
        : [];
      const at = sampleTime(meta.start + 10 * 60_000, windowEnd);
      const t = tierIdx === null ? null : tiers[tierIdx];
      const total = (t?.amount ?? 0) + bonus + addons.reduce((s, a) => s + a.q * a.price, 0) + (t?.fee ?? 0);
      rows.push({ backer, at, tierIdx, bonus, addons });
      sum += total;
    }
    // Hết người góp mà chưa tới tỉ lệ mục tiêu → phân bổ phần "ủng hộ thêm" cho các pledge.
    if (sum < target && rows.length) {
      const extra = Math.ceil((target - sum) / rows.length / 10_000) * 10_000;
      for (const r of rows) r.bonus += extra;
    }
    rows.sort((a, b) => a.at - b.at);
    pledgesByProject[p.slug] = [];
    for (const r of rows) {
      const t = r.tierIdx === null ? null : tiers[r.tierIdx];
      const addOnAmount = r.addons.reduce((s, a) => s + a.q * a.price, 0);
      const ship = t?.fee ?? 0;
      const total = (t?.amount ?? 0) + r.bonus + addOnAmount + ship;
      const a = t?.ships ? addrOf(r.backer) : null;
      const plId = randomUUID();
      const plCode = `FV-${String(++pledgeSeq).padStart(6, "0")}`;
      const isVnp = vnpRand() < 0.68;
      const vnpBank = ["NCB", "VCB", "TCB", "MBB", "BIDV", "ACB", "VNPAYQR"][Math.floor(vnpRand() * 7)];
      const vnpChannel = vnpBank === "VNPAYQR" ? "VNPAYQR" : "VNBANK";
      const vnpTxnRef = `VNP${vnDate(r.at).replace(/-/g, "")}${String(pledgeSeq).padStart(6, "0")}`;
      const vnpTransNo = `${14400000 + pledgeSeq}`;
      ins("pledges", {
        id: plId, code: plCode, project_id: id, backer_id: r.backer, tier_id: t?.id ?? null,
        payment_method_id: cardOf(r.backer), address_id: a?.id ?? null, reward_amount: t?.amount ?? 0, bonus_amount: r.bonus,
        add_on_amount: addOnAmount, shipping_amount: ship, total_amount: total, status: "AUTHORIZED",
        ship_recipient: a?.recipient_name ?? null, ship_phone: a?.phone ?? null,
        ship_address: a ? `${a.line1}, ${a.ward}, ${a.district}` : null, ship_province: a?.province ?? null,
        is_anonymous: rand() < 0.08 ? 1 : 0, created_at: iso(r.at), updated_at: iso(r.at),
      });
      for (const ad of r.addons) ins("pledge_add_ons", { pledge_id: plId, add_on_id: ad.id, project_id: id, quantity: ad.q, unit_price: ad.price });
      ins("payment_transactions", {
        id: randomUUID(),
        pledge_id: plId,
        kind: "AUTHORIZE",
        amount: total,
        status: "SUCCEEDED",
        idempotency_key: `${plId}:AUTHORIZE`,
        provider: isVnp ? "VNPAY" : "FUNDVIET_PAY",
        provider_ref: isVnp ? vnpTransNo : `fvp_${randomUUID().slice(0, 12)}`,
        bank_code: isVnp ? vnpBank : null,
        vnp_txn_ref: isVnp ? vnpTxnRef : null,
        vnp_response_code: isVnp ? "00" : null,
        message: isVnp
          ? `Đã ký quỹ tạm giữ qua VNPAY (${vnpBank}) — chỉ giải ngân khi dự án đạt mục tiêu`
          : "Đã uỷ quyền giữ chỗ trên thẻ (chưa trừ tiền)",
        created_at: iso(r.at),
      });
      if (isVnp && pledgeSeq % 12 === 0) {
        ins("vnpay_orders", {
          id: randomUUID(),
          txn_ref: vnpTxnRef,
          project_id: id,
          backer_id: r.backer,
          pledge_id: plId,
          purpose: "NEW_PLEDGE",
          amount: total,
          bank_code: vnpBank,
          pay_channel: vnpChannel,
          order_info: `Tam giu gop von ${plCode} du an ${p.slug}`,
          payload_json: JSON.stringify({ tierId: t?.id ?? null, bonusAmount: r.bonus }),
          status: "PAID",
          vnp_transaction_no: vnpTransNo,
          vnp_response_code: "00",
          card_mask: vnpBank === "VNPAYQR" ? "VNPAY-QR" : "970419••••••198",
          card_holder: "NGUYEN VAN A",
          ip_address: "113.161.72.18",
          expires_at: iso(r.at + 15 * 60_000),
          paid_at: iso(r.at + 45_000),
          created_at: iso(r.at),
        });
      }
      pledgesByProject[p.slug].push({ id: plId, backer: r.backer, at: r.at, total, tier: t?.id, ships: Boolean(t?.ships) });
    }
    // Một vài backer huỷ trước hạn (dự án LIVE)
    if (p.status === "LIVE") {
      for (const pl of pledgesByProject[p.slug].filter((x) => x.backer !== uid.usr_minhanh).slice(2, 3)) {
        const at = Math.min(NOW - HOUR, pl.at + DAY);
        run(`UPDATE pledges SET status='CANCELLED', cancelled_at=?, updated_at=? WHERE id=?`, iso(at), iso(at), pl.id);
        ins("payment_transactions", { id: randomUUID(), pledge_id: pl.id, kind: "VOID", amount: pl.total, status: "SUCCEEDED", idempotency_key: `${pl.id}:VOID`, message: "Backer huỷ pledge — giải phóng tiền giữ chỗ", created_at: iso(at) });
      }
    }
    // Chốt kết quả
    const endMs = meta.end;
    if (["SUCCESS", "FULFILLING", "COMPLETED"].includes(p.status)) {
      let idxInSuccess = 0;
      for (const pl of pledgesByProject[p.slug]) {
        idxInSuccess++;
        if (p.status === "SUCCESS" && idxInSuccess === pledgesByProject[p.slug].length && pl.backer !== uid.usr_minhanh) {
          run(`UPDATE pledges SET status='CAPTURE_FAILED', updated_at=? WHERE id=? AND status='AUTHORIZED'`, iso(endMs + HOUR), pl.id);
          ins("payment_transactions", {
            id: randomUUID(),
            pledge_id: pl.id,
            kind: "CAPTURE",
            amount: pl.total,
            status: "FAILED",
            idempotency_key: `${pl.id}:CAPTURE`,
            provider: "VNPAY",
            provider_ref: `1459${idxInSuccess}`,
            bank_code: "NCB",
            vnp_response_code: "51",
            message: "Tài khoản thẻ không đủ số dư khi quyết toán chiến dịch — chờ thanh toán lại",
            created_at: iso(endMs + HOUR),
          });
          continue;
        }
        run(`UPDATE pledges SET status='CAPTURED', captured_at=?, updated_at=? WHERE id=? AND status='AUTHORIZED'`, iso(endMs + HOUR), iso(endMs + HOUR), pl.id);
        ins("payment_transactions", {
          id: randomUUID(),
          pledge_id: pl.id,
          kind: "CAPTURE",
          amount: pl.total,
          status: "SUCCEEDED",
          idempotency_key: `${pl.id}:CAPTURE`,
          provider: idxInSuccess % 3 === 0 ? "FUNDVIET_PAY" : "VNPAY",
          provider_ref: idxInSuccess % 3 === 0 ? `fvp_${randomUUID().slice(0, 10)}` : `1460${String(idxInSuccess).padStart(4, "0")}`,
          bank_code: idxInSuccess % 3 === 0 ? null : "VCB",
          vnp_response_code: idxInSuccess % 3 === 0 ? null : "00",
          message: "Dự án đạt mục tiêu — đã quyết toán giải ngân thành công",
          created_at: iso(endMs + HOUR),
        });
      }
      if (p.status === "SUCCESS" && pledgesByProject[p.slug].length > 5) {
        const refCandidate = pledgesByProject[p.slug].find((x) => x.backer !== uid.usr_minhanh && !x.ships);
        if (refCandidate) {
          const refAt = Math.min(NOW - HOUR, endMs + 2 * DAY);
          run(`UPDATE pledges SET status='REFUNDED', updated_at=? WHERE id=? AND status='CAPTURED'`, iso(refAt), refCandidate.id);
          ins("payment_transactions", {
            id: randomUUID(),
            pledge_id: refCandidate.id,
            kind: "REFUND",
            amount: refCandidate.total,
            status: "SUCCEEDED",
            idempotency_key: `${refCandidate.id}:REFUND`,
            provider: "VNPAY",
            provider_ref: `14990001`,
            bank_code: "NCB",
            vnp_response_code: "00",
            message: "Hoàn tiền theo yêu cầu đối soát của người ủng hộ qua cổng VNPAY",
            created_at: iso(refAt),
          });
        }
      }
      run(`UPDATE projects SET status='SUCCESS', ended_at=? WHERE id=?`, iso(endMs), id);
      history(id, "LIVE", "SUCCESS", null, endMs, "Đạt mục tiêu khi kết thúc");
      if (p.status !== "SUCCESS") {
        run(`UPDATE projects SET status='FULFILLING' WHERE id=?`, id);
        history(id, "SUCCESS", "FULFILLING", uid[p.creator], endMs + 3 * DAY, "Bắt đầu giao quà");
        for (const pl of pledgesByProject[p.slug].filter((x) => x.ships)) {
          const done = p.status === "COMPLETED" || rand() < 0.55;
          const shipped = p.status === "COMPLETED" || done || rand() < 0.5;
          ins("shipments", {
            pledge_id: pl.id, status: done ? "DELIVERED" : shipped ? "SHIPPED" : "PREPARING",
            carrier: shipped ? pick(["GHN", "GHTK", "Viettel Post", "J&T"]) : null,
            tracking_code: shipped ? `VN${int(100000000, 999999999)}` : null,
            shipped_at: shipped ? iso(endMs + int(10, 20) * DAY) : null, delivered_at: done ? iso(endMs + int(21, 30) * DAY) : null,
            updated_at: iso(Math.min(NOW, endMs + 30 * DAY)),
          });
        }
      }
      if (p.status === "COMPLETED") {
        run(`UPDATE projects SET status='COMPLETED' WHERE id=?`, id);
        history(id, "FULFILLING", "COMPLETED", uid[p.creator], endMs + 40 * DAY, "Đã giao toàn bộ quà");
      }
    } else if (p.status === "FAILED") {
      for (const pl of pledgesByProject[p.slug]) {
        run(`UPDATE pledges SET status='VOIDED', voided_at=?, updated_at=? WHERE id=? AND status='AUTHORIZED'`, iso(endMs + HOUR), iso(endMs + HOUR), pl.id);
        ins("payment_transactions", { id: randomUUID(), pledge_id: pl.id, kind: "VOID", amount: pl.total, status: "SUCCEEDED", idempotency_key: `${pl.id}:VOID`, message: "Dự án không đạt mục tiêu — không trừ tiền", created_at: iso(endMs + HOUR) });
      }
      run(`UPDATE projects SET status='FAILED', ended_at=? WHERE id=?`, iso(endMs), id);
      history(id, "LIVE", "FAILED", null, endMs, "Không đạt mục tiêu khi kết thúc");
    } else if (p.status === "SUSPENDED") {
      run(`UPDATE projects SET status='SUSPENDED' WHERE id=?`, id);
      history(id, "LIVE", "SUSPENDED", admin, NOW - 2 * DAY, "Nghi vi phạm bản quyền hình ảnh — tạm gỡ để xác minh");
    }
  }

  // ───────────── 6. Thống kê theo ngày ─────────────
  for (const p of P) {
    const meta = projectMeta[p.slug];
    if (!meta.start || p.status === "SCHEDULED") continue;
    const id = pid[p.slug];
    const pls = db.prepare(`SELECT created_at, total_amount, status, cancelled_at FROM pledges WHERE project_id = ?`).all(id) as { created_at: string; total_amount: number; status: string; cancelled_at: string | null }[];
    const lastDay = Math.min(NOW, meta.end);
    let cumA = 0, cumB = 0;
    for (let d = meta.start; vnDate(d) <= vnDate(lastDay); d += DAY) {
      const key = vnDate(d);
      const day = pls.filter((x) => vnDate(new Date(x.created_at).getTime()) === key);
      const cancels = pls.filter((x) => x.cancelled_at && vnDate(new Date(x.cancelled_at).getTime()) === key);
      const amount = day.reduce((s, x) => s + x.total_amount, 0) - cancels.reduce((s, x) => s + x.total_amount, 0);
      cumA += amount; cumB += day.length - cancels.length;
      ins("project_daily_stats", {
        project_id: id, stat_date: key, new_pledges: day.length, new_backers: day.length, pledged_amount: amount,
        cumulative_amount: Math.max(0, cumA), cumulative_backers: Math.max(0, cumB),
        views: day.length * int(8, 20) + int(15, 80), saves: int(0, 6), comments: int(0, 3),
      });
    }
  }

  // ───────────── 7. Update, FAQ, bình luận ─────────────
  const FAQ_BANK: [string, string][] = [
    ["Khi nào tôi nhận được quà?", "Thời gian giao dự kiến ghi ở từng mức quà. Nhóm sẽ gửi mã vận đơn qua email và mục Updates khi bắt đầu giao."],
    ["Nếu dự án không đạt mục tiêu thì sao?", "FundViet áp dụng All-or-Nothing: nếu không đạt mục tiêu khi kết thúc, khoản giữ chỗ được giải phóng và bạn không bị trừ tiền."],
    ["Có giao hàng toàn quốc không?", "Có, nhóm giao toàn quốc qua GHN/GHTK. Hiện chưa giao ra nước ngoài."],
    ["Tôi có thể đổi mức quà không?", "Bạn có thể huỷ và chọn lại mức quà bất cứ lúc nào trước khi chiến dịch kết thúc."],
    ["Sản phẩm có bảo hành không?", "Có, bảo hành 12 tháng với lỗi sản xuất, đổi mới trong 30 ngày đầu."],
  ];
  const UPDATE_BANK = [
    ["Cảm ơn những backer đầu tiên!", "Chỉ sau 48 giờ, dự án đã nhận được sự ủng hộ vượt mong đợi. Cả nhóm xin cảm ơn và sẽ cập nhật tiến độ hằng tuần tại đây."],
    ["Hoàn thiện mẫu thử thứ ba", "Theo góp ý của các bạn, nhóm đã điều chỉnh kích thước và hoàn thiện mẫu thử thứ ba. Ảnh chi tiết và video sẽ có trong bản tin tới."],
    ["Mở khoá stretch goal đầu tiên", "Khi đạt 120% mục tiêu, mọi backer có quà vật lý sẽ được tặng thêm túi đựng bằng vải canvas tái chế."],
    ["Lịch sản xuất & giao hàng", "Nhà xưởng đã xác nhận lịch sản xuất. Lô đầu tiên dự kiến hoàn thành sau 6 tuần kể từ khi chiến dịch kết thúc."],
    ["Đã giao lô hàng đầu tiên", "Lô hàng đầu đã rời kho! Mã vận đơn đã được gửi tới email của từng backer."],
  ];
  const CMT: Record<string, string[]> = {
    QUESTION: ["Khi nào thì bắt đầu giao hàng vậy nhóm?", "Sản phẩm có bảo hành bao lâu ạ?", "Mình ở Đà Nẵng thì phí ship bao nhiêu?", "Nếu dự án không đạt mục tiêu thì tiền của mình có bị trừ không?", "Có thể đổi gói sau khi đã góp vốn không ạ?", "Gói giới hạn còn suất không nhóm ơi?", "Chất liệu có an toàn cho trẻ em không?"],
    SUGGESTION: ["Nhóm nên thêm lựa chọn màu xanh rêu, mình nghĩ sẽ rất hợp.", "Mong có thêm gói combo cho 2 người để tặng quà.", "Đề xuất làm thêm bản tiếng Anh để bạn bè nước ngoài cùng ủng hộ.", "Cần thay đổi kích thước hộp cho gọn hơn, để dễ mang đi.", "Giá như có app để theo dõi tiến độ sản xuất thì tuyệt.", "Nên bổ sung video quay cận cảnh chất liệu thực tế."],
    ISSUE: ["Mình góp vốn từ tuần trước nhưng chưa nhận được email xác nhận.", "Trang thanh toán báo lỗi khi mình chọn add-on, nhóm kiểm tra giúp nhé.", "Hơi thất vọng vì tiến độ chậm hơn dự kiến, mong nhóm cập nhật thường xuyên hơn.", "Ảnh sản phẩm và mô tả màu sắc có vẻ chưa khớp nhau."],
    PRAISE: ["Ý tưởng quá tuyệt vời, ủng hộ nhóm hết mình!", "Thiết kế đẹp và tinh tế, đã góp vốn ngay khi thấy.", "Rất thích cách nhóm đưa văn hoá Việt vào sản phẩm.", "Chúc mừng nhóm! Xứng đáng lắm.", "Đã theo dõi nhóm từ dự án trước, chất lượng luôn ổn định."],
    OTHER: ["Đã chia sẻ cho nhóm bạn rồi nhé.", "Hóng quá đi mất."],
    SPAM: ["Kiếm tiền online 5 triệu/ngày, inbox zalo để biết thêm!"],
  };
  const REPLY: Record<string, string> = {
    QUESTION: "Cảm ơn bạn! Nhóm đã bổ sung câu trả lời chi tiết vào mục FAQ, bạn xem giúp nhé.",
    SUGGESTION: "Góp ý rất hay, nhóm đã ghi nhận và sẽ báo kết quả trong Update tới!",
    ISSUE: "Xin lỗi bạn vì sự bất tiện, nhóm đã nhắn tin riêng để kiểm tra ngay.",
  };

  const publicStatuses = ["SCHEDULED", "LIVE", "SUCCESS", "FAILED", "FULFILLING", "COMPLETED", "SUSPENDED"];
  for (const p of P) {
    const id = pid[p.slug];
    const meta = projectMeta[p.slug];
    const creator = uid[p.creator];
    const collab = p.collabs?.[0] ? uid[p.collabs[0]] : null;
    // FAQ
    if (p.status !== "DRAFT") {
      FAQ_BANK.slice(0, p.status === "PENDING_REVIEW" ? 2 : int(3, 5)).forEach(([q, a], i) =>
        ins("faqs", { id: randomUUID(), project_id: id, question: q, answer: a, sort_order: i, created_by: i === 3 && collab ? collab : creator, created_at: iso(meta.created + DAY) }));
    }
    if (!publicStatuses.includes(p.status)) continue;
    const base = meta.start || NOW;
    const until = Math.min(NOW - HOUR, (meta.end || NOW) + 40 * DAY);
    // Updates
    const nUpdates = p.status === "SCHEDULED" ? 1 : p.status === "LIVE" ? int(1, 3) : int(3, 5);
    for (let i = 0; i < nUpdates; i++) {
      const [title, body] = p.status === "SCHEDULED" ? ["Sắp mở gọi vốn — bật nhắc để không lỡ Early Bird!", "Trang preview đã mở. Hãy lưu dự án để nhận thông báo ngay khi chiến dịch bắt đầu."] : UPDATE_BANK[i];
      const at = p.status === "SCHEDULED" ? NOW - 2 * DAY : Math.min(until, base + (i + 1) * (Math.max(DAY, (until - base) / (nUpdates + 1))));
      const author = collab && i === 1 ? collab : creator;
      ins("project_updates", { id: randomUUID(), project_id: id, author_id: author, title, body: `${body}\n\nCảm ơn bạn đã đồng hành cùng ${p.title.split("–")[0].trim()}.`, status: "PUBLISHED", backers_only: i === 3 ? 1 : 0, published_by: creator, published_at: iso(at), created_at: iso(at - HOUR), updated_at: iso(at) });
    }
    if (collab && p.status === "LIVE") {
      ins("project_updates", { id: randomUUID(), project_id: id, author_id: collab, title: "Hậu trường buổi chụp ảnh sản phẩm", body: "Bản nháp do Collaborator soạn: tổng hợp ảnh hậu trường và trả lời 5 câu hỏi được hỏi nhiều nhất tuần qua. Chờ Creator duyệt để đăng.", status: "DRAFT", created_at: iso(NOW - 5 * HOUR), updated_at: iso(NOW - 5 * HOUR) });
    }
    // Bình luận
    const backers = (pledgesByProject[p.slug] ?? []).map((x) => x.backer);
    const pool = backers.length ? backers : backerKeys.slice(3, 40).map((k) => uid[k]);
    const nComments = Math.min(22, 4 + Math.floor((pledgesByProject[p.slug]?.length ?? 6) / 3));
    const labels = ["QUESTION", "QUESTION", "SUGGESTION", "SUGGESTION", "PRAISE", "PRAISE", "PRAISE", "ISSUE", "OTHER"];
    for (let i = 0; i < nComments; i++) {
      const label = i === 5 && p.status === "LIVE" ? "SPAM" : pick(labels);
      const body = pick(CMT[label]);
      const at = between(Math.max(base - (p.status === "SCHEDULED" ? 5 * DAY : 0), meta.created), until);
      const author = pick(pool);
      const cid = randomUUID();
      const hidden = label === "SPAM";
      ins("comments", { id: cid, project_id: id, author_id: author, body, status: hidden ? "HIDDEN" : "VISIBLE", moderated_by: hidden ? (collab ?? creator) : null, moderated_reason: hidden ? "Spam / quảng cáo" : null, created_at: iso(at), updated_at: iso(at) });
      const a = analyzeComment(body);
      const replied = REPLY[label] && rand() < 0.55;
      const replier = collab && rand() < 0.5 ? collab : creator;
      const replyAt = Math.min(NOW - 60_000, at + between(1, 20) * HOUR);
      if (replied) ins("comments", { id: randomUUID(), project_id: id, parent_id: cid, author_id: replier, body: REPLY[label], created_at: iso(replyAt), updated_at: iso(replyAt) });
      ins("comment_analyses", {
        comment_id: cid, label: a.label, sentiment: a.sentiment, needs_action: a.needsAction ? 1 : 0, topic: a.topic, summary: a.summary,
        suggested_reply: a.suggestedReply, confidence: a.confidence, source: "RULE",
        handled_by: replied || hidden ? replier : null, handled_at: replied || hidden ? iso(replyAt) : null, analyzed_at: iso(at + 60_000),
      });
      for (const liker of shuffle(pool).slice(0, int(0, 6))) {
        if (liker !== author) ins("comment_likes", { comment_id: cid, user_id: liker, created_at: iso(at + HOUR) });
      }
    }
  }

  // ───────────── 8. Lưu, theo dõi, tin nhắn, thông báo ─────────────
  const save = (u: string, slug: string) => { try { ins("saved_projects", { user_id: u, project_id: pid[slug], created_at: iso(NOW - int(1, 20) * DAY) }); } catch { /* trùng */ } };
  ["moc-lamp", "sac-mau-ba-mien", "bep-may", "loa-tre", "ao-dai-sen", "robot-ti-hon"].forEach((s) => save(uid.usr_minhanh, s));
  const publicSlugs = P.filter((p) => publicStatuses.includes(p.status) && p.status !== "SUSPENDED").map((p) => p.slug);
  for (const k of backerKeys.slice(3)) for (const s of shuffle(publicSlugs).slice(0, int(0, 4))) save(uid[k], s);
  const follow = (a: string, b: string) => { if (a !== b) try { ins("follows", { follower_id: a, followee_id: b, created_at: iso(NOW - int(1, 90) * DAY) }); } catch { /* trùng */ } };
  ["usr_linh", "usr_haiyen", "usr_ducanh", "usr_lachong"].forEach((c) => follow(uid.usr_minhanh, uid[c]));
  follow(uid.usr_giahuy, uid.usr_linh);
  const creatorIds = CREATORS.map(([k]) => uid[`usr_${k}`]).concat(uid.usr_linh);
  for (const k of backerKeys.slice(3)) for (const c of shuffle(creatorIds).slice(0, int(0, 3))) follow(uid[k], c);

  const convo = (a: string, b: string, project: string | null, subject: string, msgs: [string, string][]) => {
    const cid = randomUUID();
    const startAt = NOW - msgs.length * 5 * HOUR - DAY;
    ins("conversations", { id: cid, project_id: project ? pid[project] : null, subject, created_at: iso(startAt), last_message_at: iso(startAt + (msgs.length - 1) * 5 * HOUR) });
    ins("conversation_participants", { conversation_id: cid, user_id: uid[a], last_read_at: iso(startAt + (msgs.length - 2) * 5 * HOUR), joined_at: iso(startAt) });
    ins("conversation_participants", { conversation_id: cid, user_id: uid[b], last_read_at: iso(startAt + (msgs.length - 1) * 5 * HOUR), joined_at: iso(startAt) });
    msgs.forEach(([who, body], i) => ins("messages", { id: randomUUID(), conversation_id: cid, sender_id: uid[who], body, created_at: iso(startAt + i * 5 * HOUR) }));
  };
  convo("usr_minhanh", "usr_linh", "orbit-one", "Hỏi về ORBIT One Early Bird", [
    ["usr_minhanh", "Chào anh Thanh, gói Early Bird có kèm máy xay rời không ạ?"],
    ["usr_linh", "Chào Minh Anh! Early Bird chưa kèm máy xay rời, bạn có thể nâng lên bản Pro hoặc đặt kèm phụ kiện sắp mở nhé."],
    ["usr_minhanh", "Dạ vậy em giữ Early Bird và thêm hộp viên nén. Bao giờ mở phụ kiện máy xay nhờ anh báo giúp em ạ."],
    ["usr_linh", "Chắc chắn rồi, nhóm sẽ cập nhật trong bản tin tuần tới nhé."],
  ]);
  convo("usr_giahuy", "usr_linh", "orbit-one", "Kế hoạch nội dung tuần này", [
    ["usr_linh", "Huy soạn giúp anh bản tin hậu trường kiểm thử áp suất nhé, anh xem xong sẽ đăng."],
    ["usr_giahuy", "Dạ em đã lưu bản nháp kèm giải đáp 5 câu hỏi thường gặp trong Studio rồi ạ."],
  ]);
  convo("usr_minhanh", "usr_haiyen", "hiep-si-pho-co", "Bìa cứng ký tặng", [
    ["usr_minhanh", "Chị Yến ơi, bản bìa cứng có ký tên riêng cho từng người không ạ?"],
    ["usr_haiyen", "Có em nhé, chị sẽ ký tên người nhận theo tên em điền lúc góp vốn."],
  ]);

  const notify = (u: string, type: string, title: string, body: string, link: string, ago: number, read = false, project?: string, actor?: string) =>
    ins("notifications", { id: randomUUID(), user_id: uid[u], type, title, body, link, project_id: project ? pid[project] : null, actor_id: actor ? uid[actor] : null, read_at: read ? iso(NOW - ago + HOUR) : null, created_at: iso(NOW - ago) });
  notify("usr_minhanh", "PROJECT_UPDATE", "ORBIT One có bản tin mới", "Mở khoá cột mốc nâng cấp đầu tiên", "/p/orbit-one?tab=updates", 3 * HOUR, false, "orbit-one", "usr_linh");
  notify("usr_minhanh", "COMMENT_REPLY", "Nguyễn Nhựt Thanh đã trả lời bình luận của bạn", "Cảm ơn bạn! Nhóm đã bổ sung chi tiết vào mục FAQ.", "/p/orbit-one?tab=comments", 7 * HOUR, false, "orbit-one", "usr_linh");
  notify("usr_minhanh", "SHIPMENT", "Pulse Band đang được giao", "Mã vận đơn đã được cập nhật", "/me/backed", DAY, true, "pulse-band");
  notify("usr_minhanh", "NEW_PROJECT_FROM_FOLLOWED", "Nguyễn Nhựt Thanh sắp mở dự án mới", "Loa Tre – Loa Bluetooth từ tre tự nhiên", "/p/loa-tre", 2 * DAY, true, "loa-tre", "usr_linh");
  notify("usr_minhanh", "PROJECT_RESULT", "Bước Xanh không đạt mục tiêu", "Khoản uỷ quyền giữ chỗ đã được giải phóng, thẻ của bạn không bị trừ tiền.", "/me/backed", 20 * DAY, true, "buoc-xanh");
  notify("usr_linh", "PLEDGE_RECEIVED", "ORBIT One vừa nhận thêm lượt ủng hộ", "Một người ủng hộ vừa chọn gói ORBIT One Pro", "/studio/orbit-one", HOUR, false, "orbit-one");
  notify("usr_linh", "NEW_COMMENT", "Có 3 góp ý mới cần xử lý", "Hệ thống AI đã phân loại các bình luận cần phản hồi trên Mộc Lamp", "/studio/moc-lamp?tab=comments", 5 * HOUR, false, "moc-lamp");
  notify("usr_linh", "MESSAGE", "Trần Gia Huy gửi tin nhắn", "Dạ em đã lưu bản nháp…", "/me/messages", 6 * HOUR, false, undefined, "usr_giahuy");
  notify("usr_giahuy", "SYSTEM", "Bạn đang cộng tác tại 3 dự án", "ORBIT One, Mộc Lamp, Loa Tre", "/studio", 3 * DAY, true);
  notify("usr_thanhtam", "REVIEW_RESULT", "Sơn mài số đang chờ duyệt", "Ban kiểm duyệt sẽ phản hồi trong vòng 48 giờ", "/studio/son-mai-so", DAY, false, "son-mai-so");
  notify("usr_maytre", "REVIEW_RESULT", "Nón lá phát sáng LED cần bổ sung hồ sơ", "Cần bổ sung chứng nhận an toàn điện cho pin", "/studio/non-la-led", 4 * DAY, false, "non-la-led", "usr_admin");

  // Lời mời cộng tác đang chờ phản hồi
  ins("project_invitations", { id: randomUUID(), project_id: pid["chu-cuoi"], email: "user000001@gmail.com", invitee_id: uid.usr_minhanh, invited_by: uid.usr_linh, message: "Nhờ Minh Anh hỗ trợ nhóm điều phối thông tin cộng đồng cho dự án phim nhé!", status: "PENDING", token: randomUUID(), expires_at: iso(NOW + 6 * DAY), created_at: iso(NOW - DAY) });
  notify("usr_minhanh", "INVITATION", "Nguyễn Nhựt Thanh mời bạn làm Cộng tác viên", "Dự án: Chú Cuội – Phim hoạt hình ngắn", "/me", DAY, false, "chu-cuoi", "usr_linh");

  ins("project_invitations", { id: randomUUID(), project_id: pid["gom-men-lam"], email: "ctv000001@gmail.com", invitee_id: uid.usr_giahuy, invited_by: uid.usr_maytre, message: "Mời Gia Huy tham gia phụ trách giải đáp người ủng hộ cho bộ sưu tập Gốm Men Lam.", status: "PENDING", token: randomUUID(), expires_at: iso(NOW + 6 * DAY), created_at: iso(NOW - 8 * HOUR) });
  notify("usr_giahuy", "INVITATION", "Nhóm Mây Tre Việt mời bạn làm Cộng tác viên", "Dự án: Gốm Men Lam", "/me", 8 * HOUR, false, "gom-men-lam", "usr_maytre");

  // ───────────── 9. Báo cáo, nhật ký, lập lịch ─────────────
  ins("reports", { id: randomUUID(), reporter_id: uid.b3, target_type: "PROJECT", project_id: pid["than-thoai-viet"], reason: "PROHIBITED", detail: "Hình minh hoạ trùng lặp với tác phẩm đã đăng ký bản quyền của đơn vị khác.", status: "RESOLVED", handled_by: admin, handled_at: iso(NOW - 2 * DAY), resolution: "Tạm gỡ dự án, yêu cầu Chủ dự án cung cấp hồ sơ bản quyền.", created_at: iso(NOW - 3 * DAY) });
  ins("reports", { id: randomUUID(), reporter_id: uid.b7, target_type: "PROJECT", project_id: pid["robot-ti-hon"], reason: "MISLEADING", detail: "Thông số dung lượng pin trong video giới thiệu chưa khớp phần mô tả kỹ thuật.", status: "OPEN", created_at: iso(NOW - 10 * HOUR) });
  const spam = db.prepare(`SELECT id, project_id FROM comments WHERE status='HIDDEN' LIMIT 1`).get() as { id: string; project_id: string } | undefined;
  if (spam) ins("reports", { id: randomUUID(), reporter_id: uid.b11, target_type: "COMMENT", project_id: spam.project_id, comment_id: spam.id, reason: "SPAM", detail: "Bình luận chứa nội dung quảng cáo không liên quan", status: "OPEN", created_at: iso(NOW - 4 * HOUR) });
  ins("reports", { id: randomUUID(), reporter_id: uid.b15, target_type: "USER", user_id: uid.b20, reason: "HARASSMENT", detail: "Gửi tin nhắn quảng cáo lặp lại nhiều lần.", status: "OPEN", created_at: iso(NOW - 2 * HOUR) });
  // Khoá một tài khoản vi phạm thực tế
  run(`UPDATE users SET status='LOCKED', locked_reason='Phát tán bình luận quảng cáo trái phép trên nhiều dự án' WHERE id=?`, uid.b25);
  for (const [action, entity, entityId, detail, ago] of [
    ["project.approve", "project", pid["bep-may"], "Phê duyệt Bếp Mây, lên lịch mở gọi vốn sau 4 ngày", 3 * DAY],
    ["project.reject", "project", pid["non-la-led"], "Yêu cầu bổ sung chứng nhận an toàn điện", 4 * DAY],
    ["project.suspend", "project", pid["than-thoai-viet"], "Tạm ngưng hiển thị để xác minh quyền sở hữu hình ảnh", 2 * DAY],
    ["user.lock", "user", uid.b25, "Khoá tài khoản phát tán quảng cáo rác", DAY],
  ] as const) ins("audit_logs", { id: randomUUID(), actor_id: admin, action, entity_type: entity, entity_id: entityId, detail, created_at: iso(NOW - ago) });
  ins("scheduler_runs", { id: randomUUID(), trigger_source: "AUTO", opened_count: 0, success_count: 0, failed_count: 0, captured_count: 0, voided_count: 0, started_at: iso(NOW - 30 * 60_000), finished_at: iso(NOW - 30 * 60_000 + 120), note: "Chu kỳ kiểm tra định kỳ hoàn tất" });

  // ───────────── 10. Dự đoán AI ─────────────
  for (const p of P) {
    if (["CANCELLED", "SUSPENDED"].includes(p.status)) continue;
    const id = pid[p.slug];
    const input = buildPredictionInputSync(db, id, nowDate);
    if (!input) continue;
    const r = predictSuccess(input);
    ins("ai_predictions", {
      id: randomUUID(), project_id: id, mode: input.mode, probability: r.probability, band: r.band, projected_amount: r.projectedAmount,
      factors_json: JSON.stringify(r.factors), suggestions_json: JSON.stringify(r.suggestions), model_version: r.modelVersion,
      requested_by: uid[p.creator], created_at: iso(NOW - int(1, 6) * HOUR),
    });
  }

  db.prepare(`INSERT INTO meta (key, value) VALUES ('seeded_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(iso(NOW));
  return { users: Object.keys(uid).length, projects: P.length };
}

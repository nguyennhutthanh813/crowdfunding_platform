// Chỉ đọc DB dành riêng cho video để đối chiếu các vai trò và khóa ngoại.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const out = resolve(root, "output/video-demo-2026-11-01");
const a = JSON.parse(readFileSync(resolve(out, "manifest-A.json"), "utf8"));
const c = JSON.parse(readFileSync(resolve(out, "manifest-C.json"), "utf8"));
const db = new DatabaseSync(resolve(root, ".local-data/gop-video-20261101.sqlite"));
const campaignId = a.campaignId;
const campaign = db.prepare("select id,creator_id,status,goal_amount,pledged_amount from campaigns where id=?").get(campaignId);
const review = db.prepare("select reviewer_id,decision,submission_version from campaign_reviews where campaign_id=? order by submission_version desc limit 1").get(campaignId);
const members = db.prepare("select user_id,role from campaign_members where campaign_id=? order by user_id").all(campaignId);
const rewards = db.prepare("select id,title,amount from reward_tiers where campaign_id=?").all(campaignId);
const addOns = db.prepare("select id,title,amount from add_ons where campaign_id=?").all(campaignId);
const shipping = db.prepare("select id,name,fee_amount from shipping_options where campaign_id=?").all(campaignId);
const pledges = db.prepare("select id,backer_id,reward_tier_id,shipping_option_id,shipping_address_id,status,total_amount from pledges where campaign_id=?").all(campaignId);
const authorizations = db.prepare("select id,pledge_id,status,amount from payment_authorizations where pledge_id in (select id from pledges where campaign_id=?)").all(campaignId);
const comments = db.prepare("select id,author_id,kind from campaign_comments where campaign_id=?").all(campaignId);
const updates = db.prepare("select id,author_id,title from campaign_updates where campaign_id=?").all(campaignId);
const events = db.prepare("select event_type,actor_role from campaign_events where campaign_id=? order by created_at").all(campaignId);
const fk = db.prepare("pragma foreign_key_check").all();

function check(condition, message) { if (!condition) throw new Error(message); }
check(campaign?.status === "LIVE" && campaign.creator_id === "usr_hoang_linh", "Chiến dịch/chủ/trạng thái không khớp.");
check(review?.decision === "APPROVED" && review.reviewer_id === "usr_khanh_an", "Lượt duyệt không khớp.");
check(members.some((row) => row.user_id === "usr_gia_huy" && row.role === "COLLABORATOR"), "Gia Huy chưa ở đúng chiến dịch.");
check(rewards.some((row) => row.amount === 750000), "Gói quà chưa ghi.");
check(addOns.some((row) => row.amount === 120000), "Phần bổ sung chưa ghi.");
check(shipping.some((row) => row.fee_amount === 30000), "Phí giao chưa ghi.");
check(pledges.length === 1 && pledges[0].backer_id === "usr_minh_anh" && pledges[0].total_amount === 950000, "Cam kết Minh Anh/tổng tiền không khớp.");
check(authorizations.some((row) => row.id === c.pledgeAuthorizationId && row.amount === 950000), "Mã cam kết mẫu không khớp bảng ủy quyền.");
check(comments.some((row) => row.author_id === "usr_minh_anh"), "Câu hỏi người ủng hộ chưa ghi.");
check(updates.some((row) => row.author_id === "usr_gia_huy"), "Cập nhật cộng tác viên chưa ghi.");
check(fk.length === 0, `Có ${fk.length} lỗi khóa ngoại.`);

console.log(JSON.stringify({campaignId, campaign, review, members, rewards, addOns, shipping,
  pledges, authorizations, comments, updates, eventCount: events.length,
  events: events.map((row) => `${row.actor_role}:${row.event_type}`), foreignKeyErrors: fk.length}, null, 2));
db.close();

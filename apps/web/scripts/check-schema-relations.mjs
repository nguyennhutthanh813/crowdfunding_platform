import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const schemaPath = path.join(projectRoot, "database", "schema.sql");
const submissionPath = path.resolve(
  projectRoot,
  "..",
  "BAI_NOP_TUAN_USE_CASE_ERD_DATABASE",
  "02_ERD_DATABASE",
  "database-schema.sql",
);
const publicSchemaPath = path.join(
  projectRoot,
  "public",
  "diagrams",
  "erd",
  "database-schema.sql",
);
const schema = fs.readFileSync(schemaPath, "utf8");
const paymentAuthorizationTable =
  schema.match(/CREATE TABLE payment_authorizations \(([\s\S]*?)\n\);/)?.[1] ??
  "";

const checks = [
  {
    name: "User 1:N Campaign, creator_id không UNIQUE",
    pass:
      /creator_id UUID NOT NULL REFERENCES users\(id\)/.test(schema) &&
      !/UNIQUE\s*\(\s*creator_id\s*\)/i.test(schema),
  },
  {
    name: "Mỗi campaign tối đa một OWNER",
    pass:
      /uq_campaign_single_owner/.test(schema) &&
      /WHERE role = 'OWNER'/.test(schema),
  },
  {
    name: "OWNER luôn trùng creator_id",
    pass:
      /sync_campaign_owner_membership/.test(schema) &&
      /assert_campaign_owner_consistency/.test(schema) &&
      /INSERT INTO user_roles \(user_id, role\)[\s\S]*?VALUES \(NEW.creator_id, 'CREATOR'\)/.test(
        schema,
      ),
  },
  {
    name: "Reward và shipping cùng campaign với pledge",
    pass:
      /FOREIGN KEY \(reward_tier_id, campaign_id\)[\s\S]*?reward_tiers\(id, campaign_id\)/.test(
        schema,
      ) &&
      /FOREIGN KEY \(shipping_option_id, campaign_id\)[\s\S]*?shipping_options\(id, campaign_id\)/.test(
        schema,
      ),
  },
  {
    name: "Reward và add-on khai báo rõ nhu cầu giao hàng",
    pass:
      /CREATE TABLE reward_tiers \([\s\S]*?requires_shipping BOOLEAN NOT NULL DEFAULT false[\s\S]*?\n\);/.test(
        schema,
      ) &&
      /CREATE TABLE add_ons \([\s\S]*?requires_shipping BOOLEAN NOT NULL DEFAULT false[\s\S]*?\n\);/.test(
        schema,
      ),
  },
  {
    name: "Địa chỉ pledge thuộc đúng backer",
    pass:
      /FOREIGN KEY \(shipping_address_id, backer_id\)[\s\S]*?addresses\(id, user_id\)/.test(
        schema,
      ),
  },
  {
    name: "Pledge Add-on mang campaign_id và khóa chéo",
    pass:
      /CREATE TABLE pledge_add_ons[\s\S]*?campaign_id UUID NOT NULL/.test(
        schema,
      ) &&
      /FOREIGN KEY \(add_on_id, campaign_id\)[\s\S]*?add_ons\(id, campaign_id\)/.test(
        schema,
      ),
  },
  {
    name: "Update và reply không nối chéo campaign",
    pass:
      /FOREIGN KEY \(campaign_id, author_id\)[\s\S]*?campaign_members\(campaign_id, user_id\)/.test(
        schema,
      ) &&
      /FOREIGN KEY \(parent_comment_id, campaign_id\)[\s\S]*?comments\(id, campaign_id\)/.test(
        schema,
      ),
  },
  {
    name: "Pledge 1:0..1 Fulfillment",
    pass:
      /pledge_id UUID NOT NULL UNIQUE REFERENCES pledges\(id\)/.test(schema),
  },
  {
    name: "Một user thích một comment tối đa một lần",
    pass:
      schema.includes("CREATE TABLE comment_likes (") &&
      schema.includes("PRIMARY KEY (comment_id, user_id)") &&
      schema.includes("REFERENCES comments(id) ON DELETE CASCADE") &&
      schema.includes("REFERENCES users(id) ON DELETE CASCADE") &&
      schema.includes("CREATE TRIGGER trg_comment_likes_count"),
  },
  {
    name: "Câu hỏi chỉ có một người phụ trách trong cùng campaign",
    pass:
      /kind VARCHAR\(16\) NOT NULL DEFAULT 'COMMENT' CHECK \(kind IN \('COMMENT', 'QUESTION'\)\)/.test(schema) &&
      /CREATE TABLE question_assignments \([\s\S]*?PRIMARY KEY \(campaign_id, comment_id\)/.test(schema) &&
      /FOREIGN KEY \(comment_id, campaign_id\)[\s\S]*?REFERENCES comments\(id, campaign_id\)/.test(schema) &&
      /FOREIGN KEY \(campaign_id, assignee_user_id\)[\s\S]*?REFERENCES campaign_members\(campaign_id, user_id\)/.test(schema),
  },
  {
    name: "Pledge 1:N Payment Authorization",
    pass:
      /pledge_id UUID NOT NULL REFERENCES pledges\(id\)/.test(
        paymentAuthorizationTable,
      ) && !/pledge_id UUID NOT NULL UNIQUE/.test(paymentAuthorizationTable),
  },
  {
    name: "Fraud alert khớp pledge, campaign và backer",
    pass:
      /FOREIGN KEY \(pledge_id, campaign_id, subject_user_id\)[\s\S]*?pledges\(id, campaign_id, backer_id\)/.test(
        schema,
      ),
  },
];

if (fs.existsSync(submissionPath)) {
  checks.push({
    name: "SQL trong source và folder bài nộp đồng bộ",
    pass: fs.readFileSync(submissionPath, "utf8") === schema,
  });
}

if (fs.existsSync(publicSchemaPath)) {
  checks.push({
    name: "SQL tải từ trang System Design đồng bộ source",
    pass: fs.readFileSync(publicSchemaPath, "utf8") === schema,
  });
}

console.table(
  checks.map((check) => ({
    relationship: check.name,
    result: check.pass ? "PASS" : "FAIL",
  })),
);

const failed = checks.filter((check) => !check.pass);
if (failed.length) {
  throw new Error(
    `SCHEMA_RELATION_CHECK_FAILED:${failed.map((check) => check.name).join("|")}`,
  );
}

console.log(`SCHEMA_RELATION_CHECK_PASSED:${checks.length}/${checks.length}`);

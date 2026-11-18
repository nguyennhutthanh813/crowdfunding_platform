import { DomainError, all, insert, newId, tx, type DbClient } from "../../db/helpers.js";
import { buildPredictionInput } from "./features.js";
import { predictSuccess, type PredictionResult } from "./predict.js";
import { analyzeComment } from "./comments.js";

/** Chạy dự đoán AI và lưu lịch sử. Quyền ai.run kiểm ở tầng gọi. */
export async function runPrediction(db: DbClient, projectId: string, actorId: string | null): Promise<PredictionResult & { id: string }> {
  return tx(db, async () => {
    const input = await buildPredictionInput(db, projectId);
    if (!input) throw new DomainError("Không tìm thấy dự án.", "NOT_FOUND");
    const r = predictSuccess(input);
    const id = newId();
    await insert(db, "ai_predictions", {
      id,
      project_id: projectId,
      mode: input.mode,
      probability: r.probability,
      band: r.band,
      projected_amount: r.projectedAmount,
      factors_json: JSON.stringify(r.factors),
      suggestions_json: JSON.stringify(r.suggestions),
      model_version: r.modelVersion,
      requested_by: actorId,
    });
    return { ...r, id };
  });
}

/** Phân tích các bình luận chưa có kết quả AI. Bỏ qua bình luận của thành viên dự án. */
export async function analyzeProjectComments(db: DbClient, projectId: string): Promise<number> {
  return tx(db, async () => {
    const rows = await all<{ id: string; body: string }>(
      db,
      `SELECT c.id, c.body FROM comments c
       WHERE c.project_id = ? AND c.parent_id IS NULL AND c.status <> 'DELETED'
         AND NOT EXISTS (SELECT 1 FROM comment_analyses a WHERE a.comment_id = c.id)
         AND NOT EXISTS (SELECT 1 FROM project_members m WHERE m.project_id = c.project_id AND m.user_id = c.author_id AND m.status = 'ACTIVE')`,
      projectId,
    );
    for (const r of rows) {
      const a = analyzeComment(r.body);
      await insert(db, "comment_analyses", {
        comment_id: r.id,
        label: a.label,
        sentiment: a.sentiment,
        needs_action: a.needsAction ? 1 : 0,
        topic: a.topic,
        summary: a.summary,
        suggested_reply: a.suggestedReply,
        confidence: a.confidence,
        source: "RULE",
      });
    }
    return rows.length;
  });
}

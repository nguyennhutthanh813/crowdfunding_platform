'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { connectedRequest } from './request';
import type { Comment, User } from './types';
import styles from './connected-workspace.module.css';

type CommentPage = {
  data: Comment[];
  meta: { hasNextPage: boolean };
};

export function DiscussionPanel({
  campaignId,
  user,
  allowReply = true,
}: {
  campaignId: string;
  user: User | null;
  allowReply?: boolean;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load(nextPage: number) {
    const result = await connectedRequest<CommentPage>(
      `social/comments?campaignId=${campaignId}&page=${nextPage}&limit=10`,
    );
    setComments((current) => (nextPage === 1 ? result.data : [...current, ...result.data]));
    setPage(nextPage);
    setHasMore(result.meta.hasNextPage);
  }

  useEffect(() => {
    let active = true;
    connectedRequest<CommentPage>(`social/comments?campaignId=${campaignId}&page=1&limit=10`)
      .then((result) => {
        if (!active) return;
        setComments(result.data);
        setHasMore(result.meta.hasNextPage);
      })
      .catch((reason) => {
        if (active) setError((reason as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [campaignId]);

  async function submit(event: FormEvent<HTMLFormElement>, parentCommentId?: string) {
    event.preventDefault();
    const content = (parentCommentId ? replyBody : body).trim();
    if (!content) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await connectedRequest('social/comments', 'POST', {
        campaignId,
        body: content,
        ...(parentCommentId ? { parentCommentId } : {}),
      });
      await load(1);
      if (parentCommentId) {
        setReplyTo(null);
        setReplyBody('');
      } else {
        setBody('');
      }
      setNotice(parentCommentId ? 'Đã gửi câu trả lời.' : 'Đã đăng câu hỏi của bạn.');
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.discussion} aria-label="Trao đổi về chiến dịch">
      <div className={styles.discussionHead}>
        <div>
          <h4>Hỏi đáp về dự án</h4>
          <p>Câu hỏi và câu trả lời được lưu cùng chiến dịch này.</p>
        </div>
        <button
          type="button"
          className={styles.textButton}
          disabled={busy || loading}
          onClick={() => void load(1).catch((reason) => setError((reason as Error).message))}
        >
          Tải lại
        </button>
      </div>
      {loading && <p role="status">Đang tải trao đổi…</p>}
      {error && (
        <p role="alert" className={styles.inlineError}>
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className={styles.inlineSuccess}>
          {notice}
        </p>
      )}
      {!loading && !comments.length && (
        <p className={styles.empty}>Chưa có câu hỏi nào cho dự án này.</p>
      )}
      <div className={styles.commentList}>
        {comments.map((comment) => (
          <article key={comment.id} className={styles.commentItem}>
            <div className={styles.commentMeta}>
              <strong>{comment.author.displayName}</strong>
              <time dateTime={comment.createdAt}>
                {new Date(comment.createdAt).toLocaleString('vi-VN')}
              </time>
            </div>
            <p>{comment.body}</p>
            {comment.replies.map((reply) => (
              <div key={reply.id} className={styles.commentReply}>
                <div className={styles.commentMeta}>
                  <strong>{reply.author.displayName}</strong>
                  <time dateTime={reply.createdAt}>
                    {new Date(reply.createdAt).toLocaleString('vi-VN')}
                  </time>
                </div>
                <p>{reply.body}</p>
              </div>
            ))}
            {user && allowReply && (
              <button
                type="button"
                className={styles.textButton}
                onClick={() => {
                  setReplyTo(replyTo === comment.id ? null : comment.id);
                  setReplyBody('');
                }}
              >
                {replyTo === comment.id ? 'Đóng trả lời' : 'Trả lời'}
              </button>
            )}
            {replyTo === comment.id && (
              <form
                onSubmit={(event) => void submit(event, comment.id)}
                className={styles.formStack}
              >
                <label>
                  <span className={styles.label}>Trả lời {comment.author.displayName}</span>
                  <textarea
                    name="replyBody"
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    maxLength={4000}
                    rows={3}
                    required
                  />
                </label>
                <button
                  type="submit"
                  className={styles.secondaryButton}
                  disabled={busy || !replyBody.trim()}
                >
                  Gửi trả lời
                </button>
              </form>
            )}
          </article>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={busy || loading}
          onClick={() => {
            setLoading(true);
            void load(page + 1)
              .catch((reason) => setError((reason as Error).message))
              .finally(() => setLoading(false));
          }}
        >
          Xem thêm câu hỏi
        </button>
      )}
      {user ? (
        <form onSubmit={(event) => void submit(event)} className={styles.formStack}>
          <label>
            <span className={styles.label}>Bạn muốn hỏi nhóm dự án điều gì?</span>
            <textarea
              name="commentBody"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={4000}
              rows={3}
              required
              placeholder="Ví dụ: Khi nào nhóm dự kiến giao gói ủng hộ?"
            />
          </label>
          <button type="submit" className={styles.primaryButton} disabled={busy || !body.trim()}>
            Đăng câu hỏi
          </button>
        </form>
      ) : (
        <p className={styles.helper}>
          Chọn một vai trò để đăng nhập rồi quay lại Khám phá nếu bạn muốn đặt câu hỏi.
        </p>
      )}
    </section>
  );
}

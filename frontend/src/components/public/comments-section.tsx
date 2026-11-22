"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { Eye, EyeOff, Heart, MessageCircle, Pencil, Reply, Send, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CommentVM } from "@/server/queries/public";
import { addCommentAction, editCommentAction, moderateCommentAction, toggleCommentLikeAction } from "@/server/actions/public";
import { burstAt } from "@/components/fx/confetti";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/layout-bits";
import { Avatar, Badge, RoleBadge } from "@/components/ui/primitives";
import { ReportDialog } from "./project-hero-actions";
import { cn, formatDate, timeAgo } from "@/lib/utils";

export interface CommentViewerInfo {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  canComment: boolean;
  canModerate: boolean;
  canDelete: boolean;
  canReport: boolean;
}

export function CommentsSection({
  projectId,
  slug,
  comments,
  isPublic,
  viewer,
}: {
  projectId: string;
  slug: string;
  comments: CommentVM[];
  isPublic: boolean;
  viewer: CommentViewerInfo | null;
}) {
  const [replyTarget, setReplyTarget] = useState<{ rootId: string; mention: string } | null>(null);
  const [modTarget, setModTarget] = useState<{ comment: CommentVM; op: "hide" | "delete" } | null>(null);

  const openReply = (rootId: string, mention: string) => {
    setReplyTarget((cur) => (cur?.rootId === rootId && cur.mention === mention ? null : { rootId, mention }));
  };

  return (
    <div className="space-y-6">
      {/* Khung viết bình luận cấp 1 */}
      {!isPublic ? (
        <div className="card p-4 text-sm text-muted">
          Dự án hiện chưa mở thảo luận công khai.
        </div>
      ) : !viewer ? (
        <div className="card flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-bold">Tham gia thảo luận cùng cộng đồng</h3>
            <p className="mt-1 text-sm text-muted">
              Đăng nhập để đặt câu hỏi, góp ý cho chủ dự án hoặc thả tim bình luận hữu ích.
            </p>
          </div>
          <ButtonLink href={`/login?next=${encodeURIComponent(`/p/${slug}?tab=comments`)}`} size="sm">
            Đăng nhập để bình luận
          </ButtonLink>
        </div>
      ) : !viewer.canComment && viewer.isAdmin ? (
        <div className="card flex items-start gap-3 border-amber-500/25 bg-amber-500/5 p-4 text-sm">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
          <div>
            <div className="font-semibold">Chế độ giám sát Quản trị viên</div>
            <p className="mt-0.5 text-muted">
              Quản trị viên không đăng bình luận trên dự án, nhưng có thể xoá bình luận vi phạm khi cần.
            </p>
          </div>
        </div>
      ) : viewer.canComment ? (
        <div className="card p-4 sm:p-5">
          <ActionForm action={addCommentAction} resetOnSuccess className="space-y-3">
            <input type="hidden" name="projectId" value={projectId} />
            <div className="flex items-start gap-3">
              <Avatar name={viewer.displayName} src={viewer.avatarUrl} size={38} className="mt-0.5" />
              <div className="min-w-0 flex-1 space-y-2.5">
                <Textarea
                  name="body"
                  maxLength={2000}
                  placeholder="Đặt câu hỏi về sản phẩm, giao hàng hoặc gửi góp ý cho nhóm…"
                  className="min-h-24"
                  required
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted">
                    Góp ý của bạn sẽ được AI phân loại để nhóm dự án phản hồi nhanh hơn.
                  </span>
                  <SubmitButton size="sm" pendingText="Đang gửi…">
                    <Send className="size-4" /> Gửi bình luận
                  </SubmitButton>
                </div>
              </div>
            </div>
          </ActionForm>
        </div>
      ) : null}

      {/* Danh sách bình luận 2 cấp */}
      {comments.length === 0 ? (
        <EmptyState
          compact
          title="Chưa có bình luận nào"
          description="Hãy là người đầu tiên đặt câu hỏi hoặc chia sẻ cảm nhận về dự án này."
        />
      ) : (
        <div className="space-y-4">
          {comments.map((root) => (
            <div
              key={root.id}
              className={cn(
                "card p-4 sm:p-5",
                root.status === "HIDDEN" && "border-dashed border-amber-500/40 bg-amber-500/5",
              )}
            >
              <CommentItem
                comment={root}
                slug={slug}
                projectId={projectId}
                isPublic={isPublic}
                viewer={viewer}
                onReply={() => openReply(root.id, "")}
                onModerate={(op) => setModTarget({ comment: root, op })}
              />

              {/* Danh sách trả lời cấp 2 */}
              {root.replies.length > 0 && (
                <div className="mt-4 space-y-3 border-l-2 border-line pl-3.5 sm:ml-6 sm:pl-5">
                  {root.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={cn(
                        "rounded-2xl bg-surface-2/60 p-3.5",
                        reply.status === "HIDDEN" && "border border-dashed border-amber-500/40 bg-amber-500/5",
                      )}
                    >
                      <CommentItem
                        comment={reply}
                        slug={slug}
                        projectId={projectId}
                        isPublic={isPublic}
                        viewer={viewer}
                        onReply={() => openReply(root.id, `@${reply.display_name} `)}
                        onModerate={(op) => setModTarget({ comment: reply, op })}
                        compact
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Form trả lời inline (gắn vào bình luận gốc để giữ tối đa 2 cấp) */}
              {replyTarget?.rootId === root.id && viewer?.canComment && isPublic && (
                <div className="mt-4 border-l-2 border-violet-500/50 pl-3.5 sm:ml-6 sm:pl-5">
                  <ActionForm
                    action={addCommentAction}
                    resetOnSuccess
                    onSuccess={() => setReplyTarget(null)}
                    className="space-y-2.5 rounded-2xl border border-violet-500/25 bg-surface-2/70 p-3.5"
                  >
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="parentId" value={root.id} />
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>
                        Đang trả lời <b className="text-fg">{root.display_name}</b>
                      </span>
                      <button
                        type="button"
                        onClick={() => setReplyTarget(null)}
                        className="font-semibold hover:text-fg"
                      >
                        Đóng
                      </button>
                    </div>
                    <Textarea
                      name="body"
                      maxLength={2000}
                      defaultValue={replyTarget.mention}
                      placeholder="Nhập nội dung phản hồi…"
                      className="min-h-20"
                      required
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" size="xs" onClick={() => setReplyTarget(null)}>
                        Huỷ
                      </Button>
                      <SubmitButton size="xs" pendingText="Đang gửi…">
                        <Reply className="size-3.5" /> Gửi trả lời
                      </SubmitButton>
                    </div>
                  </ActionForm>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal ẩn / xoá bình luận */}
      <Dialog
        open={Boolean(modTarget)}
        onClose={() => setModTarget(null)}
        title={modTarget?.op === "hide" ? "Ẩn bình luận" : "Xoá bình luận"}
        description={
          modTarget?.op === "hide"
            ? "Bình luận bị ẩn sẽ không hiển thị với khách và người dùng khác, nhưng nhóm dự án vẫn xem và khôi phục được."
            : "Hành động xoá sẽ gỡ bình luận khỏi trang dự án và ghi vào nhật ký kiểm duyệt."
        }
      >
        {modTarget && (
          <ActionForm
            action={moderateCommentAction}
            onSuccess={() => setModTarget(null)}
            className="space-y-4"
          >
            <input type="hidden" name="commentId" value={modTarget.comment.id} />
            <input type="hidden" name="op" value={modTarget.op} />
            <div className="rounded-xl border border-line bg-surface-2 p-3 text-sm text-muted">
              <div className="font-semibold text-fg">{modTarget.comment.display_name}</div>
              <p className="mt-1 line-clamp-3">{modTarget.comment.body}</p>
            </div>
            <Field label="Lý do (tuỳ chọn)">
              <Input
                name="reason"
                maxLength={300}
                placeholder={modTarget.op === "hide" ? "Ví dụ: Spam / quảng cáo" : "Ví dụ: Ngôn từ vi phạm quy định"}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModTarget(null)}>
                Huỷ
              </Button>
              <SubmitButton
                variant={modTarget.op === "delete" ? "danger" : "primary"}
                size="sm"
                pendingText="Đang xử lý…"
              >
                {modTarget.op === "hide" ? "Xác nhận ẩn" : "Xác nhận xoá"}
              </SubmitButton>
            </div>
          </ActionForm>
        )}
      </Dialog>
    </div>
  );
}

function CommentItem({
  comment,
  slug,
  projectId,
  isPublic,
  viewer,
  onReply,
  onModerate,
  compact,
}: {
  comment: CommentVM;
  slug: string;
  projectId: string;
  isPublic: boolean;
  viewer: CommentViewerInfo | null;
  onReply: () => void;
  onModerate: (op: "hide" | "delete") => void;
  compact?: boolean;
}) {
  const isOwn = viewer?.id === comment.author_id;
  const [editingBody, setEditingBody] = useState<string | null>(null);

  return (
    <div className="flex items-start gap-3">
      <Link href={`/u/${comment.username}`} className="shrink-0">
        <Avatar name={comment.display_name} src={comment.avatar_url} size={compact ? 32 : 38} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={`/u/${comment.username}`} className="text-sm font-bold hover:text-violet-600 dark:hover:text-violet-400">
            {comment.display_name}
          </Link>
          {comment.badge && <RoleBadge role={comment.badge} />}
          {comment.status === "HIDDEN" && (
            <Badge tone="amber" dot>
              Đã ẩn{comment.moderated_reason ? ` · ${comment.moderated_reason}` : ""}
            </Badge>
          )}
          <span className="text-xs text-muted" title={formatDate(comment.created_at, true)}>
            {timeAgo(comment.created_at)}
          </span>
        </div>

        {editingBody !== null ? (
          <ActionForm
            action={editCommentAction}
            onSuccess={() => setEditingBody(null)}
            className="mt-2 space-y-2"
          >
            <input type="hidden" name="commentId" value={comment.id} />
            <Textarea
              name="body"
              value={editingBody}
              onChange={(e) => setEditingBody(e.target.value)}
              maxLength={2000}
              className="min-h-20"
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="xs" onClick={() => setEditingBody(null)}>
                Huỷ
              </Button>
              <SubmitButton size="xs" pendingText="Đang lưu…">
                Lưu sửa
              </SubmitButton>
            </div>
          </ActionForm>
        ) : (
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-fg/95">
            {comment.body}
          </p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <CommentLikeButton
            commentId={comment.id}
            slug={slug}
            likes={comment.likes}
            liked={Boolean(comment.liked)}
            disabled={comment.status !== "VISIBLE"}
          />

          {isPublic && viewer?.canComment && comment.status === "VISIBLE" && (
            <button
              type="button"
              onClick={onReply}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <MessageCircle className="size-3.5" /> Trả lời
            </button>
          )}

          {viewer?.canModerate && comment.status === "VISIBLE" && (
            <button
              type="button"
              onClick={() => onModerate("hide")}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400"
            >
              <EyeOff className="size-3.5" /> Ẩn
            </button>
          )}

          {viewer?.canModerate && comment.status === "HIDDEN" && (
            <ActionForm action={moderateCommentAction} className="inline-flex">
              <input type="hidden" name="commentId" value={comment.id} />
              <input type="hidden" name="op" value="unhide" />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-500/10 dark:text-emerald-400"
              >
                <Eye className="size-3.5" /> Hiện lại
              </button>
            </ActionForm>
          )}

          {isOwn && comment.status === "VISIBLE" && editingBody === null && (
            <button
              type="button"
              onClick={() => setEditingBody(comment.body)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <Pencil className="size-3.5" /> Sửa
            </button>
          )}

          {(isOwn || viewer?.canModerate || viewer?.canDelete) && (
            <button
              type="button"
              onClick={() => onModerate("delete")}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
            >
              <Trash2 className="size-3.5" /> Xoá
            </button>
          )}

          {!isOwn && (
            <ReportDialog
              targetType="COMMENT"
              projectId={projectId}
              commentId={comment.id}
              targetLabel={`bình luận của ${comment.display_name}`}
              canReport={Boolean(viewer?.canReport)}
              isGuest={!viewer}
              compact
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CommentLikeButton({
  commentId,
  slug,
  likes,
  liked,
  disabled,
}: {
  commentId: string;
  slug: string;
  likes: number;
  liked: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [opt, setOpt] = useOptimistic(
    { liked, likes },
    (cur, nextLiked: boolean) => ({
      liked: nextLiked,
      likes: Math.max(0, cur.likes + (nextLiked ? 1 : -1)),
    }),
  );

  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const { clientX, clientY } = e;
    startTransition(async () => {
      setOpt(!opt.liked);
      const r = await toggleCommentLikeAction(commentId, slug);
      if (!r.ok) {
        toast.error(r.error ?? "Không thể thực hiện.");
        if (r.needLogin) router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }
      if (r.on) burstAt(clientX, clientY);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={opt.liked}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition",
        opt.liked
          ? "bg-rose-500/12 text-rose-600 dark:text-rose-400"
          : "text-muted hover:bg-surface-2 hover:text-fg",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Heart className={cn("size-3.5 transition", opt.liked && "fill-current")} />
      <span className="tabular-nums">{opt.likes}</span>
    </button>
  );
}

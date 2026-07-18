import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createComment, deleteComment, listComments } from "./comments.functions";
import { reportComment } from "#/reports/reports.functions";
import { ReportButton } from "#/reports/ReportButton";
import type { CommentNode } from "./comments.server";

function formatRelativeTime(date: Date) {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function CommentForm({
  onSubmit,
  autoFocus,
}: {
  onSubmit: (body: string) => Promise<void>;
  autoFocus?: boolean;
}) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(body.trim());
      setBody("");
    } catch {
      setError("Could not post your comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        className="w-full rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a comment..."
        autoFocus={autoFocus}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !body.trim()}
        className="mt-2 rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
      >
        {submitting ? "Posting..." : "Post"}
      </button>
    </form>
  );
}

function CommentItem({
  comment,
  canComment,
  currentUserId,
  isAdmin,
  replyingTo,
  onReplyClick,
  onReplySubmit,
  onReport,
  onDelete,
}: {
  comment: CommentNode;
  canComment: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
  replyingTo: string | null;
  onReplyClick: (id: string | null) => void;
  onReplySubmit: (parentId: string, body: string) => Promise<void>;
  onReport: (commentId: string, reason: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}) {
  const isReplying = replyingTo === comment.id;

  function handleDelete() {
    if (!window.confirm("Delete this comment? This can't be undone.")) return;
    void onDelete(comment.id);
  }

  return (
    <li className="border-l-2 border-accent-100 pl-4">
      <div className="flex items-center gap-2">
        {comment.author.avatarUrl && (
          <img src={comment.author.avatarUrl} alt="" loading="lazy" className="h-6 w-6 rounded-full" />
        )}
        {comment.author.username ? (
          <Link
            to="/u/$username"
            params={{ username: comment.author.username }}
            className="font-medium text-ink hover:text-accent-600 dark:hover:text-accent-400"
          >
            {comment.author.name}
          </Link>
        ) : (
          <span className="font-medium text-ink">{comment.author.name}</span>
        )}
        <span className="text-xs text-ink/40">{formatRelativeTime(comment.createdAt)}</span>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-ink/80">{comment.body}</p>

      <div className="mt-1 flex items-center gap-3">
        {canComment && (
          <button
            type="button"
            className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
            onClick={() => onReplyClick(isReplying ? null : comment.id)}
          >
            {isReplying ? "Cancel" : "Reply"}
          </button>
        )}
        {currentUserId && currentUserId !== comment.author.id && (
          <ReportButton onReport={(reason) => onReport(comment.id, reason)} />
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={handleDelete}
            className="text-sm font-medium text-red-600 hover:text-red-700"
          >
            Delete
          </button>
        )}
      </div>

      {isReplying && (
        <div className="mt-2">
          <CommentForm autoFocus onSubmit={(body) => onReplySubmit(comment.id, body)} />
        </div>
      )}

      {comment.replies.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              canComment={canComment}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              replyingTo={replyingTo}
              onReplyClick={onReplyClick}
              onReplySubmit={onReplySubmit}
              onReport={onReport}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function CommentThread({
  recipeId,
  shareToken,
  canComment,
  currentUserId,
  isAdmin,
}: {
  recipeId: string;
  shareToken?: string;
  canComment: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
}) {
  const createCommentFn = useServerFn(createComment);
  const reportCommentFn = useServerFn(reportComment);
  const deleteCommentFn = useServerFn(deleteComment);
  const listCommentsFn = useServerFn(listComments);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentNode[] | null>(null);

  const cancelledRef = useRef(false);

  async function refetchComments() {
    const result = await listCommentsFn({ data: { recipeId, shareToken } });
    if (!cancelledRef.current) setComments(result);
  }

  useEffect(() => {
    cancelledRef.current = false;
    setComments(null);
    void listCommentsFn({ data: { recipeId, shareToken } }).then((result) => {
      if (!cancelledRef.current) setComments(result);
    });
    return () => {
      cancelledRef.current = true;
    };
  }, [recipeId, shareToken, listCommentsFn]);

  async function postComment(body: string, parentId?: string) {
    await createCommentFn({ data: { recipeId, parentId, body } });
    setReplyingTo(null);
    await refetchComments();
  }

  async function reportCommentHandler(commentId: string, reason: string) {
    await reportCommentFn({ data: { commentId, reason } });
  }

  async function deleteCommentHandler(commentId: string) {
    await deleteCommentFn({ data: { commentId } });
    await refetchComments();
  }

  return (
    <section className="mt-8">
      <h2 className="font-serif text-xl font-semibold text-ink">Comments</h2>

      {canComment ? (
        <div className="mt-4">
          <CommentForm onSubmit={(body) => postComment(body)} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink/60">
          <a
            href="/auth/google"
            className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            Sign in with Google
          </a>{" "}
          to leave a comment.
        </p>
      )}

      {comments === null ? (
        <p className="mt-4 text-ink/60">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="mt-4 text-ink/60">No comments yet.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              canComment={canComment}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              replyingTo={replyingTo}
              onReplyClick={setReplyingTo}
              onReplySubmit={(parentId, body) => postComment(body, parentId)}
              onReport={reportCommentHandler}
              onDelete={deleteCommentHandler}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

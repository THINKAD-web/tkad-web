"use client";

import { useState } from "react";
import { CommunityCommentForm } from "@/components/community/comment-form";
import { CommunityCommentItemCard } from "@/components/community/comment-item";
import { CommunityMemberRequiredPanel } from "@/components/community/member-required-panel";
import {
  fallbackCommunityRoleFromAppRole,
  normalizeCommunityMemberRole,
  type CommunityCommentItem,
  type CommunityAuthorSummary,
} from "@/lib/community/types";

type MutationCommentPayload = {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
  author: CommunityAuthorSummary | null;
};

type Props = {
  postId: string;
  locale: string;
  initialComments: CommunityCommentItem[];
  currentUser: {
    id: string;
    name: string;
    company: string | null;
    role: string;
    communityRole: string | null;
    region?: string | null;
  } | null;
};

function toCommentItem(
  comment: MutationCommentPayload,
  editableByMe: boolean,
  previous?: CommunityCommentItem,
): CommunityCommentItem {
  return {
    id: comment.id,
    body: comment.content,
    authorName: comment.authorName,
    isAnonymous: previous?.isAnonymous ?? false,
    author: comment.author,
    status: previous?.status ?? "published",
    reportCount: previous?.reportCount ?? 0,
    createdAt: comment.createdAt,
    editableByMe,
  };
}

function toCurrentUserAuthor(
  currentUser: NonNullable<Props["currentUser"]>,
): CommunityAuthorSummary {
  return {
    id: currentUser.id,
    name: currentUser.name,
    company: currentUser.company,
    role:
      normalizeCommunityMemberRole(currentUser.communityRole) ??
      fallbackCommunityRoleFromAppRole(currentUser.role),
    bio: null,
    region: currentUser.region ?? null,
  };
}

export function CommunityCommentsSection({
  postId,
  locale,
  initialComments,
  currentUser,
}: Props) {
  const isKo = locale === "ko";
  const [comments, setComments] = useState(initialComments);

  const handleCreateComment = async (content: string) => {
    if (!currentUser) {
      return {
        ok: false,
        error: isKo
          ? "댓글을 작성하려면 로그인이 필요합니다."
          : "Sign in to write a comment.",
      };
    }

    const optimisticId = `temp-${Date.now()}`;
    const optimisticComment: CommunityCommentItem = {
      id: optimisticId,
      body: content,
      authorName: currentUser.name,
      isAnonymous: false,
      author: toCurrentUserAuthor(currentUser),
      status: "published",
      reportCount: 0,
      createdAt: new Date().toISOString(),
      editableByMe: true,
    };

    setComments((prev) => [...prev, optimisticComment]);

    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        comment?: MutationCommentPayload;
      };

      if (!res.ok || !data.ok || !data.comment) {
        setComments((prev) => prev.filter((item) => item.id !== optimisticId));
        return {
          ok: false,
          error: data.error || (isKo ? "댓글을 저장하지 못했습니다." : "Failed to create comment."),
        };
      }

      setComments((prev) =>
        prev.map((item) =>
          item.id === optimisticId
            ? toCommentItem(data.comment!, true, optimisticComment)
            : item,
        ),
      );
      return { ok: true };
    } catch {
      setComments((prev) => prev.filter((item) => item.id !== optimisticId));
      return {
        ok: false,
        error: isKo ? "네트워크 오류가 발생했습니다." : "A network error occurred.",
      };
    }
  };

  const handleSaveComment = async (commentId: string, content: string) => {
    let previousComment: CommunityCommentItem | null = null;

    setComments((prev) =>
      prev.map((item) => {
        if (item.id !== commentId) return item;
        previousComment = item;
        return { ...item, body: content };
      }),
    );

    try {
      const res = await fetch(`/api/community/posts/${postId}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        comment?: MutationCommentPayload;
      };

      if (!res.ok || !data.ok || !data.comment) {
        if (previousComment) {
          setComments((prev) =>
            prev.map((item) =>
              item.id === commentId ? previousComment! : item,
            ),
          );
        }
        return {
          ok: false,
          error: data.error || (isKo ? "댓글을 수정하지 못했습니다." : "Failed to update comment."),
        };
      }

      setComments((prev) =>
        prev.map((item) =>
          item.id === commentId
            ? toCommentItem(data.comment!, item.editableByMe, previousComment ?? item)
            : item,
        ),
      );
      return { ok: true };
    } catch {
      if (previousComment) {
        setComments((prev) =>
          prev.map((item) => (item.id === commentId ? previousComment! : item)),
        );
      }
      return {
        ok: false,
        error: isKo ? "네트워크 오류가 발생했습니다." : "A network error occurred.",
      };
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    let removedComment: CommunityCommentItem | null = null;
    let removedIndex = -1;

    setComments((prev) => {
      removedIndex = prev.findIndex((item) => item.id === commentId);
      if (removedIndex === -1) return prev;
      removedComment = prev[removedIndex] ?? null;
      return prev.filter((item) => item.id !== commentId);
    });

    try {
      const res = await fetch(`/api/community/posts/${postId}/comments/${commentId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        if (removedComment && removedIndex >= 0) {
          setComments((prev) => {
            const next = [...prev];
            next.splice(removedIndex, 0, removedComment!);
            return next;
          });
        }
        return {
          ok: false,
          error: data.error || (isKo ? "댓글을 삭제하지 못했습니다." : "Failed to delete comment."),
        };
      }

      return { ok: true };
    } catch {
      if (removedComment && removedIndex >= 0) {
        setComments((prev) => {
          const next = [...prev];
          next.splice(removedIndex, 0, removedComment!);
          return next;
        });
      }
      return {
        ok: false,
        error: isKo ? "네트워크 오류가 발생했습니다." : "A network error occurred.",
      };
    }
  };

  return (
    <div className="rounded-[32px] border border-white/10 bg-black/18 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-white/45">
            [ Conversation ]
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white sm:text-3xl">
            {isKo
              ? `댓글 ${comments.length.toLocaleString()}`
              : `Comments ${comments.length.toLocaleString()}`}
          </h2>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/58">
          {isKo
            ? `${comments.length.toLocaleString()}개 댓글`
            : `${comments.length.toLocaleString()} comments`}
        </p>
      </div>

      {comments.length === 0 ? (
        <p className="mt-6 rounded-[24px] border border-white/12 bg-black/20 p-6 text-center font-mono text-[12px] uppercase tracking-[0.22em] text-white/58">
          {isKo ? "// 첫 댓글을 작성해주세요." : "// be the first to comment"}
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {comments.map((comment) => (
            <CommunityCommentItemCard
              key={comment.id}
              comment={comment}
              postId={postId}
              locale={locale}
              onSaveComment={handleSaveComment}
              onDeleteComment={handleDeleteComment}
            />
          ))}
        </ul>
      )}

      <div className="mt-8 border-t border-white/10 pt-8">
        {currentUser ? (
          <CommunityCommentForm
            postId={postId}
            locale={locale}
            currentUser={currentUser}
            onSubmitComment={handleCreateComment}
          />
        ) : (
          <CommunityMemberRequiredPanel
            locale={locale}
            nextPath={`/community/post/${postId}`}
            title={
              isKo
                ? "댓글을 작성하려면 로그인이 필요합니다."
                : "Sign in to write a comment."
            }
            body={
              isKo
                ? "댓글 작성과 수정, 삭제는 로그인한 멤버만 이용할 수 있습니다."
                : "Comment create, edit, and delete actions are limited to signed-in members."
            }
          />
        )}
      </div>
    </div>
  );
}

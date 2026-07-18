import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toggleFollow } from "./follows.functions";

export function FollowButton({
  targetUserId,
  initiallyFollowing,
}: {
  targetUserId: string;
  initiallyFollowing: boolean;
}) {
  const toggleFollowFn = useServerFn(toggleFollow);
  const [isFollowing, setIsFollowing] = useState(initiallyFollowing);
  const [submitting, setSubmitting] = useState(false);

  async function handleToggle() {
    setSubmitting(true);
    try {
      const result = await toggleFollowFn({ data: { userId: targetUserId } });
      setIsFollowing(result.isFollowing);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={submitting}
      className="text-sm font-medium text-accent-600 hover:text-accent-700 disabled:opacity-50 dark:hover:text-accent-400"
    >
      {isFollowing ? "✓ Following" : "Follow"}
    </button>
  );
}

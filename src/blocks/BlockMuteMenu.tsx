import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { DropdownButton } from "#/ui/DropdownButton";
import { blockUser } from "./blocks.functions";
import { muteUser, unmuteUser } from "#/mutes/mutes.functions";

export function BlockMuteMenu({
  targetUserId,
  initiallyMuted,
}: {
  targetUserId: string;
  initiallyMuted: boolean;
}) {
  const blockUserFn = useServerFn(blockUser);
  const muteUserFn = useServerFn(muteUser);
  const unmuteUserFn = useServerFn(unmuteUser);
  const [isMuted, setIsMuted] = useState(initiallyMuted);
  const [submitting, setSubmitting] = useState(false);

  async function handleBlock() {
    if (!window.confirm("Block this user? Neither of you will be able to see or contact each other.")) return;
    setSubmitting(true);
    try {
      await blockUserFn({ data: { userId: targetUserId } });
      window.location.reload();
    } catch {
      setSubmitting(false);
    }
  }

  async function handleToggleMute() {
    setSubmitting(true);
    try {
      if (isMuted) await unmuteUserFn({ data: { userId: targetUserId } });
      else await muteUserFn({ data: { userId: targetUserId } });
      setIsMuted((m) => !m);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DropdownButton label="More options" icon={<MoreVertical size={16} />} iconOnly>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={handleToggleMute}
          disabled={submitting}
          className="rounded-lg px-3 py-1.5 text-left text-sm font-medium text-ink hover:bg-accent-50 disabled:opacity-50"
        >
          {isMuted ? "Unmute user" : "Mute user"}
        </button>
        <button
          type="button"
          onClick={handleBlock}
          disabled={submitting}
          className="rounded-lg px-3 py-1.5 text-left text-sm font-medium text-red-600 hover:bg-accent-50 disabled:opacity-50"
        >
          Block user
        </button>
      </div>
    </DropdownButton>
  );
}

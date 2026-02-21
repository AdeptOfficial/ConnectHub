import { useEffect, useState } from "react";
import { useChannelStore } from "@/stores/channelStore";
import { useSpaceStore } from "@/stores/spaceStore";
import { getTypingUsers } from "@/stores/gatewayStore";
import { gateway } from "@/lib/gateway";
import MessageList from "./MessageList";
import MessageComposer from "./MessageComposer";
import MemberList from "./MemberList";

export default function ChannelView() {
  const activeChannelId = useChannelStore((s) => s.activeChannelId);
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);
  const [typingText, setTypingText] = useState<string | null>(null);

  // Subscribe/unsubscribe to channel WS events
  useEffect(() => {
    if (!activeChannelId) return;
    gateway.subscribe(activeChannelId);
    return () => gateway.unsubscribe(activeChannelId);
  }, [activeChannelId]);

  // Poll typing indicators
  useEffect(() => {
    if (!activeChannelId) return;
    const interval = setInterval(() => {
      const typers = getTypingUsers(activeChannelId);
      if (typers.length === 0) setTypingText(null);
      else if (typers.length === 1) setTypingText(`${typers[0].username} is typing...`);
      else setTypingText(`${typers.length} people are typing...`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeChannelId]);

  if (!activeChannelId) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted">
        Select a channel to start chatting
      </div>
    );
  }

  return (
    <div className="flex-1 flex">
      <div className="flex-1 flex flex-col">
        {/* Channel header */}
        <div className="h-12 px-4 flex items-center border-b border-border shadow-sm shrink-0">
          <span className="text-text-muted mr-2">#</span>
          <span className="font-semibold text-sm">
            channel-{activeChannelId.slice(-4)}
          </span>
        </div>

        <MessageList channelId={activeChannelId} />

        {/* Typing indicator */}
        <div className="h-6 px-4 text-xs text-text-muted shrink-0">
          {typingText}
        </div>

        <MessageComposer channelId={activeChannelId} />
      </div>

      {/* Member list (right panel) */}
      {activeSpaceId && <MemberList spaceId={activeSpaceId} />}
    </div>
  );
}

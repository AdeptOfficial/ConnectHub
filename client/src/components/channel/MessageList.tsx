import { useEffect, useRef } from "react";
import { useMessageStore, type MessageWithAuthor } from "@/stores/messageStore";
import Message from "./Message";

const EMPTY_MESSAGES: MessageWithAuthor[] = [];

export default function MessageList({ channelId }: { channelId: string }) {
  const loading = useMessageStore((s) => s.loading);
  const messages = useMessageStore(
    (s) => s.messages.get(channelId) ?? EMPTY_MESSAGES
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    useMessageStore.getState().fetchMessages(channelId);
  }, [channelId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-text-muted">
          No messages yet. Say something!
        </div>
      ) : (
        messages.map((msg) => <Message key={msg.id} message={msg} channelId={channelId} />)
      )}
      <div ref={bottomRef} />
    </div>
  );
}

import { useState, useRef, type FormEvent, type KeyboardEvent } from "react";
import { gateway } from "@/lib/gateway";

export default function MessageComposer({
  channelId,
}: {
  channelId: string;
}) {
  const [content, setContent] = useState("");
  const typingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSend = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    gateway.sendMessage({
      channelId,
      encryptedContent: trimmed,
    });

    setContent("");
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }

    // Typing indicator
    if (!typingRef.current) {
      typingRef.current = true;
      gateway.startTyping(channelId);
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingRef.current = false;
    }, 5000);
  };

  return (
    <form onSubmit={handleSend} className="px-4 pb-6">
      <div className="bg-bg-input rounded-lg flex items-end">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          rows={1}
          className="flex-1 bg-transparent px-4 py-3 text-sm text-text-primary outline-none resize-none max-h-[200px]"
          style={{ minHeight: "44px" }}
        />
        <button
          type="submit"
          disabled={!content.trim()}
          className="p-3 text-accent hover:text-accent-hover disabled:text-text-muted transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </form>
  );
}

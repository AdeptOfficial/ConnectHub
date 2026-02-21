import { useState, useRef, useEffect } from "react";
import type { MessageWithAuthor } from "@/stores/messageStore";
import { useMessageStore } from "@/stores/messageStore";
import { useAuthStore } from "@/stores/authStore";
import { extractTimestamp } from "@/lib/snowflake";

interface Props {
  message: MessageWithAuthor;
  channelId: string;
}

export default function Message({ message, channelId }: Props) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isOwn = message.authorId === currentUserId;

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.encryptedContent);
  const [saving, setSaving] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const timestamp = new Date(extractTimestamp(message.id));
  const timeStr = timestamp.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.selectionStart = editRef.current.value.length;
    }
  }, [editing]);

  const handleEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === message.encryptedContent) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await useMessageStore.getState().editMessage(channelId, message.id, trimmed);
      setEditing(false);
    } catch {
      // keep editing open on error
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this message?")) return;
    try {
      await useMessageStore.getState().deleteMessage(channelId, message.id);
    } catch (e: any) {
      alert(e.message || "Failed to delete message");
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    }
    if (e.key === "Escape") {
      setEditing(false);
      setEditContent(message.encryptedContent);
    }
  };

  return (
    <div className="flex gap-4 px-4 py-1 hover:bg-bg-hover/30 group relative">
      <div className="w-10 h-10 rounded-full bg-accent flex-shrink-0 flex items-center justify-center text-sm font-medium mt-0.5">
        {(
          message.author.displayName ||
          message.author.username ||
          "?"
        )[0].toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-sm hover:underline cursor-pointer">
            {message.author.displayName || message.author.username}
          </span>
          <span className="text-xs text-text-muted">{timeStr}</span>
          {message.editedAt && (
            <span className="text-xs text-text-muted">(edited)</span>
          )}
        </div>

        {editing ? (
          <div className="mt-1">
            <textarea
              ref={editRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleEditKeyDown}
              rows={2}
              className="w-full bg-bg-input text-text-primary text-sm rounded px-2 py-1 outline-none focus:ring-1 focus:ring-accent resize-none"
            />
            <div className="flex gap-2 mt-1 text-xs">
              <span className="text-text-muted">
                escape to{" "}
                <button onClick={() => { setEditing(false); setEditContent(message.encryptedContent); }} className="text-accent hover:underline">
                  cancel
                </button>
                {" \u2022 "}enter to{" "}
                <button onClick={handleEdit} disabled={saving} className="text-accent hover:underline">
                  {saving ? "saving..." : "save"}
                </button>
              </span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-text-secondary break-words">
            {message.encryptedContent}
          </div>
        )}
      </div>

      {/* Action buttons on hover */}
      {!editing && (
        <div className="absolute right-4 top-0 -translate-y-1/2 hidden group-hover:flex gap-0.5 bg-bg-primary border border-border rounded shadow-sm">
          {isOwn && (
            <button
              onClick={() => { setEditing(true); setEditContent(message.encryptedContent); }}
              className="p-1.5 text-text-muted hover:text-text-primary"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-1.5 text-text-muted hover:text-danger"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

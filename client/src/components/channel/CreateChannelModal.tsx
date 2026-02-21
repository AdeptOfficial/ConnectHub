import { useState, type FormEvent } from "react";
import { useChannelStore } from "@/stores/channelStore";

interface Props {
  spaceId: string;
  onClose: () => void;
}

export default function CreateChannelModal({ spaceId, onClose }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    try {
      await useChannelStore.getState().createChannel(spaceId, trimmed);
      onClose();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-secondary rounded-lg p-6 w-full max-w-md"
      >
        <h2 className="text-xl font-bold mb-4">Create Channel</h2>

        {error && (
          <div className="bg-danger/10 text-danger rounded p-2 mb-3 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="block text-text-secondary text-sm mb-1">Channel Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="new-channel"
            autoFocus
            className="w-full bg-bg-input text-text-primary rounded px-3 py-2 mb-4 outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-muted text-sm hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

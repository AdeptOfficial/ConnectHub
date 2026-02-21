import { useState, type FormEvent } from "react";
import { useSpaceStore } from "@/stores/spaceStore";
import { useChannelStore } from "@/stores/channelStore";

export default function CreateSpaceModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const createSpace = useSpaceStore((s) => s.createSpace);
  const setActiveSpace = useSpaceStore((s) => s.setActiveSpace);
  const setActiveChannel = useChannelStore((s) => s.setActiveChannel);
  const fetchChannels = useChannelStore((s) => s.fetchChannels);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      // For now, encryptedConfig is just the name (plaintext). E2EE Phase 5 will encrypt it.
      const space = await createSpace(name.trim());
      setActiveSpace(space.id);
      await fetchChannels(space.id);
      onClose();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-secondary rounded-lg p-6 w-full max-w-md"
      >
        <h2 className="text-xl font-bold mb-4">Create a Space</h2>

        <label className="block mb-4">
          <span className="text-text-secondary text-xs font-semibold uppercase tracking-wide">
            Space Name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full bg-bg-input text-text-primary rounded px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
            placeholder="My awesome space"
            required
            autoFocus
          />
        </label>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

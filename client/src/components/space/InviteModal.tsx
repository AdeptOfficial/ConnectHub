import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useSpaceStore } from "@/stores/spaceStore";

interface Props {
  spaceId: string;
  joinOnly?: boolean;
  onClose: () => void;
}

export default function InviteModal({ spaceId, joinOnly, onClose }: Props) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"create" | "join">(joinOnly ? "join" : "create");

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ code: string }>("/invites", { spaceId });
      setInviteCode(res.code);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ spaceId: string }>(`/invites/${joinCode.trim()}/join`);
      // Refresh spaces and select the newly joined one
      await useSpaceStore.getState().fetchSpaces();
      useSpaceStore.getState().setActiveSpace(res.spaceId);
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
        <h2 className="text-xl font-bold mb-4">{joinOnly ? "Join a Space" : "Invites"}</h2>

        {!joinOnly && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTab("create")}
              className={`px-3 py-1 rounded text-sm ${tab === "create" ? "bg-accent text-white" : "text-text-secondary"}`}
            >
              Create Invite
            </button>
            <button
              onClick={() => setTab("join")}
              className={`px-3 py-1 rounded text-sm ${tab === "join" ? "bg-accent text-white" : "text-text-secondary"}`}
            >
              Join with Code
            </button>
          </div>
        )}

        {error && (
          <div className="bg-danger/10 text-danger rounded p-2 mb-3 text-sm">{error}</div>
        )}

        {tab === "create" && !joinOnly ? (
          <div>
            {inviteCode ? (
              <div>
                <p className="text-text-secondary text-sm mb-2">
                  Share this invite code:
                </p>
                <div className="bg-bg-input rounded px-3 py-2 font-mono text-lg text-center select-all">
                  {inviteCode}
                </div>
              </div>
            ) : (
              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full bg-accent hover:bg-accent-hover text-white py-2 rounded text-sm font-medium disabled:opacity-50"
              >
                {loading ? "Creating..." : "Generate Invite Code"}
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleJoin}>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter invite code"
              autoFocus
              className="w-full bg-bg-input text-text-primary rounded px-3 py-2 mb-3 outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={loading || !joinCode.trim()}
              className="w-full bg-accent hover:bg-accent-hover text-white py-2 rounded text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Joining..." : "Join Space"}
            </button>
          </form>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full text-text-muted text-sm hover:text-text-primary"
        >
          Close
        </button>
      </div>
    </div>
  );
}

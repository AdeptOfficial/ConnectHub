import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

interface Member {
  userId: string;
  username: string;
  displayName: string | null;
  avatarHash: string | null;
  role: number;
  joinedAt: number;
}

const roleLabels: Record<number, string> = {
  0: "Member",
  1: "Admin",
  2: "Owner",
};

export default function MemberList({ spaceId }: { spaceId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const currentUserId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    api.get<Member[]>(`/members/space/${spaceId}`).then(setMembers).catch(() => {});
  }, [spaceId]);

  // Find current user's role in this space
  const myRole = members.find((m) => m.userId === currentUserId)?.role ?? 0;

  const handleKick = async (userId: string) => {
    if (!confirm("Kick this member?")) return;
    try {
      await api.delete(`/members/space/${spaceId}/user/${userId}`);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Group by role
  const grouped = new Map<number, Member[]>();
  for (const m of members) {
    const list = grouped.get(m.role) || [];
    list.push(m);
    grouped.set(m.role, list);
  }

  return (
    <div className="w-60 bg-bg-secondary overflow-y-auto py-4 px-2">
      {[2, 1, 0].map((role) => {
        const list = grouped.get(role);
        if (!list?.length) return null;
        return (
          <div key={role} className="mb-4">
            <div className="text-text-muted text-xs font-semibold uppercase tracking-wide px-2 mb-1">
              {roleLabels[role]} — {list.length}
            </div>
            {list.map((m) => (
              <div
                key={m.userId}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-hover/50 cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium">
                  {(m.displayName || m.username)[0].toUpperCase()}
                </div>
                <span className="text-sm text-text-secondary truncate flex-1">
                  {m.displayName || m.username}
                </span>
                {/* Show kick button if we're admin+ and target has lower role and is not us */}
                {myRole >= 1 && m.role < myRole && m.userId !== currentUserId && (
                  <button
                    onClick={() => handleKick(m.userId)}
                    className="hidden group-hover:block text-xs text-danger hover:text-danger/80 shrink-0"
                    title="Kick member"
                  >
                    Kick
                  </button>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

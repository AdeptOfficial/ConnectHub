import { useAuthStore } from "@/stores/authStore";

export default function UserArea() {
  const { user, logout } = useAuthStore();

  const displayName = user?.displayName || user?.username || "...";
  const username = user?.username || "...";

  return (
    <div className="h-[52px] bg-bg-primary/50 px-2 flex items-center gap-2 shrink-0">
      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-medium">
        {displayName[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{displayName}</div>
        <div className="text-xs text-text-muted truncate">{username}</div>
      </div>
      <button
        onClick={logout}
        className="text-text-muted hover:text-text-primary text-xs p-1"
        title="Log out"
      >
        &#x2192;
      </button>
    </div>
  );
}

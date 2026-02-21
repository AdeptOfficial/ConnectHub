import { useSpaceStore } from "@/stores/spaceStore";
import { useChannelStore } from "@/stores/channelStore";
import { useState } from "react";
import CreateSpaceModal from "@/components/space/CreateSpaceModal";

export default function SpaceRail() {
  const spaces = useSpaceStore((s) => s.spaces);
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);
  const setActiveSpace = useSpaceStore((s) => s.setActiveSpace);
  const setActiveChannel = useChannelStore((s) => s.setActiveChannel);
  const [showCreate, setShowCreate] = useState(false);

  const handleSelectSpace = (id: string | null) => {
    setActiveSpace(id);
    setActiveChannel(null);
  };

  return (
    <div className="flex flex-col items-center w-[72px] bg-bg-primary py-3 gap-2 overflow-y-auto shrink-0">
      {/* Home button */}
      <button
        onClick={() => handleSelectSpace(null)}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold transition-all hover:rounded-xl ${
          activeSpaceId === null
            ? "bg-accent text-white rounded-xl"
            : "bg-bg-tertiary text-text-primary hover:bg-accent hover:text-white"
        }`}
      >
        H
      </button>

      <div className="w-8 h-0.5 bg-border rounded-full" />

      {/* Space icons */}
      {spaces.map((space) => {
        const initial = space.encryptedConfig?.[0]?.toUpperCase() || "?";
        return (
          <button
            key={space.id}
            onClick={() => handleSelectSpace(space.id)}
            title={space.encryptedConfig || space.id}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-medium transition-all hover:rounded-xl ${
              activeSpaceId === space.id
                ? "bg-accent text-white rounded-xl"
                : "bg-bg-tertiary text-text-primary hover:bg-accent hover:text-white"
            }`}
          >
            {initial}
          </button>
        );
      })}

      {/* Create space button */}
      <button
        onClick={() => setShowCreate(true)}
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl text-success bg-bg-tertiary hover:bg-success hover:text-white transition-all hover:rounded-xl"
      >
        +
      </button>

      {showCreate && <CreateSpaceModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

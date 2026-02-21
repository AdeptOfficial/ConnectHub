import { useEffect, useRef, useState } from "react";
import { useSpaceStore } from "@/stores/spaceStore";
import { useChannelStore } from "@/stores/channelStore";
import { api } from "@/lib/api";
import UserArea from "./UserArea";
import InviteModal from "@/components/space/InviteModal";
import CreateChannelModal from "@/components/channel/CreateChannelModal";
import type { Channel } from "shared";

const EMPTY_CHANNELS: Channel[] = [];

export default function SpaceSidebar() {
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);
  const spaces = useSpaceStore((s) => s.spaces);
  const activeChannelId = useChannelStore((s) => s.activeChannelId);
  const setActiveChannel = useChannelStore((s) => s.setActiveChannel);
  const channels = useChannelStore(
    (s) => (activeSpaceId ? s.channels.get(activeSpaceId) : undefined) ?? EMPTY_CHANNELS
  );
  const fetchedRef = useRef<string | null>(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSpaceId && fetchedRef.current !== activeSpaceId) {
      fetchedRef.current = activeSpaceId;
      useChannelStore.getState().fetchChannels(activeSpaceId);
    }
  }, [activeSpaceId]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const handleLeaveSpace = async () => {
    if (!activeSpaceId) return;
    try {
      await api.delete(`/members/space/${activeSpaceId}/me`);
      useSpaceStore.getState().setActiveSpace(null);
      // Remove from local spaces list
      useSpaceStore.setState((s) => ({
        spaces: s.spaces.filter((sp) => sp.id !== activeSpaceId),
      }));
      useChannelStore.getState().setActiveChannel(null);
    } catch (e: any) {
      alert(e.message);
    }
    setDropdownOpen(false);
  };

  if (!activeSpaceId) {
    return (
      <div className="w-60 h-full bg-bg-secondary flex flex-col shrink-0">
        <div className="h-12 px-4 flex items-center border-b border-border font-semibold shadow-sm shrink-0">
          ConnectHub
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-text-muted text-sm p-4 text-center gap-3">
          <span>Select a space or create one to get started</span>
          <button
            onClick={() => setShowInvite(true)}
            className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-medium"
          >
            Join a Space
          </button>
        </div>
        <UserArea />
        {showInvite && (
          <InviteModal
            spaceId=""
            joinOnly
            onClose={() => setShowInvite(false)}
          />
        )}
      </div>
    );
  }

  const spaceName = spaces.find((s) => s.id === activeSpaceId)?.encryptedConfig || "Space";

  return (
    <div className="w-60 h-full bg-bg-secondary flex flex-col shrink-0">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="w-full h-12 px-4 flex items-center justify-between border-b border-border font-semibold shadow-sm shrink-0 hover:bg-bg-hover/50 transition-colors"
        >
          <span className="truncate">{spaceName}</span>
          <svg
            className={`w-4 h-4 text-text-muted transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-2 right-2 mt-1 bg-bg-primary rounded-lg shadow-lg border border-border py-1 z-50">
            <button
              onClick={() => { setShowInvite(true); setDropdownOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
            >
              Invite People
            </button>
            <button
              onClick={() => { setShowCreateChannel(true); setDropdownOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
            >
              Create Channel
            </button>
            <div className="border-t border-border my-1" />
            <button
              onClick={handleLeaveSpace}
              className="w-full text-left px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
            >
              Leave Space
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-text-muted text-xs font-semibold uppercase tracking-wide">
            Text Channels
          </span>
          <button
            onClick={() => setShowCreateChannel(true)}
            className="text-text-muted hover:text-text-primary text-lg leading-none"
            title="Create Channel"
          >
            +
          </button>
        </div>
        {channels.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setActiveChannel(ch.id)}
            className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 text-sm transition-colors ${
              activeChannelId === ch.id
                ? "bg-bg-hover text-text-primary"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-hover/50"
            }`}
          >
            <span className="text-text-muted">#</span>
            <span className="truncate">
              {ch.encryptedName || `channel-${ch.id.slice(-4)}`}
            </span>
          </button>
        ))}
      </div>
      <UserArea />

      {showInvite && (
        <InviteModal
          spaceId={activeSpaceId}
          onClose={() => setShowInvite(false)}
        />
      )}
      {showCreateChannel && (
        <CreateChannelModal
          spaceId={activeSpaceId}
          onClose={() => setShowCreateChannel(false)}
        />
      )}
    </div>
  );
}

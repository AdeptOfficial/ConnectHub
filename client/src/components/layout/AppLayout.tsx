import SpaceRail from "./SpaceRail";
import SpaceSidebar from "./SpaceSidebar";
import ChannelView from "@/components/channel/ChannelView";

export default function AppLayout() {
  return (
    <div className="flex h-full">
      <SpaceRail />
      <SpaceSidebar />
      <div className="flex-1 flex flex-col bg-bg-tertiary min-w-0">
        <ChannelView />
      </div>
    </div>
  );
}

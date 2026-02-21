import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuthStore } from "@/stores/authStore";
import LoginPage from "@/components/auth/LoginPage";
import RegisterPage from "@/components/auth/RegisterPage";
import AppLayout from "@/components/layout/AppLayout";
import { useSpaceStore } from "@/stores/spaceStore";
import { useChannelStore } from "@/stores/channelStore";
import { gateway } from "@/lib/gateway";
import { api } from "@/lib/api";

// Error boundary to catch and display React errors
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center text-danger p-8">
          <div>
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <pre className="text-sm text-text-muted whitespace-pre-wrap">
              {this.state.error.message}
              {"\n"}
              {this.state.error.stack}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const token = useAuthStore((s) => s.token);
  const ready = useAuthStore((s) => s.ready);
  const [authView, setAuthView] = useState<"login" | "register">(
    window.location.pathname === "/register" ? "register" : "login"
  );
  const restoreCalled = useRef(false);

  // Restore session on mount
  useEffect(() => {
    if (restoreCalled.current) return;
    restoreCalled.current = true;

    // Parse URL -> set state
    const match = window.location.pathname.match(
      /^\/channels\/([^/]+)(?:\/([^/]+))?$/
    );
    if (match) {
      const [, spaceId, channelId] = match;
      if (spaceId && spaceId !== "@me") {
        useSpaceStore.getState().setActiveSpace(spaceId);
        if (channelId) useChannelStore.getState().setActiveChannel(channelId);
      }
    }

    // Restore auth
    const savedToken = localStorage.getItem("token");
    if (!savedToken) {
      useAuthStore.setState({ ready: true });
      return;
    }

    api.setToken(savedToken);
    api
      .get("/spaces")
      .then(() => {
        console.log("[RESTORE] Token valid, connecting gateway");
        gateway.connect(savedToken);
        useAuthStore.setState({ token: savedToken, ready: true });
      })
      .catch((err) => {
        console.error("[RESTORE] Token invalid, clearing:", err);
        api.setToken(null);
        localStorage.removeItem("token");
        useAuthStore.setState({ token: null, ready: true });
      });
  }, []);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-text-muted">
        Loading...
      </div>
    );
  }

  if (!token) {
    if (authView === "register") {
      return <RegisterPage onSwitch={() => setAuthView("login")} />;
    }
    return <LoginPage onSwitch={() => setAuthView("register")} />;
  }

  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}

function AppShell() {
  useEffect(() => {
    useSpaceStore.getState().fetchSpaces();
  }, []);

  // Sync state -> URL
  useEffect(() => {
    const unsub1 = useSpaceStore.subscribe((state, prev) => {
      if (state.activeSpaceId !== prev.activeSpaceId) syncUrl();
    });
    const unsub2 = useChannelStore.subscribe((state, prev) => {
      if (state.activeChannelId !== prev.activeChannelId) syncUrl();
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  return <AppLayout />;
}

function syncUrl() {
  const spaceId = useSpaceStore.getState().activeSpaceId;
  const channelId = useChannelStore.getState().activeChannelId;
  let path = "/channels/@me";
  if (spaceId) {
    path = `/channels/${spaceId}`;
    if (channelId) path += `/${channelId}`;
  }
  if (window.location.pathname !== path) {
    window.history.replaceState(null, "", path);
  }
}

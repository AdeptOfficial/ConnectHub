import { create } from "zustand";
import { api, ApiError } from "@/lib/api";
import { gateway } from "@/lib/gateway";
import type { User } from "shared";

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  ready: boolean;
  error: string | null;
  register: (
    username: string,
    password: string,
    displayName?: string
  ) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  restore: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  loading: false,
  ready: false,
  error: null,

  register: async (username, password, displayName) => {
    set({ loading: true, error: null });
    try {
      const identityKey = btoa(
        String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))
      );

      const res = await api.post<{ token: string; user: User }>(
        "/auth/register",
        { username, password, displayName, identityKey }
      );

      api.setToken(res.token);
      localStorage.setItem("token", res.token);
      gateway.connect(res.token);
      set({ token: res.token, user: res.user, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post<{ token: string; user: User }>(
        "/auth/login",
        { username, password }
      );

      api.setToken(res.token);
      localStorage.setItem("token", res.token);
      gateway.connect(res.token);
      set({ token: res.token, user: res.user, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e.message });
      throw e;
    }
  },

  logout: () => {
    api.post("/auth/logout").catch(() => {});
    gateway.disconnect();
    api.setToken(null);
    localStorage.removeItem("token");
    set({ token: null, user: null });
  },

  restore: () => {
    const token = localStorage.getItem("token");
    if (!token) {
      set({ ready: true });
      return;
    }

    // Validate token and fetch current user
    api.setToken(token);
    api
      .get<User>("/auth/me")
      .then((user) => {
        gateway.connect(token);
        set({ token, user, ready: true });
      })
      .catch(() => {
        api.setToken(null);
        localStorage.removeItem("token");
        set({ token: null, user: null, ready: true });
      });
  },
}));

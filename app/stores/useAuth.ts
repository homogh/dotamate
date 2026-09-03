import { create } from "zustand";

export interface AuthUser {
  id: number;
  displayName: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  country: string | null;
  languages: string | null;
  rank: string;
  mainPosition: string | null;
  rankVerification: string;
  steamProfileUrl: string | null;
  notifyBell: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  status: "idle" | "loading" | "authenticated" | "guest";
  fetchMe: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: "idle",

  fetchMe: async () => {
    set({ status: "loading" });
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const json = await res.json();
      if (json.status === "success") {
        set({ user: json.data, status: "authenticated" });
      } else {
        set({ user: null, status: "guest" });
      }
    } catch {
      set({ user: null, status: "guest" });
    }
  },

  setUser: (user) => set({ user, status: user ? "authenticated" : "guest" }),

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null, status: "guest" });
  },
}));

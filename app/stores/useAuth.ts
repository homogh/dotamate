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

export interface AuthRole {
  roleId: number;
  roleName: string;
  permissions: Record<string, "NONE" | "VIEW" | "EDIT">;
}

interface AuthState {
  user: AuthUser | null;
  status: "idle" | "loading" | "authenticated" | "guest";
  role: AuthRole | null;
  fetchMe: () => Promise<void>;
  fetchRole: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  role: null,

  fetchMe: async () => {
    set({ status: "loading" });
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const json = await res.json();
      if (json.status === "success") {
        set({ user: json.data, status: "authenticated" });
      } else {
        set({ user: null, status: "guest", role: null });
      }
    } catch {
      set({ user: null, status: "guest", role: null });
    }
  },

  fetchRole: async () => {
    try {
      const res = await fetch("/api/auth/role", { cache: "no-store" });
      const json = await res.json();
      set({ role: json.status === "success" ? json.data : null });
    } catch {
      set({ role: null });
    }
  },

  setUser: (user) => set({ user, status: user ? "authenticated" : "guest" }),

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null, status: "guest", role: null });
  },
}));

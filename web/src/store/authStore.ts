import { api } from "@/lib/api";
import type { LoginCredentials, RegisterData } from "@/lib/schemas";
import { create } from "zustand";

interface User {
    id: string; // ID is number in Go (int64) but string in API JSON response usually, need to check
    name: string;
    email: string;
}

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    // Actions
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoading: true,
    isAuthenticated: false,

    login: async (credentials) => {
        // 1. Perform login
        await api.post("/auth/login", credentials);
        // 2. Fetch user details to confirm and update state
        const { data } = await api.get("/users/me");
        set({ user: data, isAuthenticated: true });
    },

    register: async (data: RegisterData) => {
        // 1. Register
        await api.post("/users", data);
        // 2. For now, we redirect to login (as per AuthContext), so no state update needed here usually
        // unless auto-login. The previous logic redirected to login, so we keep that flow or improving it by auto-logging in.
        // Let's stick to the previous flow for now to be safe, or just auto-login?
        // User requested "proper auth store".
        // Let's just do the API call. The component will handle navigation.
    },

    logout: async () => {
        try {
            await api.post("/auth/logout");
        } catch (error) {
            console.error("Logout failed", error);
        }
        set({ user: null, isAuthenticated: false });
    },

    checkAuth: async () => {
        set({ isLoading: true });
        try {
            const { data } = await api.get("/users/me");
            set({ user: data, isAuthenticated: true });
        } catch (error) {
            // 401 or network error
            set({ user: null, isAuthenticated: false });
        } finally {
            set({ isLoading: false });
        }
    },
}));

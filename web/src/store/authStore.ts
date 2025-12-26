import { api } from "@/lib/api";
import type { LoginCredentials, RegisterData } from "@/lib/schemas";
import { create } from "zustand";

interface User {
    id: number; // ID is int64 in Go, comes as number in JSON
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
        // 1. Perform login and get user data
        const response = await api.post("/auth/login", credentials);
        console.log("Login response:", response.data);
        // 2. Extract user from response (response.data.data.user)
        const userData = response.data.data.user;
        set({ user: userData, isAuthenticated: true });
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
            const response = await api.get("/users/me");
            console.log("checkAuth response:", response.data);
            // response.data.data contains the user object directly
            const userData = response.data.data;
            set({ user: userData, isAuthenticated: true });
        } catch (error) {
            // 401 or network error
            console.log("checkAuth failed:", error);
            set({ user: null, isAuthenticated: false });
        } finally {
            set({ isLoading: false });
        }
    },
}));

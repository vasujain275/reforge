import { api } from "@/lib/api";

// ============= Types =============

export interface ChangePasswordRequest {
    old_password: string;
    new_password: string;
}

export interface DeleteAccountRequest {
    password: string;
}

// ============= User Account Management =============

export const usersApi = {
    // Change current user's password
    changePassword: async (data: ChangePasswordRequest): Promise<void> => {
        await api.put(`/users/me/password`, data);
    },

    // Delete current user's account
    deleteAccount: async (data: DeleteAccountRequest): Promise<void> => {
        await api.delete(`/users/me`, { data });
    },
};

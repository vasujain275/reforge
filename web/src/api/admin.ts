import { api } from "@/lib/api";

// ============= Types =============

export interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: 'user' | 'admin';
    is_active: boolean;
    created_at: string;
}

export interface UserListResponse {
    users: AdminUser[];
    total: number;
    page: number;
    page_size: number;
}

export interface InviteCode {
    id: number;
    code: string;
    created_by_admin_id: number;
    created_at: string;
    expires_at: string | null;
    max_uses: number;
    current_uses: number;
}

export interface SignupSettings {
    signup_enabled: boolean;
    invite_codes_enabled: boolean;
}

export interface PasswordResetResponse {
    token: string;
    reset_link: string;
    expires_at: string;
}

// ============= Public APIs (no auth required) =============

export const publicApi = {
    // Get signup settings (publicly accessible)
    getSignupSettings: async (): Promise<SignupSettings> => {
        const response = await api.get(`/settings/signup`);
        return response.data.data;
    },
};

// ============= User Management =============

export const adminApi = {
    // List all users with pagination
    listUsers: async (page = 1, pageSize = 50): Promise<UserListResponse> => {
        const response = await api.get(`/admin/users`, {
            params: { page, page_size: pageSize },
        });
        return response.data.data;
    },

    // Update user role
    updateUserRole: async (userId: number, role: 'user' | 'admin'): Promise<void> => {
        await api.post(`/admin/users/${userId}/role`, { role });
    },

    // Deactivate user
    deactivateUser: async (userId: number): Promise<void> => {
        await api.post(`/admin/users/${userId}/deactivate`);
    },

    // Reactivate user
    reactivateUser: async (userId: number): Promise<void> => {
        await api.post(`/admin/users/${userId}/reactivate`);
    },

    // Delete user permanently
    deleteUser: async (userId: number): Promise<void> => {
        await api.delete(`/admin/users/${userId}`);
    },

    // Initiate password reset for user
    initiatePasswordReset: async (userId: number): Promise<PasswordResetResponse> => {
        const response = await api.post(`/admin/users/${userId}/reset-password`);
        return response.data.data;
    },

    // ============= Invite Codes =============

    // List all invite codes
    listInviteCodes: async (): Promise<InviteCode[]> => {
        const response = await api.get(`/admin/invites`);
        return response.data.data.invite_codes || [];
    },

    // Create invite code
    createInviteCode: async (params?: {
        expires_in?: number;  // Hours until expiration
        max_uses?: number;
    }): Promise<InviteCode> => {
        const response = await api.post(`/admin/invites`, params || {});
        return response.data.data;
    },

    // Delete invite code
    deleteInviteCode: async (inviteId: number): Promise<void> => {
        await api.delete(`/admin/invites/${inviteId}`);
    },

    // ============= Settings =============

    // Get signup settings
    getSignupSettings: async (): Promise<SignupSettings> => {
        const response = await api.get(`/admin/settings/signup`);
        return response.data.data;
    },

    // Update signup enabled
    updateSignupEnabled: async (enabled: boolean): Promise<void> => {
        await api.put(`/admin/settings/signup/enabled`, { enabled });
    },

    // Update invite codes enabled
    updateInviteCodesEnabled: async (enabled: boolean): Promise<void> => {
        await api.put(`/admin/settings/signup/invites`, { enabled });
    },
};

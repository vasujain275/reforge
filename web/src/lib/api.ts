import axios from "axios";

// Create axios instance
export const api = axios.create({
    baseURL: "/api/v1",
    withCredentials: true, // Important for cookies
});

// Response interceptor for handling token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Prevent infinite loops
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Attempt to refresh token
                await api.post("/auth/refresh");

                // Retry original request
                return api(originalRequest);
            } catch (refreshError) {
                // If refresh fails, let the error propagate (AuthContext will handle logout/redirect)
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

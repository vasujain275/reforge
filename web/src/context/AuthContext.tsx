import { api } from "@/lib/api";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Types
interface User {
  id: string;
  name: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  // location was unused
  // const location = useLocation();

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await api.get("/users/me");
      setUser(data);
    } catch (error) {
      // Unused error var is fine if we just ignore it, or log it
      console.debug("Not authenticated", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: unknown) => {
    await api.post("/auth/login", credentials);
    await checkAuth(); // Fetch user details after login
    navigate("/dashboard");
  };

  const register = async (data: unknown) => {
    await api.post("/users", data);
    // Auto-login after register if API supports it, or redirect to login
    // Assuming /users doesn't set cookie, we might need to login.
    // Spec says /users creates user. Let's redirect to login for now or auto-login.
    // Flow: Register -> Login -> Dashboard
    navigate("/login");
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

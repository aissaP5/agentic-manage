import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiClient } from "../api/client";

type User = {
  id: number;
  name: string;
};

interface AuthContextType {
  user: User | null;
  login: (name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Load from memory on boot
    const storedUser = localStorage.getItem("agentic_user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const login = async (name: string, password: string) => {
    try {
      const res = await apiClient.post("/users/login", { name, password });
      const data = res.data;
      if (data.id) {
        setUser(data);
        localStorage.setItem("agentic_user", JSON.stringify(data));
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        throw new Error("Incorrect password");
      }
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("agentic_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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

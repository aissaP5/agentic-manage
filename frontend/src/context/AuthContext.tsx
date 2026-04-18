import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
    const res = await fetch("http://localhost:3000/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password })
    });
    
    if (res.status === 401) {
      throw new Error("Incorrect password");
    }
    
    const data = await res.json();
    if (data.id) {
      setUser(data);
      localStorage.setItem("agentic_user", JSON.stringify(data));
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

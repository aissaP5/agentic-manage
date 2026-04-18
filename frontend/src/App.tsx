import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./components/Home";
import Dashboard from "./components/Dashboard";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginScreen from "./components/LoginScreen";

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  
  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl">A</div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Agentic Learning
          </h1>
        </Link>
        <div className="flex items-center gap-4">
          <span className="font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            {user.name}
          </span>
          <button onClick={logout} className="text-sm font-bold text-red-500 hover:text-red-700 transition">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthWrapper>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </AuthWrapper>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

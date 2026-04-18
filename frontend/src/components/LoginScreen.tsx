import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { LogIn, BrainCircuit } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginScreen() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password) return;
    setLoading(true);
    setError("");
    try {
      await login(name, password);
    } catch (err: any) {
      setError(err.message || "Failed to enter learning space");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-100 to-blue-50">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-10 -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-10 -ml-10 -mb-10"></div>
        
        <div className="text-center mb-8 relative z-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6 mx-auto">
             <BrainCircuit className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Agentic Learner</h1>
          <p className="text-slate-500 mt-2 font-medium">Create your profile to start learning</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marie Curie"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-lg font-medium text-slate-800"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-lg font-medium text-slate-800"
              required
            />
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-sm font-bold text-center">
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all outline-none"
          >
            {loading ? "Authenticating..." : <><LogIn size={20} /> Enter Learning Space</>}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Clock, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../api/client";
import { ThinkingProcess } from "./ThinkingProcess";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkingLogs, setThinkingLogs] = useState<any[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const forceNew = location.state?.forceNew;

  // Redirect to Dashboard directly if the user already has courses
  useEffect(() => {
    if (user?.id && !forceNew) {
      apiClient.get(`/users/${user.id}/plans`)
        .then(res => {
          if (res.data && res.data.length > 0) {
            navigate("/dashboard");
          }
        })
        .catch(err => console.error("Failed to check user plans", err));
    }
  }, [user, navigate, forceNew]);

  // Simulate Agentic Thought Process
  useEffect(() => {
    if (!loading) {
      setThinkingLogs([]);
      return;
    }

    const steps = [
      { id: '1', agent: 'Architect', message: 'Analyzing topic requirements and duration...', status: 'thinking' },
      { id: '2', agent: 'Research', message: 'Scanning knowledge base for existing material...', status: 'waiting' },
      { id: '3', agent: 'Researcher', message: 'Fetching deep-dive data from Wikipedia & Google...', status: 'waiting' },
      { id: '4', agent: 'Critic', message: 'Reviewing curriculum for accuracy and flow...', status: 'waiting' }
    ];

    setThinkingLogs([steps[0]]);

    const timers = [
      setTimeout(() => setThinkingLogs(prev => [
        { ...prev[0], status: 'done', message: 'Topic analysis complete.' },
        { ...steps[1], status: 'thinking' }
      ]), 2500),
      setTimeout(() => setThinkingLogs(prev => [
        prev[0],
        { ...prev[1], status: 'done', message: 'Memories retrieved successfully.' },
        { ...steps[2], status: 'thinking' }
      ]), 5000),
      setTimeout(() => setThinkingLogs(prev => [
        prev[0],
        prev[1],
        { ...prev[2], status: 'done', message: 'Research gathered 5 new sources.' },
        { ...steps[3], status: 'thinking' }
      ]), 9000),
       setTimeout(() => setThinkingLogs(prev => [
        prev[0],
        prev[1],
        prev[2],
        { ...prev[3], status: 'done', message: 'Content verified and optimized.' }
      ]), 13000)
    ];

    return () => timers.forEach(clearTimeout);
  }, [loading]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !user) return;

    setLoading(true);
    try {
      const response = await apiClient.post("/learn", { 
        topic, 
        userId: user.id 
      });
      // Small buffer to show completion
      setTimeout(() => {
        navigate("/dashboard", { state: { planData: response.data } });
      }, 1000);
    } catch (error: any) {
      console.error(error);
      const detail = error.response?.data?.details || "Ensure backend is running and Gemini key is set.";
      alert(`Failed to generate plan: ${detail}`);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-4xl mx-auto text-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
          <Sparkles size={16} /> Powered by Agentic Intelligence
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900">
          Learn anything, <span className="text-blue-600">faster.</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Our Multi-Agent system researches, plans, and teaches you step-by-step with verified resources.
        </p>

        <AnimatePresence mode="wait">
          {!loading ? (
            <motion.form 
              key="form"
              exit={{ opacity: 0, scale: 0.95 }}
              onSubmit={handleStart} 
              className="mt-8 bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-slate-100 gap-6 flex flex-col items-start w-full max-w-2xl mx-auto text-left"
            >
              <div className="w-full space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <BookOpen size={18} className="text-blue-500" /> What do you want to learn?
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Next.js, Quantum Physics, Spanish" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                />
              </div>



              <button 
                type="submit" 
                className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                Generate My Learning Path <ArrowRight size={20} />
              </button>
            </motion.form>
          ) : (
            <motion.div 
              key="thinking"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-8 w-full max-w-2xl mx-auto"
            >
              <ThinkingProcess logs={thinkingLogs} />
              <p className="mt-4 text-slate-400 text-sm animate-pulse">
                Building your custom academy...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}


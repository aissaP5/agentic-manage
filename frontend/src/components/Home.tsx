import { useAuth } from "../context/AuthContext";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !duration || !user) return;

    setLoading(true);
    try {
      const response = await apiClient.post("/learn", { 
        topic, 
        duration, 
        userId: user.id 
      });
      // Pass the plan to the dashboard
      navigate("/dashboard", { state: { planData: response.data } });
    } catch (error: any) {
      console.error(error);
      const detail = error.response?.data?.details || "Ensure backend is running and Gemini key is set.";
      alert(`Failed to generate plan: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-2xl mx-auto text-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
          <Sparkles size={16} /> Powered by Gemini AI
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900">
          Learn anything, <span className="text-blue-600">faster.</span>
        </h1>
        <p className="text-lg text-slate-600">
          Enter any topic and your available time. Our Agentic AI will analyze, plan, and teach you step-by-step with curated resources and quizzes.
        </p>

        <form onSubmit={handleStart} className="mt-8 bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-slate-100 gap-6 flex flex-col items-start w-full text-left">
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

          <div className="w-full space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Clock size={18} className="text-purple-500" /> How much time do you have?
            </label>
            <input 
              type="text" 
              placeholder="e.g. 2 weeks, 1 month, 3 days" 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? "Generating Plan (takes ~10s)..." : <>Generate My Learning Path <ArrowRight size={20} /></>}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

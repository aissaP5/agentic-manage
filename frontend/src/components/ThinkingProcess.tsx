import React from 'react';
import { Loader2, Search, Cpu, CheckCircle2, ShieldCheck } from 'lucide-react';

interface Thought {
  id: string;
  agent: string;
  message: string;
  status: 'thinking' | 'done' | 'working' | 'waiting';
}

interface ThinkingProcessProps {
  logs: Thought[];
  title?: string;
}

export const ThinkingProcess: React.FC<ThinkingProcessProps> = ({ logs, title }) => {
  const getIcon = (agent: string) => {
    switch (agent.toLowerCase()) {
      case 'architect': return <Cpu className="w-5 h-5 text-blue-400" />;
      case 'researcher': return <Search className="w-5 h-5 text-purple-400" />;
      case 'critic': return <ShieldCheck className="w-5 h-5 text-green-400" />;
      default: return <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />;
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-md rounded-xl p-6 border border-slate-700/50 my-6 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-25 animate-pulse"></div>
          <Cpu className="w-6 h-6 text-blue-400 relative" />
        </div>
        <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          {title || "Agentic Workflow Exploration"}
        </h3>
      </div>

      <div className="space-y-4">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-4 group">
            <div className="flex flex-col items-center">
              <div className={`p-2 rounded-lg ${log.status === 'thinking' ? 'bg-slate-800 animate-pulse' : 'bg-slate-800'}`}>
                {log.status === 'thinking' ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                  getIcon(log.agent)
                )}
              </div>
              <div className="w-px h-full bg-slate-800 group-last:hidden mt-2"></div>
            </div>
            
            <div className="pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {log.agent}
                </span>
                {log.status === 'done' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
              </div>
              <p className={`text-sm mt-1 shadow-sm ${log.status === 'thinking' ? 'text-slate-400 italic' : 'text-slate-200'}`}>
                {log.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

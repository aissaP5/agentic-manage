import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Terminal, Play, RefreshCw, Eye, EyeOff } from "lucide-react";

export default function Playground({ initialCode = "<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: system-ui; text-align: center; padding-top: 50px; }\n    h1 { color: #2563eb; }\n  </style>\n</head>\n<body>\n  <h1>Welcome to the Lab!</h1>\n  <p>Modify this code to see changes.</p>\n</body>\n</html>" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState("");
  const [isLive, setIsLive] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  const runCode = () => {
    let finalHtml = code;
    
    // If the code doesn't look like a full HTML document, wrap it nicely
    if (!code.toLowerCase().includes("<html") && !code.toLowerCase().includes("<body")) {
      finalHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 16px; color: #333; }
            </style>
          </head>
          <body>
            ${code}
          </body>
        </html>
      `;
    }
    
    setOutput(finalHtml);
  };

  useEffect(() => {
    if (isLive) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(runCode, 500);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [code, isLive]);

  useEffect(() => {
    runCode();
  }, []);

  return (
    <div className="flex flex-col h-[600px] border border-slate-200 rounded-xl overflow-hidden shadow-lg bg-white">
      <div className="flex bg-slate-900 p-3 items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2 ml-2">
            <Terminal size={16} className="text-blue-400" /> 
            <span className="opacity-80">Interactive Lab:</span>
            <span className="text-white font-semibold">index.html</span>
          </h3>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsLive(!isLive)} 
            className={`p-1.5 px-3 text-xs font-bold rounded flex items-center gap-2 transition-all ${isLive ? 'bg-green-600/20 text-green-400 border border-green-500/50' : 'bg-slate-700 text-slate-300 border border-slate-600'}`}
          >
            {isLive ? <Eye size={14} /> : <EyeOff size={14} />}
            {isLive ? "Live" : "Manual"}
          </button>
          <button onClick={() => setCode(initialCode)} className="p-1.5 px-3 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded flex items-center gap-2 transition-colors">
            <RefreshCw size={14} /> Reset
          </button>
          {!isLive && (
            <button onClick={runCode} className="p-1.5 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded shadow-sm flex items-center gap-2 transition-all active:scale-95">
              <Play size={14} fill="currentColor" /> Run
            </button>
          )}
        </div>
      </div>
      
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden bg-slate-50">
        <div className="w-full md:w-1/2 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-slate-200 bg-[#1e1e1e] relative">
          <Editor
            height="100%"
            defaultLanguage="html"
            theme="vs-dark"
            value={code}
            onChange={(val) => setCode(val || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              wordWrap: "on",
              padding: { top: 16 },
              smoothScrolling: true,
              cursorBlinking: "smooth",
              formatOnPaste: true,
              formatOnType: true
            }}
          />
        </div>
        <div className="w-full md:w-1/2 h-1/2 md:h-full bg-white relative flex flex-col">
          <div className="bg-slate-50 border-b border-slate-100 p-1 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
            <span>Browser Preview</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-green-600">Online</span>
            </div>
          </div>
          <iframe
            key={output}
            title="result"
            srcDoc={output || "<html><body><p style='font-family:sans-serif;color:#999;text-align:center;margin-top:40px;'>Loading preview...</p></body></html>"}
            sandbox="allow-scripts allow-same-origin"
            className="w-full flex-1 border-none bg-white"
          />
        </div>
      </div>
    </div>
  );
}

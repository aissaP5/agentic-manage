import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Terminal, Play, RefreshCw } from "lucide-react";

export default function Playground({ initialCode = "<h1>Hello Learner!</h1>\n<p>Write some HTML or JS here to experiment.</p>" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState("");

  const runCode = () => {
    // Basic way to render HTML/JS in an iframe
    const htmlString = `
      <!DOCTYPE html>
      <html>
        <head><style>body { font-family: sans-serif; color: #333; padding: 10px; }</style></head>
        <body>
          ${code}
          <script>
            // Intercept console.log to show on screen if needed, but for now simple execution is fine
          </script>
        </body>
      </html>
    `;
    setOutput(htmlString);
  };

  useEffect(() => {
    runCode();
  }, []);

  return (
    <div className="flex flex-col h-[500px] border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
      <div className="flex bg-slate-100 p-2 items-center justify-between border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Terminal size={16} /> Interactive Lab
        </h3>
        <div className="flex gap-2">
          <button onClick={() => setCode(initialCode)} className="p-1 px-2 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded flex items-center gap-1 transition-colors">
            <RefreshCw size={12} /> Reset
          </button>
          <button onClick={runCode} className="p-1 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1 transition-colors">
            <Play size={12} fill="currentColor" /> Run Code
          </button>
        </div>
      </div>
      
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
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
              wordWrap: "on",
              padding: { top: 16 }
            }}
          />
        </div>
        <div className="w-full md:w-1/2 h-1/2 md:h-full bg-white relative">
          <iframe
            title="result"
            srcDoc={output}
            sandbox="allow-scripts"
            className="w-full h-full border-none"
          />
        </div>
      </div>
    </div>
  );
}

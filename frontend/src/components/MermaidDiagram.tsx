import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
});

interface MermaidDiagramProps {
  chart: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderChart = async () => {
      if (ref.current && chart) {
        try {
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          // Cleanup: Mermaid doesn't like newlines inside node labels [...] or ((...)) or {...}
          const sanitizedChart = chart
            .replace(/\[([\s\S]*?)\]/g, (m, content) => `[${content.replace(/\n/g, ' ')}]`)
            .replace(/\(([\s\S]*?)\)/g, (m, content) => `(${content.replace(/\n/g, ' ')})`)
            .replace(/\{([\s\S]*?)\}/g, (m, content) => `{${content.replace(/\n/g, ' ')}}`);

          const { svg } = await mermaid.render(id, sanitizedChart);
          ref.current.innerHTML = svg;
        } catch (error) {
          console.error("Mermaid render error:", error);
          ref.current.innerHTML = `<div className="text-red-500 text-xs">Visual generation failed. Check syntax.</div>`;
        }
      }
    };
    renderChart();
  }, [chart]);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden w-full">
        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Conceptual Mindmap</h4>
        <div className="w-full flex justify-center" ref={ref}></div>
    </div>
  );
};

export default MermaidDiagram;

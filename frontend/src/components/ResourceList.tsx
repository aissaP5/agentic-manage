import { ExternalLink, Video, BookMarked, Globe } from "lucide-react";

interface Resource {
  title: string;
  link?: string;
  url?: string;
  description?: string;
}

export default function ResourceList({ resources }: { resources: Resource[] }) {
  // Normalize: accept both 'link' and 'url' fields
  const normalized = (resources || [])
    .map(r => ({
      title: r.title || "Resource",
      link: r.link || r.url || "",
      description: r.description || ""
    }))
    .filter(r => r.link && r.link.startsWith("http"));

  if (normalized.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
        <BookMarked size={48} className="text-slate-200 mb-4" />
        <p className="text-slate-500 font-medium">No external resources were found for this topic.</p>
        <p className="text-slate-400 text-sm mt-1">Generate the module content first, or try refining the plan.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Globe size={20} className="text-blue-500" /> Curated Resources
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {normalized.map((res, idx) => {
          const isVideo = res.title.toLowerCase().includes('youtube') || res.link.includes('youtube');
          // Extract domain for display
          let domain = "";
          try { domain = new URL(res.link).hostname.replace("www.", ""); } catch {}

          return (
            <a 
              key={idx}
              href={res.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group"
            >
              <div className={`p-3 rounded-lg shrink-0 ${isVideo ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'}`}>
                {isVideo ? <Video size={24} /> : <BookMarked size={24} />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                  {res.title} <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </h4>
                {res.description && (
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{res.description}</p>
                )}
                <p className="text-xs text-blue-500 mt-1.5 truncate font-mono">{domain}</p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

import { ExternalLink, Video, BookMarked } from "lucide-react";

interface Resource {
  title: string;
  link: string;
  description: string;
}

export default function ResourceList({ resources }: { resources: Resource[] }) {
  if (!resources || resources.length === 0) return null;

  return (
    <div>
      <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">Curated Resources</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resources.map((res, idx) => {
          const isVideo = res.title.toLowerCase().includes('youtube') || res.link.includes('youtube');
          return (
            <a 
              key={idx}
              href={res.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group"
            >
              <div className={`p-3 rounded-lg ${isVideo ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'}`}>
                {isVideo ? <Video size={24} /> : <BookMarked size={24} />}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                  {res.title} <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </h4>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{res.description}</p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

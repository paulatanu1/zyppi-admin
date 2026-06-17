import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, FileText, ExternalLink } from 'lucide-react';

interface DocumentGroupProps {
  label: string;
  urls?: string[];
}

// Fullscreen lightbox
function Lightbox({ urls, startIndex, onClose }: { urls: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90" onClick={onClose}>
      <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors">
        <X className="h-5 w-5" />
      </button>

      {urls.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + urls.length) % urls.length); }}
            className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % urls.length); }}
            className="absolute right-14 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <div className="flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
        <img
          src={urls[idx]}
          alt={`Document ${idx + 1}`}
          className="max-h-[80vh] max-w-[85vw] rounded-xl object-contain shadow-2xl"
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/60">{idx + 1} / {urls.length}</span>
          <a href={urls[idx]} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition-colors">
            <ExternalLink className="h-3.5 w-3.5" /> Open original
          </a>
        </div>
      </div>
    </div>
  );
}

function DocumentGroup({ label, urls }: DocumentGroupProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const hasUrls = urls && urls.length > 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-3.5 w-3.5 text-gray-400" />
        <p className="text-xs font-semibold text-gray-600">{label}</p>
        {hasUrls && (
          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
            {urls.length} file{urls.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {!hasUrls ? (
        <div className="flex h-16 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-400">Not uploaded</p>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {urls.map((url, i) => (
            <button
              key={i}
              onClick={() => setLightboxIdx(i)}
              className="group relative h-20 w-20 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 hover:border-indigo-300 transition-all hover:shadow-md"
            >
              <img src={url} alt={`${label} ${i + 1}`} className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors rounded-xl">
                <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      )}

      {lightboxIdx !== null && (
        <Lightbox urls={urls!} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </div>
  );
}

interface DocumentViewerProps {
  documents?: {
    rcImages?: string[];
    licenseImages?: string[];
    insuranceImages?: string[];
    pucImages?: string[];
    vehicleImages?: string[];
  };
}

export function DocumentViewer({ documents }: DocumentViewerProps) {
  if (!documents) {
    return <p className="py-4 text-center text-sm text-gray-400">No documents uploaded</p>;
  }

  const groups = [
    { label: 'Vehicle Photos', urls: documents.vehicleImages },
    { label: 'RC Book', urls: documents.rcImages },
    { label: 'Driving License', urls: documents.licenseImages },
    { label: 'Insurance', urls: documents.insuranceImages },
    { label: 'PUC Certificate', urls: documents.pucImages },
  ];

  const totalUploaded = groups.reduce((sum, g) => sum + (g.urls?.length ?? 0), 0);

  return (
    <div className="space-y-5">
      {totalUploaded === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-6 text-center">
          <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No documents uploaded yet</p>
        </div>
      )}
      {groups.map(g => (
        <DocumentGroup key={g.label} label={g.label} urls={g.urls} />
      ))}
    </div>
  );
}

import React from 'react';

interface Props {
  onEnable: () => void;
}

export function FetchPaused({ onEnable }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-4">⏸️</div>
      <p className="text-sm font-semibold text-gray-700">Data fetching is paused</p>
      <p className="text-xs text-gray-400 mt-1 max-w-xs">
        This section is disabled in Settings to reduce Firebase reads.
      </p>
      <button
        onClick={onEnable}
        className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
      >
        Enable &amp; Load Data →
      </button>
      <a href="/admin/settings" className="mt-2 text-xs text-gray-400 hover:text-indigo-600 transition-colors">
        Manage in Settings
      </a>
    </div>
  );
}

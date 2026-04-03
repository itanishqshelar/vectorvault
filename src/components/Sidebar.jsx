'use client';

import { FileText, Sheet, Mail, FolderOpen, Trash2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const TYPE_ICONS = {
  pdf: { icon: FileText, cls: 'text-red-400 bg-red-400/10' },
  excel: { icon: Sheet, cls: 'text-green-400 bg-green-400/10' },
  email: { icon: Mail, cls: 'text-blue-400 bg-blue-400/10' },
  gmail: { icon: Mail, cls: 'text-orange-400 bg-orange-400/10' },
  drive: { icon: FolderOpen, cls: 'text-blue-400 bg-blue-400/10' },
};

export default function Sidebar({ sources, onDeleteSource, isCollapsed }) {
  const totalChunks = sources.reduce((sum, s) => sum + (s.chunk_count || 0), 0);
  const [loadingView, setLoadingView] = useState(null);

  async function handleView(sourceId) {
    setLoadingView(sourceId);
    try {
      const res = await fetch(`/api/sources/${sourceId}/view`);
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      } else {
        alert(data.error || 'Could not load file');
      }
    } finally {
      setLoadingView(null);
    }
  }

  return (
    <aside
      className={cn(
        'flex flex-col flex-shrink-0 bg-neutral-900/80 backdrop-blur-xl border-r border-neutral-800 transition-all duration-300 overflow-hidden',
        isCollapsed ? 'w-0 opacity-0 border-r-0' : 'w-[280px]'
      )}
    >
      {/* Brand */}
      <div className="p-5 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/25">
            V
          </div>
          <div>
            <div className="font-[family-name:var(--font-display)] text-lg font-bold text-white">
              VectorVault
            </div>
            <div className="text-[11px] text-neutral-500 uppercase tracking-wider">
              Knowledge Agent
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 p-4 border-b border-neutral-800">
        <div className="flex-1 bg-neutral-800/60 border border-neutral-700/50 rounded-lg p-3 text-center">
          <div className="font-[family-name:var(--font-display)] text-xl font-bold text-indigo-400">
            {sources.length}
          </div>
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Documents</div>
        </div>
        <div className="flex-1 bg-neutral-800/60 border border-neutral-700/50 rounded-lg p-3 text-center">
          <div className="font-[family-name:var(--font-display)] text-xl font-bold text-indigo-400">
            {totalChunks}
          </div>
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Chunks</div>
        </div>
      </div>

      {/* Section title */}
      <div className="px-5 pt-4 pb-2 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
        Document Library
      </div>

      {/* Sources list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {sources.length === 0 ? (
          <div className="px-5 py-6 text-center text-neutral-500 text-sm">
            No documents uploaded yet. Click &quot;Upload&quot; to add your first document.
          </div>
        ) : (
          sources.map((source) => {
            const typeInfo = TYPE_ICONS[source.source_type] || TYPE_ICONS.pdf;
            const Icon = typeInfo.icon;
            return (
              <div
                key={source.id}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-800/60 transition-colors"
              >
                <div className={cn('w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0', typeInfo.cls)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-neutral-200 truncate">
                    {source.filename}
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {source.chunk_count} chunks &middot;{' '}
                    {new Date(source.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all">
                  <button
                    className="p-1.5 rounded-md text-neutral-500 hover:text-indigo-400 hover:bg-indigo-400/10 transition-colors disabled:opacity-50"
                    onClick={() => handleView(source.id)}
                    disabled={loadingView === source.id}
                    title="View document"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="p-1.5 rounded-md text-neutral-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    onClick={() => onDeleteSource(source.id)}
                    title="Delete source"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

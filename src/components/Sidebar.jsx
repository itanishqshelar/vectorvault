'use client';

import { FileText, Sheet, Mail, FolderOpen, Trash2, Eye, Plus, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import Image from 'next/image';
import LanguageSelector from './LanguageSelector';

const TYPE_ICONS = {
  pdf: { icon: FileText, cls: 'text-red-400 bg-red-400/10' },
  excel: { icon: Sheet, cls: 'text-green-400 bg-green-400/10' },
  email: { icon: Mail, cls: 'text-blue-400 bg-blue-400/10' },
  gmail: { icon: Mail, cls: 'text-orange-400 bg-orange-400/10' },
  drive: { icon: FolderOpen, cls: 'text-blue-400 bg-blue-400/10' },
};

export default function Sidebar({ 
  sources, 
  onDeleteSource, 
  isCollapsed,
  sessions = [],
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession
}) {
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
        'flex flex-col flex-shrink-0 bg-neutral-900/80 backdrop-blur-xl transition-all duration-300 overflow-hidden',
        isCollapsed ? 'w-0 opacity-0' : 'w-[280px]'
      )}
      style={{ borderRight: isCollapsed ? 'none' : '1px solid #262626' }}
    >
      {/* Brand */}
      <div className="p-5" style={{ borderBottom: '1px solid #262626' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden"
            style={{
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.25)',
            }}
          >
            <Image 
              src="/vaultlogo.jpeg" 
              alt="VectorVault Logo" 
              width={36} 
              height={36} 
              className="object-cover"
            />
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

      {/* Language Switcher */}
      <LanguageSelector />

      {/* Stats */}
      <div className="flex gap-3 p-4" style={{ borderBottom: '1px solid #262626' }}>
        <div
          className="flex-1 bg-neutral-800/60 rounded-lg p-3 text-center"
          style={{ border: '1px solid rgba(64,64,64,0.5)' }}
        >
          <div className="font-[family-name:var(--font-display)] text-xl font-bold text-blue-400">
            {sources.length}
          </div>
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Documents</div>
        </div>
        <div
          className="flex-1 bg-neutral-800/60 rounded-lg p-3 text-center"
          style={{ border: '1px solid rgba(64,64,64,0.5)' }}
        >
          <div className="font-[family-name:var(--font-display)] text-xl font-bold text-blue-400">
            {totalChunks}
          </div>
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Chunks</div>
        </div>
      </div>

      {/* Scrollable Container for both sections */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        
        {/* Document Library Section */}
        <div className="flex flex-col flex-1 min-h-0 border-b border-[#262626]">
          <div className="px-5 pt-4 pb-2 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Document Library
          </div>
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
                        className="p-1.5 rounded-md text-neutral-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors disabled:opacity-50 cursor-pointer"
                        style={{ border: 'none', background: 'none' }}
                        onClick={() => handleView(source.id)}
                        disabled={loadingView === source.id}
                        title="View document"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 rounded-md text-neutral-500 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
                        style={{ border: 'none', background: 'none' }}
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
        </div>

        {/* Chat History Section */}
        <div className="flex flex-col flex-1 min-h-0">
          <div className="px-5 pt-4 pb-2 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider flex justify-between items-center">
            <span>Chat History</span>
            <button
              onClick={onNewChat}
              className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="New Chat"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {sessions.length === 0 ? (
              <div className="px-5 py-6 text-center text-neutral-500 text-sm">
                No chat history yet.
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer mb-1",
                    session.id === currentSessionId 
                      ? "bg-blue-500/10 text-blue-400" 
                      : "hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {session.title || 'New Chat'}
                    </div>
                  </div>
                  {onDeleteSession && sessions.length > 1 && (
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-neutral-500 hover:text-red-400 hover:bg-red-400/10 transition-all cursor-pointer"
                      style={{ border: 'none', background: 'none' }}
                      onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                      title="Delete chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </aside>
  );
}

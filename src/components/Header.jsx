'use client';

import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeft, Upload, RefreshCw } from 'lucide-react';

export default function Header({ onUploadClick, onSyncClick, toggleSidebar, isSidebarCollapsed }) {
  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-neutral-900/60 backdrop-blur-xl border-b border-neutral-800">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-neutral-400 hover:text-white hover:bg-neutral-800"
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? (
            <PanelLeft className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </Button>
        <div className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-white">
          Chat with your documents
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={onSyncClick}
          variant="ghost"
          className="text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-600"
        >
          <RefreshCw className="w-4 h-4 shrink-0" />
          <span>Sync Google</span>
        </Button>
        <Button
          onClick={onUploadClick}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5"
        >
          <Upload className="w-4 h-4 shrink-0" />
          <span>Upload Document</span>
        </Button>
      </div>
    </header>
  );
}

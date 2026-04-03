'use client';

import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeft, Upload } from 'lucide-react';

export default function Header({ onUploadClick, toggleSidebar, isSidebarCollapsed }) {
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
          onClick={onUploadClick}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </Button>
      </div>
    </header>
  );
}

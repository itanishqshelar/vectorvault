'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeft, Upload, RefreshCw, Ticket } from 'lucide-react';

export default function Header({ onUploadClick, onSyncClick, toggleSidebar, isSidebarCollapsed }) {
  const router = useRouter();
  return (
    <header
      className="flex items-center justify-between px-6 py-3.5 bg-neutral-900/60 backdrop-blur-xl"
      style={{ borderBottom: '1px solid #262626' }}
    >
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-neutral-400 hover:text-white hover:bg-neutral-800 border-none"
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
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onSyncClick}
          className="inline-flex items-center gap-2 shrink-0 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          style={{ border: '1px solid #404040' }}
        >
          <RefreshCw className="w-4 h-4 shrink-0" />
          <span>Sync Google</span>
        </button>
        <button
          onClick={() => router.push('/crm')}
          className="inline-flex items-center gap-2 shrink-0 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          style={{ border: '1px solid #404040' }}
        >
          <Ticket className="w-4 h-4 shrink-0" />
          <span>Grievances</span>
        </button>
        <button
          onClick={onUploadClick}
          className="inline-flex items-center gap-2 shrink-0 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium text-white transition-all hover:-translate-y-0.5 border-none"
          style={{
            background: 'linear-gradient(to right, #2563eb, #3b82f6)',
            boxShadow: '0 10px 15px -3px rgba(37,99,235,0.25)',
          }}
        >
          <Upload className="w-4 h-4 shrink-0" />
          <span>Upload Document</span>
        </button>
      </div>
    </header>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ChatInterface from '@/components/ChatInterface';
import UploadPanel from '@/components/UploadPanel';
import SyncPanel from '@/components/SyncPanel';

export default function Home() {
  const [sources, setSources] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch('/api/sources');
      const data = await res.json();
      setSources(data.sources || []);
    } catch {
      // silently fail - sources will show as empty
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      setShowSync(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handleDeleteSource = async (id) => {
    try {
      await fetch('/api/sources', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchSources();
    } catch {
      // handle error silently
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-950">
      <Sidebar
        sources={sources}
        onDeleteSource={handleDeleteSource}
        isCollapsed={isSidebarCollapsed}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onUploadClick={() => setShowUpload(true)}
          onSyncClick={() => setShowSync(true)}
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
        />
        <ChatInterface />
      </div>
      {showUpload && (
        <UploadPanel
          onClose={() => setShowUpload(false)}
          onUploadComplete={fetchSources}
        />
      )}
      {showSync && (
        <SyncPanel
          onClose={() => setShowSync(false)}
          onSyncComplete={fetchSources}
        />
      )}
    </div>
  );
}

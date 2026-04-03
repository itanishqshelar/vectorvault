'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ChatInterface from '@/components/ChatInterface';
import UploadPanel from '@/components/UploadPanel';

export default function Home() {
  const [sources, setSources] = useState([]);
  const [showUpload, setShowUpload] = useState(false);

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
    <div className="app-layout">
      <Sidebar sources={sources} onDeleteSource={handleDeleteSource} />
      <div className="main-content">
        <Header onUploadClick={() => setShowUpload(true)} />
        <ChatInterface />
      </div>
      {showUpload && (
        <UploadPanel
          onClose={() => setShowUpload(false)}
          onUploadComplete={fetchSources}
        />
      )}
    </div>
  );
}

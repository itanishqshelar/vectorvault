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

  const [sessions, setSessions] = useState([
    { id: '1', title: 'New Chat', messages: [], createdAt: new Date() }
  ]);
  const [currentSessionId, setCurrentSessionId] = useState('1');

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];

  const handleNewChat = () => {
    const newSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const handleSetMessages = useCallback((updater) => {
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const nextMessages = typeof updater === 'function' ? updater(s.messages) : updater;
        
        let newTitle = s.title;
        if (s.title === 'New Chat' && nextMessages.length > 0) {
          const firstUserMsg = nextMessages.find(m => m.role === 'user');
          if (firstUserMsg) {
            newTitle = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
          }
        }

        return { ...s, messages: nextMessages, title: newTitle };
      }
      return s;
    }));
  }, [currentSessionId]);

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
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onNewChat={handleNewChat}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onUploadClick={() => setShowUpload(true)}
          onSyncClick={() => setShowSync(true)}
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
        />
        <ChatInterface 
          key={currentSession.id}
          messages={currentSession.messages}
          setMessages={handleSetMessages}
        />
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
